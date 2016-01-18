//mapbox://styles/laurenancona/ciji1o3vr003w92kfrfbu9wgk

mapboxgl.accessToken = 'pk.eyJ1IjoibGF1cmVuYW5jb25hIiwiYSI6ImNpZjMxbWtoeDI2MjlzdW0zanUyZGt5eXAifQ.0yDBBkfLr5famdg4bPgtbw';

// Set bounds to Philadelphia metro

var bounds = [
  [-75.387541, 39.864439],
  [-74.883544, 40.156325]
];

var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/laurenancona/ciji1o3vr003w92kfrfbu9wgk', //stylesheet location
  center: [-75.1543, 39.9462],
  bearing: 9.2, // Rotate Philly ~9° off of north
  zoom: 13,
  maxZoom: 18,
  minZoom: 12,
  maxBounds: bounds,
  hash: true,
  touchZoomRotate: false
});