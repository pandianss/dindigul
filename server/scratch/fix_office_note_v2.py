import os

file_path = r"c:\Users\63039\Videos\Projects\dindigul\server\src\routes\officeNote.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the end of the signatoryTitleTa line
start_idx = -1
for i, line in enumerate(lines):
    if "signatoryTitleTa: sigTitleTa," in line:
        start_idx = i
        break

# Find the start of the notes = await prisma.officeNote.findMany line
end_idx = -1
for i, line in enumerate(lines):
    if "const notes = await prisma.officeNote.findMany({" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Fixing from {start_idx+1} to {end_idx+1}")
    
    restored = [
        "            organization: RO_DATA,\n",
        "            isAdvisory: false,\n",
        "            deptSealSrc,\n",
        "            orgMeta: {\n",
        "                sealX: content.sealX,\n",
        "                sealY: content.sealY\n",
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
        "        res.setHeader('Content-Disposition', `attachment; filename=\"OfficeNote_${note.id.slice(-4)}.pdf\"`);\n",
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
        "    let startDate, endDate;\n",
        "    if (period === 'weekly') {\n",
        "        startDate = new Date(referenceDate);\n",
        "        startDate.setDate(referenceDate.getDate() - referenceDate.getDay() + 1);\n",
        "        endDate = new Date(startDate);\n",
        "        endDate.setDate(startDate.getDate() + 6);\n",
        "    } else {\n",
        "        startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);\n",
        "        endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);\n",
        "    }\n",
        "\n",
        "    try {\n"
    ]
    
    new_lines = lines[:start_idx+1] + restored + lines[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f2:
        f2.writelines(new_lines)
    print("Fixed!")
else:
    print(f"Not found. Start: {start_idx}, End: {end_idx}")
