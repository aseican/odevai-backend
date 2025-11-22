import sys
import os
from pdf2docx import Converter
import pdfplumber
import pandas as pd
from youtube_transcript_api import YouTubeTranscriptApi
import pytesseract
from pdf2image import convert_from_path

# --- 1. PDF -> WORD ---
def pdf_to_word(pdf_file, docx_file):
    try:
        cv = Converter(pdf_file)
        cv.convert(docx_file, start=0, end=None)
        cv.close()
        print(f"Basarili: {docx_file}")
    except Exception as e:
        print(f"Hata: {e}")
        sys.exit(1)

# --- 2. PDF -> EXCEL ---
def pdf_to_excel(pdf_file, excel_file):
    try:
        all_tables = []
        # Tablo arama
        with pdfplumber.open(pdf_file) as pdf:
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
        print("Bilgi: Tablo bulunamadi, metin moduna geciliyor...")
        all_text_data = []
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        all_text_data.append([line])
        
        if not all_text_data:
            # Burada OCR denenebilir ama Excel için OCR tablosu zordur, şimdilik hata dönüyoruz.
            print("Hata: PDF bos veya tablo yok.")
            sys.exit(1)

        df = pd.DataFrame(all_text_data, columns=["PDF İçeriği"])
        df.to_excel(excel_file, index=False, sheet_name="Metin")
        print(f"Basarili: {excel_file}")

    except Exception as e:
        print(f"Hata (Excel): {e}")
        sys.exit(1)

# --- 3. YOUTUBE ÖZETİ ---
def get_youtube_transcript(video_url, output_file):
    try:
        if "v=" in video_url:
            video_id = video_url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split("youtu.be/")[1].split("?")[0]
        else:
            print("Hata: Gecersiz YouTube linki")
            sys.exit(1)

        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['tr', 'en'])
        full_text = " ".join([t['text'] for t in transcript_list])
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(full_text)
            
        print(f"Basarili: {output_file}")

    except Exception as e:
        print(f"Hata: Altyazi alinamadi. ({e})")
        sys.exit(1)

# --- 4. PDF METİN ÇIKARMA (CHATPDF & AI SORU HAZIRLAMA) ---
# BURASI GÜNCELLENDİ: ARTIK OCR (RESİM OKUMA) YETENEĞİ VAR!
def extract_text_from_pdf(pdf_file, output_txt_file):
    try:
        full_text = ""
        page_count = 0
        
        # 1. YÖNTEM: Hızlı Okuma (pdfplumber)
        with pdfplumber.open(pdf_file) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # 2. KONTROL: Eğer metin çok azsa (Sayfa başı 50 karakterden azsa) OCR devreye girsin
        avg_char_per_page = len(full_text) / page_count if page_count > 0 else 0
        
        if avg_char_per_page < 50:
            print("Bilgi: Metin bulunamadi (Resim PDF). OCR motoru baslatiliyor (Bu islem biraz sürebilir)...")
            
            # PDF sayfalarını resme çevir
            images = convert_from_path(pdf_file)
            full_text = "" # Metni sıfırla, OCR ile yeniden doldur
            
            for i, image in enumerate(images):
                print(f"OCR Taraniyor: Sayfa {i+1}/{len(images)}")
                # Türkçe ve İngilizce tarama yap
                page_text = pytesseract.image_to_string(image, lang='tur+eng')
                full_text += page_text + "\n"

        if not full_text.strip():
            print("Hata: PDF tamamen bos veya okunamadi.")
            sys.exit(1)

        with open(output_txt_file, "w", encoding="utf-8") as f:
            f.write(full_text)

        print(f"Basarili: {output_txt_file}")

    except Exception as e:
        print(f"Hata (PDF Text/OCR): {e}")
        sys.exit(1)

# --- ANA YÖNETİCİ ---
if __name__ == "__main__":
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print("Eksik arguman")
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
    
    else:
        print("Gecersiz islem")
        sys.exit(1)