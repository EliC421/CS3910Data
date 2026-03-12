# Test script for crash data analysis
Write-Host "Iowa Vehicle Crash Data Analyzer" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Load the CSV (first 10,000 rows for testing)
Write-Host "Loading crash data..." -ForegroundColor Yellow
$crashes = Import-Csv "data\Vehicle_Crashes_in_Iowa_20260307.csv" | Select-Object -First 10000

Write-Host "Loaded $($crashes.Count) crash records" -ForegroundColor Green
Write-Host ""

# Summary Statistics
Write-Host "=== SUMMARY STATISTICS ===" -ForegroundColor Cyan

$totalCrashes = $crashes.Count
$crashesWithLocation = ($crashes | Where-Object { $_.'Location' -and $_.'Location' -notmatch 'N/A' }).Count
$fatalCrashes = ($crashes | Where-Object { [int]$_.'Number of Fatalities' -gt 0 }).Count
$totalFatalities = ($crashes | Measure-Object -Property 'Number of Fatalities' -Sum).Sum
$totalInjuries = ($crashes | Measure-Object -Property 'Number of Injuries' -Sum).Sum
$alcoholRelated = ($crashes | Where-Object { $_.'Drug or Alcohol ' -and $_.'Drug or Alcohol ' -ne 'None Indicated' }).Count
$propertyDamageOnly = ($crashes | Where-Object { $_.'Crash Severity' -eq 'Property Damage Only' }).Count

Write-Host "Total Crashes:           $totalCrashes"
Write-Host "With Location Data:      $crashesWithLocation ($([math]::Round($crashesWithLocation/$totalCrashes*100, 1))%)"
Write-Host "Fatal Crashes:           $fatalCrashes"
Write-Host "Total Fatalities:        $totalFatalities"
Write-Host "Total Injuries:          $totalInjuries"
Write-Host "Alcohol/Drug Related:    $alcoholRelated ($([math]::Round($alcoholRelated/$totalCrashes*100, 1))%)"
Write-Host "Property Damage Only:    $propertyDamageOnly"
Write-Host ""

# Top Counties
Write-Host "=== TOP 10 COUNTIES BY CRASH COUNT ===" -ForegroundColor Cyan
$crashes | Group-Object 'County Name' | 
    Sort-Object Count -Descending | 
    Select-Object -First 10 | 
    ForEach-Object {
        $county = $_.Name
        $count = $_.Count
        $countyFatalities = ($_.Group | Measure-Object -Property 'Number of Fatalities' -Sum).Sum
        $countyInjuries = ($_.Group | Measure-Object -Property 'Number of Injuries' -Sum).Sum
        Write-Host "$county : $count crashes ($countyFatalities fatalities, $countyInjuries injuries)"
    }
Write-Host ""

# Sample crash records
Write-Host "=== SAMPLE CRASH RECORDS ===" -ForegroundColor Cyan
$crashes | Select-Object -First 3 | ForEach-Object {
    Write-Host "Case: $($_.'Iowa DOT Case Number')"
    Write-Host "  Date: $($_.'Date of Crash') $($_.'Time of Crash')"
    Write-Host "  County: $($_.'County Name') | City: $($_.'City Name')"
    Write-Host "  Severity: $($_.'Crash Severity')"
    Write-Host "  Fatalities: $($_.'Number of Fatalities') | Injuries: $($_.'Number of Injuries')"
    Write-Host "  Alcohol/Drug: $($_.'Drug or Alcohol ')"
    Write-Host "  Location: $($_.'Location')"
    Write-Host ""
}

# Extract coordinates from a few records
Write-Host "=== GEOGRAPHIC DATA TEST ===" -ForegroundColor Cyan
$sampleWithCoords = $crashes | Where-Object { $_.'Location' -match 'POINT' } | Select-Object -First 5

Write-Host "Found $($sampleWithCoords.Count) records with coordinates in sample:"
$sampleWithCoords | ForEach-Object {
    if ($_.'Location' -match 'POINT \(([^ ]+) ([^ )]+)\)') {
        $lng = $matches[1]
        $lat = $matches[2]
        Write-Host "  $($_.'County Name'): ($lat, $lng)"
    }
}
Write-Host ""

Write-Host "Analysis complete!" -ForegroundColor Green
