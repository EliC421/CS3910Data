(function (global) {
    function computePearsonPair(mapLayersByMetric, layerLabels, layerAId, layerBId) {
        const layerA = mapLayersByMetric[layerAId];
        const layerB = mapLayersByMetric[layerBId];
        const valuesA = layerA?.valuesByCounty || {};
        const valuesB = layerB?.valuesByCounty || {};

        const counties = Object.keys(valuesA).filter((county) => Number.isFinite(valuesA[county]) && Number.isFinite(valuesB[county]));
        if (counties.length < 3) {
            return null;
        }

        const points = counties.map((county) => ({
            county,
            x: valuesA[county],
            y: valuesB[county]
        }));

        const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
        const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

        let numerator = 0;
        let sumSqX = 0;
        let sumSqY = 0;

        points.forEach((point) => {
            const dx = point.x - meanX;
            const dy = point.y - meanY;
            numerator += dx * dy;
            sumSqX += dx * dx;
            sumSqY += dy * dy;
        });

        const denominator = Math.sqrt(sumSqX * sumSqY);
        if (!Number.isFinite(denominator) || denominator === 0) {
            return null;
        }

        const r = numerator / denominator;
        return {
            layerAId,
            layerBId,
            layerALabel: layerLabels[layerAId] || layerAId,
            layerBLabel: layerLabels[layerBId] || layerBId,
            n: points.length,
            r,
            points
        };
    }

    function buildCorrelationPairs(mapLayersByMetric, layerLabels, layerIds) {
        const pairs = [];
        for (let i = 0; i < layerIds.length; i++) {
            for (let j = i + 1; j < layerIds.length; j++) {
                const result = computePearsonPair(mapLayersByMetric, layerLabels, layerIds[i], layerIds[j]);
                if (result) {
                    pairs.push(result);
                }
            }
        }

        return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    }

    function calculateLinearTrend(points) {
        const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
        const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

        let numerator = 0;
        let denominator = 0;

        points.forEach((point) => {
            numerator += (point.x - meanX) * (point.y - meanY);
            denominator += (point.x - meanX) * (point.x - meanX);
        });

        const slope = denominator === 0 ? 0 : numerator / denominator;
        const intercept = meanY - slope * meanX;

        return { slope, intercept };
    }

    function toScatterPlotScales(pair, width, height, pad) {
        const xs = pair.points.map((point) => point.x);
        const ys = pair.points.map((point) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            minX,
            maxX,
            minY,
            maxY,
            xSpan: maxX - minX || 1,
            ySpan: maxY - minY || 1,
            width,
            height,
            pad
        };
    }

    function toScatterCoordinates(point, scales) {
        const x = scales.pad + ((point.x - scales.minX) / scales.xSpan) * (scales.width - scales.pad * 2);
        const y = scales.height - scales.pad - ((point.y - scales.minY) / scales.ySpan) * (scales.height - scales.pad * 2);
        return { x, y };
    }

    function renderScatterPoints(pair, scales) {
        return pair.points.map((point) => {
            const plotted = toScatterCoordinates(point, scales);
            return `<circle cx="${plotted.x.toFixed(2)}" cy="${plotted.y.toFixed(2)}" r="3" class="scatter-point"><title>${point.county}: ${point.x.toFixed(2)}, ${point.y.toFixed(2)}</title></circle>`;
        }).join('');
    }

    function describeCorrelation(r) {
        const absR = Math.abs(r);
        const direction = r >= 0 ? 'positive' : 'negative';

        let strength = 'very weak';
        if (absR >= 0.7) {
            strength = 'strong';
        } else if (absR >= 0.4) {
            strength = 'moderate';
        } else if (absR >= 0.2) {
            strength = 'weak';
        }

        return {
            direction,
            strength,
            shortLabel: `${strength} ${direction}`,
            sentence: `This is a ${strength} ${direction} relationship.`
        };
    }

    function renderScatterSvg(pair) {
        const width = 560;
        const height = 260;
        const pad = 30;
        const scales = toScatterPlotScales(pair, width, height, pad);
        const trend = calculateLinearTrend(pair.points);

        const x1Val = scales.minX;
        const y1Val = trend.slope * x1Val + trend.intercept;
        const x2Val = scales.maxX;
        const y2Val = trend.slope * x2Val + trend.intercept;

        const x1 = pad;
        const y1 = height - pad - ((y1Val - scales.minY) / scales.ySpan) * (height - pad * 2);
        const x2 = width - pad;
        const y2 = height - pad - ((y2Val - scales.minY) / scales.ySpan) * (height - pad * 2);
        const circles = renderScatterPoints(pair, scales);

        return `
        <svg viewBox="0 0 ${width} ${height}" class="scatter-svg" role="img" aria-label="Scatter plot">
            <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="axis-line"></line>
            <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" class="axis-line"></line>
            <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="trend-line"></line>
            ${circles}
            <text x="${pad}" y="${height - pad + 14}" class="tick-label">${scales.minX.toFixed(1)}</text>
            <text x="${width - pad - 30}" y="${height - pad + 14}" class="tick-label">${scales.maxX.toFixed(1)}</text>
            <text x="${pad - 24}" y="${height - pad + 2}" class="tick-label">${scales.minY.toFixed(1)}</text>
            <text x="${pad - 24}" y="${pad + 2}" class="tick-label">${scales.maxY.toFixed(1)}</text>
            <text x="${width / 2}" y="${height - 6}" class="axis-label">${pair.layerALabel}</text>
            <text x="14" y="${height / 2}" transform="rotate(-90 14 ${height / 2})" class="axis-label">${pair.layerBLabel}</text>
        </svg>
    `;
    }

    function toMetricSummaryEntries(metricLayer) {
        return Object.entries(metricLayer.valuesByCounty)
            .filter(([, value]) => Number.isFinite(value))
            .sort((a, b) => b[1] - a[1]);
    }

    function formatLayerValue(value) {
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function renderBarRows(list, maxValue) {
        return list.map(([county, value]) => {
            const width = Math.max(2, (value / maxValue) * 100);
            return `
            <div class="bar-row">
                <span class="bar-label">${county}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
                <span class="bar-value">${formatLayerValue(value)}</span>
            </div>
        `;
        }).join('');
    }

    function renderCorrelationPanelHtml(options) {
        const { layerIds, mapLayersByMetric, layerLabels } = options;

        if (layerIds.length < 2) {
            return '<div class="correlation-empty">Enable at least 2 metric layers to view correlation graphs.</div>';
        }

        const pairs = buildCorrelationPairs(mapLayersByMetric, layerLabels, layerIds);
        if (pairs.length === 0) {
            return '<div class="correlation-empty">Not enough overlapping county data to calculate correlation.</div>';
        }

        const strongest = pairs[0];
        const strongestDesc = describeCorrelation(strongest.r);
        const strongestR2 = strongest.r * strongest.r;
        const pairRows = pairs.map((pair) => {
            const direction = pair.r >= 0 ? 'positive' : 'negative';
            const desc = describeCorrelation(pair.r);
            return `
            <div class="corr-row ${direction}">
                <span class="corr-pair">${pair.layerALabel} vs ${pair.layerBLabel}</span>
                <span class="corr-r">r=${pair.r.toFixed(3)}</span>
                <span class="corr-n">n=${pair.n}</span>
                <span class="corr-desc">${desc.shortLabel}</span>
            </div>
        `;
        }).join('');

        return `
        <div class="correlation-section">
            <h3>Correlation Graphs</h3>
            <p class="correlation-subtitle">Pearson correlation across counties for active layers.</p>
            <div class="correlation-grid">
                <div class="correlation-list">
                    ${pairRows}
                </div>
                <div class="scatter-card">
                    <h4>Strongest Pair: ${strongest.layerALabel} vs ${strongest.layerBLabel}</h4>
                    <p>r = ${strongest.r.toFixed(3)} · R² = ${strongestR2.toFixed(3)} · n = ${strongest.n}</p>
                    <p class="corr-interpretation">${strongestDesc.sentence}</p>
                    ${renderScatterSvg(strongest)}
                </div>
            </div>
        </div>
    `;
    }

    function renderMetricGraphsHtml(options) {
        const { activeLayerId, metricLayer, layerLabels, correlationPanelHtml } = options;
        const entries = toMetricSummaryEntries(metricLayer);

        if (entries.length === 0) {
            return '<div class="empty-charts">No graphable values for this layer.</div>';
        }

        const top10 = entries.slice(0, 10);
        const bottom10 = entries.slice(-10).sort((a, b) => a[1] - b[1]);
        const max = top10[0][1] || 1;
        const avg = entries.reduce((sum, [, value]) => sum + value, 0) / entries.length;
        const title = layerLabels[activeLayerId] || activeLayerId;

        return `
        <div class="graph-header">
            <h3>${title}</h3>
            <p>Year ${metricLayer.year || 'N/A'} · Counties with values: ${entries.length}</p>
        </div>
        <div class="summary-grid">
            <div class="summary-card"><strong>Average</strong><span>${formatLayerValue(avg)}</span></div>
            <div class="summary-card"><strong>Max</strong><span>${formatLayerValue(metricLayer.max ?? 0)}</span></div>
            <div class="summary-card"><strong>Min</strong><span>${formatLayerValue(metricLayer.min ?? 0)}</span></div>
        </div>
        <div class="dual-graphs">
            <div class="graph-panel">
                <h4>Top 10 Counties</h4>
                <div class="bars-wrap">${renderBarRows(top10, max)}</div>
            </div>
            <div class="graph-panel">
                <h4>Bottom 10 Counties</h4>
                <div class="bars-wrap">${renderBarRows(bottom10, max)}</div>
            </div>
        </div>
        ${correlationPanelHtml}
    `;
    }

    global.AnalyticsHelpers = {
        renderCorrelationPanelHtml,
        renderMetricGraphsHtml
    };
})(window);
