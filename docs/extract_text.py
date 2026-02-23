import xml.etree.ElementTree as ET
import sys

def extract_text(xml_path, output_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # XML namespaces in docx
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        }
        
        # Find all <w:t> elements which contain text
        texts = root.findall('.//w:t', namespaces)
        
        full_text = []
        for text in texts:
            if text.text:
                full_text.append(text.text)
        
        content = "".join(full_text)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully extracted text to {output_path}"
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_text.py <path_to_xml> <output_txt_path>")
    else:
        print(extract_text(sys.argv[1], sys.argv[2]))
