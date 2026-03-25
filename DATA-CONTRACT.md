Data Contract for Multi-Layer Map Feature

## Datasets Available

### 1. Crashes
- **File**: crash_county_year.csv
- **Metric field**: impaired_crashes (raw count) → impaired_crashes_per_100k (normalized)
- **Years available**: 2014–2025
- **Coverage**: ~99 counties
- **Units**: absolute count vs. rate per 100,000 population
- **Year availability**: 2020 recommended as midpoint

### 2. Median Household Income
- **File**: income_county_year.csv
- **Metric field**: median_household_income
- **Years available**: 2012–2023
- **Coverage**: ~99 counties
- **Units**: USD
- **Normalization**: N/A (already a county-level metric)
- **Year availability**: 2020 ✓ (within range)

### 3. Liquor Sales
- **File**: liquor_county_year.csv
- **Metric fields**: liquor_sale_dollars (raw) → liquor_dollars_per_100k (normalized)
- **Years available**: 2025–2026 (SPARSE)
- **Coverage**: ~99 counties
- **Units**: absolute dollars vs. per capita rate
- **Normalization**: count-based (dollars per 100k pop)
- **CAUTION**: Limited timeframe, mark as "limited data"

### 4. Population
- **File**: population_county_year.csv
- **Metric field**: population (absolute population count)
- **Years available**: 1990–2024
- **Coverage**: ~99 counties
- **Units**: absolute count
- **Normalization**: N/A (cannot normalize count data further)
- **Note**: Used as denominator for per-100k calculations

### 5. Probation / OWI
- **File**: probation_owi_county_year.csv
- **Metric fields**: owi_reincarcerated (raw) → owi_probation_per_100k (normalized)
- **Years available**: 2016–2022
- **Coverage**: ~100 counties
- **Units**: absolute count vs. per 100k population
- **Normalization**: rate-based

### 6. Unemployment
- **File**: unemployment_county_year.csv
- **Metric field**: unemployment_rate (already a rate)
- **Years available**: 2000–2025
- **Coverage**: ~99 counties
- **Units**: percentage (%)
- **Normalization**: N/A (already normalized)
- **Note**: Widest historical range

### 7. Master Normalized Dataset
- **File**: county_year_normalized.csv
- **Contains**: Aggregated values from all individual datasets
- **Years available**: 2000–2026
- **Use case**: Reference/validation only; prefer individual files for clarity

## Recommended Year Default

**2020** — intersection year where all major datasets (crash, income, unemployment, probation OWI) have data.

## Year × Dataset Availability Summary

| Year | Normalized | Crashes | Income | Liquor | Population | Probation | Unemployment |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 2000 | ✓ |   |   |   | ✓ |   | ✓ |
| 2005 | ✓ |   |   |   | ✓ |   | ✓ |
| 2010 | ✓ |   |   |   | ✓ |   | ✓ |
| 2015 | ✓ | ✓ | ✓ |   | ✓ |   | ✓ |
| 2020 | ✓ | ✓ | ✓ |   | ✓ | ✓ | ✓ |
| 2025 | ✓ | ✓ |   | ✓ | ✓ |   | ✓ |

**Legend**: ✓ = data available

## Metric Definitions & Handling

### Per-100k Normalized Metrics (allow toggle)
- **impaired_crashes_per_100k**: number of impaired crashes per 100,000 population
  - Raw alternative: impaired_crashes (absolute count)
  - Formula: (total / county_population) × 100,000
  
- **liquor_dollars_per_100k**: liquor sales dollars per 100,000 population
  - Raw alternative: liquor_sale_dollars (absolute dollars)
  - Formula: (total / county_population) × 100,000

- **owi_probation_per_100k**: OWI probation cases per 100,000 population
  - Raw alternative: owi_cases (absolute count)
  - Formula: (total / county_population) × 100,000

### Already-Normalized Metrics (no toggle needed)
- **unemployment_rate**: percentage (%), no per-capita normalization needed
- **median_household_income**: USD per household, county-level metric already

### Raw Metrics (no normalization applicable)
- **population**: absolute population count
- **total_crashes**: absolute crash count

## UI Implications

1. **Layer toggles**: Show checkbox for each available dataset (parameterized by year)
2. **Normalized/Raw toggle**: Only active when layer has both forms (3 layers only)
3. **Year selector**: Dropdown showing available years; disable years where <2 datasets available
4. **Legend**: Update dynamically per selected category + normalized/raw state
5. **Missing data handling**: Use null-safe comparisons; color code missing counties as grey
6. **Sparse datasets**: Mark liquor sales as "⚠ Limited Data (2025+)" in layer label

## Frontend Loading & Caching Strategy

- PreLoad all 7 CSV files at app init (static frontend approach confirmed)
- Parse to in-memory lookup: `metric[year][county] = value`
- Cache normalized rates on demand or at init
- For year/dataset combo with no data: return `null` (not 0)
