var Location = function(name, streetNo, streetName, city, state) {
    this.name = name;
    this.streetNo = streetNo;
    this.streetName = streetName;
    this.city = city;
    this.state = state;
    this.fourSquareInfo = new FourSquareLocationInfo(name, city, state);
};

Location.prototype.getFormattedAddress = function() {
    return this.streetNo + " " + this.streetName + " " + this.city + ", " + this.state;
}

var FourSquareLocationInfo = function(name, city, state) {
    this.name = name;
    this.city = city;
    this.state = state;

    this.name;
    this.phone;
    this.twitter;
    this.facebookUsername;
    this.categories = [];
    this.website;

    var fourSquareURL = "https://api.foursquare.com/v2/venues/search?near=" + this.city +", "+ this.state +
                        "&query="+ this.name +"&limit=1&oauth_token=FSOWT50BEYQIEETU5RHQHFVEIYBG3LFIZWJKU24U254RFTWA&v=20160701"; //TODO: PROPER OAUTH TOKEN


    $.getJSON(fourSquareURL)
    .success( function(data) {
        var venue = data.response.venues[0];
        this.name = venue.name;
        this.phone = venue.contact.phone;
        this.twitter = venue.contact.twitter;
        this.facebookUsername = venue.contact.facebookUsername;

        var numCategories = venue.categories.length;
        for (var i = 0; i < numCategories; i++) {
            this.categories.push(venue.categories[i].name);
        };

        this.website = venue.url;
    }.bind(this))
    .error( function() {
        //TODO: SOME SORT OF ERROR HANDLING
    }.bind(this))
};

var test = new FourSquareLocationInfo("The Domain", "Austin", "Texas");
setTimeout(function() { console.log(test.website) }, 2500);


var LocationModel = {
    locations: [ //new Location("The Domain", "11410", "Century Oaks Terrace", "Austin", "Texas"),
                 new Location("Barton Springs Pool", "2101", "Barton Springs Rd", "Austin", "Texas"),
                 //new Location("Lady Bird Lake Trail", "", "", "Autin", "Texas"),
                 new Location("Game Over Video Games", "3005", "S Lamar Blvd", "Austin", "Texas"),
                 new Location("Pinballz Arcade", "", "", "Austin", "Texas"),
                 //new Location("", "", "", "Austin", "Texas")
                 new Location("Alamo Drafthouse Cinema", "2700", "W Anderson Ln", "Austin", "Texas")
    ],
    getLocationByName: function(name) {
        var numLocations = this.locations.length;

        for ( var i = 0; i < numLocations; i++ ) {
            if ( this.locations[i].name == name )
                return this.locations[i];
        }

        return null;
    }
};

var ViewModel = function() {
    var self = this;

    self.filter = ko.observable("");

    self.currentLocation = ko.observable({ "location": { "name": "" } });

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
};

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setAllMarkersVisible = function(makeVisible) {
    var numMarkers = this.markers.length;

    for (var i = 0; i < numMarkers; i++) {
        this.markers[i].setVisible(makeVisible);
    }
};

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setMarkerVisible = function(markerTitle, isVisible) {
    var marker = this._getMarkerByTitle(markerTitle);

    if ( marker != null ) {
        marker.setVisible(isVisible);
    }
};

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype.setActiveMarker = function(markerTitle) {
    var marker = this._getMarkerByTitle(markerTitle);

    if ( marker != null ) {
        this._setActiveMarker(marker);
    }
};

//TODO: WILL FAIL IF MAP IS NOT LOADED
Map.prototype._setActiveMarker = function(marker) {
    var numMarkers = this.markers.length;

    for (var i = 0; i < numMarkers; i++) {
        this.markers[i].setIcon(this._DESELECTED_MARKER_ICON);
    }

    marker.setIcon(this._SELECTED_MARKER_ICON);
};

Map.prototype._addLocationMarkers = function () {
    var self = this; //TODO: THIS IS HACKY
    // creates a Google place search service object. PlacesService does the work of
    // actually searching for location data.
    var service = new google.maps.places.PlacesService(this.map);

    // Iterates through the array of locations, creates a search object for each location
    LocationModel.locations.forEach(function(location){

        var locationQuery;

        if ( location.streetNo == "" || location.streetName == "" ) {
            locationQuery = location.name + " " + location.city + ", " + location.state;
        }
        else {
            locationQuery = location.getFormattedAddress();
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

    var location = LocationModel.getLocationByName(marker.getTitle());

    var infoWindowContent = "<div>" +
                                "<h1 class='infoWindowHeader'>" + location.name + "</h1>" +
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "Address: " + "</span>" +
                                    "<span>" + location.getFormattedAddress()  + "</span>" +
                                "</div>" +
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "Phone: " + "</span>" +
                                    "<span>" + location.fourSquareInfo.phone + "</span>" +
                                "</div>" +
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "Twitter: " + "</span>" +
                                    "<span>" + location.fourSquareInfo.twitter + "</span>" +
                                "</div>" +
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "Facebook: " + "</span>" +
                                    "<span>" + location.fourSquareInfo.facebookUsername + "</span>" +
                                "</div>" +
/*
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "Categories" + "</span>" +
                                    "<span>" + "" + "</span>" +
                                "</div>" +
*/
                                "<div>" +
                                    "<span class='infoWindowIcon'>" + "URL: " + "</span>" +
                                    "<span>" + location.fourSquareInfo.website + "</span>" +
                                "</div>" +
                             "</div>";

    var infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent
    });

    google.maps.event.addListener(marker, 'click', function() {
        var loc =  LocationModel.getLocationByName(marker.getTitle());
        vm.currentLocation( { location: loc } );

        this._setActiveMarker(marker);  //TODO: Should maybe use a callback

        infoWindow.open(this.map, marker);
    }.bind(this));

    // this is where the pin actually gets added to the map.
    // bounds.extend() takes in a map location object
    bounds.extend(new google.maps.LatLng(lat, lon));
    this.map.fitBounds(bounds);
    this.map.setCenter(bounds.getCenter());
};

Map.prototype._getMarkerByTitle = function(markerTitle) {
    var numMarkers = this.markers.length;
    for (var i = 0; i < numMarkers; i++ ) {
        if ( this.markers[i].getTitle() == markerTitle ) {
            return this.markers[i];
        }
    }

    return null;
};

var mainMap;

window.addEventListener('load', function() {
    mainMap = new Map("googleMap");
    mainMap.render();
});