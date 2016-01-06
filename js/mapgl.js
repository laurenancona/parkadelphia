var ParkingMap = ParkingMap || {};

(function () {
  'use strict';

  var mapLayers = {};
  var layerNames = ['rppblocks', 'rppdistricts', 'scooters', 'lots', 'valet'];

  //  Deprecated layers, keep until tested:
  //  , 'transit', 'entrances', 'poperide', 'parking'

  var accessToken = 'pk.eyJ1IjoibGF1cmVuYW5jb25hIiwiYSI6ImNpZjMxbWtoeDI2MjlzdW0zanUyZGt5eXAifQ.0yDBBkfLr5famdg4bPgtbw';

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

    // Call mapboxgl.Map.featuresAt with the hijacked
    // callback function.
    map.featuresAt(point, options, hijacked);
  };

  ParkingMap.initFancyMap = function () {
    var map;

    L.mapbox.accessToken = accessToken;
    mapboxgl.accessToken = accessToken;

    // Construct a bounding box

    // var southWest = L.latLng(39.864439, -75.387541),
    //     northEast = L.latLng(40.156325, -74.883544),
    //     bounds = L.latLngBounds(southWest, northEast);

    map = ParkingMap.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/laurenancona/ciiya39oq00ndzwmajm6lwhvq',
      center: [-75.1575, 39.9572],
      bearing: 9.2, // Rotate Philly ~9° off of north
      zoom: 12,
      maxZoom: 18,
      minZoom: 12,
      //   maxBounds: bounds,
      hash: true
    });

    map.addControl(new mapboxgl.Navigation({
      position: 'top-left'
    }));
    map.on('load', function () {
      map.addControl(new mapboxgl.Control.Locate({
        position: 'top-left'
      }));
    });

    // disable map rotation using right click + drag
    //    map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    //    map.touchZoomRotate.disableRotation();

    var getPoint = function (evt) {
    // MapboxGL will call it `point`, leaflet `containerPoint`.
      return evt.point || evt.containerPoint;
    };

    ParkingMap.map.on('mousemove', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);
        featuresAt(map, point, {
          radius: 15
        }, function (err, features) {
          if (err) throw err;
          ParkingMap.map._container.classList.toggle('interacting', features.length > 0);
        });
      }
    });

    ParkingMap.map.on('click', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);

        // Find what was clicked on
        featuresAt(map, point, {
          radius: 15
        }, function (err, features) {
          var layerName, feature;

          if (err) throw err;

          if (features.length > 0) {
            feature = features[0];
            layerName = feature.layer.id;
            showInfo(layerName, feature);
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
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        });
      }
    };

    map.on('load', function () {
      var layerAssociation = { //using '.i' in GL layernames we want to be interactive
        'rppblocks': ['rppblocks_bothsides.i', 'rppblocks_1side.i', 'rppblocks.casing.i', 'rppblocks.label'],
        'rppdistricts': ['rppdistricts.i', 'rppdistricts.line', 'rppdistricts.label'],
        'scooters': ['scooters.i'],
        'lots': ['lots.i'],
        'valet': ['valet.i']
          //        'transit': ['transit-stations.i', 'septa-rr.lines.i', 'market-st', 'broad-st', 'patco'],
      };

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
  };
  //========================= LEAFLET-BASED VECTOR TILE FALLBACK ====
  // Vector tiles fallback == these will all be Leaflet-based functions
  ParkingMap.initClassicMap = function () {
    var map;

    L.mapbox.accessToken = accessToken;

    // Construct a bounding box

    var southWest = L.latLng(39.864439, -75.387541),
      northEast = L.latLng(40.156325, -74.883544),
      bounds = L.latLngBounds(southWest, northEast);

    map = ParkingMap.map = L.mapbox.map('map', 'laurenancona.2ff8c154', { // ParkingMap polygons baselayer
      // set that bounding box as maxBounds to restrict moving the map (http://leafletjs.com/reference.html#map-maxbounds)
      //  maxBounds: bounds,
      infoControl: false,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 13,
      center: [39.9572, -75.1575],
      zoom: 14
    });

    // Map controls and additions for URL hash, geocoding, and locate-me

    ParkingMap.map.addControl(L.mapbox.geocoderControl('mapbox.places', {
      autocomplete: true
    }));
    L.control.locate().addTo(ParkingMap.map);
    L.hash(ParkingMap.map); // append (z)/(x)/(y) to URL for deep linking to locations


    // Here be our data layers

    var rppblocks = L.mapbox.featureLayer(); //.addTo(map);
    rppblocks.loadURL('data/rppblocks.geojson');
    mapLayers['rppblocks'] = rppblocks;

    var rppdistricts = L.mapbox.featureLayer(); //.addTo(map);
    rppdistricts.loadURL('data/rppdistricts.geojson');
    mapLayers['rppdistricts'] = rppdistricts;

    var scooters = L.mapbox.featureLayer(); //.addTo(map);
    scooters.loadURL('data/jumbotrons.geojson');
    mapLayers['scooters'] = scooters;

    var lots = L.mapbox.featureLayer(); //.addTo(map);
    lots.loadURL('data/lots.geojson');
    mapLayers['lots'] = lots;

    //    var transit = L.mapbox.featureLayer().addTo(map);
    //    transit.loadURL('https://gist.githubusercontent.com/laurenancona/f6fc6dee346781538cf7/raw/9ef66b848017b61a972eaa27179541ddfe90d990/septa-train-stations.geojson')
    //    mapLayers['transit'] = transit;
    //
    //    var entrances = L.mapbox.featureLayer(); //.addTo(map);
    //    entrances.loadURL('https://gist.githubusercontent.com/laurenancona/222ac7fbcb959208a93a/raw/b8953400ac6c945380203e98d6107505f9e9f0c9/entrances.geojson');
    //    mapLayers['entrances'] = entrances;
    //
    //    var poperide = L.mapbox.featureLayer(); //.addTo(map);
    //    poperide.loadURL('data/poperide.geojson');
    //    mapLayers['poperide'] = poperide;
    //
    //    var parking = L.mapbox.featureLayer().addTo(map);
    //    parking.loadURL('data/parking.geojson');
    //    mapLayers['parking'] = parking;

    layerNames.forEach(function (layerName, index) {
      var layer = mapLayers[layerName];
      document.getElementById(layerName).addEventListener('change', function () {
        if (document.getElementById(layerName).checked)
          layer.addTo(map);
        else
          map.removeLayer(layer);
      });
    });

    //============================================================//

    // UTF Grid interactivity, testing w/ multiple layers
    //    var blocksTiles = blocks.addTo(map);
    var infoGrid = L.mapbox.gridLayer('laurenancona.2ff8c154').addTo(map); //,
    //        lotsGrid = L.mapbox.gridLayer('laurenancona.fc7871b8').addTo(map);
    //    var blocksControl = L.mapbox.gridControl(blocksGrid ).addTo(map); //,
    //        lotsControl = L.mapbox.gridControl('laurenancona.fc7871b8').addTo(map);

    // Listen for individual marker clicks.

    //    entrances.on('click', function (e) {
    //      e.layer.closePopup(); // Force the popup closed.
    //      showInfo('entrances', e.layer.feature);
    //    });
    //
    //    transit.on('click', function (e) {
    //      e.layer.closePopup();
    //      showInfo('transit', e.layer.feature);
    //    });
    //
    //    poperide.on('click', function (e) {
    //      e.layer.closePopup();
    //      showInfo('poperide', e.layer.feature);
    //    });
    //
    //    parking.on('click', function (e) {
    //      e.layer.closePopup();
    //      showInfo('parking', e.layer.feature);
    //    });
    //
    //    rppblocks.on('click', function (e) {
    //      e.layer.closePopup();
    //      showInfo('rppblocks', e.layer.feature);
    //    });
    //
    //    lots.on('click', function (e) {
    //      e.layer.closePopup();
    //      showInfo('lots', e.layer.feature);
    //    });
  };

  //============================================================//

  var showInfo = function (tpl, feature) {
    var content;

    switch (tpl) {
      case 'rppblocks_bothsides.i':
      case 'rppblocks_1side.i':
        content = '<div><strong>' + feature.properties.block_street + '</strong>' +
          '<p>' + feature.properties.sos + '</p></div>';
        break;

        //      case 'transit':
        //      case 'transit.i':
        //      case 'transit-stations.i':
        //      case 'septa-rr.lines.i':
        //      case 'septa-rr.lines.casing.i':
        //        content = '<div><strong>' + feature.properties.name + '</strong>' +
        //          (feature.properties.description || '') + '</div>';
        //        //          '<p>' + feature.properties.Tickets + '</p>' +
        //        //          '<p><a href=' + '"' + feature.properties.info + '"' + ' target="_blank" /><strong>VISIT SITE</strong></a></p></div>';
        //        break;

      case 'rppdistricts':
      case 'rppdistricts.line':
      case 'rppdistricts.label':
        content = '<div><strong>' + feature.properties.name + '</strong></div>';
        break;

      case 'lots':
      case 'lots.i':
        content = '<div>' + (feature.properties.name ?
            '<strong>' + feature.properties.name + '</strong>' : '') +
          (feature.properties.address ?
            '<p>' + feature.properties.address + '</p>' : '') +
          (feature.properties.phone ?
            '<p>' + feature.properties.phone + '</p>' : '') +
          (feature.properties.capacity ?
            '<p> Capacity: ' + feature.properties.capacity + '</p>' : '') +
          (feature.properties.hours ?
            '<p> Hours: ' + feature.properties.hours + '</p>' : '') + '</div>';
        break;

      case 'valet.i':
        content = '<div>' + (feature.properties.Name ?
          '<strong>' + feature.properties.Name + '</strong>' : '') + '</div>';
        break;

      default:
        content = '<div>' + (feature.properties.name ?
            '<strong>' + feature.properties.name + '</strong>' : '') +
          (feature.properties.title ?
            '<strong>' + feature.properties.title + '</strong>' : '') +
          (feature.properties.description ?
            '<p> ' + feature.properties.description + '</p>' : '') +
          (feature.properties.capacity ?
            '<p> Capacity: ' + feature.properties.capacity + '</p>' : '') + '</div>';
        break;
    }
    info.innerHTML = content;
  };

  if (ParkingMap.allowFancyMap && window.mapboxgl && mapboxgl.supported()) {
    ParkingMap.initFancyMap();
  } else {
    ParkingMap.initClassicMap();
  }

  // Clear the tooltip when map is clicked.
  ParkingMap.map.on('move', empty);

  // Trigger empty contents when the script has loaded on the page.
  empty();

  function empty() {
    info.innerHTML = '<div><p><strong>Choose layers at left, then click features for info</strong></p></div>';
  }

})();


// ht @konklone for console.log-fication example
// for sad, sad IE:
if (window._ie) {
  console.log("Hey there.");
  console.log("If you're into this kind of thing and want to help out, let me know.");
  console.log("http://github.com/laurenancona or @laurenancona");
}

// otherwise, style it up:
else {
  var styles = {
    medium: "font-size: 10pt, font-weight: bold;color: #1B3B56",
    medium_link: "font-size: 10pt; font-weight: bold; color: #027ea4",
  };
  console.log("%cHey there", styles.medium);
  console.log("%cIf you're into this kind of thing and want to help out, let me know.", styles.medium);
  console.log("%chttp://github.com/laurenancona or @laurenancona", styles.medium);
}
