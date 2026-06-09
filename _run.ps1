$base = "C:\Users\admin\Desktop\xiangmu\duihua"
$html = Get-Content "$base\_sg.txt" -Raw
[System.IO.File]::WriteAllText("$base\savings-goal-calculator.html", $html, [System.Text.UTF8Encoding]::new($false))
Write-Output "Savings Goal written: $($html.Length) chars"