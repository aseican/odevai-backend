import sys
import os
from pdf2docx import Converter
import pdfplumber
import pandas as pd
from youtube_transcript_api import YouTubeTranscriptApi

# Not: Ağır kütüphaneler (pikepdf, pytesseract) performans için
# sadece ilgili fonksiyonların içinde import edilecektir.

# --- YARDIMCI: PDF ŞİFRE ÇÖZÜCÜ ---
def decrypt_pdf_if_needed(input_path):
    import pikepdf # Sadece burada çağırıyoruz
    
    temp_filename = f"temp_decrypted_{os.path.basename(input_path)}"
    try:
        with pikepdf.open(input_path, allow_overwriting_input=True) as pdf:
            pdf.save(temp_filename)
        return temp_filename, True
    except Exception:
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

        # Tablo yoksa metin modu
        all_text_data = []
        with pdfplumber.open(usable_pdf) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        all_text_data.append([line])
        
        if not all_text_data:
            print("Hata: PDF bos.")
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
        # ID Ayıklama
        video_id = ""
        if "v=" in video_url:
            video_id = video_url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split("youtu.be/")[1].split("?")[0]
        else:
            print("Hata: Gecersiz YouTube linki")
            sys.exit(1)

        # Listeyi çek
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception as e:
            print(f"Hata: Video altyazisi yok veya erisilemiyor. ({e})")
            sys.exit(1)

        # Dil Seçimi (Akıllı Mod)
        transcript = None
        try:
            transcript = transcript_list.find_transcript(['tr', 'tr-TR'])
        except:
            try:
                transcript = transcript_list.find_transcript(['en', 'en-US'])
            except:
                for t in transcript_list:
                    transcript = t
                    break
        
        if not transcript:
            print("Hata: Uygun altyazi bulunamadi.")
            sys.exit(1)

        final_data = transcript.fetch()
        full_text = " ".join([t['text'] for t in final_data])
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(full_text)
            
        print(f"Basarili: {output_file}")

    except Exception as e:
        print(f"Hata: {e}")
        sys.exit(1)

# --- 4. PDF METİN (OCR DESTEKLİ) ---
def extract_text_from_pdf(pdf_file, output_txt_file):
    # OCR kütüphanelerini SADECE BURADA çağır
    import pytesseract
    from pdf2image import convert_from_path
    
    usable_pdf, is_temp = decrypt_pdf_if_needed(pdf_file)
    
    try:
        full_text = ""
        page_count = 0
        
        with pdfplumber.open(usable_pdf) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # OCR Kontrolü
        avg_char = len(full_text) / page_count if page_count > 0 else 0
        
        if avg_char < 50:
            print("Bilgi: Resim PDF tespit edildi. OCR baslatiliyor...")
            images = convert_from_path(usable_pdf)
            full_text = ""
            for i, image in enumerate(images):
                print(f"OCR: Sayfa {i+1} taraniyor...")
                # Dil paketleri kurulu olmalı (setup.sh ile kurduk)
                page_text = pytesseract.image_to_string(image, lang='tur+eng')
                full_text += page_text + "\n"

        if not full_text.strip():
            print("Hata: PDF bos.")
            sys.exit(1)

        with open(output_txt_file, "w", encoding="utf-8") as f:
            f.write(full_text)

        print(f"Basarili: {output_txt_file}")

    except Exception as e:
        print(f"Hata (Text): {e}")
        sys.exit(1)
    finally:
        cleanup_temp_file(usable_pdf, is_temp)

# --- MAIN ---
if __name__ == "__main__":
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print("Eksik parametre")
        sys.exit(1)

    action = sys.argv[1]

    if action == "convert":
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        if output_path.endswith('.docx'):
            pdf_to_word(input_path, output_path)
        elif output_path.endswith('.xlsx'):
            pdf_to_excel(input_path, output_path)
    
    elif action == "youtube":
        url = sys.argv[2]
        output_txt = sys.argv[3]
        get_youtube_transcript(url, output_txt)

    elif action == "pdf_text":
        input_pdf = sys.argv[2]
        output_txt = sys.argv[3]
        extract_text_from_pdf(input_pdf, output_txt)