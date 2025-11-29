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
        const row = document.getElementById('row-input').value;

        // Get the value of the col input field
        const col = document.getElementById('col-input').value;

        await fetch('/upload-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv: csvText, row:row, col: col })
        });

        //location.href = '/edit_figure';
        location.href = '/edit_figure';
}
    reader.readAsText(file);
}