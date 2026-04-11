Set objWord = CreateObject("Word.Application")
Set objDoc = objWord.Documents.Open("C:\Users\63039\Videos\Projects\dindigul\mis_files\MICR Code Request format Karuppayurani.doc")
WScript.Echo objDoc.Content.Text
objDoc.Close False
objWord.Quit
