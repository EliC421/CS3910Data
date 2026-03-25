/**
 * App State Manager for Multi-Layer Map Feature
 * 
 * Manages:
 * - Active year
 * - Visible layers (which metrics are toggled on)
 * - Normalized vs. Raw mode per layer
 * - Selected county (for details view)
 * - Correlation computation state
 */

class AppStateManager {
  constructor() {
    // Year selector
    this.activeYear = 2020; // default year with best data coverage
    
    // Layer visibility & normalization mode
    // Structure: { layerId: { visible: bool, normalized: bool } }
    this.layerStates = {
      crashes: { visible: true, normalized: true },
      income: { visible: true, normalized: false }, // income has no raw/normalized distinction
      liquor: { visible: false, normalized: true },
      population: { visible: false, normalized: false },
      unemployment: { visible: false, normalized: false },
      probationOWI: { visible: false, normalized: true }
    };
    
    // Metadata about each layer (units, available years, etc.)
    this.layerMetadata = {
      crashes: {
        label: 'Impaired Crashes',
        file: 'crash_county_year.csv',
        normalizedField: 'impaired_crashes_per_100k',
        rawField: 'impaired_crashes',
        supportsNormalize: true,
        normalizedUnit: 'per 100k',
        rawUnit: 'count',
        yearsAvailable: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
        color: '#dc2626' // red
      },
      income: {
        label: 'Median Household Income',
        file: 'income_county_year.csv',
        normalizedField: 'median_household_income',
        rawField: null, // no raw alternative
        supportsNormalize: false,
        unit: 'USD',
        yearsAvailable: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
        color: '#2ecc71' // green
      },
      liquor: {
        label: 'Liquor Sales ⚠',
        file: 'liquor_county_year.csv',
        normalizedField: 'liquor_dollars_per_100k',
        rawField: 'liquor_sale_dollars',
        supportsNormalize: true,
        normalizedUnit: 'per 100k',
        rawUnit: 'dollars',
        yearsAvailable: [2025, 2026],
        color: '#f39c12', // orange
        note: 'Limited data (2025+)'
      },
      population: {
        label: 'Population',
        file: 'population_county_year.csv',
        normalizedField: 'population',
        rawField: null,
        supportsNormalize: false,
        unit: 'count',
        yearsAvailable: [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
        color: '#3498db' // blue
      },
      unemployment: {
        label: 'Unemployment Rate',
        file: 'unemployment_county_year.csv',
        normalizedField: 'unemployment_rate',
        rawField: null,
        supportsNormalize: false,
        unit: '%',
        yearsAvailable: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
        color: '#9b59b6' // purple
      },
      probationOWI: {
        label: 'OWI Probation Cases',
        file: 'probation_owi_county_year.csv',
        normalizedField: 'owi_probation_per_100k',
        rawField: 'owi_cases',
        supportsNormalize: true,
        normalizedUnit: 'per 100k',
        rawUnit: 'count',
        yearsAvailable: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
        color: '#1abc9c' // teal
      }
    };
    
    // Selected county for details view
    this.selectedCounty = null;
    
    // Correlation state (for when user selects 2 layers)
    this.correlationState = {
      computed: false,
      layer1Id: null,
      layer2Id: null,
      r: null, // Pearson correlation coefficient
      n: null, // sample size
      missing: null // count of missing pairs
    };
  }
  
  /**
   * Get all visible layer IDs
   */
  getVisibleLayers() {
    return Object.keys(this.layerStates).filter(
      id => this.layerStates[id].visible
    );
  }
  
  /**
   * Get count of visible layers
   */
  getVisibleLayerCount() {
    return this.getVisibleLayers().length;
  }
  
  /**
   * Toggle layer visibility
   */
  toggleLayer(layerId) {
    if (this.layerStates[layerId]) {
      this.layerStates[layerId].visible = !this.layerStates[layerId].visible;
      return true;
    }
    return false;
  }
  
  /**
   * Toggle normalized/raw mode for a layer
   */
  toggleNormalized(layerId) {
    if (this.layerStates[layerId] && this.layerMetadata[layerId].supportsNormalize) {
      this.layerStates[layerId].normalized = !this.layerStates[layerId].normalized;
      return true;
    }
    return false;
  }
  
  /**
   * Set active year
   */
  setActiveYear(year) {
    this.activeYear = year;
  }
  
  /**
   * Get metric field name for a layer given normalization mode
   */
  getMetricField(layerId) {
    if (!this.layerMetadata[layerId]) return null;
    const metadata = this.layerMetadata[layerId];
    const isNormalized = this.layerStates[layerId].normalized;
    
    if (isNormalized && metadata.normalizedField) {
      return metadata.normalizedField;
    }
    
    return metadata.rawField || metadata.normalizedField;
  }
  
  /**
   * Get unit label for a layer given normalization mode
   */
  getUnitLabel(layerId) {
    if (!this.layerMetadata[layerId]) return '';
    const metadata = this.layerMetadata[layerId];
    const isNormalized = this.layerStates[layerId].normalized;
    
    if (isNormalized) {
      return metadata.normalizedUnit || metadata.unit;
    } else {
      return metadata.rawUnit || metadata.unit;
    }
  }
  
  /**
   * Check if a layer has data for the active year
   */
  hasDataForYear(layerId) {
    if (!this.layerMetadata[layerId]) return false;
    return this.layerMetadata[layerId].yearsAvailable.includes(this.activeYear);
  }
  
  /**
   * Get layers available for the active year
   */
  getAvailableLayers() {
    return Object.keys(this.layerMetadata).filter(
      id => this.hasDataForYear(id)
    );
  }
  
  /**
   * Get all layers (union of all years)
   */
  getAllLayers() {
    return Object.keys(this.layerMetadata);
  }
  
  /**
   * Select a county for details view
   */
  selectCounty(countyName) {
    this.selectedCounty = countyName;
  }
  
  /**
   * Clear county selection
   */
  clearCountySelection() {
    this.selectedCounty = null;
  }
  
  /**
   * Compute correlation between two visible layers
   * This will be called after data is loaded
   */
  setCorrelation(layer1Id, layer2Id, r, n, missing) {
    this.correlationState = {
      computed: true,
      layer1Id,
      layer2Id,
      r,
      n,
      missing
    };
  }
  
  /**
   * Clear correlation state
   */
  clearCorrelation() {
    this.correlationState = {
      computed: false,
      layer1Id: null,
      layer2Id: null,
      r: null,
      n: null,
      missing: null
    };
  }
  
  /**
   * Get a summary of current state (useful for debugging)
   */
  getSummary() {
    return {
      activeYear: this.activeYear,
      visibleLayers: this.getVisibleLayers(),
      visibleCount: this.getVisibleLayerCount(),
      selectedCounty: this.selectedCounty,
      correlationComputed: this.correlationState.computed,
      availableLayers: this.getAvailableLayers()
    };
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppStateManager;
}
