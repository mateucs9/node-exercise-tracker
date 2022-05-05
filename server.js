'use-strict'

const express = require('express')
const app = express()
const cors = require('cors')
const mongo = require('mongodb')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Database Connection
mongoose.connect(
  process.env['MONGO_URI'], {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

const connection = mongoose.connection;
connection.once('open', () => console.log('successfully connected'))

const { Schema, Types } = mongoose;

const exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String }
})

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema]
})



const USERS = mongoose.model('USERS', userSchema)
const EXERCISES = mongoose.model('EXERCISES', exerciseSchema)


app.post('/api/users', function(req, res) {
  let username = req.body.username;

  USERS.countDocuments({ username: username }, function(err, count) {
    if (count > 0) {
      res.send('Sorry, but ' + username + ' is already taken');
    } else {
      const newUser = new USERS({ username: username });
      newUser.save(function(err, user) {
        if (err) {
          console.log(err);
        } else {
          res.json({ "_id": user._id.toString(), username: username });
        }
      });
    }
  })
})

app.get('/api/users', async function(req, res) {
  let users = await USERS.find();
  res.send(users.map((doc) => { return { _id: doc.id, username: doc.username } }))
})

app.post('/api/users/:_id/exercises', function(req, res) {
  var date = req.body.date != '' && req.body.date != undefined ? new Date(req.body.date).toDateString() : new Date().toDateString();

  const newExercise = new EXERCISES({
    description: req.body.description,
    duration: req.body.duration,
    date: date
  })

  USERS.findByIdAndUpdate(req.params._id, { $push: { log: newExercise } }, { new: true }, (err, userUpdated) => {
    if (!err) {
      res.json({
        username: userUpdated.username,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date,
        _id: userUpdated._id
      })
    }

  })
})

app.get('/api/users/:_id/logs', function(req, res) {
  USERS.findById(req.params['_id'], (err, user) => {
    if (err) {
      console.log(err);
    } else {
      let userData = { ...user._doc };

      const { from, to, limit } = req.query;

      if (from) {
        const fromDate = new Date(from);
        console.log(fromDate);
        userData.log = userData.log.filter((exercise) => {
          console.log(new Date(exercise.date));
          return (new Date(exercise.date)) > fromDate;
        })
      }

      if (to) {
        const toDate = new Date(to);
        userData.log = userData.log.filter((exercise) => {
          
          return (new Date(exercise.date)) < toDate;
        })
      }

      if (limit) {
        console.log(limit);
        userData.log = userData.log.slice(0, limit);
      }

      userData.count = user.log.length;
      res.json(userData);
      console.log(userData);
    }
  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

