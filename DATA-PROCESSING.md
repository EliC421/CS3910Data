# CSV Parsing and Data Processing Branch

This branch contains tools and scripts for processing Iowa government CSV data.

## Data Processing Workflow

1. **Download Data**
   - Download CSV files from Iowa.gov data portal
   - Place files in the `data/` directory

2. **Validate Data**
   - Run validation scripts to check data integrity
   - Verify required columns exist
   - Check for geographic coordinates

3. **Clean Data**
   - Remove duplicates
   - Handle missing values
   - Normalize formats

4. **Transform Data**
   - Extract geographic coordinates
   - Aggregate by county/region
   - Calculate statistics

5. **Export Data**
   - Generate processed files for visualization
   - Create JSON files for map display

## CSV File Requirements

### Liquor Sales Data
- Required columns: Location, County, Latitude, Longitude, Sales Amount
- Download from: [Iowa ABD Data](https://data.iowa.gov/)

### DUI Charges Data
- Required columns: County, Date, Latitude, Longitude, Charge Type
- Download from: Iowa criminal justice data portal

### Sex Offenders Registry
- Required columns: County, Latitude, Longitude, Offense Type
- **Note**: Handle sensitive data carefully, anonymize if needed

### Amber Alerts (Optional)
- Required columns: County, Date, Latitude, Longitude, Status

## Scripts

- `data-validator.js` - Validate CSV structure and content
- `geocode-helper.js` - Helper functions for geocoding addresses
- `correlation-analysis.js` - Calculate correlations between datasets

## Testing Data

Place small sample datasets in `data/samples/` for testing before processing full datasets.

## Notes for Eli

- Remember to add .csv files to .gitignore (already configured)
- Document any data transformations you make
- Keep track of data sources and update links
- Consider data privacy when working with sensitive datasets
