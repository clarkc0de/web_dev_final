$(document).ready(function(){
    console.log("on home page");
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