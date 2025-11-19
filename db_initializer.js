
const fs = require('fs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/salesDB', {})
    .then(function(db) {
        console.log("db connected");
    });
