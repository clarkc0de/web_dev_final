$(document).ready(function(){
    console.log("on archive");
});

function home(){
    location.href = '/';
}

function createNew(){
    location.href = '/create_new';
}

function getFigureObject(figure) {
    return `<li class="list-group-item" data-f="${figure._id.toString()}">
        <div class="row">
            <div class="col"><a>Name</a></div>
            <div class="col"><a>Details</a></div>
            <div class="col">
                <button class="btn btn-outline-primary">Edit</button>
            </div>
            <div class="col">
                <button class="btn btn-outline-primary">Export</button>
            </div>
            <div class="col">
                <button class="btn btn-outline-primary">Delete</button>
            </div>
        </div>
    </li>`;
}

function showList(figures) {
    $("#figure_list").empty();

    figures.forEach((figure) => {
        $("#figure_list").append(getFigureObject(figure));
    });
}



