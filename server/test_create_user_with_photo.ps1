$photoData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
$body = @{
    username = "testuser_photo"
    fullNameEn = "Test User Photo"
    role = "BRANCH_USER"
    photoData = $photoData
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/users" -Method Post -Body $body -ContentType "application/json"
    Write-Host "User created successfully:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error creating user:"
    Write-Host $_.Exception.Response
}
