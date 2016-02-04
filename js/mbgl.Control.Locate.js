/*!
Copyright (c) 2014 Dominik Moritz

This file is part of the leaflet locate control. It is licensed under the MIT license.
You can find the project at: https://github.com/domoritz/leaflet-locatecontrol
*/

// Adapted for mapboxgl by Mjumbe Poe https://github.com/mjumbewu

(function (factory, window) {
  // see https://github.com/Leaflet/Leaflet/blob/master/PLUGIN-GUIDE.md#module-loaders
  // for details on how to structure a leaflet plugin.

  // define an AMD module that relies on 'leaflet'
  if (typeof define === 'function' && define.amd) {
    define(['mapboxgl', 'leaflet'], factory);

    // define a Common JS module that relies on 'leaflet'
  } else if (typeof exports === 'object') {
    var M, L;

    if (typeof window !== 'undefined' && window.mapboxgl) {
      M = window.mapboxgl;
    } else {
      M = require('mapboxgl');
    }

    if (typeof window !== 'undefined' && window.L) {
      L = window.L;
    } else {
      L = require('leaflet');
    }

    module.exports = factory(M, L);
  }

  // attach your plugin to the global 'L' variable
  if (typeof window !== 'undefined' && window.mapboxgl && window.L) {
    window.mapboxgl.Locate = factory(window.mapboxgl, window.L);
  }

}(function (M, L) {
  // L.DomUtil = L.DomUtil || {};
  // L.DomUtil.create = function(tagName, classes) {
  //     var el = document.createElement(tagName);
  //     el.setAttribute('class', classes);
  //     return el;
  // };

  M.Control.Locate = function (options) {
    M.util.setOptions(this, options);
  };

  M.Control.Locate.prototype = M.util.inherit(M.Control, {
    options: {
      position: 'topleft',
      drawCircle: true,
      follow: false, // follow with zoom and pan the user's location
      stopFollowingOnDrag: false, // if follow is true, stop following when map is dragged (deprecated)
      // if true locate control remains active on click even if the user's location is in view.
      // clicking control will just pan to location
      remainActive: false,
      markerClass: L.circleMarker, // L.circleMarker or L.marker
      // range circle
      circleStyle: {
        'circle-color': '#136AEC',
        'circle-opacity': 0.5
      },
      // inner marker
      markerStyle: {
        color: '#136AEC',
        fillColor: '#2A93EE',
        fillOpacity: 0.7,
        weight: 2,
        opacity: 0.9,
        radius: 5
      },
      // changes to range circle and inner marker while following
      // it is only necessary to provide the things that should change
      followCircleStyle: {},
      followMarkerStyle: {
        //color: '#FFA500',
        //fillColor: '#FFB000'
      },
      icon: 'fa fa-map-marker', // fa-location-arrow or fa-map-marker
      iconLoading: 'fa fa-spinner fa-spin',
      circlePadding: 0,
      metric: true,
      onLocationError: function (err) {
        // this event is called in case of any location error
        // that is not a time out error.
        alert(err.message);
      },
      onLocationOutsideMapBounds: function (control) {
        // this event is repeatedly called when the location changes
        control.stop();
        alert(control.options.strings.outsideMapBoundsMsg);
      },
      setView: false, // automatically sets the map view to the user's location
      // keep the current map zoom level when displaying the user's location. (if 'false', use maxZoom)
      keepCurrentZoomLevel: false,
      showPopup: true, // display a popup when the user clicks on the inner marker
      strings: {
        title: "Show me where I am",
        metersUnit: "meters",
        feetUnit: "feet",
        popup: "You are within {distance} {unit} from this point",
        outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
      },
      locateOptions: {
        maxZoom: 16,
        watch: true // if you overwrite this, visualization cannot be updated
      }
    },

    initialize: function (options) {
      L.Map.addInitHook(function () {
        if (this.options.locateControl) {
          this.addControl(this);
        }
      });

      for (var i in options) {
        if (typeof this.options[i] === 'object') {
          L.extend(this.options[i], options[i]);
        } else {
          this.options[i] = options[i];
        }
      }

      L.extend(this.options.locateOptions, {
        setView: false // have to set this to false because we have to
          // do setView manually
      });
    },

    /**
     * This method launches the location engine.
     * It is called before the marker is updated,
     * event if it does not mean that the event will be ready.
     *
     * Override it if you want to add more functionalities.
     * It should set the this._active to true and do nothing if
     * this._active is not true.
     */
    _activate: function () {
      if (this.options.setView) {
        this._locateOnNextLocationFound = true;
      }

      if (!this._active) {
        this.locate(this.options.locateOptions);
      }
      this._active = true;

      if (this.options.follow) {
        this._startFollowing(this._map);
      }
    },

    /**
     * Called to stop the location engine.
     *
     * Override it to shutdown any functionalities you added on start.
     */
    _deactivate: function () {
      this.stopLocate();

      this._map.off('move', this._stopFollowing, this);
      if (this.options.follow && this._following) {
        this._stopFollowing(this._map);
      }
    },

    /**
     * Draw the resulting marker on the map.
     *
     * Uses the event retrieved from onLocationFound from the map.
     */
    drawMarker: function (map) {
      if (this._event.accuracy === undefined) {
        this._event.accuracy = 0;
      }

      var radius = this._event.accuracy;
      if (this._locateOnNextLocationFound) {
        if (this._isOutsideMapBounds()) {
          this.options.onLocationOutsideMapBounds(this);
        } else {
          // If accuracy info isn't desired, keep the current zoom level
          if (this.options.keepCurrentZoomLevel || !this.options.drawCircle) {
            map.panTo(this._event.lnglat);
          } else {
            map.fitBounds(this._event.bounds, {
              padding: this.options.circlePadding,
              maxZoom: this.options.keepCurrentZoomLevel ?
                map.getZoom() : this.options.locateOptions.maxZoom
            });
          }
        }
        this._locateOnNextLocationFound = false;
      }

      // circle with the radius of the location's accuracy
      var style, o;
      if (this.options.drawCircle) {
        if (this._following) {
          style = this.options.followCircleStyle;
        } else {
          style = this.options.circleStyle;
        }

        this._source.setData({
          "type": "FeatureCollection",
          "features": [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [
                                this._event.lnglat.lng,
                                this._event.lnglat.lat
                            ]
            }
                    }]
        });
        map.setLayoutProperty('user.location', 'visibility', 'visible');
        map.setPaintProperty('user.location', 'circle-radius', radius);
        for (o in style) {
          map.setPaintProperty('user.location', o, style[o]);
        }
      }

      var distance, unit;
      if (this.options.metric) {
        distance = radius.toFixed(0);
        unit = this.options.strings.metersUnit;
      } else {
        distance = (radius * 3.2808399).toFixed(0);
        unit = this.options.strings.feetUnit;
      }

      // small inner marker
      var mStyle;
      if (this._following) {
        mStyle = this.options.followMarkerStyle;
      } else {
        mStyle = this.options.markerStyle;
      }

      // if (!this._marker) {
      //     this._marker = this.createMarker(this._event.lnglat, mStyle)
      //     .addTo(this._layer);
      // } else {
      //     this.updateMarker(this._event.lnglat, mStyle);
      // }

      // var t = this.options.strings.popup;
      // if (this.options.showPopup && t) {
      //     this._marker.bindPopup(L.Util.template(t, {distance: distance, unit: unit}))
      //     ._popup.setLatLng(this._event.lnglat);
      // }

      this._toggleContainerStyle();
    },

    /**
     * Creates the marker.
     *
     * Should return the base marker so it is possible to bind a pop-up if the
     * option is activated.
     *
     * Used by drawMarker, you can ignore it if you have overridden it.
     */
    createMarker: function (latlng, mStyle) {
      return this.options.markerClass(latlng, mStyle);
    },

    /**
     * Updates the marker with current coordinates.
     *
     * Used by drawMarker, you can ignore it if you have overridden it.
     */
    updateMarker: function (latlng, mStyle) {
      this._marker.setLatLng(latlng);
      for (var o in mStyle) {
        this._marker.options[o] = mStyle[o];
      }
    },

    /**
     * Remove the marker from map.
     */
    removeMarker: function () {
      this._clearLayers();
      this._marker = undefined;
      this._circle = undefined;
    },

    _clearLayers: function () {
      this._map.setLayoutProperty('user.location', 'visibility', 'none');
      this._map.setLayoutProperty('user.location.accuracy', 'visibility', 'none');
    },

    _createSource: function () {
      return new M.GeoJSONSource({
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": []
        }
      });
    },

    _createLocationLayer: function () {
      return {
        id: 'user.location',
        source: 'user.location',
        type: 'circle',
        layout: {
          visibility: 'none'
        },
        paint: {},
        interactive: false
      };
    },

    _createAccuracyLayer: function () {
      return {
        id: 'user.location.accuracy',
        source: 'user.location',
        type: 'circle',
        layout: {
          visibility: 'none'
        },
        paint: {},
        interactive: false
      };
    },

    onAdd: function (map) {
      var container = L.DomUtil.create('div',
        'leaflet-control-locate leaflet-bar leaflet-control');

      this._source = this._createSource();
      this._locationLayer = this._createLocationLayer();
      this._accuracyLayer = this._createAccuracyLayer();
      map.addSource('user.location', this._source);
      map.addLayer(this._accuracyLayer);
      map.addLayer(this._locationLayer);

      this._event = undefined;

      this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', container);
      this._link.href = '#';
      this._link.title = this.options.strings.title;
      this._icon = L.DomUtil.create('span', this.options.icon, this._link);

      L.DomEvent
        .on(this._link, 'click', L.DomEvent.stopPropagation)
        .on(this._link, 'click', L.DomEvent.preventDefault)
        .on(this._link, 'click', function () {
          var shouldStop = (this._event === undefined ||
            this.boundsContains(this._map.getBounds(), this._event.lnglat) ||
            !this.options.setView || this._isOutsideMapBounds());
          if (!this.options.remainActive && (this._active && shouldStop)) {
            this.stop();
          } else {
            this.start();
          }
        }, this)
        .on(this._link, 'dblclick', L.DomEvent.stopPropagation);

      this._resetVariables();
      this.bindEvents(map);

      return container;
    },

    boundsContains: function (bounds, lnglat) {
      return (
        bounds && lnglat &&
        lnglat.lat <= bounds._ne.lat &&
        lnglat.lng <= bounds._ne.lng &&
        lnglat.lat >= bounds._sw.lat &&
        lnglat.lng >= bounds._sw.lng
      );
    },

    /**
     * Binds the actions to the map events.
     */
    bindEvents: function (map) {
      this.on('locationfound', this._onLocationFound, this);
      this.on('locationerror', this._onLocationError, this);
      this.on('unload', this.stop, this);
    },

    /**
     * Starts the plugin:
     * - activates the engine
     * - draws the marker (if coordinates available)
     */
    start: function () {
      this._activate();

      if (!this._event) {
        this._setClasses('requesting');
      } else {
        this.drawMarker(this._map);
      }
    },

    /**
     * Stops the plugin:
     * - deactivates the engine
     * - reinitializes the button
     * - removes the marker
     */
    stop: function () {
      this._deactivate();

      this._cleanClasses();
      this._resetVariables();

      this.removeMarker();
    },

    /**
     * Calls deactivate and dispatches an error.
     */
    _onLocationError: function (err) {
      // ignore time out error if the location is watched
      if (err.code == 3 && this.options.locateOptions.watch) {
        return;
      }

      this.stop();
      this.options.onLocationError(err);
    },

    /**
     * Stores the received event and updates the marker.
     */
    _onLocationFound: function (e) {
      // no need to do anything if the location has not changed
      if (this._event &&
        (this._event.lnglat.lat === e.lnglat.lat &&
          this._event.lnglat.lng === e.lnglat.lng &&
          this._event.accuracy === e.accuracy)) {
        return;
      }

      if (!this._active) {
        return;
      }

      this._event = e;

      if (this.options.follow && this._following) {
        this._locateOnNextLocationFound = true;
      }

      this.drawMarker(this._map);
    },

    /**
     * Dispatches the 'startfollowing' event on map.
     */
    _startFollowing: function () {
      this._map.fire('startfollowing', this);
      this._following = true;
      if (this.options.stopFollowingOnDrag) {
        this._map.on('move', this._stopFollowing, this);
      }
    },

    /**
     * Dispatches the 'stopfollowing' event on map.
     */
    _stopFollowing: function () {
      this._map.fire('stopfollowing', this);
      this._following = false;
      if (this.options.stopFollowingOnDrag) {
        this._map.off('move', this._stopFollowing, this);
      }
      this._toggleContainerStyle();
    },

    /**
     * Check if location is in map bounds
     */
    _isOutsideMapBounds: function () {
      if (this._event === undefined)
        return false;
      return this._map.options.maxBounds &&
        this.boundsContains(!this._map.options.maxBounds, this._event.lnglat);
    },

    /**
     * Toggles button class between following and active.
     */
    _toggleContainerStyle: function () {
      if (!this._container) {
        return;
      }

      if (this._following) {
        this._setClasses('following');
      } else {
        this._setClasses('active');
      }
    },

    /**
     * Sets the CSS classes for the state.
     */
    _setClasses: function (state) {
      if (state == 'requesting') {
        L.DomUtil.removeClasses(this._container, "active following");
        L.DomUtil.addClasses(this._container, "requesting");

        L.DomUtil.removeClasses(this._icon, this.options.icon);
        L.DomUtil.addClasses(this._icon, this.options.iconLoading);
      } else if (state == 'active') {
        L.DomUtil.removeClasses(this._container, "requesting following");
        L.DomUtil.addClasses(this._container, "active");

        L.DomUtil.removeClasses(this._icon, this.options.iconLoading);
        L.DomUtil.addClasses(this._icon, this.options.icon);
      } else if (state == 'following') {
        L.DomUtil.removeClasses(this._container, "requesting");
        L.DomUtil.addClasses(this._container, "active following");

        L.DomUtil.removeClasses(this._icon, this.options.iconLoading);
        L.DomUtil.addClasses(this._icon, this.options.icon);
      }
    },

    /**
     * Removes all classes from button.
     */
    _cleanClasses: function () {
      L.DomUtil.removeClass(this._container, "requesting");
      L.DomUtil.removeClass(this._container, "active");
      L.DomUtil.removeClass(this._container, "following");

      L.DomUtil.removeClasses(this._icon, this.options.iconLoading);
      L.DomUtil.addClasses(this._icon, this.options.icon);
    },

    /**
     * Reinitializes attributes.
     */
    _resetVariables: function () {
      this._active = false;
      this._locateOnNextLocationFound = this.options.setView;
      this._following = false;
    },

    /* ================================================================
     * Copy the geolocation function from leaflet/ext/Map.Geolocation
     * ================================================================
     */
    _defaultLocateOptions: {
      timeout: 10000,
      watch: false,
      // setView: false
      // maxZoom: <Number>
      // maximumAge: 0
      // enableHighAccuracy: false
      keepCurrentZoomLevel: true
    },

    locate: function (options) {

      options = this._locateOptions = L.extend({}, this._defaultLocateOptions, options);

      if (!('geolocation' in navigator)) {
        this._handleGeolocationError({
          code: 0,
          message: 'Geolocation not supported.'
        });
        return this;
      }

      var onResponse = L.bind(this._handleGeolocationResponse, this),
        onError = L.bind(this._handleGeolocationError, this);

      if (options.watch) {
        this._locationWatchId =
          navigator.geolocation.watchPosition(onResponse, onError, options);
      } else {
        navigator.geolocation.getCurrentPosition(onResponse, onError, options);
      }
      return this;
    },

    stopLocate: function () {
      if (navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(this._locationWatchId);
      }
      if (this._locateOptions) {
        this._locateOptions.setView = false;
      }
      return this;
    },

    _handleGeolocationError: function (error) {
      var c = error.code,
        message = error.message ||
        (c === 1 ? 'permission denied' :
          (c === 2 ? 'position unavailable' : 'timeout'));

      if (this._locateOptions.setView && !this._loaded) {
        this.fitWorld();
      }

      this.fire('locationerror', {
        code: c,
        message: 'Geolocation error: ' + message + '.'
      });
    },

    // For some reason, L.LatLng has no toBounds, so make up for that here.
    // While we're at it, return something mapboxgl wants to use.
    lnglatToBounds: function (lnglat, sizeInMeters) {
      var latAccuracy = 180 * sizeInMeters / 40075017,
        lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * lnglat.lat);

      return new M.LngLatBounds(
                    [lnglat.lng - lngAccuracy, lnglat.lat - latAccuracy], [lnglat.lng + lngAccuracy, lnglat.lat + latAccuracy]);
    },

    _handleGeolocationResponse: function (pos) {
      var lat = pos.coords.latitude,
        lng = pos.coords.longitude,
        lnglat = new M.LngLat(lng, lat),
        bounds = this.lnglatToBounds(lnglat, pos.coords.accuracy),
        options = this._locateOptions;

      // if (options.setView) {
      //     var zoom = this.getBoundsZoom(bounds);
      //     this.setView(lnglat, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
      // }

      var data = {
        lnglat: lnglat,
        bounds: bounds,
        timestamp: pos.timestamp
      };

      for (var i in pos.coords) {
        if (typeof pos.coords[i] === 'number') {
          data[i] = pos.coords[i];
        }
      }

      this.fire('locationfound', data);
    }
  });
  M.util.extend(M.Control.Locate.prototype, M.Evented);

  // MapboxGL doesn't do the leaflet-style new-less construction right now.
  // L.control.locate = function (options) {
  //     return new L.Control.Locate(options);
  // };

  (function () {
    // leaflet.js raises bug when trying to addClass / removeClass multiple classes at once
    // Let's create a wrapper on it which fixes it.
    var LDomUtilApplyClassesMethod = function (method, element, classNames) {
      classNames = classNames.split(' ');
      classNames.forEach(function (className) {
        L.DomUtil[method].call(this, element, className);
      });
    };

    L.DomUtil.addClasses = function (el, names) {
      LDomUtilApplyClassesMethod('addClass', el, names);
    };
    L.DomUtil.removeClasses = function (el, names) {
      LDomUtilApplyClassesMethod('removeClass', el, names);
    };
  })();

  return L.Control.Locate;
}, window));
