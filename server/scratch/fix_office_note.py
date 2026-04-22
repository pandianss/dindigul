import os

file_path = r"c:\Users\63039\Videos\Projects\dindigul\server\src\routes\officeNote.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the corruption point
# The corruption looks like it's around "sealY: content.sealY" followed immediately by "if (period == 'weekly')"
for i, line in enumerate(lines):
    if "sealY: content.sealY" in line:
        print(f"Found corruption at line {i+1}")
        # Check if next line is the "if (period == 'weekly')"
        if i + 1 < len(lines) and "if (period === 'weekly') {" in lines[i+1]:
             # We found it.
             # Now we need to insert the missing parts.
             missing = [
                 "            },\n",
                 "            hideHeader: ['RBI_BO_PROFORMA'].includes(note.type),\n",
                 "            hideMeta: ['RBI_BO_PROFORMA'].includes(note.type),\n",
                 "            hideTitle: ['RBI_BO_PROFORMA'].includes(note.type),\n",
                 "            hideApprovedStatus: note.type === 'MICR_CODE_REQUEST'\n",
                 "        });\n",
                 "\n",
                 "        const pdfBuffer = await PDFRenderer.generate(html, { refNo });\n",
                 "\n",
                 "        res.contentType('application/pdf');\n",
                 "        res.setHeader('Content-Disposition', f'attachment; filename=\"OfficeNote_{{note.id.slice(-4)}}.pdf\"');\n",
                 "        res.send(pdfBuffer);\n",
                 "    } catch (error: any) {\n",
                 "        logger.error('Error generating PDF:', error);\n",
                 "        res.status(500).json({ error: 'Failed to generate PDF' });\n",
                 "    }\n",
                 "});\n",
                 "\n",
                 "// Get summary of High Value DD notes (Weekly/Monthly)\n",
                 "router.get('/high-value-dd/summary', authenticateToken, async (req: any, res) => {\n",
                 "    const { period, date } = req.query; // 'weekly' or 'monthly'\n",
                 "    const referenceDate = date ? new Date(date as string) : new Date();\n",
                 "\n",
                 "    let startDate, endDate;\n"
             ]
             # Replace the corrupted line and insert missing
             # Wait, the corrupted line is "sealY: content.sealY" but it might be missing the closing brace etc.
             # Actually, let's just insert after it.
             new_lines = lines[:i+1] + missing + lines[i+1:]
             with open(file_path, 'w', encoding='utf-8') as f2:
                 f2.writelines(new_lines)
             print("Fixed!")
             break
