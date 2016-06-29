var funLocations = {
  "locations": [
    { "name": "The Domain", "streetNo": "11410", "streetName": "Century Oaks Terrace", "city": "Austin", "state": "Texas" },
    { "name": "Barton Springs Pool", "streetNo": "2101", "streetName": "Barton Springs Rd", "city": "Austin", "state": "Texas" },
    { "name": "Lady Bird Lake Trail", "streetNo": "", "streetName": "", "city": "Austin", "state": "Texas" },
    { "name": "Game Over Video Games", "streetNo": "3005", "streetName": "S Lamar Blvd", "city": "Austin", "state": "Texas" },
    { "name": "Alamo Drafthouse Cinema", "streetNo": "2700", "streetName": "W Anderson Ln", "city": "Austin", "state": "Texas" }
  ]
};

var Map = function(containerId) {

    this.container = document.getElementById(containerId);
    this.map;
};

Map.prototype._addLocationMarkers = function () {
    var self = this; //TODO: THIS IS HACKY
    // creates a Google place search service object. PlacesService does the work of
    // actually searching for location data.
    var service = new google.maps.places.PlacesService(this.map);

    // Iterates through the array of locations, creates a search object for each location
    funLocations.locations.forEach(function(location){
        // the search request object

        var locationQuery;

        if ( location.streetNo == "" || location.streetName == "" ) {
            locationQuery = location.name + " " + location.city + ", " + location.state;
        }
        else {
            locationQuery = location.streetNo + " " + location.streetName + " " + location.city + ", " + location.state;
        }

        var request = {
            query: locationQuery
        };

        // Actually searches the Google Maps API for location data and calls createMapMarker with the results
        service.textSearch(request,  function(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                self._createMapMarker(results[0]);
            }
            else {
                $("#googleMap").html("<h1>Oh noes! Could not load google maps!</h1>");
            }
        });
    });
};

Map.prototype._createMapMarker = function(placeData) {
    // The next lines save location data from the search result object to local variables
    var lat = placeData.geometry.location.lat();  // latitude from the place service
    var lon = placeData.geometry.location.lng();  // longitude from the place service
    var name = placeData.formatted_address;   // name of the place from the place service
    var bounds = window.mapBounds;            // current boundaries of the map window          // TODO: PROBLEM!?!?!?!??!?!?!??!?!

    // marker is an object with additional data about the pin for a single location
    var marker = new google.maps.Marker({
      map: this.map,                                                                                // TODO: THIS.MAP?
      position: placeData.geometry.location,
      title: name
    });

    // infoWindows are the little helper windows that open when you click
    // or hover over a pin on a map. They usually contain more information
    // about a location.
    var infoWindow = new google.maps.InfoWindow({
      content: name
    });

    google.maps.event.addListener(marker, 'click', function() {
        //TODO Interact with foursquare API, set marker color, etc
        console.log(marker);

        var title = marker.title;
    });

    // this is where the pin actually gets added to the map.
    // bounds.extend() takes in a map location object
    bounds.extend(new google.maps.LatLng(lat, lon));
    // fit the map to the new marker
    this.map.fitBounds(bounds);                                             // TODO: ONLY CALL THIS AT END OF RENDER?
    // center the map
    this.map.setCenter(bounds.getCenter());                                 // TODO: ONLY CALL THIS AT END OF RENDER?
}

Map.prototype.render = function() {
    var mapOptions = {
        disableDefaultUI: true
    };

    this.map = new google.maps.Map(document.querySelector('#googleMap'), mapOptions);

    // Sets the boundaries of the map based on pin locations
    window.mapBounds = new google.maps.LatLngBounds(); //TODO: WTF DOES THIS EVEN DO?

    this._addLocationMarkers();
};

Map.prototype.resizeMap = function() {
    var center = this.map.getCenter();
    google.maps.event.trigger(this.map, "resize");
    this.map.setCenter(center);
}

var mainMap;

window.addEventListener('load', function() {
    mainMap = new Map("googleMap");
    mainMap.render();
});
