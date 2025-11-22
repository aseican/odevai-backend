import sys
import os
import shutil
from pdf2docx import Converter
import pdfplumber
import pandas as pd
from youtube_transcript_api import YouTubeTranscriptApi
import pytesseract
from pdf2image import convert_from_path
import pikepdf # Şifreli PDF'leri açmak için

# --- YARDIMCI: PDF ŞİFRE ÇÖZÜCÜ ---
def decrypt_pdf_if_needed(input_path):
    """
    PDF şifreliyse veya kısıtlamalıysa, şifresiz geçici bir kopyasını oluşturur.
    Geriye (kullanılacak_dosya_yolu, geçici_dosya_silinsin_mi) döner.
    """
    temp_filename = f"temp_decrypted_{os.path.basename(input_path)}"
    
    try:
        # Pikepdf ile dosyayı aç ve üzerine yazmaya izin ver
        with pikepdf.open(input_path, allow_overwriting_input=True) as pdf:
            pdf.save(temp_filename)
        return temp_filename, True
    except Exception:
        # Eğer hata verirse (şifreli değilse veya pikepdf açamazsa) orijinali kullan
        return input_path, False

def cleanup_temp_file(path, should_delete):
    if should_delete and os.path.exists(path):
        try:
            os.remove(path)
        except:
            pass

# --- 1. PDF -> WORD ---
def pdf_to_word(pdf_file, docx_file):
    usable_pdf, is_temp = decrypt_pdf_if_needed(pdf_file)
    try:
        cv = Converter(usable_pdf)
        cv.convert(docx_file, start=0, end=None)
        cv.close()
        print(f"Basarili: {docx_file}")
    except Exception as e:
        print(f"Hata: {e}")
        sys.exit(1)
    finally:
        cleanup_temp_file(usable_pdf, is_temp)

# --- 2. PDF -> EXCEL ---
def pdf_to_excel(pdf_file, excel_file):
    usable_pdf, is_temp = decrypt_pdf_if_needed(pdf_file)
    try:
        all_tables = []
        # 1. YÖNTEM: Tablo Arama
        with pdfplumber.open(usable_pdf) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        cleaned_table = [['' if item is None else item for item in row] for row in table]
                        df = pd.DataFrame(cleaned_table[1:], columns=cleaned_table[0])
                        all_tables.append(df)
        
        if all_tables:
            with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
                for i, df in enumerate(all_tables):
                    sheet_name = f"Tablo_{i+1}"
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"Basarili: {excel_file}")
            return

        # 2. YÖNTEM: Tablo Yoksa Metin Modu
        print("Bilgi: Tablo bulunamadi, metin moduna geciliyor...")
        all_text_data = []
        with pdfplumber.open(usable_pdf) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        all_text_data.append([line])
        
        if not all_text_data:
            print("Hata: PDF bos veya okunamadi.")
            sys.exit(1)

        df = pd.DataFrame(all_text_data, columns=["PDF İçeriği"])
        df.to_excel(excel_file, index=False, sheet_name="Metin")
        print(f"Basarili: {excel_file}")

    except Exception as e:
        print(f"Hata (Excel): {e}")
        sys.exit(1)
    finally:
        cleanup_temp_file(usable_pdf, is_temp)

# --- 3. YOUTUBE ÖZETİ (AKILLI VERSİYON) ---
def get_youtube_transcript(video_url, output_file):
    try:
        # 1. Video ID'yi Bul
        video_id = ""
        if "v=" in video_url:
            video_id = video_url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split("youtu.be/")[1].split("?")[0]
        else:
            print("Hata: Gecersiz YouTube linki")
            sys.exit(1)

        # 2. Tüm Altyazıları Listele (Manuel veya Otomatik)
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception as e:
             # Eğer liste alınamıyorsa büyük ihtimalle video kısıtlıdır veya IP engeli vardır
             print(f"Hata: Video erisilemiyor veya altyazi kapali. ({e})")
             sys.exit(1)

        # 3. En Uygun Dili Seçme Stratejisi
        transcript = None
        
        try:
            # A Planı: Direkt Türkçe (Manuel veya Otomatik) bulmaya çalış
            transcript = transcript_list.find_transcript(['tr', 'tr-TR'])
        except:
            try:
                # B Planı: İngilizce bulmaya çalış
                transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            except:
                # C Planı: Ne varsa onu al (Almanca, İspanyolca vs.)
                # iterate edip ilkini alıyoruz
                for t in transcript_list:
                    transcript = t
                    break
        
        if not transcript:
            print("Hata: Hicbir dilde altyazi bulunamadi.")
            sys.exit(1)

        # 4. Veriyi Çek
        final_data = transcript.fetch()
        full_text = " ".join([t['text'] for t in final_data])
        
        # 5. Dosyaya Yaz
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(full_text)
            
        print(f"Basarili: {output_file}")

    except Exception as e:
        # Genel Hata Yakalama
        print(f"Hata: Beklenmeyen bir sorun olustu. ({e})")
        sys.exit(1)

# --- 4. PDF METİN ÇIKARMA (CHATPDF & AI SORU HAZIRLAMA) ---
# OCR DESTEKLİ - RESİMLERİ DE OKUR
def extract_text_from_pdf(pdf_file, output_txt_file):
    usable_pdf, is_temp = decrypt_pdf_if_needed(pdf_file)
    
    try:
        full_text = ""
        page_count = 0
        
        # 1. YÖNTEM: Normal Okuma
        with pdfplumber.open(usable_pdf) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # 2. YÖNTEM: OCR Kontrolü (Eğer yazı çok azsa resimdir)
        avg_char_per_page = len(full_text) / page_count if page_count > 0 else 0
        
        if avg_char_per_page < 50:
            print("Bilgi: Metin az/yok (Resim PDF). OCR motoru baslatiliyor...")
            
            # PDF'i resimlere çevir
            images = convert_from_path(usable_pdf)
            full_text = "" # Metni sıfırla
            
            for i, image in enumerate(images):
                # Node.js loglarında ilerlemeyi göstermek için print
                print(f"OCR Isleniyor: Sayfa {i+1}/{len(images)}")
                page_text = pytesseract.image_to_string(image, lang='tur+eng')
                full_text += page_text + "\n"

        if not full_text.strip():
            print("Hata: PDF bos.")
            sys.exit(1)

        with open(output_txt_file, "w", encoding="utf-8") as f:
            f.write(full_text)

        print(f"Basarili: {output_txt_file}")

    except Exception as e:
        print(f"Hata (PDF Text/OCR): {e}")
        sys.exit(1)
    finally:
        cleanup_temp_file(usable_pdf, is_temp)

# --- ANA YÖNETİCİ ---
if __name__ == "__main__":
    # Türkçe karakter sorununu önlemek için
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print("Eksik arguman")
        sys.exit(1)

    action = sys.argv[1]

    # Dönüştürme İşlemleri (Word/Excel)
    if action == "convert":
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        if output_path.endswith('.docx'):
            pdf_to_word(input_path, output_path)
        elif output_path.endswith('.xlsx'):
            pdf_to_excel(input_path, output_path)
    
    # YouTube İşlemi
    elif action == "youtube":
        url = sys.argv[2]
        output_txt = sys.argv[3]
        get_youtube_transcript(url, output_txt)

    # Metin Çıkarma (ChatPDF ve Soru Hazırlama için)
    elif action == "pdf_text":
        input_pdf = sys.argv[2]
        output_txt = sys.argv[3]
        extract_text_from_pdf(input_pdf, output_txt)
    
    else:
        print("Gecersiz islem")
        sys.exit(1)