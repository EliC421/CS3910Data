# CSV Parsing and Data Processing Branch

This branch contains tools and scripts for processing Iowa government CSV data.

## Data Processing Workflow

1. **Download Data**
   - Download required CSV files and county geometry
   - Place files in the `data/` directory using project-standard names
   - Required for v1: crash CSV, county population CSV, county boundaries GeoJSON

2. **Validate Data**
   - Run validation scripts to check data integrity
   - Verify required columns exist
   - Check geographic coordinates and county-name consistency

3. **Clean Data**
   - Remove duplicates
   - Handle missing values
   - Normalize formats
   - Normalize county keys (case-insensitive, drop `County` suffix)

4. **Transform Data**
   - Extract geographic coordinates
   - Aggregate by county/region
   - Calculate statistics
   - Calculate population-normalized rates:
     - `ratePer100k = (countyTotal / countyPopulation) * 100000`

5. **Export Data**
   - Generate processed files for visualization
   - Create JSON files for map display

## CSV File Requirements

### Crash Data (Required)
- File: `Vehicle_Crashes_in_Iowa_20260307.csv`
- Required columns: `County Name`, `Date of Crash`, `Crash Severity`, `Number of Fatalities`, `Number of Injuries`, `Location`

### County Population Data (Required for normalization)
- File: `county-population.csv`
- Required columns: `County`, `Population`
- Optional columns: `Year`, `Source`

### County Boundaries (Required)
- File: `IowaCounties.geojson`
- Required geometry: county polygons with county name property

### DUI Charges Data (Recommended)
- File: `dui-charges.csv`
- Required columns: county field and count/incident field

### Liquor Sales Data (Recommended)
- File: `liquor-sales.csv`
- Required columns: county field and sales amount

### Incarceration Data (Recommended)
- File: `incarceration.csv`
- Required columns: county field and count metric

### Unemployment Data (Recommended)
- File: `unemployment-rate-by-county.csv`
- Required columns: `County` and either unemployment rate or unemployed/labor-force columns

### Income Data (Recommended)
- File: `median-household-income-by-county.csv`
- Required columns: `County`, median household income metric

### Restricted Datasets
- Sex offender and amber alert datasets can be access-restricted and may not support bulk download.
- If unavailable, do not block analysis; proceed with public county-level socioeconomic and justice datasets.

## Scripts

- `data-validator.js` - Validate CSV structure and content
- `geocode-helper.js` - Helper functions for geocoding addresses
- `correlation-analyzer.js` - Calculate correlations between datasets
- `data-processor.js` - CSV loading, aggregation, and population normalization helper

## Testing Data

Place small sample datasets in `data/samples/` for testing before processing full datasets.

## Notes for Eli

- Remember to add .csv files to .gitignore (already configured)
- Document any data transformations you make
- Keep track of data sources and update links
- Consider data privacy when working with sensitive datasets
- Prioritize finding a reliable county population source before adding more optional datasets
