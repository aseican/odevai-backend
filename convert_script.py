import sys
import os
from pdf2docx import Converter
import pdfplumber
import pandas as pd

def pdf_to_word(pdf_file, docx_file):
    try:
        cv = Converter(pdf_file)
        cv.convert(docx_file, start=0, end=None)
        cv.close()
        print(f"Basarili: {docx_file}")
    except Exception as e:
        print(f"Hata: {e}")
        sys.exit(1)

def pdf_to_excel(pdf_file, excel_file):
    try:
        # PDF'teki tüm tablolari bul
        all_tables = []
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    # Bos tablolari atla
                    if table:
                        # Tabloyu DataFrame'e cevir
                        df = pd.DataFrame(table[1:], columns=table[0])
                        all_tables.append(df)
        
        if not all_tables:
            print("Hata: PDF icinde tablo bulunamadi.")
            sys.exit(1)

        # Excel Writer baslat
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            for i, df in enumerate(all_tables):
                sheet_name = f"Tablo_{i+1}"
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"Basarili: {excel_file}")

    except Exception as e:
        print(f"Hata (Excel): {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Kullanim: python convert_script.py <input_pdf> <output_file>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Cikti dosyasinin uzantisina göre islem yap
    if output_path.lower().endswith('.docx'):
        pdf_to_word(input_path, output_path)
    elif output_path.lower().endswith('.xlsx'):
        pdf_to_excel(input_path, output_path)
    else:
        print("Hata: Desteklenmeyen format. Sadece .docx ve .xlsx")
        sys.exit(1)