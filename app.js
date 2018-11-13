const config = require('./config.js');
let app = require('express')(),
  server = require('http').Server(app),
  turf = require('@turf/turf'),
  fs = require('fs'),
  bodyParser = require('body-parser'),
  Twit = require('twit'),
  io = require('socket.io')(server);

//----------------------//
//---- STREAM STUFF ----//
//----------------------//

let T = new Twit({
  consumer_key:         config.config.consumer_key,
  consumer_secret:      config.config.consumer_secret,
  access_token:         config.config.access_token,
  access_token_secret:  config.config.access_token_secret,
  timeout_ms:           config.config.timeout_ms,    // optional HTTP request timeout to apply to all requests.
  strictSSL:            config.config.strictSSL,     // optional - requires SSL certificates to be valid.
})
let sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]
let washArea = ['-78.420410','38.513788','-76.107788','39.474365'];
let twitterSearchCriteria = [];

// commas as logical ORs, while spaces are equivalent to logical ANDs
// let stream = T.stream('statuses/filter', { track: 'storm hurricane tornado', locations: sanFrancisco })
// let stream = T.stream('statuses/filter', { track: 'storm, hurricane, tornado, lightning, fire, wildfire, flood' })

// define interactions with client
io.on('connection', function (socket) {
  console.log('Connecting to Twitter stream...')

  let twitterFilter = 'storm, hurricane, tornado, lightning, fire, wildfire, flood';
  // let twitterFilter = 'trump';
  socket.on('twitterFilter', function (userFilter) {
    console.log('new filter:', userFilter)
    if (userFilter !== null) {
      console.log('stop/start stream!')
      // TODO: this isn't actually working...  no new criteria is being sent.
      stream.stop()
      twitterFilter = userFilter;
      stream.start()
    }
  });

  console.log('firing up stream again')
  let stream = T.stream('statuses/filter', { track: twitterFilter })

  stream.on('tweet', function (tweet) {
    if (tweet.place !== null && tweet.place.bounding_box !== null) {
      // console.log('tweet', tweet.text)
      // fix the poly
      let tweetPoly = tweet.place.bounding_box.coordinates;
      tweetPoly[0].push(tweetPoly[0][0])

      let geoPoint = turf.centerOfMass(turf.polygon(tweetPoly));
      tweet.userLoc = geoPoint;

      // append text to geoJson portion of object being sent
      // TODO fix this
      tweet.userLoc.properties.text = tweet.text;

      console.log('filter being used', twitterFilter)
      // only emit tweets with proper geoCords
      socket.emit('twitter feed', tweet)
    }

  })

  socket.on('disconnect', function () {
    console.log('disconnecting...')
  })
});

//----------------------//
//---- END OF STREAM ----//
//----------------------//



// Dynamically set the port that this application runs on so that Heroku
// can properly wrap the way that it connects to the outside network
app.set('port', (process.env.PORT || 3000));

app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/random', function (req, res) {
  let randomCount = req.body.randomCount;

  let points = turf.randomPoint(100, {bbox: [-90, 35, -105, 40]});
  let randomGeoJson = turf.sample(points, randomCount);

  console.log('----------- Random (', randomGeoJson.length, ') ----------')
  res.send({
    randomGeoJson: randomGeoJson
  })
})

app.post('/searchwithin', function(req, res) {
  let assets = req.body.assets;
  let searchWithin = req.body.searchWithin;
  let alertPolys = [];
  let affectedAssets = [];

  searchWithin.forEach((alertArea) => {
    alertPolys.push(alertArea.geometry.coordinates);
  });

  let multiPoly = turf.multiPolygon(alertPolys);

  assets.forEach((asset) => {
    let point = turf.point(asset.geometry.coordinates);
    if (turf.booleanPointInPolygon(point, multiPoly)) {
      affectedAssets.push(point);
    }
  });

  console.log('----------- Affected (', affectedAssets.length, ') ----------')
  // console.log(affectedAssets)
  res.send({
    copyOfReq: req.body,
    affectedAssets: affectedAssets
  });
});

server.listen(3000)
