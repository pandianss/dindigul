$word = New-Object -ComObject Word.Application
$doc = $word.Documents.Open('C:\Users\63039\Videos\Projects\dindigul\mis_files\MICR Code Request format Karuppayurani.doc')
$doc.Content.Text | Out-File 'C:\Users\63039\Videos\Projects\dindigul\micr_extract.txt'
$word.Quit()
