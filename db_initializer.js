
const fs = require('fs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/salesDB', {})
    .then(function(db) {
        console.log("db connected");
    });


const entrySchema = {
    csv: String,
    row: String,
    col: String,
}

const Entry = mongoose.model('Entry', entrySchema);
// const movieList = [];
//
// jsonList.forEach(movie => {
//     movieList.push({
//         'title': movie.title,
//         'rating': movie.vote_average,
//         'poster_path':'http://image.tmdb.org/t/p/w342' + movie.poster_path,
//         'release_date':movie.release_date,
//         'overview':movie.overview,
//     });
// })
// Movie.insertMany(movieList).then(result => {
//     mongoose.connection.close();
// }).catch(err => console.log(err));