var LocationModel = {
    locations: [
    { "name": "The Domain", "streetNo": "11410", "streetName": "Century Oaks Terrace", "city": "Austin", "state": "Texas" },
    { "name": "Barton Springs Pool", "streetNo": "2101", "streetName": "Barton Springs Rd", "city": "Austin", "state": "Texas" },
    { "name": "Lady Bird Lake Trail", "streetNo": "", "streetName": "", "city": "Austin", "state": "Texas" },
    { "name": "Game Over Video Games", "streetNo": "3005", "streetName": "S Lamar Blvd", "city": "Austin", "state": "Texas" },
    { "name": "Alamo Drafthouse Cinema", "streetNo": "2700", "streetName": "W Anderson Ln", "city": "Austin", "state": "Texas" }
  ]
};

var currLocation = { "location": { "name": "" } }; //TODO: SORT OF HACKY, FIX LATER


var getCurrentLocationByName = function(name) {
    var numLocations = LocationModel.locations.length;

    for ( var i = 0; i < numLocations; i++ ) {
        if ( LocationModel.locations[i].name == name )
            return LocationModel.locations[i];
    }

    return null;
}

var ViewModel = function() {
    var self = this;

    self.filter = ko.observable("");

    self.currentLocation = ko.observable(currLocation);

    self.locationList = ko.observableArray([]);

    LocationModel.locations.forEach(function(locationItem){
        self.locationList.push( locationItem );
    });

    self.setActiveLocation = function(data, event) {
        mainMap.setActiveMarker(data.name);

        self.currentLocation( { location: data } )
    };

    self.filterLocations = ko.computed(function () {
        if (!self.filter()) {
            if ( mainMap != undefined) { // MAP NOT YET LOADED
                mainMap.setAllMarkersVisible(true);
            }

            return self.locationList();
        }
        else {
            return ko.utils.arrayFilter(self.locationList(), function (locationItem) {
                var show = locationItem.name.toLowerCase().includes(self.filter().toLowerCase())
                mainMap.setMarkerVisible(locationItem.name, show);
                return show;
            });
        }
    });
};

var vm = new ViewModel();
ko.applyBindings( vm );

var Map = function(containerId) {

    this.container = document.getElementById(containerId);
    this.map;

    this.markers = [];

    this._DESELECTED_MARKER_ICON = "https://www.google.com/mapfiles/marker.png";
    this._SELECTED_MARKER_ICON = "https://www.google.com/mapfiles/marker_green.png";
};

Map.prototype._addLocationMarkers = function () {
    var self = this; //TODO: THIS IS HACKY
    // creates a Google place search service object. PlacesService does the work of
    // actually searching for location data.
    var service = new google.maps.places.PlacesService(this.map);

    // Iterates through the array of locations, creates a search object for each location
    LocationModel.locations.forEach(function(location){
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
                self._createMapMarker(results[0], location);
            }
            else {
                $("#googleMap").html("<h1>Oh noes! Could not load google maps!</h1>");
            }
        });
    });
};

Map.prototype._createMapMarker = function(result, location) {
    // The next lines save location data from the search result object to local variables
    var lat = result.geometry.location.lat();  // latitude from the place service
    var lon = result.geometry.location.lng();  // longitude from the place service
    //var name = result.formatted_address;   // name of the place from the place service
    var name = location.name;
    var bounds = window.mapBounds;            // current boundaries of the map window          // TODO: PROBLEM!?!?!?!??!?!?!??!?!

    // marker is an object with additional data about the pin for a single location
    var marker = new google.maps.Marker({
      map: this.map,
      position: result.geometry.location,
      title: name,
      icon: this._DESELECTED_MARKER_ICON
    });

    this.markers.push(marker);

    // infoWindows are the little helper windows that open when you click
    // or hover over a pin on a map. They usually contain more information
    // about a location.
    var infoWindow = new google.maps.InfoWindow({
      content: name
    });

    google.maps.event.addListener(marker, 'click', function() {
        var loc =  getCurrentLocationByName(marker.getTitle());
        vm.currentLocation( {location: loc} );

        this._setActiveMarker(marker);
    }.bind(this));

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

Map.prototype._getMarkerByTitle = function(markerTitle) {
    var numMarkers = this.markers.length;
    for (var i = 0; i < numMarkers; i++ ) {
        if ( this.markers[i].getTitle() == markerTitle ) {
            return this.markers[i];
        }
    }

    return null;
}

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setAllMarkersVisible = function(makeVisible) {
    var numMarkers = this.markers.length;

    for (var i = 0; i < numMarkers; i++) {
        this.markers[i].setVisible(makeVisible);
    }
}

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setMarkerVisible = function(markerTitle, isVisible) {
    var marker = this._getMarkerByTitle(markerTitle);

    if ( marker != null ) {
        marker.setVisible(isVisible);
    }
}

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setActiveMarker = function(markerTitle) {
    var marker = this._getMarkerByTitle(markerTitle);

    if ( marker != null ) {
        this._setActiveMarker(marker);
    }
}

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype._setActiveMarker = function(marker) {
    var numMarkers = this.markers.length;

    for (var i = 0; i < numMarkers; i++) {
        this.markers[i].setIcon(this._DESELECTED_MARKER_ICON);
    }

    marker.setIcon(this._SELECTED_MARKER_ICON);
}

var mainMap;

window.addEventListener('load', function() {
    mainMap = new Map("googleMap");
    mainMap.render();
});