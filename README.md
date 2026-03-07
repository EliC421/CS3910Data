# Iowa Data Visualization Project

A web application that visualizes Iowa government data using Google Maps API to display heat maps and show correlations between different datasets.

## Team Members
- **Vanessa Banks** - API Integration
- **Eli Chow** - Data Processing
- **Samsam Mohamed** - Front End

## Project Overview

This project visualizes correlations in Iowa data, including:
- Liquor sales & DUI charges
- Sex offenders & Amber Alerts (& incarceration data)
- Math and Reading Proficiency & Iowa PBS Services (stretch goal)

## Features

### Core Functionalities
- View maps with location data using Google Maps API
- Click to overlay maps to see correlations
- Location pins for specific data points
- Toggle controls to display/hide different data layers

### Stretch Goals
- View graphs of data below maps
- Advanced correlation analysis
- Interactive data filtering

## Project Structure

```
CS3910Data/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Main stylesheet (Flexbox & Grid layouts)
├── js/
│   ├── main.js            # Main application logic
│   ├── map.js             # Google Maps integration
│   └── data-processor.js  # CSV parsing and data processing
├── data/
│   └── README.md          # Data directory documentation
├── config.example.js      # Configuration template
└── .gitignore            # Git ignore rules
```

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/vbanks123/CS3910Data.git
   cd CS3910Data
   ```

2. Set up Google Maps API:
   - Copy `config.example.js` to `config.js`
   - Add your Google Maps API key
   - Don't commit `config.js` (it's in .gitignore)

3. Add data files:
   - Place CSV files from Iowa.gov in the `data/` directory
   - See `data/README.md` for required file formats

4. Open `index.html` in a web browser or use a local server

## Data Sources
- [Iowa Data Portal](https://data.iowa.gov/)

## Technologies
- HTML5 (Semantic elements)
- CSS3 (Flexbox & Grid layouts)
- Vanilla JavaScript
- Google Maps JavaScript API

## Hosting
TBD: GitHub Pages, Vercel, or AWS

## Communication
- Zoom meetings on weekends and as needed
- See project wireframe: [Link to wireframe]

## License
MIT