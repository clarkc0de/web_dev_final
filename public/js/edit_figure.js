// edit_figure.js
// Browser-side: fetches CSV from /get-csv, parses, computes monthly mean/median,
// draws scatter plots + linear regressions, and renders a wide table.

// ---------- Helpers ----------
async function fetchCSVText() {
    const res = await fetch('/get-csv');
    if (!res.ok) throw new Error('Failed to fetch CSV from server');
    const txt = await res.text();
    return txt;
}

// robust CSV -> array of objects using PapaParse
function parseCSV(text) {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length) {
        console.warn('CSV parse warnings/errors:', parsed.errors.slice(0,3));
    }
    return parsed.data; // array of objects keyed by header
}

function parsePrice(value) {
    if (value == null) return null;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '').trim();
    if (!cleaned || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null;
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
}

function monthKeyFromDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
}

// compute monthly mean & median; returns array of {monthYear, date(1st), mean, median}
function computeMonthlyStatsFromRows(rows, dateCol, priceCol) {
    const buckets = {};
    for (const r of rows) {
        const dateRaw = r[dateCol];
        if (!dateRaw) continue;
        const date = new Date(dateRaw);
        if (isNaN(date)) continue;
        const price = parsePrice(r[priceCol]);
        if (price == null) continue;
        const key = monthKeyFromDate(date);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(price);
    }

    const keys = Object.keys(buckets).sort();
    const out = [];
    for (const k of keys) {
        const arr = buckets[k].slice().sort((a,b)=>a-b);
        const mean = arr.reduce((s,v)=>s+v,0)/arr.length;
        const mid = Math.floor(arr.length/2);
        const median = (arr.length % 2 === 0) ? (arr[mid-1]+arr[mid])/2 : arr[mid];
        // create a date at first day of month for plotting
        const parts = k.split('-'); // YYYY-MM
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        out.push({ monthYear: k, monthDate: d, mean, median });
    }
    return out;
}

// simple linear regression (least squares) for arrays x[], y[]
function linearRegression(x, y) {
    if (x.length !== y.length || x.length === 0) return null;
    const n = x.length;
    const meanX = x.reduce((a,b)=>a+b,0)/n;
    const meanY = y.reduce((a,b)=>a+b,0)/n;
    let num = 0, den = 0;
    for (let i=0;i<n;i++){
        const dx = x[i]-meanX;
        num += dx * (y[i]-meanY);
        den += dx * dx;
    }
    if (den === 0) return { m: 0, b: meanY }; // vertical all same x
    const m = num/den;
    const b = meanY - m*meanX;
    return { m, b };
}

// ---------- Chart rendering ----------
let chartInstance = null;

function renderChartFromMonthlyStats(monthlyStats) {
    // monthlyStats: array of {monthYear, monthDate (Date), mean, median}
    const ctx = document.getElementById('priceChart').getContext('2d');

    // prepare scatter points (x = Date, y = value)
    const meanPoints = monthlyStats.map(m => ({ x: m.monthDate, y: m.mean }));
    const medianPoints = monthlyStats.map(m => ({ x: m.monthDate, y: m.median }));

    // regression on numeric x (ms) vs mean/median
    const xNums = monthlyStats.map(m => m.monthDate.getTime());
    const meanYs = monthlyStats.map(m => m.mean);
    const medYs = monthlyStats.map(m => m.median);

    const meanReg = linearRegression(xNums, meanYs);
    const medReg = linearRegression(xNums, medYs);

    // create regression line endpoints spanning first->last month
    const firstX = monthlyStats[0].monthDate;
    const lastX = monthlyStats[monthlyStats.length - 1].monthDate;
    const firstXnum = firstX.getTime();
    const lastXnum = lastX.getTime();

    const meanLine = [
        { x: new Date(firstXnum), y: meanReg.m * firstXnum + meanReg.b },
        { x: new Date(lastXnum),  y: meanReg.m * lastXnum  + meanReg.b }
    ];
    const medLine = [
        { x: new Date(firstXnum), y: medReg.m * firstXnum + medReg.b },
        { x: new Date(lastXnum),  y: medReg.m * lastXnum  + medReg.b }
    ];

    // destroy previous chart if present
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(
        ctx,
        {
            type: 'scatter', // scatter as base; lines for regression will be type:'line'
            data: {
                datasets: [
                    {
                        label: 'Mean (scatter)',
                        data: meanPoints,
                        backgroundColor: 'rgba(220,20,60,0.9)',
                        pointRadius: 6,
                        showLine: false,
                    },
                    {
                        label: 'Median (scatter)',
                        data: medianPoints,
                        backgroundColor: 'rgba(30,144,255,0.9)',
                        pointRadius: 6,
                        showLine: false,
                    },
                    {
                        label: 'Mean trend (linear)',
                        data: meanLine,
                        type: 'line',
                        borderColor: 'rgba(220,20,60,0.8)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0,
                        borderDash: [],
                        fill: false,
                    },
                    {
                        label: 'Median trend (linear)',
                        data: medLine,
                        type: 'line',
                        borderColor: 'rgba(30,144,255,0.8)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0,
                        borderDash: [6,4],
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'month', tooltipFormat: 'MMM yyyy' },
                        title: { display: true, text: 'Date (Month)' }
                    },
                    y: {
                        title: { display: true, text: 'Price' },
                        ticks: { callback: val => Number(val).toLocaleString() }
                    }
                }
            }
        }
    );
}

// ---------- Table rendering (wide orientation) ----------
function renderWideTable(monthlyStats) {
    // monthlyStats sorted ascending by monthYear
    const table = document.getElementById('statsTable');
    // header row: first empty cell then month columns
    let html = '<tr><th class="rowLabel">Statistic</th>';
    for (const m of monthlyStats) {
        html += `<th class="month">${m.monthYear}</th>`;
    }
    html += '</tr>';

    // Mean row
    html += '<tr>';
    html += '<th class="rowLabel">Mean</th>';
    for (const m of monthlyStats) {
        html += `<td>${Number(m.mean).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>`;
    }
    html += '</tr>';

    // Median row
    html += '<tr>';
    html += '<th class="rowLabel">Median</th>';
    for (const m of monthlyStats) {
        html += `<td>${Number(m.median).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>`;
    }
    html += '</tr>';

    table.innerHTML = html;
}

// ---------- Main orchestration ----------
async function renderAll() {
    try {
        const dateCol = document.getElementById('dateCol').value.trim();
        const priceCol = document.getElementById('priceCol').value.trim();

        const csvText = await fetchCSVText();
        const rows = parseCSV(csvText);

        const monthlyStats = computeMonthlyStatsFromRows(rows, dateCol, priceCol);
        if (monthlyStats.length === 0) {
            alert('No valid month/price data found with the provided column names.');
            return;
        }

        renderChartFromMonthlyStats(monthlyStats);
        renderWideTable(monthlyStats);
    } catch (err) {
        console.error(err);
        alert('Error: ' + (err.message || err));
    }
}

// ---------- Export PNG of chart ----------
function exportChartPNG() {
    if (!chartInstance) {
        alert('Chart not rendered yet.');
        return;
    }
    const a = document.createElement('a');
    a.href = document.getElementById('priceChart').toDataURL('image/png');
    a.download = 'price_chart.png';
    a.click();
}

// ---------- Wire up buttons ----------
document.getElementById('refreshBtn').addEventListener('click', renderAll);
document.getElementById('exportPngBtn').addEventListener('click', exportChartPNG);

// Auto-run on load (optional)
window.addEventListener('load', () => {
    renderAll().catch(e => console.warn(e));
});