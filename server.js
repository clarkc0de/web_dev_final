const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();



app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(__dirname + "/public"));


app.listen(3000, function () {
    console.log("server started at 3000");
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.get('/archive', function (req, res) {
    res.sendFile(__dirname + "/public/archive.html");
})

app.get('/edit_figure', function (req, res) {
    res.sendFile(__dirname + "/public/edit_figure.html");
})

app.get('/create_new', function (req, res) {
    res.sendFile(__dirname + "/public/create_new.html");
})

app.get('/export_and_save', function (req, res) {
    res.sendFile(__dirname + "/public/export_and_save.html");
})


app.post('/', function(req, res) {
    res.redirect('/');
})


let temporaryCSV = null;

app.post('/upload-csv', function(req, res) {

    //console.log("BODY:", req.body);
    //res.send("ok");


    const { csv } = req.body;

    if (!csv) {
        return res.send("No CSV provided");
    }

    temporaryCSV = csv;  // store the uploaded CSV text

    res.send("CSV received");
});


app.get('/get-csv', function(req, res) {
    if (!temporaryCSV) {
        return res.send("No CSV stored");
    }

    res.send(temporaryCSV);
});