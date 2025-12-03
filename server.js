const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();


const entrySchema = {
    master: Object,
    current: Object,
    style: Object,
    text:{
        required:false,
        type:String,
    },
    name:{
        required:false,
        type:String,
    }
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

    console.log("got here");
    //res.send("ok");
    const from = req.body.from;

    if (from==="create_new") {
        const {csv} = req.body;

        if (!csv) {
            return res.send("No CSV provided");
        }

        temporaryCSV = csv;  // store the uploaded CSV text
        //console.log(temporaryCSV);
        res.send("CSV received");

        let csvString = '';
        const row = req.body.row;
        const col = req.body.col;

        // Split the CSV by rows and columns (this may vary depending on your CSV format)
        const rows = temporaryCSV.split('\n');  // Split by rows
        rows.forEach(row => {
            const columns = row.split(',');  // Split by columns (assuming comma-separated values)
            csvString += columns.join(' ') + ' ';  // Join columns into a string with spaces (or any delimiter you prefer)
        });

        console.log('CSV String:', csvString);


    }else if (from==="export_and_save") {
        const csv= req.body;

        if (!csv) {
            return res.send("No CSV provided");
        }

        temporaryCSV = csv;  // store the uploaded CSV text
        console.log(temporaryCSV);
        res.send("CSV received");


        const entry = {
            master: req.body.master,
            current: req.body.current,
            style: req.body.style,
            text:(req.body.text==="") ? null : req.body.text,
            name: (req.body.name==="" ? null : req.body.name),
        }
        addOne(entry);

    }

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

app.post('/export_and_save', function(req, res) {
    temporaryCSV = req.body.instanceData;
    console.log(temporaryCSV);
    if(!temporaryCSV) {
        return res.send("No CSV stored");
    }
    res.send(`
         <script>location.href="/export_and_save.html"</script>`
    );
})

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

// WIP deleting single entry from mongoose
app.post('/delete-entry-by-id', function (req, res) {
    Entry.deleteOne({"id":req.body.figure_id})
        .then(entry => {
            res.send({"message": "success"});
        }).catch(err => {
            res.send({"message": err});
    });
});