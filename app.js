let express = require('express'),
  app = express(),
  turf = require('@turf/turf'),
  bodyParser = require('body-parser'),
  OAuth = require('oauth'),
  Twit = require('twit');

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

app.post('/twittergetter', function (req, res) {
  let results = {};

  var T = new Twit({
    consumer_key:         'tNBsGKO4JZE6peBHcBzkWttQO',
    consumer_secret:      'vaJFF2XuEE6IapDHC9CYYt5lTUskKMHIRPiYOkKF2Tn0W5WNB9',
    access_token:         '1054847332230012930-2fl0igkVRRlxn0i9BwsQxzNwO37FnW',
    access_token_secret:  'hymESo2uTVnWnKuctJ0dEuoBtgniRpLNQkZ4RD3Ds9gKP',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })

  //
  //  search twitter for all tweets containing the word 'banana' since July 11, 2011
  //
  // T.get('search/tweets', { q: 'tornado since:2018-11-01', count: 100 }, function(err, data, response) {
  //   results = response
  //   res.send({
  //     res: data
  //   })
  // })

  //
  // filter the public stream by the latitude/longitude bounded box of San Francisco
  //
  let sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]
  let washArea = ['-78.420410','38.513788','-76.107788','39.474365'];

  // commas as logical ORs, while spaces are equivalent to logical ANDs
  let stream = T.stream('statuses/filter', { track: 'storm, hurricane, tornado', locations: washArea })

  stream.on('tweet', function (tweet) {
    console.log(tweet.user.screen_name, ': ', tweet.text)

    let twitterHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    // tweet.pipe(dst)
    // const readable = tweet;
    // readable.on('data', (chunk) => {
    //   console.log(`Received ${chunk.length} bytes of data.`);
    // });


    res.send({
      res: tweet
    })
  })

  // let twitterHeaders = {
  //     'Access-Control-Allow-Origin': '*',
  //     'Accept': '*/*',
  //     'Content-Type': 'application/x-www-form-urlencoded',
  // }
  // let oa = new OAuth.OAuth(
  //   'https://api.twitter.com/oauth/request_token',
  //   'https://api.twitter.com/oauth/access_token',
  //   'tNBsGKO4JZE6peBHcBzkWttQO',
  //   'vaJFF2XuEE6IapDHC9CYYt5lTUskKMHIRPiYOkKF2Tn0W5WNB9',
  //   '1.0A',
  //   null,
  //   'HMAC-SHA1',
  //   'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
  //    twitterHeaders
  // )
  //
  // oa.post(
  //   // 'https://api.twitter.com/1.1/trends/place.json?id=23424977',
  //   'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=twitterapi&count=2',
  //   '1054847332230012930-2fl0igkVRRlxn0i9BwsQxzNwO37FnW',
  //   'hymESo2uTVnWnKuctJ0dEuoBtgniRpLNQkZ4RD3Ds9gKP ',
  //   function (e, data, res) {
  //     results = res
  //
  //     if (e) console.error(e);
  //     console.log(require('util').inspect(data));
  //   }
  // )

  // res.send({
  //   res: results
  // })
})

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

app.use(express.static(__dirname + '/public'));

let server = app.listen(app.get('port'), function () {
  let host = server.address().address;
  let port = server.address().port;
  console.log('running %s %s', host, port);
});


//let oa = new OAuth.OAuth(
//     'https://api.twitter.com/oauth/request_token',
//     'https://api.twitter.com/oauth/access_token',
//     'tNBsGKO4JZE6peBHcBzkWttQO',
//     'vaJFF2XuEE6IapDHC9CYYt5lTUskKMHIRPiYOkKF2Tn0W5WNB9',
//     '1.0A',
//     null,
//     'HMAC-SHA1',
//     { 'timestamp': req.body.timestamp },
//     { 'headers': twitterHeaders }  // these are headers
//   );
