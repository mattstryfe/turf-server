let app = require('express')(),
  server = require('http').Server(app)
  turf = require('@turf/turf'),
  fs = require('fs'),
  bodyParser = require('body-parser'),
  Twit = require('twit'),
  io = require('socket.io')(server);

const { Transform } = require('stream');

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

// define interactions with client
io.on('connection', function (socket) {
  console.log('Connecting to Twitter stream...')

  let T = new Twit({
    consumer_key:         'tNBsGKO4JZE6peBHcBzkWttQO',
    consumer_secret:      'vaJFF2XuEE6IapDHC9CYYt5lTUskKMHIRPiYOkKF2Tn0W5WNB9',
    access_token:         '1054847332230012930-2fl0igkVRRlxn0i9BwsQxzNwO37FnW',
    access_token_secret:  'hymESo2uTVnWnKuctJ0dEuoBtgniRpLNQkZ4RD3Ds9gKP',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })
  let sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]
  let washArea = ['-78.420410','38.513788','-76.107788','39.474365'];

  // commas as logical ORs, while spaces are equivalent to logical ANDs
  let stream = T.stream('statuses/filter', { track: 'storm, hurricane, tornado', locations: washArea })

  stream.on('tweet', function (tweet) {
    socket.emit('twitter feed', tweet)
  })

  // this isnt causing the error
  socket.on('disconnect', function () {
    console.log('disconnecting...')
  })

});

/*app.post('/twittergetter', function (req, res, socket) {
  let T = new Twit({
    consumer_key:         'tNBsGKO4JZE6peBHcBzkWttQO',
    consumer_secret:      'vaJFF2XuEE6IapDHC9CYYt5lTUskKMHIRPiYOkKF2Tn0W5WNB9',
    access_token:         '1054847332230012930-2fl0igkVRRlxn0i9BwsQxzNwO37FnW',
    access_token_secret:  'hymESo2uTVnWnKuctJ0dEuoBtgniRpLNQkZ4RD3Ds9gKP',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })
  let sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]
  let washArea = ['-78.420410','38.513788','-76.107788','39.474365'];

  // commas as logical ORs, while spaces are equivalent to logical ANDs
  let stream = T.stream('statuses/filter', { track: 'storm, hurricane, tornado', locations: washArea })


  stream.on('tweet', function (tweet, ) {
    // process.stdin.pipe(tweet.objectToString)
    // tweet.pipe(dst)
    // const readable = tweet;
    // readable.on('data', (chunk) => {
    //   console.log(`Received ${chunk.length} bytes of data.`);
    // });

    // rs.push(tweet)

    // res.send({
    //   res: rs
    // })
  })
  //stream.pipe(fs.createWriteStream('tweets.json'))
})*/

app.post('/random', function (req, res) {
  let randomCount = req.body.randomCount;

  let points = turf.randomPoint(100, {bbox: [-90, 35, -105, 40]});
  let randomGeoJson = turf.sample(points, randomCount);

  console.log('----------- Random ----------')
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

  console.log('----------- affected ----------')
  console.log(affectedAssets)
  res.send({
    copyOfReq: req.body,
    affectedAssets: affectedAssets
  });
});

server.listen(3000)
// let server = app.listen(app.get('port'), function () {
//   let host = server.address().address;
//   let port = server.address().port;
//   console.log('running %s %s', host, port);
// });
