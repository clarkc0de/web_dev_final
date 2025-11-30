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

// functions for displaying list
function getFigureObject(figure) {
    return `<li class="list-group-item" data-f="${figure._id.toString()}">
        <div class="row">
            <div class="col"><a>Name</a></div>
            <div class="col"><a>Details</a></div>
            <div class="col">
                <button class="btn btn-primary" onclick="editFigure()">Edit</button>
            </div>
            <div class="col">
                <button class="btn btn-primary" onclick="exportFigure()">Export</button>
            </div>
            <div class="col">
                <button class="btn btn-danger" onclick="deleteFigure()">Delete</button>
            </div>
        </div>
    </li>`;
}

function showList(figures) {
    $("#figure_list").empty();

    figures.forEach(figure => {
        $("#figure_list").append(getFigureObject(figure));
    });
}

$.getJSON("/get-all-entries").done(
    data => {
        if (data.message === "success") {
            console.log(data.data);
            showList(data.data);
        }
    }
);

// functions to make working buttons
function editFigure() {
    console.log("editFigure called");
}

function exportFigure() {

}

function deleteFigure() {

}