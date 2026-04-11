import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r'C:\Users\63039\Videos\Projects\dindigul\CONSOLIDATED MONTHLY REPORT LIST (002).docx'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

try:
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        texts = []
        for p in root.findall('.//w:p', ns):
            p_text = "".join([t.text for t in p.findall('.//w:t', ns) if t.text])
            if p_text:
                texts.append(p_text)
        
        output_path = r'C:\Users\63039\Videos\Projects\dindigul\scratch\extracted_content.txt'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(texts))
        print(f"Successfully extracted {len(texts)} paragraphs to {output_path}")
except Exception as e:
    print(f"Error: {e}")
