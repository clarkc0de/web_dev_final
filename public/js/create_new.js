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
    const row = $('#row-input');
    const col = $('#col-input');


    //find error message and border and clear it
    const csvDiv = document.getElementById('formFile');
    const rowDiv = document.getElementById('row-input');
    const colDiv = document.getElementById('col-input');
    csvDiv.style.border ="";
    rowDiv.style.border ="";
    colDiv.style.border ="";
    $('#error_message').text('');
    //show error
    if (!file) {
        console.log("No file selected.");
        $('#error_message').text('No file selected.');
        csvDiv.style.border = "2px solid red";
        return;
    }

    if(row.val().length < 3){
        console.log(row.val());
        $('#error_message').text('Please select row name.');
        rowDiv.style.border = "2px solid red";
        return;
    }
    if(col.val().length < 3){
        console.log(col.val());
        $('#error_message').text('Please select column name.');
        colDiv.style.border = "2px solid red";
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
            body: JSON.stringify({ csv: csvText, row:row, col: col, from: "create_new"})
        });

        //location.href = '/edit_figure';
        location.href = '/edit_figure';
}
    reader.readAsText(file);
}