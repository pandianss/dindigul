$ErrorActionPreference = 'Stop'

$target = 'C:\Users\63039\Videos\Projects\dindigul\docs\Operational_Risk_Advisory_Reference.docx'
$tempRoot = Join-Path $env:TEMP ('op-risk-docx-' + [guid]::NewGuid().ToString())
$mediaDir = Join-Path $tempRoot 'word\media'
$logoSource = 'C:\Users\63039\Videos\Projects\dindigul\public\assets\dept_seal.png'

New-Item -ItemType Directory -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot 'docProps') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot 'word') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot 'word\_rels') | Out-Null
New-Item -ItemType Directory -Path $mediaDir | Out-Null

Copy-Item -LiteralPath $logoSource -Destination (Join-Path $mediaDir 'seal.png')

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@
Set-Content -LiteralPath (Join-Path $tempRoot '[Content_Types].xml') -Value $contentTypes -Encoding UTF8

$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@
Set-Content -LiteralPath (Join-Path $tempRoot '_rels\.rels') -Value $rootRels -Encoding UTF8

$coreProps = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Operational Risk Advisory Reference</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-04-10T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-04-10T00:00:00Z</dcterms:modified>
</cp:coreProperties>
'@
Set-Content -LiteralPath (Join-Path $tempRoot 'docProps\core.xml') -Value $coreProps -Encoding UTF8

$appProps = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>
'@
Set-Content -LiteralPath (Join-Path $tempRoot 'docProps\app.xml') -Value $appProps -Encoding UTF8

$docRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/seal.png"/>
</Relationships>
'@
Set-Content -LiteralPath (Join-Path $tempRoot 'word\_rels\document.xml.rels') -Value $docRels -Encoding UTF8

function Escape-Xml {
    param([string]$Text)
    return [System.Security.SecurityElement]::Escape($Text)
}

function New-TextRun {
    param(
        [string]$Text,
        [int]$Size = 22,
        [bool]$Bold = $false,
        [string]$Color = '000000'
    )
    $escaped = Escape-Xml $Text
    $boldTag = if ($Bold) { '<w:b/>' } else { '' }
    return "<w:r><w:rPr>$boldTag<w:color w:val=`"$Color`"/><w:sz w:val=`"$Size`"/><w:szCs w:val=`"$Size`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r>"
}

function New-Paragraph {
    param(
        [string]$Text,
        [string]$Align = 'left',
        [bool]$Bold = $false,
        [int]$Size = 22,
        [string]$Color = '000000',
        [int]$After = 100
    )

    $jc = switch ($Align) {
        'center' { '<w:jc w:val="center"/>' }
        'right' { '<w:jc w:val="right"/>' }
        default { '<w:jc w:val="left"/>' }
    }

    return @"
<w:p>
  <w:pPr>$jc<w:spacing w:after="$After"/></w:pPr>
  $(New-TextRun -Text $Text -Size $Size -Bold $Bold -Color $Color)
</w:p>
"@
}

function New-ImageParagraph {
    param(
        [string]$RelationshipId,
        [int]$WidthEmu = 700000,
        [int]$HeightEmu = 700000
    )

    return @"
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="$WidthEmu" cy="$HeightEmu"/>
        <wp:docPr id="1" name="Department Seal"/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="Department Seal"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="$RelationshipId"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="$WidthEmu" cy="$HeightEmu"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"@
}

function New-Separator {
    param([string]$Color = '21357F')
    return @"
<w:p>
  <w:pPr>
    <w:spacing w:before="60" w:after="60"/>
    <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="$Color"/></w:pBdr>
  </w:pPr>
</w:p>
"@
}

function New-Cell {
    param(
        [string]$InnerXml,
        [int]$Width,
        [string]$Shading = '',
        [string]$Align = 'left'
    )
    $jc = switch ($Align) {
        'center' { '<w:jc w:val="center"/>' }
        'right' { '<w:jc w:val="right"/>' }
        default { '<w:jc w:val="left"/>' }
    }
    $shd = if ($Shading) { "<w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"$Shading`"/>" } else { '' }
    return @"
<w:tc>
  <w:tcPr>
    <w:tcW w:w="$Width" w:type="dxa"/>
    $shd
  </w:tcPr>
  <w:p>
    <w:pPr>$jc<w:spacing w:after="80"/></w:pPr>
    $InnerXml
  </w:p>
</w:tc>
"@
}

function New-Row {
    param([string[]]$Cells)
    return "<w:tr>$($Cells -join '')</w:tr>"
}

function New-Table {
    param([string[]]$Rows)
    return @"
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="nil"/>
      <w:left w:val="nil"/>
      <w:bottom w:val="nil"/>
      <w:right w:val="nil"/>
      <w:insideH w:val="nil"/>
      <w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="2400"/>
    <w:gridCol w:w="7200"/>
  </w:tblGrid>
  $($Rows -join "`n")
</w:tbl>
"@
}

$refDateTable = @"
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="nil"/>
      <w:left w:val="nil"/>
      <w:bottom w:val="nil"/>
      <w:right w:val="nil"/>
      <w:insideH w:val="nil"/>
      <w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="5400"/>
    <w:gridCol w:w="4200"/>
  </w:tblGrid>
  <w:tr>
    $(New-Cell -Width 5400 -Align 'left' -InnerXml ((New-TextRun -Text "Ref No: RO/PLNG/OPR/2026/04/54" -Size 21 -Bold $true -Color '21357F')))
    $(New-Cell -Width 4200 -Align 'right' -InnerXml ((New-TextRun -Text "दिनांक / தேதி / Date: 10.04.2026" -Size 21 -Bold $true -Color '21357F')))
  </w:tr>
</w:tbl>
"@

$tablePlaceholder = @"
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9600" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:left w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:bottom w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:right w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:insideH w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
      <w:insideV w:val="single" w:sz="8" w:space="0" w:color="D1D5DB"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tr>
    <w:tc>
      <w:tcPr><w:tcW w:w="9600" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="180" w:after="180"/></w:pPr>
        $(New-TextRun -Text '[EXCEPTION_TABLE / MOVEMENT_TABLE TO BE INSERTED HERE]' -Size 22 -Bold $true -Color '64748B')
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>
"@

$headerRows = @(
    (New-Row -Cells @(
        (New-Cell -Width 2400 -Align 'center' -InnerXml @"
$(New-TextRun -Text '' -Size 1)
<w:r>
  <w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="700000" cy="700000"/>
      <wp:docPr id="2" name="Seal"/>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="0" name="Seal"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="rIdLogo"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="700000" cy="700000"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>
</w:r>
"@),
        (New-Cell -Width 7200 -Align 'center' -InnerXml (
            (New-TextRun -Text 'इंडियन ओवरसीज बैंक' -Size 24 -Bold $true -Color '21357F') +
            (New-TextRun -Text ' இந்தியன் ஓவர்சீஸ் வங்கி' -Size 22 -Bold $true -Color '21357F') +
            (New-TextRun -Text ' Indian Overseas Bank' -Size 24 -Bold $true -Color '21357F')
        ))
    )),
    (New-Row -Cells @(
        (New-Cell -Width 2400 -Align 'left' -InnerXml (New-TextRun -Text '' -Size 1)),
        (New-Cell -Width 7200 -Align 'center' -InnerXml (
            (New-TextRun -Text 'क्षेत्रीय कार्यालय, डिंडीगुल' -Size 20 -Bold $true -Color '374151') +
            (New-TextRun -Text ' | மண்டல அலுவலகம், திண்டுக்கல்' -Size 20 -Bold $true -Color '374151') +
            (New-TextRun -Text ' | Regional Office, Dindigul' -Size 20 -Bold $true -Color '374151')
        ))
    )),
    (New-Row -Cells @(
        (New-Cell -Width 2400 -Align 'left' -InnerXml (New-TextRun -Text '' -Size 1)),
        (New-Cell -Width 7200 -Align 'center' -InnerXml (
            (New-TextRun -Text 'Pensioner Street, Dindigul - 624001 | Phone: 0451-2405195 / 198 | Email: 3933ro@iob.bank.in' -Size 18 -Bold $false -Color '64748B')
        ))
    ))
)

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    $(New-Table -Rows $headerRows)
    $(New-Separator -Color '21357F')
    $refDateTable
    $(New-Paragraph -Text 'To,' -Size 22 -Bold $false -Color '111827' -After 60)
    $(New-Paragraph -Text 'Shri. Dileep G' -Size 22 -Bold $true -Color '111827' -After 60)
    $(New-Paragraph -Text 'Senior Manager - I Line' -Size 22 -Bold $true -Color '111827' -After 60)
    $(New-Paragraph -Text 'Indian Overseas Bank' -Size 22 -Bold $false -Color '111827' -After 60)
    $(New-Paragraph -Text 'Theni Allinagaram [0174]' -Size 22 -Bold $true -Color '111827' -After 160)
    $(New-Paragraph -Text 'OPERATIONAL RISK ADVISORY - 09.04.2026 - 0174' -Align 'center' -Size 24 -Bold $true -Color '111827' -After 180)
    $(New-Paragraph -Text 'Dear Sir/Madam,' -Size 22 -Bold $true -Color '111827' -After 120)
    $(New-Paragraph -Text 'During the operational risk review for 09.04.2026, the Risk Monitoring System has flagged 3 open exceptions pertaining to Theni Allinagaram Branch. The observations are reproduced below for immediate attention.' -Size 22 -Color '111827' -After 140)
    $tablePlaceholder
    $(New-Paragraph -Text 'In addition, a review of the recent business movement of the branch indicates the following trend position:' -Size 22 -Color '111827' -After 140)
    $tablePlaceholder
    $(New-Paragraph -Text 'The above exceptions require immediate verification at the branch level. You are advised to review the root cause of each observation, complete the necessary control rectification, and strengthen branch-level monitoring so that recurrence is avoided.' -Size 22 -Color '111827' -After 140)
    $(New-Paragraph -Text 'As Senior Manager, you may ensure that the observations are diarised, tracked to closure, and discussed with the concerned officials. This communication is issued for your information and corrective action.' -Size 22 -Color '111827' -After 220)
    $(New-Paragraph -Text 'Yours faithfully,' -Size 22 -Color '111827' -After 80)
    $(New-Paragraph -Text 'Authorized Signatory' -Size 22 -Bold $true -Color '111827' -After 60)
    $(New-Paragraph -Text 'Regional Office, Dindigul' -Size 22 -Color '111827' -After 140)
    $(New-Paragraph -Text 'Reference note: this .docx is a formatted document sample for the existing operational risk letter structure.' -Size 18 -Color '64748B' -After 80)
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@
Set-Content -LiteralPath (Join-Path $tempRoot 'word\document.xml') -Value $documentXml -Encoding UTF8

if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Force
}

$zipPath = [System.IO.Path]::ChangeExtension($target, '.zip')
if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $tempRoot '*') -DestinationPath $zipPath
Move-Item -LiteralPath $zipPath -Destination $target
Remove-Item -LiteralPath $tempRoot -Recurse -Force

Write-Output $target
