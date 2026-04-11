$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open('C:\Users\63039\Videos\Projects\dindigul\CONSOLIDATED MONTHLY REPORT LIST.doc')
    $doc.Content.Text | Out-File 'C:\Users\63039\Videos\Projects\dindigul\consolidated_monthly_report_extract.txt'
    $doc.Close()
} catch {
    $_.Exception.Message
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
