var loading_screen;

var ParkingMap = ParkingMap || {};

(function () {
  'use strict';

  var mapLayers = {};
  var layerNames = [
  'scooters', 
  'lots',
  'valet',
  'snowroutes',
  'meters',
  'rpp',
  'rppdistricts',
  'meters-testing',
  'satellite'];

  var accessToken = 'pk.eyJ1IjoibGF1cmVuYW5jb25hIiwiYSI6ImNpa2d4YWpubTAwdXR1eGttcmw5dXYyenIifQ.JeAAAiEbZq3OB4L0cShJMA';

  var mapProgressDom = document.getElementById('map-progress');

  // some basic platform detection
  var is = {
    // iOS, see http://stackoverflow.com/questions/9038625/detect-if-device-is-ios
    iOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  };

  var INTERACTIVE_PATTERN = /\.i$/;
  var isInteractive = function (feature) {
    /* Check whether the given feature belongs to an
     * interactive layer.
     */
    var layerName = feature.layer.id;
    return INTERACTIVE_PATTERN.test(layerName) && ParkingMap.map.getLayoutProperty(layerName, 'visibility') === 'visible';
  };

  var featuresAt = function (map, point, options, callback) {
    /* A wrapper around mapboxgl.Map.featuresAt that will
     * only take interactive layers into account. Layer
     * interactivity is determined by the isInteractive
     * function.
     *
     * TODO: Allow overriding the isInteractive method from
     * within the options.
     */

    // Hijack the callback.
    var hijacked = function (err, features) {
      var filteredFeatures = [],
        i;
      for (i = 0; i < features.length; i++) {
        if (isInteractive(features[i])) {
          filteredFeatures.push(features[i]);
        }
      }
      callback(err, filteredFeatures);
    };

    // Call mapboxgl.Map.featuresAt with the hijacked callback function.
    map.featuresAt(point, options, hijacked);
  };

  ParkingMap.initFancyMap = function () {
    var map;

    mapboxgl.accessToken = accessToken;

    // Set bounds to Philadelphia metro
    var bounds = [
  [-75.387541, 39.864439],
  [-74.883544, 40.156325]
];

    var map = ParkingMap.map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'mapbox://styles/laurenancona/cij3k82x800018wkmhwgg7tgt', // stylesheet location
      center: [-75.1694, 39.9294],
      bearing: 9.2, // Rotate Philly ~9° off of north, thanks Billy Penn.
      zoom: 12,
      maxZoom: 19,
      minZoom: 12,
      pitch: 60,
      attributionControl: true,
      //    maxBounds: bounds,
      hash: true,
      touchRotate: false
    });
    
    
    
    // Change cursor state when hovering on interactive features

    var getPoint = function (evt) {
      // MapboxGL will call it `point`, leaflet `containerPoint`.
      return evt.point || evt.containerPoint;
    };

    ParkingMap.map.on('mousemove', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);
        featuresAt(map, point, {
          radius: 7
        }, function (err, features) {
          if (err) throw err;
          ParkingMap.map._container.classList.toggle('interacting', features.length > 0);
          //  document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
        });
      }
    });

    /* setTimeout instead of waiting for user to click
       from https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout:
    */

    ParkingMap.map.on('load', function (evt) {
      window.setTimeout(goHome, 2000);
    });

    function goHome() {
    // debugger
      if (map.loaded()) {
        var p = map.getPitch();
        console.log(p);
        if (p > 0) {
          map.flyTo({
            center: [-75.1646, 39.9516],
            zoom: 15,
            speed: 0.3,
            bearing: 9.2,
            pitch: 0
          });
        }
      }
    }

    // Add/remove class for bottom button onClicks
    // From https://developer.mozilla.org/en-US/docs/Web/API/Element/classList

    // if class 'quiet' is set, remove it. Otherwise add it:
    var geocoderCt = document.getElementById('geocoder-container'),
        geocoderInput;

    document.getElementById('search').addEventListener('click', function (evt) {
      geocoderCt.classList.toggle('quiet');

      if (!geocoderInput) {
        geocoderInput = geocoderCt.querySelector('input');
      }

      geocoderInput.focus();
      geocoderInput.setSelectionRange(0, 9999);
    });
    
    // add/remove 'quiet', depending on test conditional, i less than 10
    
    // div.classList.toggle("visible", i < 10 );
    // alert(div.classList.contains("foo"));
    // div.classList.add("foo","bar"); //add multiple classes
    
    // Listen for clicks on features & pass data to templates
    ParkingMap.map.on('click', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);

        // Find what was clicked on
        featuresAt(map, point, {
          radius: 10
            // includeGeometry: true // for recentering map onClick
        }, function (err, features) {
          var layerName, feature;

          if (err) throw err;
          if (features.length > 0) { // if there are more than none features
            feature = features[0];
            layerName = feature.layer.id;
            if (layerName === 'meters-testing') {
              showInfo(layerName, features);
            } else {
              showInfo(layerName, feature);
            }
          } else {
            empty();
          }
        });
      }
    });

    var updateLayerVisibility = function (layerName) {
      var toggledLayers = mapLayers[layerName] || [];
      if (document.getElementById(layerName).checked) {
        toggledLayers.forEach(function (layer) {
          map.setLayoutProperty(layer.id, 'visibility', 'visible');
        });
      } else {
        toggledLayers.forEach(function (layer) {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
        });
      }
    };

    /* Define layers & interactivity
     *  TODO: Refactor using docs so that layers are only 
     *  loaded when selected (instead of loading everything first, 
     *  then disabling after UI state check)
     */
//    map.on('load', function () {
    map.on('load', function () {
      var layerAssociation = { //using '.i' in GL layernames we want to be interactive
        'scooters': ['scooters.i'],
        'valet': ['valet.i'],
        'snowroutes': ['snow_emergency_routes', 'snow_emergency_routes.label'],
        'lots': ['lots.i', 'lots.label'],
        'meters': ['meterblocks_n.i', 'meterblocks_s.i', 'meterblocks_e.i', 'meterblocks_w.i', 'meters.i', 'meters.circle.i'],
        'rpp': ['rppblocks_bothsides.i', 'rppblocks_1side.i', 'rppblocks.label'],
        'rppdistricts': ['rppdistricts', 'rppdistricts.line', 'rppdistricts.label', 'rppdistricts.line_case'],
        'meters-testing': ['meters-testing-side.i'],
        'satellite': ['satellite']
      };
            
      loading_screen.finish();
      map.resize();
      
        // Disable the default error handler
        map.off('style.error', map.onError);
        map.off('source.error', map.onError);
        map.off('tile.error', map.onError);
        map.off('layer.error', map.onError);

      layerNames.forEach(function (layerName, index) {
        // Associate the map layers with a layerName.
        var interactiveLayerNames = layerAssociation[layerName];
        interactiveLayerNames.forEach(function (interactiveLayerName) {
          var interactiveLayer = map.style.getLayer(interactiveLayerName);
          if (!mapLayers[layerName]) {
            mapLayers[layerName] = [];
          }
          if (interactiveLayer) {
            mapLayers[layerName].push(interactiveLayer);
          }
        });

        // Bind the checkbox change to update layer visibility.

        document.getElementById(layerName).addEventListener('change', function () {
          updateLayerVisibility(layerName);
        });

        // Set the initial layer visibility to match the toggle.

        updateLayerVisibility(layerName);
      });
    });

    // Add Mapbox Geocoder

    var geocoder = new mapboxgl.Geocoder({
      container: 'geocoder-container'
    });

    map.addControl(geocoder);

    // After the map style has loaded on the page, add a source layer and default
    // styling for a single point. 

    map.on('style.load', function () {
      map.addSource('single-point', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": []
        }
      });

      map.addLayer({
        "id": "point",
        "source": "single-point",
        "type": "circle",
        "paint": {
          "circle-radius": 6,
          "circle-color": "#EFFC1C"
        }
      });
      
      // Add Geolocator via HTML5 API

      var geoLocating = false;
//      var watchID;
      
      document.getElementById('locate').addEventListener('click', function(evt) {
        if (!navigator.geolocation) {
          alert('no location 4 u!!!!1');
          return;
        }

        // bail if we're already waiting for the location
        if (geoLocating) {
        /*  console.log("Stopping watchID "+watchID)
          navigator.geolocation.clearWatch(watchID);
          geoLocating = false; */
          return;
        }

        // show a progress bar while we look for you
        mapProgressDom.style.visibility = '';
        geoLocating = true;

        // locate user and watch for movement
        // https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/Using_geolocation
        // watchID = navigator.geolocation.watchPosition(function(position) {
          navigator.geolocation.getCurrentPosition(function(position) {
          var myLocation = {
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude]
          };
          mapProgressDom.style.visibility = 'hidden';
          console.log('got position: lon=%o, lat=%o', position.coords.longitude, position.coords.latitude);
          geoLocating = false;
          map.getSource('single-point').setData(myLocation); 
          map.flyTo({
            center: myLocation.coordinates,
            zoom: 15
          });
        }, function() {
          alert('current postion not available');
        });
      })

      // Listen for the `geocoder.input` event that is triggered when a user
      // makes a selection and add a marker that matches the result.

      geocoder.on('geocoder.input', function (evt) {
        map.getSource('single-point').setData(evt.result.geometry);
        var center = evt.result.geometry.coordinates;
        console.log(center);
        
        if (geocoderInput) {
          geocoderInput.blur(); // blur so keyboard goes away
        }

        // override janky Philadelphia bounding box bug by forcing center on point
        map.flyTo({
          center: center,
          zoom: 15
        });
      });
    });

    // disable map rotation using touch gesture because that shit's cray
    map.touchZoomRotate.disableRotation();

    // map.addControl(new mapboxgl.Navigation());
  };

  var showInfo = function (tpl, feature) {
    console.log('Here is your info', tpl);
    var content;

    switch (tpl) {
    case 'rppblocks_bothsides.i':
    case 'rppblocks_1side.i':
        content = '<div><span class="location">' + 
          feature.properties.block_street + '&nbsp;&nbsp;' + 
          '</span><br>' +          
          '<span class="rpp"><span class="loading-icons material-icons">' +
          '<img src="img/icons/RPP.svg"></span>' + 
          '<span class="no-parking">' + feature.properties.sos + 
          '<br>Residential Permit Parking</span>' +
          '</span></div>';
      break;

    case 'lots.i':
      content = '<div>' + (feature.properties.name ?
          '<span class="location">' + feature.properties.name + ' </span>' : '') +
        '<span class="detail">' + (feature.properties.description ?
          feature.properties.description : '') +
        (feature.properties.address ?
          '<br>' + feature.properties.address : '') +
        (feature.properties.type ?
          '<br>' + feature.properties.type : '') +
        (feature.properties.capacity ?
         '&nbsp; | &nbsp;Capacity: ' + feature.properties.capacity : '') +
        (feature.properties.hours ?
          '<br>' + feature.properties.hours : '') +
        (feature.properties.days ?
          '<br>' + feature.properties.days : '') +
        (feature.properties.times ?
          ' &nbsp;' + feature.properties.times : '') +
        (feature.properties.rates ?
          '<br><span class="detail">Rates: ' + feature.properties.rates + '</span>' : '') +
        (feature.properties.notes ?
          '<br>' + feature.properties.notes + '<br>' : '') + '</span></div>';
      break;

    case 'valet.i':
      content = '<div>' + (feature.properties.Name ?
          '<span class="location">' + feature.properties.Name + '</span>' : '') +
        (feature.properties.Hours ?
          '<p class="detail">Hours: ' + feature.properties.Hours + '<br>' : '') +
        (feature.properties.Spaces ?
          'Spaces: ' + feature.properties.Spaces : '') +
        '</p></div>';
      break;

    case 'meterblocks_n.i':
    case 'meterblocks_s.i':
    case 'meterblocks_e.i':
    case 'meterblocks_w.i':
      content = []; // TODO: do this outside the switch once all are converted
      content.push('<div>');
      
      if (feature.properties.l_hund_block_label) {
        content.push(
          '<span class="location">',
            feature.properties.l_hund_block_label,
          '</span>',
          '<br>'
        );
      }
       
      content.push(
        '<div class="regulations clearfix">',
          '<span class="regulations-side">',
          feature.properties.side,
          ' side </span><br>',
          '<span class="rate">',
          '<i class="material-icons">settings_input_hdmi</i>',
          '</span>',
        
          '<span class="tariff">',
            (
              feature.properties.rate1 
              ? feature.properties.rate1 + '&nbsp;&nbsp;' + feature.properties.rate
              : ''
            ),
            (
              feature.properties.rate2 
              ? '<br>' + feature.properties.rate2 + '&nbsp;&nbsp;' + feature.properties.rate 
              : ''
            ),
            (
              feature.properties.rate3 
              ? '<br>' + feature.properties.rate3 + '&nbsp;&nbsp;' + feature.properties.rate
              : ''
            ),
          '</span>',
        '</div>'
      );
      
      if (feature.properties.no_parking_message) { 
        
        content.push(
          '<div class="exceptions">',
          '<span class="loading-icons"><i class="material-icons">not_interested</i></span>',
            '<span class="no-parking">',
              (
                feature.properties.no_parking_message 
                ? feature.properties.no_parking_message + '<br>' 
                : ''
              ),
              (
                feature.properties.no_parking1
                ? feature.properties.no_parking1 + '<br>'
                : ''
              ),
              (
                feature.properties.no_parking2 
                ? feature.properties.no_parking2
                : ''
              ),
            '</span>',
          '</div>'
        );
      }
        
      content.push('</div>');
        
      content = content.join('');
      break;

    case 'meters-testing-side.i':
      var template = _.template(
        '<div id="meter-info" style="margin-left:auto;margin-right:auto;max-width:350px;">' +
        '<% _.each(features,function(regulations,key){ %>' +
        '<span class="location"><%= key %></span><br>' +
        '<span class="detail-icon"><img src="img/icons/meter.svg"/></span>' +
        '<span class="detail"><% _.each(regulations,function(regulation){ %>' +
        '<%= regulation.properties.from_day %> - <%= regulation.properties.to_day %> &nbsp;' +
        ' <%= regulation.properties.from_time %> - <%= regulation.properties.to_time %> &nbsp;' +
        ' $<%= regulation.properties.rate %> &nbsp;&nbsp;' +
        'Limit: <%= (regulation.properties.limit_hr ? regulation.properties.limit_hr + " hr" : "") %>' +
        '<%= (regulation.properties.limit_min ? regulation.properties.limit_min + " min" : "") %> &nbsp;' +
        '&nbsp; <small><%= regulation.properties.seg_id %></small><hr>' +
        '<% }) %>' +
        '<% }) %></span></div>');

      var byStreet = _.groupBy(feature, function (value) {
        return value.properties.street + ', ' + value.properties.side + ' Side';
      });
      content = template({
        'features': byStreet
      });
      break;

    default:
      content = '<div>' + (feature.properties.name ?
          '<span class="location">' + feature.properties.name + '</span><br>' : '') +
        (feature.properties.title ?
          '<strong>' + feature.properties.title + '</strong><br>' : '') +
        (feature.properties.description ?
          '<span class="detail">' + feature.properties.description + '<br>' : '') +
        (feature.properties.capacity ?
          'Capacity: ' + feature.properties.capacity + '</p>' : '') + '</span></div>';
      break;
      
//      case 'rppdistricts.i':
//        content = '<div><span class="location">' + feature.properties.title + '</span><br>' +
//          feature.properties.description + '</div>';
//      break;
    }
    infoblock.innerHTML = content;
  };

  ParkingMap.allowFancyMap = true;

  //  Show a loading screen because we are currently doing it a bit backwards

  loading_screen = pleaseWait({
    logo: "img/logo_green.png",
    backgroundColor: '#404040',
    loadingHtml: "<div class='loading_text'>Mapping Philadelphia's parking regulations</div><div class='spinner'><div class='double-bounce1'></div><div class='double-bounce2'></div></div>"
  });

  //  TODO: remove extra else below

  if (ParkingMap.allowFancyMap && window.mapboxgl && mapboxgl.supported()) {
    ParkingMap.initFancyMap();
  } else {
    ParkingMap.initFancyMap();
  }

  // Clear the tooltip when map is clicked.
  ParkingMap.map.on('move', empty);

  // Trigger empty contents when the script has loaded on the page.
  empty();

  function empty() {
    //    console.log('Here is your stupid empty.');
    infoblock.innerHTML = '';
  }

  // setup persistent state for sharing tools
  var encodedShareMessage = window.encodeURIComponent('Philly parking, demystified.'),
      encodedShareUrl, copyShareLinkTextarea;

  // update hrefs when share menu button is clicked
  document.getElementById('share').addEventListener('click', function(e) {
    // grab updated URL + hash for sharing
    encodedShareUrl = window.encodeURIComponent(location.href);

    document.getElementById('share-facebook').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedShareUrl;
    document.getElementById('share-twitter').href = 'https://twitter.com/intent/tweet?url=' + encodedShareUrl + '&text=' + encodedShareMessage;
    document.getElementById('share-reddit').href = 'http://www.reddit.com/submit?url=' + encodedShareUrl + '&title=' + encodedShareMessage;
    document.getElementById('share-email').href = 'mailto:?subject=' + encodedShareMessage + '&body=' + encodedShareUrl;
  });

  // setup copy link tool
  var shareLinkDom = document.getElementById('share-link');
  shareLinkDom.href = '#share-link';
  shareLinkDom.addEventListener('click', function(e) {
    var linkCopied = false;

    e.preventDefault();

    // iOS doesn't support the copy command and fails silently like a jerk
    if (!is.iOS) {
      // create off-screen textarea if needed
      if (!copyShareLinkTextarea) {
        copyShareLinkTextarea = document.createElement('textarea');
        copyShareLinkTextarea.style.position = 'absolute';
        copyShareLinkTextarea.style.left = '-9999px';
        copyShareLinkTextarea.style.top = '0';
        document.body.appendChild(copyShareLinkTextarea);
      }

      // update textarea contents
      copyShareLinkTextarea.textContent = location.href;

      // remember what user had focused before
      var currentFocus = document.activeElement;

      // select the textarea content
      copyShareLinkTextarea.focus();
      copyShareLinkTextarea.setSelectionRange(0, copyShareLinkTextarea.value.length);

      // copy the selection
      try {
        document.execCommand('copy');
        linkCopied = true;
      } catch (e) {
        linkCopied = false;
      }

      // restore original focus
      if (currentFocus && typeof currentFocus.focus === 'function') {
        currentFocus.focus();
      }
    }

    // evaluate success
    if (linkCopied) {
      // show snackbar
      document.getElementById('snackbar').MaterialSnackbar.showSnackbar({
        message: 'Link copied to clipboard',
        timeout: 2000
      });
    } else {
      // fallback: show prompt
      window.prompt('Select and copy URL to share', location.href);
    }
  });

})();