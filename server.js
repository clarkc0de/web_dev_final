const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();


const entrySchema = {
    name: String,
    csv: String,
    row: String,
    col: String,
}

const Entry = mongoose.model('Entry', entrySchema);

mongoose.connect('mongodb://localhost:27017/salesDB').then(() => {
    console.log("db connected");
}).catch(err => {
    console.error("could not connect to db: " + err);
})

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(__dirname + "/public"));


app.listen(3000, function () {
    console.log("server started at http://localhost:3000");
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
    console.log(temporaryCSV);
    res.send("CSV received");

    let csvString = '';

    // Split the CSV by rows and columns (this may vary depending on your CSV format)
    const rows = temporaryCSV.split('\n');  // Split by rows
    rows.forEach(row => {
        const columns = row.split(',');  // Split by columns (assuming comma-separated values)
        csvString += columns.join(' ') + ' ';  // Join columns into a string with spaces (or any delimiter you prefer)
    });

    console.log('CSV String:', csvString);
    const csv_name = req.body.csv_name;
    const row = req.body.row;
    const col = req.body.col;

    const entry = {
        name: csv_name,
        csv: csvString,
        row: row,
        col: col,
    }
    addOne(entry);
});

async function addOne(entry){
    try{
        console.log("Saving");
        console.log(entry);
        const new_entry = new Entry(entry);
        await new_entry.save().then(()=>{console.log("saved")});
    }
    catch(err){
        console.log("Found error:" + err);
    }
}

app.get('/get-csv', function(req, res) {
    if (!temporaryCSV) {
        return res.send("No CSV stored");
    }

    res.send(temporaryCSV);
});

app.get('/get-all-entries', function (req, res) {
    Entry.find().then(entries => {
        res.send({
            "message": "success",
            "data": entries
        });
    }).catch(err => {
        res.send({
            "message": err,
            "data": []
        });
    });
});