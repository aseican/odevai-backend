import sys
import os
from pdf2docx import Converter

# Node.js'den gelen dosya yollarını alıyoruz
pdf_file = sys.argv[1]
docx_file = sys.argv[2]

try:
    # Dönüştürme işlemi
    cv = Converter(pdf_file)
    # start=0, end=None (tüm sayfalar)
    cv.convert(docx_file, start=0, end=None)
    cv.close()
    print("BASARILI")
except Exception as e:
    print(f"HATA: {str(e)}")
    sys.exit(1)