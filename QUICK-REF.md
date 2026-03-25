# Quick Reference: Multi-Layer Map Feature Development

**Current Branch**: `feature/multi-layer-map`

## Files Created This Session

```
CS3910Data/
├── verify-schemas.js           → Run to inspect all CSV schemas
├── audit-data-readiness.js     → Run to see year availability matrix  
├── DATA-CONTRACT.md            → Frontend spec (READ THIS FIRST)
├── js/app-state.js             → State manager (import in main.js)
└── SESSION-SUMMARY.md          → Detailed next steps
```

## Run These Commands to Get Oriented

```bash
# See data audit (shows which datasets have data for each year)
node audit-data-readiness.js

# Verify all CSV schemas are consistent
node verify-schemas.js

# Check git log on feature branch
git log --oneline feature/multi-layer-map
```

## Key Takeaway from Data Audit

- **Best default year**: 2020 (all major datasets have data)
- **Crashes + Income**: Good pair for correlation (2012+)
- **Unemployment + Crashes**: Widest range (2000+)
- **Liquor sales**: SPARSE (2025-2026 only)

## What's Ready to Use

1. **AppStateManager class** (js/app-state.js):
   ```javascript
   const appState = new AppStateManager();
   appState.toggleLayer('crashes');
   appState.setActiveYear(2020);
   appState.getVisibleLayers(); // ['crashes', 'income']
   ```

2. **Layer metadata** (built into AppStateManager):
   - yearsAvailable per dataset
   - supportsNormalize flag
   - normalizedField vs. rawField
   - color suggestions for each metric

## Next Session Order

1. **Session 2 (UI Controls)**: Year dropdown + multi-select layers + normalize toggle
2. **Session 3 (Map Rendering)**: Render 2+ layers simultaneously 
3. **Session 4 (Correlation)**: Compute & display r, n, missing counts
4. **Session 5 (Details)**: County table, search, compare mode

## Files You'll Modify Next

- `js/main.js` — import AppStateManager, build UI, wire events
- `index.html` — add year dropdown, update layer toggles
- `js/map.js` — modify updateMapLayers to handle multiple active layers
- `css/styles.css` — style new controls

## Debugging Tips

```bash
# Check current state at any time
git log --oneline feature/multi-layer-map | head -5

# Verify you're on the right branch
git branch -v

# See what files changed in this session
git diff main feature/multi-layer-map --name-only

# Run the audit to understand data gaps
node audit-data-readiness.js
```

## Decision Points Before Session 2

Clarify with professor:
- How to render 2 datasets simultaneously? (overlay strategy)
- Include Spearman correlation or just Pearson?
- Gray out sparse datasets (liquor) or show "no data"?
