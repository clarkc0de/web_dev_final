$(document).ready(function(){
    //console.log("on home page");
})

function home(){
    location.href = '/';
}

function viewArchive(){
    location.href = '/archive';
}

function onCancel(){
    home()
}

function makeFigure(){
    const input = $('#formFile')[0];
    const file = input.files[0];

    if (!file) {
        console.log("No file selected.");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function(e) {
        const csvText = e.target.result;  // the file’s actual content
        console.log(csvText);
        await fetch('/upload-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv: csvText })
        });

        //location.href = '/edit_figure';
        location.href = '/edit_figure';
}
    reader.readAsText(file);
}