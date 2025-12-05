$(document).ready(function(){
    // console.log("on archive");
});

// functions for navbar
function home(){
    location.href = '/';
}

function createNew(){
    location.href = '/create_new';
}

// functions for search bar
function searchArchive() {

}


// functions for displaying list
function getFigureObject(figure, idx) {
    const rowClass = idx%2 === 0? 'even-row' : 'odd-row';
    return `<li class="list-group-item ${rowClass}" data-f="${figure._id.toString()}">
        <div class="row">
            <div class="col"><a>${figure.name}</a></div>
            <div class="col">
                <button class="btn btn-primary" onclick="editFigure('${figure._id}')">Edit</button>
            </div>
            <div class="col">
                <button class="btn btn-primary" onclick="exportFigure('${figure._id}')">Export</button>
            </div>
            <div class="col">
<button class="btn btn-danger" onclick="deleteFigure('${figure._id}')">Delete</button>
            </div>
        </div>
    </li>`;
}

function showList(figures) {
    $("#figure_list").empty();

    figures.forEach((figure, idx) => {
        $("#figure_list").append(getFigureObject(figure, idx));
    });

}

$.getJSON("/get-all-entries").done(
    data => {
        if (data.message === "success") {
            //console.log(data.data);
            showList(data.data);
        }
    }
);

// functions to make working buttons
function editFigure(figure_id) {
    console.log("editFigure called");
    //console.log(figure_id);

    $.post("/edit-entry-by-id", {"_id":figure_id})
        .done(function (data) {
            console.log(data.message);
            if (data.message === "success") {
                location.href = "/edit_figure?from=archive";
            }
        });
}

function exportFigure(figure_id) {
    console.log("exportFigure called");

    $.post("/export-entry-by-id", {"_id":figure_id})
        .done(function (data) {
            console.log(data.message);
            if (data.message === "success") {
                location.href = "/export_and_save?from=archive";
            }
        });

}
function deleteFigure(figure_id) {
    console.log(figure_id);

    $.post("/delete-entry-by-id", { _id: figure_id })
        .done(function (data) {
            console.log(data.message);
            if (data.message === "success") {
                location.href = "/archive";
            }
        });
}
