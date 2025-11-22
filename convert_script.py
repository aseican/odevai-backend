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
        all_tables = []
        
        # 1. YÖNTEM: Tablo Arama
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Tablodaki None değerleri temizle
                        cleaned_table = [['' if item is None else item for item in row] for row in table]
                        df = pd.DataFrame(cleaned_table[1:], columns=cleaned_table[0])
                        all_tables.append(df)
        
        # Eğer tablo bulunduysa onları yaz
        if all_tables:
            with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
                for i, df in enumerate(all_tables):
                    sheet_name = f"Tablo_{i+1}"
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"Basarili: {excel_file} (Tablo Modu)")
            return

        # 2. YÖNTEM: Tablo Yoksa Düz Metni Al (Fallback)
        print("Bilgi: Tablo bulunamadi, düz metin moduna geciliyor...")
        all_text_data = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    # Her satırı bir Excel satırı yap
                    lines = text.split('\n')
                    for line in lines:
                        all_text_data.append([line])
        
        if not all_text_data:
            print("Hata: PDF bos veya okunamadi.")
            sys.exit(1)

        # Metni Excel'e dök
        df = pd.DataFrame(all_text_data, columns=["PDF İçeriği"])
        df.to_excel(excel_file, index=False, sheet_name="Metin_Icerik")
        print(f"Basarili: {excel_file} (Metin Modu)")

    except Exception as e:
        print(f"Hata (Excel): {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Türkçe karakter sorununu çözmek için (Linux/Windows uyumlu)
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print("Kullanim: python convert_script.py <input_pdf> <output_file>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if output_path.lower().endswith('.docx'):
        pdf_to_word(input_path, output_path)
    elif output_path.lower().endswith('.xlsx'):
        pdf_to_excel(input_path, output_path)
    else:
        print("Hata: Desteklenmeyen format.")
        sys.exit(1)