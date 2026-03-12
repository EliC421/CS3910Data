# Data Directory

This directory stores raw and processed datasets for Iowa correlation analysis.

## Dataset Priority (Collect These First)

### Required for v1 analysis
- `Vehicle_Crashes_in_Iowa_20260307.csv`
	- Purpose: base crash counts and severity by county
	- Current status: present
	- Required fields used in code: `County Name`, `Date of Crash`, `Crash Severity`, `Number of Fatalities`, `Number of Injuries`, `Location`
- `county-population.csv`
	- Purpose: normalize crash totals to rates per 100,000 residents
	- Required fields: `County`, `Population`
	- Notes: use a single year snapshot that matches crash year range as closely as possible
- `IowaCounties.geojson`
	- Purpose: county geometry for choropleth/overlay mapping
	- Current status: present

### Recommended next
- `dui-charges.csv`
	- Purpose: crash vs DUI correlation by county
	- Required fields: `County`, count field (`Charges` or equivalent), optional date field
- `liquor-sales.csv`
	- Purpose: crash vs alcohol sales correlation by county
	- Required fields: county field and sales amount field
- `incarceration.csv`
	- Purpose: justice-system comparison (optional for v1)
	- Required fields: county field and inmate/count metric
- `unemployment-rate-by-county.csv`
	- Purpose: socioeconomic control variable for crash-rate comparisons
	- Required fields: `County`, unemployment rate field (or unemployed + labor force)
- `median-household-income-by-county.csv`
	- Purpose: socioeconomic control variable for county-level correlations
	- Required fields: `County`, median household income field

### Optional later
- `school-proficiency.csv`
- `traffic-citations.csv`
- `hospital-trauma-admissions.csv`

## Restricted Data Note

Some datasets may be restricted or not downloadable in bulk (for example, sex offender records or amber alert case data).
When this happens, use county-level public aggregates instead of case-level sensitive data.

## File Naming Standard

Use these exact filenames so app loading works without code changes:

- `Vehicle_Crashes_in_Iowa_20260307.csv`
- `county-population.csv`
- `dui-charges.csv`
- `liquor-sales.csv`
- `incarceration.csv`
- `unemployment-rate-by-county.csv`
- `median-household-income-by-county.csv`
- `IowaCounties.geojson`

## Normalization Rule

County-level rates should use:

- `ratePer100k = (countyTotal / countyPopulation) * 100000`

Join key for county names should be normalized case-insensitively and without the `County` suffix.

## Data Source Tracking

Record source URL and extract date here when each file is added:

- `Vehicle_Crashes_in_Iowa_20260307.csv`: Iowa DOT / Iowa Data Portal (extract date: 2026-03-07)
- `county-population.csv`: TODO
- `dui-charges.csv`: TODO
- `liquor-sales.csv`: TODO
- `incarceration.csv`: TODO
- `unemployment-rate-by-county.csv`: TODO
- `median-household-income-by-county.csv`: TODO
