// edit_figure.js
// Browser-side: fetches CSV from /get-csv, parses, computes monthly mean/median,
// draws scatter plots + linear regressions, and renders a wide table.
$(document).ready(function() {
    // const queryString = window.location.search;
    // const urlParams = new URLSearchParams(queryString);
    // document.getElementById('dateCol').value = urlParams.get('date');
    // document.getElementById('priceCol').value = urlParams.get('price');
})

function home(){
    location.href = '/';
}

function viewArchive(){
    location.href = '/archive';
}


let masterBySource = {};   // { filename: [ {monthYear, monthDate, mean, median}, ... ] }
let currentBySource = {};
let styleConfig = {};
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
//style control renderring

function renderStyleControls() {
    const container = document.getElementById("styleControls");
    container.innerHTML = "";

    for (const source in styleConfig) {
        const cfg = styleConfig[source];

        container.innerHTML += `<h5>${source} Style</h5>`;

        container.innerHTML += `
            <div><strong>${source} Mean Scatter</strong></div>
            Color: <input type="color" id="${source}_meanScatter_color" value="${cfg.meanScatter.color}">
            Shape:
            <select id="${source}_meanScatter_shape">
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="rect">Square</option>
                <option value="cross">Cross</option>
            </select><br><br>

            <div><strong>${source} Median Scatter</strong></div>
            Color: <input type="color" id="${source}_medianScatter_color" value="${cfg.medianScatter.color}">
            Shape:
            <select id="${source}_medianScatter_shape">
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="rect">Square</option>
                <option value="cross">Cross</option>
            </select><br><br>

            <div><strong>${source} Mean Regression Line</strong></div>
            Color: <input type="color" id="${source}_meanLine_color" value="${cfg.meanLine.color}">
            Type:
            <select id="${source}_meanLine_mode">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
            </select><br><br>

            <div><strong>${source} Median Regression Line</strong></div>
            Color: <input type="color" id="${source}_medianLine_color" value="${cfg.medianLine.color}">
            Type:
            <select id="${source}_medianLine_mode">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
            </select>
            <hr>
        `;
    }

    // Wiring: when any control changes, reapply styles
    container.querySelectorAll("input, select").forEach(el => {
        el.addEventListener("change", () => {
            applyUpdatedStyles();
            renderChartFromMonthlyStats();
        });
    });
}

//apply rendered styles
function applyUpdatedStyles() {
    for (const source in styleConfig) {
        const cfg = styleConfig[source];

        cfg.meanScatter.color  = document.getElementById(`${source}_meanScatter_color`).value;
        cfg.meanScatter.shape  = document.getElementById(`${source}_meanScatter_shape`).value;

        cfg.medianScatter.color = document.getElementById(`${source}_medianScatter_color`).value;
        cfg.medianScatter.shape = document.getElementById(`${source}_medianScatter_shape`).value;

        cfg.meanLine.color     = document.getElementById(`${source}_meanLine_color`).value;
        cfg.meanLine.mode      = document.getElementById(`${source}_meanLine_mode`).value;

        cfg.medianLine.color   = document.getElementById(`${source}_medianLine_color`).value;
        cfg.medianLine.mode    = document.getElementById(`${source}_medianLine_mode`).value;
    }
}


// ---------- Chart rendering ----------
let chartInstance = null;

function renderChartFromMonthlyStats() {
    // monthlyStats: array of {monthYear, monthDate (Date), mean, median}
    const ctx = document.getElementById('priceChart').getContext('2d');
    const datasets = [];

    const colors = [
        'crimson', 'dodgerblue', 'forestgreen', 'purple',
        'orange', 'goldenrod', 'teal', 'indigo'
    ];
    let colorIndex = 0;

    for (const source in currentBySource) {
        const stats = currentBySource[source];
        if (!stats.length) continue;

        const color = colors[colorIndex % colors.length];
        colorIndex++;

        const meanPoints   = stats.filter(r=>r.mean!=null)
            .map(r=>({ x: r.monthDate, y: r.mean }));
        const medianPoints = stats.filter(r=>r.median!=null)
            .map(r=>({ x: r.monthDate, y: r.median }));

        // regression
        const xM = meanPoints.map(p=>p.x.getTime());
        const yM = meanPoints.map(p=>p.y);
        const xD = medianPoints.map(p=>p.x.getTime());
        const yD = medianPoints.map(p=>p.y);

        const regM = linearRegression(xM,yM);
        const regD = linearRegression(xD,yD);

        const first = stats[0].monthDate;
        const last  = stats[stats.length-1].monthDate;
        const firstN = first.getTime();
        const lastN  = last.getTime();

        const meanLine = regM ? [
            { x: first, y: regM.m * firstN + regM.b },
            { x: last,  y: regM.m * lastN  + regM.b }
        ] : [];

        const medianLine = regD ? [
            { x: first, y: regD.m * firstN + regD.b },
            { x: last,  y: regD.m * lastN  + regD.b }
        ] : [];

        datasets.push(
            {
                label: `${source} Mean`,
                data: meanPoints,
                backgroundColor: styleConfig[source].meanScatter.color,
                borderColor: styleConfig[source].meanScatter.color,
                pointStyle: styleConfig[source].meanScatter.shape,
                pointRadius: 6,
                showLine: false
            },
            {
                label: `${source} Median`,
                data: medianPoints,
                backgroundColor: styleConfig[source].medianScatter.color,
                borderColor: styleConfig[source].medianScatter.color,
                pointStyle: styleConfig[source].medianScatter.shape,
                pointRadius: 6,
                showLine: false
            },
            {
                label: `${source} Mean regression`,
                type: 'line',
                borderColor: styleConfig[source].meanLine.color,
                borderDash: styleConfig[source].meanLine.mode === "dashed" ? [6,4] : [],
                data: meanLine,
                borderWidth: 2,
                pointRadius: 0,
            },
            {
                label: `${source} Median regression`,
                type: 'line',
                borderColor: styleConfig[source].medianLine.color,
                data: medianLine,
                borderDash: styleConfig[source].medianLine.mode === "dashed" ? [6,4] : [],
                borderWidth: 2,
                pointRadius: 0,
            }
        );
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'month' } },
                y: { title: { text: 'Price', display: true } }
            }
        }
    });
}

// ---------- Table rendering (wide orientation) ----------
function renderWideTable() {
    const table = document.getElementById('statsTable');
    let html = '';

    // header row
    const anySource = Object.keys(currentBySource)[0];
    const months = currentBySource[anySource].map(r => r.monthYear);

    html += '<tr><th>Statistic</th>';
    months.forEach(m => html += `<th>${m}</th>`);
    html += '</tr>';

    // For each CSV:
    for (const source in currentBySource) {
        const stats = currentBySource[source];

        // mean row
        html += `<tr><th>${source} Mean</th>`;
        stats.forEach(r=>{
            html += `<td>${r.mean==null ? '' : r.mean.toFixed(2)}</td>`;
        });
        html += '</tr>';

        // median row
        html += `<tr><th>${source} Median</th>`;
        stats.forEach(r=>{
            html += `<td>${r.median==null ? '' : r.median.toFixed(2)}</td>`;
        });
        html += '</tr>';
    }

    table.innerHTML = html;
}


//check boxes
function renderCheckBoxes(source, m){
    return `
    <div class="row">
        <div class="col-md-12">${source}: ${m.monthYear}</div>

        <div class="col-md-6">
            <input type="checkbox" id="${source}_${m.monthYear}_Mean" checked>
            <label for="${source}_${m.monthYear}_Mean">Mean</label>
        </div>

        <div class="col-md-6">
            <input type="checkbox" id="${source}_${m.monthYear}_Median" checked>
            <label for="${source}_${m.monthYear}_Median">Median</label>
        </div>
    </div>
    `;
}


function applyFiltersFromCheckboxes() {
    const updated = {};

    for (const source in masterBySource) {
        updated[source] = masterBySource[source].map(row => {
            const meanChecked   = document.getElementById(`${source}_${row.monthYear}_Mean`).checked;
            const medianChecked = document.getElementById(`${source}_${row.monthYear}_Median`).checked;

            return {
                monthYear: row.monthYear,
                monthDate: row.monthDate,
                mean: meanChecked ? row.mean : null,
                median: medianChecked ? row.median : null
            };
        });
    }

    currentBySource = updated;
}


function reloadFiltered() {
    applyFiltersFromCheckboxes();
    renderChartFromMonthlyStats();
    renderWideTable();
}

// ---------- Main orchestration ----------
async function renderAll() {
    try {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        document.getElementById('dateCol').value = urlParams.get('date');
        document.getElementById('priceCol').value = urlParams.get('price');

        const dateCol = document.getElementById('dateCol').value.trim();
        console.log("date: "+dateCol);
        const priceCol = document.getElementById('priceCol').value.trim();
        console.log("price: "+priceCol);

        const csvText = await fetchCSVText();
        const rows = parseCSV(csvText);


        const monthlyStats = computeMonthlyStatsFromRows(rows, dateCol, priceCol);

        masterBySource["main"] = monthlyStats;
        currentBySource["main"] = structuredClone(monthlyStats);
        styleConfig["main"] = {
            meanScatter:  { color: "#d62728", shape: "circle" },
            medianScatter:{ color: "#1f77b4", shape: "triangle" },
            meanLine:     { color: "#d62728", mode: "solid" },
            medianLine:   { color: "#1f77b4", mode: "dashed" }
        };

        $('#checkboxes').append(`<h4>Main CSV</h4>`);
        for (const m of monthlyStats) {
            $('#checkboxes').append(renderCheckBoxes("main", m));
        }

        for (const m of monthlyStats) {
            document.getElementById(`main_${m.monthYear}_Mean`)
                .addEventListener("change", reloadFiltered);

            document.getElementById(`main_${m.monthYear}_Median`)
                .addEventListener("change", reloadFiltered);
        }

        document.getElementById("formFile").addEventListener("change", async evt => {
            const file = evt.target.files[0];
            if (!file) return;

            const dateCol = document.getElementById('newdateCol').value.trim();
            const priceCol = document.getElementById('newpriceCol').value.trim();

            const text = await file.text();
            const rows = parseCSV(text);
            const stats = computeMonthlyStatsFromRows(rows, dateCol, priceCol);

            const name = file.name.replace(/\.[^.]+$/, '');

            masterBySource[name] = stats;
            currentBySource[name] = structuredClone(stats);

            styleConfig[name] = {
                meanScatter:  { color: "#d62728", shape: "circle" },
                medianScatter:{ color: "#1f77b4", shape: "triangle" },
                meanLine:     { color: "#d62728", mode: "solid" },
                medianLine:   { color: "#1f77b4", mode: "dashed" }
            };

            $('#checkboxes').append(`<h4>${name}</h4>`);
            for (const m of stats) {
                $('#checkboxes').append(renderCheckBoxes(name, m));
                document.getElementById(`${name}_${m.monthYear}_Mean`)
                    .addEventListener('change', reloadFiltered);
                document.getElementById(`${name}_${m.monthYear}_Median`)
                    .addEventListener('change', reloadFiltered);
            }

            reloadFiltered();
            renderStyleControls();
        });



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

    renderStyleControls();
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


function convertForExport(rows) {
    const out = {
        meanPoints: [],
        medianPoints: [],
        meanRegression: [],
        medianRegression: [],
        table: {}
    };

    for (const r of rows) {
        const d = new Date(r.monthDate);
        out.table[r.monthYear] = { mean: r.mean, median: r.median };

        if (r.mean != null) out.meanPoints.push({ x: d, y: r.mean });
        if (r.median != null) out.medianPoints.push({ x: d, y: r.median });
    }

    return out;
}

function ExportorSave() {
    const prepared = {};
    const preparedAll ={};
    for (const source in currentBySource) {
        prepared[source] = convertForExport(currentBySource[source]);
    }
    for (const source in masterBySource) {
        preparedAll[source] = convertForExport(masterBySource[source]);
    }

    const payload = {
        master: preparedAll,
        current: prepared,
        style: styleConfig
    };

    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/export_and_save';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'instanceData';
    input.value = JSON.stringify(payload);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
}

// ---------- Wire up buttons ----------
document.getElementById('refreshBtn').addEventListener('click', renderAll);
document.getElementById('exportPngBtn').addEventListener('click', exportChartPNG);

// Auto-run on load (optional)
window.addEventListener('load', () => {
    renderAll().catch(e => console.warn(e));
});
