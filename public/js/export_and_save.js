$(document).ready(function(){
    $('#save_message').text('');
})

function home(){
    location.href = '/';
}

function viewArchive(){
    location.href = '/archive';
}

async function fetchCSVText() {
    const res = await fetch('/get-csv');
    if (!res.ok) throw new Error('Failed to fetch CSV from server');
    const txt = await res.text();
    return txt;
}



function computeLinearRegression(points) {
    if (!points || points.length < 2) return [];

    // Convert timestamps to numeric
    const xs = points.map(p => new Date(p.x).getTime());
    const ys = points.map(p => p.y);

    const n = xs.length;
    const sumX = xs.reduce((a,b)=>a+b,0);
    const sumY = ys.reduce((a,b)=>a+b,0);
    const sumXY = xs.reduce((a,b,i)=>a + b*ys[i], 0);
    const sumX2 = xs.reduce((a,b)=>a + b*b, 0);

    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;

    // Build 2-point line
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);

    return [
        { x: new Date(x1).toISOString(), y: slope*x1 + intercept },
        { x: new Date(x2).toISOString(), y: slope*x2 + intercept }
    ];
}



//real start here
fetchCSVText().then(data => {
    const instanceData = JSON.parse(data);
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if(urlParams.get('from')){
        masterBySource = instanceData.master;
        currentBySource = instanceData.current;
        styleConfig = instanceData.style;
        if(instanceData.text !==""){
            $('#Text_Analysis')[0].innerHTML = instanceData.text;
            $('#Text_Analysis')[0].value = instanceData.text;

        }
        if(instanceData.name !==""){
            $('#project_name')[0].innerHTML = instanceData.name;
            $('#project_name')[0].value = instanceData.name;

        }
    }else{
        masterBySource = instanceData.master;
        currentBySource = instanceData.current;
        styleConfig = instanceData.style;


        Object.values(currentBySource).forEach(src => {
            src.meanPoints = src.meanPoints.map(p => ({ x: new Date(p.x), y: p.y }));
            src.medianPoints = src.medianPoints.map(p => ({ x: new Date(p.x), y: p.y }));
            src.meanRegression = src.meanRegression.map(p => ({ x: new Date(p.x), y: p.y }));
            src.medianRegression = src.medianRegression.map(p => ({ x: new Date(p.x), y: p.y }));
        });

    }



    Object.keys(currentBySource).forEach(sourceName => {
        const src = currentBySource[sourceName];

        src.meanRegression = computeLinearRegression(src.meanPoints);
        src.medianRegression = computeLinearRegression(src.medianPoints);
    });

    renderExportChart();
    renderExportTable();
});


let exportChart = null;

function buildDatasets() {
    const datasets = [];

    Object.keys(currentBySource).forEach(sourceName => {
        const source = currentBySource[sourceName];
        const style = styleConfig[sourceName]; // <- much easier to read

        // MEAN SCATTER
        datasets.push({
            label: `${sourceName} Mean`,
            type: "scatter",
            data: source.meanPoints,
            borderColor: style.meanScatter.color,
            backgroundColor: style.meanScatter.color,
            pointStyle: style.meanScatter.shape, // circle, triangle, etc.
            pointRadius: 4,
            showLine: false
        });

        //MEDIAN SCATTER
        datasets.push({
            label: `${sourceName} Median`,
            type: "scatter",
            data: source.medianPoints,
            borderColor: style.medianScatter.color,
            backgroundColor: style.medianScatter.color,
            pointStyle: style.medianScatter.shape,
            pointRadius: 4,
            showLine: false
        });

        // MEAN TREND LINE
        datasets.push({
            label: `${sourceName} Mean Trend`,
            type: "line",
            data: source.meanRegression,
            borderColor: style.meanLine.color,
            borderDash: (style.meanLine.mode === "dashed" ? [6, 6] : []),
            borderWidth: 2,
            tension: 0,
            pointRadius: 0
        });

        // MEDIAN TREND LINE
        datasets.push({
            label: `${sourceName} Median Trend`,
            type: "line",
            data: source.medianRegression,
            borderColor: style.medianLine.color,
            borderDash: (style.medianLine.mode === "dashed" ? [6, 6] : []),
            borderWidth: 2,
            tension: 0,
            pointRadius: 0
        });
    });

    return datasets;
}

// Create the chart on the page
function renderExportChart() {
    if (exportChart) exportChart.destroy();

    const ctx = $("#priceChart")[0].getContext("2d");

    exportChart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: buildDatasets()
        },
        options: {
            scales: {
                x: { type: "time", time: { unit: "month" } },
                y: { beginAtZero: false }
            }
        }
    });
}


//make chart for chart+table as 1 image
let exportChartIMG = null;

function renderExportChartIMG(canvas, originalConfig) {
    const ctx = canvas.getContext("2d");

    canvas.width = exportChart.width;
    canvas.height = exportChart.height;

    if (window._exportChartInstance) {
        window._exportChartInstance.destroy();
    }

    const clonedConfig = JSON.parse(JSON.stringify(originalConfig));

    clonedConfig.options.responsive = false;
    clonedConfig.options.animation = false;

    clonedConfig.data.datasets = buildDatasets();

    window._exportChartInstance = new Chart(ctx, clonedConfig);

    return window._exportChartInstance;
}



function renderExportTable() {
    const table = document.getElementById("statsTable");
    table.innerHTML = "";

    // Extract all unique YYYY-MM keys
    const allMonths = new Set();

    console.log("currentBySource =", currentBySource);

    Object.values(currentBySource).forEach(src => {
        console.log("Checking src:", src);
        console.log("src.table =", src?.table);
    });

    Object.values(currentBySource).forEach(src => {
        Object.keys(src.table).forEach(month => allMonths.add(month));
    });
    const months = [...allMonths].sort();

    // Build header row
    let html = "<tr><th>Dataset</th>";
    months.forEach(m => (html += `<th>${m}</th>`));
    html += "</tr>";

    // Each dataset gets 2 rows: Mean and Median
    Object.keys(currentBySource).forEach(sourceName => {
        const src = currentBySource[sourceName];

        // Mean row
        html += `<tr><td>${sourceName} Mean</td>`;
        months.forEach(m => {
            html += `<td>${src.table[m]?.mean != null ? src.table[m].mean.toFixed(2) : ""}</td>`;
        });
        html += "</tr>";

        // Median row
        html += `<tr><td>${sourceName} Median</td>`;
        months.forEach(m => {
            html += `<td>${src.table[m]?.median != null ? src.table[m].median.toFixed(2) : ""}</td>`;
        });
        html += "</tr>";
    });

    table.innerHTML = html;
}


function exportFullTable(type) {

    if (type === "png") {
        i="png";
        j="png";
    }else{
        i="jpeg";
        j="jpg";
    }
    const originalTable = document.getElementById("statsTable");

    const temp = document.createElement("div");
    temp.style.position = "absolute";
    temp.style.left = "-999999px";
    temp.style.top = "0";
    temp.style.width = originalTable.scrollWidth + "px";
    temp.style.height = "auto";
    temp.style.display = "block";
    temp.style.overflow = "visible";
    temp.style.background = "white";


    const clone = originalTable.cloneNode(true);
    clone.style.width = originalTable.scrollWidth + "px";
    clone.style.display = "table";
    temp.appendChild(clone);

    document.body.appendChild(temp);


    html2canvas(clone, {
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
    }).then(canvas => {

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/"+i);
        a.download = "table."+j;
        a.click();

        document.body.removeChild(temp);
    });
}


function cloneDatasets(original) {
    return original.map(ds => ({
        label: ds.label,
        type: ds.type,
        borderColor: ds.borderColor,
        backgroundColor: ds.backgroundColor,
        pointStyle: ds.pointStyle,
        pointRadius: ds.pointRadius,
        showLine: ds.showLine,
        borderDash: ds.borderDash ? [...ds.borderDash] : undefined,
        borderWidth: ds.borderWidth,
        tension: ds.tension,

        data: ds.data.map(pt => ({
            x: (pt.x instanceof Date ? new Date(pt.x) : pt.x),
            y: pt.y
        }))
    }));
}


async function exportCombined(type) {
    let mime, ext;
    if (type === "png") {
        mime = "png";
        ext = "png";
    } else {
        mime = "jpeg";
        ext = "jpg";
    }

    const target = $("#doubleWrapper")[0];

    const clone = target.cloneNode(true);

    clone.style.width = "fit-content";
    clone.style.maxWidth = "none";
    clone.style.overflow = "visible";

    clone.querySelectorAll("*").forEach(el => {
        el.style.overflow = "visible";
        el.style.maxWidth = "none";
        el.style.width = "auto";
    });

    clone.style.position = "absolute";
    clone.style.left = "-99999px";
    document.body.appendChild(clone);

    clone.style.backgroundColor = "#ffffff";
    clone.querySelectorAll("*").forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.backgroundColor === "rgba(0, 0, 0, 0)" ||
            cs.backgroundColor === "transparent") {
            el.style.backgroundColor = "#ffffff";
        }
        el.style.borderColor = el.style.borderColor || "transparent";
    });


    const originalCanvas = $("#priceChart")[0];
    const cloneCanvas = clone.querySelector("canvas#priceChart");

    const newCanvas = document.createElement("canvas");
    newCanvas.width = originalCanvas.width;
    newCanvas.height = originalCanvas.height;

    const ctx = newCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    cloneCanvas.replaceWith(newCanvas);

    console.log("=== buildDatasets() for export ===",
        JSON.parse(JSON.stringify(buildDatasets())));
    const baseConfig = exportChart.options?._config || exportChart.config?._config || exportChart.config;
    const exportChartIMG = renderExportChartIMG(newCanvas, baseConfig);

    await new Promise(res => setTimeout(res, 150));

    // Copy chart to a clean canvas
    const cleanCanvas = document.createElement("canvas");
    cleanCanvas.width = newCanvas.width;
    cleanCanvas.height = newCanvas.height;

    const cleanCtx = cleanCanvas.getContext("2d");
    cleanCtx.fillStyle = "#ffffff";
    cleanCtx.fillRect(0, 0, cleanCanvas.width, cleanCanvas.height);
    cleanCtx.drawImage(newCanvas, 0, 0);

    newCanvas.replaceWith(cleanCanvas);

    // Render clone
    const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true
    });

    // Convert to desired export format
    let dataUrl;
    if (mime === "jpeg") {
        const jpegCanvas = document.createElement("canvas");
        jpegCanvas.width = canvas.width;
        jpegCanvas.height = canvas.height;

        const jpegCtx = jpegCanvas.getContext("2d");
        jpegCtx.fillStyle = "#ffffff";
        jpegCtx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
        jpegCtx.drawImage(canvas, 0, 0);

        dataUrl = jpegCanvas.toDataURL("image/jpeg", 0.95);
    } else {
        dataUrl = canvas.toDataURL("image/png");
    }

    const outLink = document.createElement("a");
    outLink.download = "chart_and_table." + ext;
    outLink.href = dataUrl;
    outLink.click();
}


async function SavetoArchive(){
    const text= $('#text_Analysis').value;
    let name= $('#project_name').val();
    if (name.trim() === "") {
        let num_entries = 0;
        try {
            const data = await $.getJSON("/get-all-entries");
            if (data.message === "success") {
                num_entries = data.data.length;
            }
            name = "new data" + ` (${num_entries + 1})`;
        } catch (error) {
            console.error("Error fetching entries:", error);
        }
    }

    console.log(name);

    await fetch('/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            master: masterBySource,
            current:currentBySource,
            style: styleConfig,
            text: (text==="") ? "": text,
            name: (name==="") ? "" : name,
            from: "export_and_save",
        })
    });
    console.log("after fetching");
    $('#save_message').text('saved successfully');
}

async function exportPDF() {
    const element = $("#exportSection")[0];

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jspdf.jsPDF("p", "pt", "letter");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Monthly Analysis Report", pageWidth / 2, y, { align: "center" });
    y += 30;

    const bodyText =
        document.getElementById('Text_Analysis').value;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    const wrapped = pdf.splitTextToSize(bodyText, pageWidth - margin * 2);


    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Page break if needed
    if (y + imgHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
    }

    pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
    y+=imgHeight +15;

    pdf.text(wrapped, margin, y);

    // Move Y down by text height
    y += wrapped.length * 14 + 20;

    pdf.save("export.pdf");
}


function ExportProject(){
    const i = parseInt($('#export_type').val(), 10);
    console.log(i);
    if(i===0){
        if (!exportChart) {
            alert('Chart not rendered yet.');
            return;
        }
        const a = document.createElement('a');
        a.href = document.getElementById('priceChart').toDataURL('image/png');
        a.download = 'price_chart.png';
        a.click();
    }else if(i===1){
        if (!exportChart) {
            alert('Chart not rendered yet.');
            return;
        }
        const a = document.createElement('a');
        a.href = document.getElementById('priceChart').toDataURL('image/jpeg');
        a.download = 'price_chart.jpg';
        a.click();

    }else if(i===2){
        exportFullTable("png")
    }else if(i===3){
        exportFullTable("jpg")
    }else if(i===4){
        exportCombined("png")
    }else if(i===5){
        exportCombined("jpg")
    }else if(i===6){
        exportPDF()
    }
}