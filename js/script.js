var mainMap;

var Location = function(name, streetNo, streetName, city, state) {
    this.name = name;
    this.streetNo = streetNo;
    this.streetName = streetName;
    this.city = city;
    this.state = state;
    this.fourSquareInfo = new FourSquareLocationInfo(name, city, state);

    this.marker = null;
    this.infoWindowContent = null;
};

/**
 * Returns the location's formatted address
 * @return {String} A formatted address of the format
 *     7921 Rustling Bark Court, Ellicott City, MD OR Ellicott City, Md
 */
Location.prototype.getFormattedAddress = function() {
    if ( this.streetNo === '' || this.streetName === '' ) {
        return this.city + ', ' + this.state;
    }

    return this.streetNo + ' ' + this.streetName + ', ' + this.city + ', ' + this.state;
};

var FourSquareLocationInfo = function(name, city, state) {
    this.name = name;
    this.city = city;
    this.state = state;

    this.phone;
    this.twitter;
    this.facebookUsername;
    this.categories = [];
    this.website;

    var fourSquareURL = 'https://api.foursquare.com/v2/venues/search?near=' + this.city +', '+ this.state +
                        '&query='+ this.name +'&limit=1&oauth_token=FSOWT50BEYQIEETU5RHQHFVEIYBG3LFIZWJKU24U254RFTWA&v=20160701'; //TODO: PROPER OAUTH TOKEN

    $.getJSON(fourSquareURL, function(data) {
        var venue = data.response.venues[0];

        this.name = venue.name;
        this.phone = venue.contact.phone;
        this.twitter = venue.contact.twitter;
        this.facebookUsername = venue.contact.facebookUsername;

        var numCategories = venue.categories.length;
        for (var i = 0; i < numCategories; i++) {
            this.categories.push(venue.categories[i].name);
        }

        this.website = venue.url;
    }.bind(this))
    .fail( function(jqXTR, status, error) {
        this.phone = 'Could not connect to FourSquare...';
        this.twitter = 'Could not connect to FourSquare...';
        this.facebookUsername = 'Could not connect to FourSquare...';
        this.website = 'Could not connect to FourSquare...';
    }.bind(this));
};

/*
 * Returns the formatted phone number
 * @return {String} A the phone number in the format (410) 799-5959
 */
FourSquareLocationInfo.prototype.getFormattedPhoneNumber = function() {
    return "(" + this.phone.substring(0,3) + ") " + this.phone.substring(3,6) + "-" + this.phone.substring(6,10);
};

var LocationModel = function() {
    this.locations = [];
    this.locations['Barton Springs Pool'] = new Location('Barton Springs Pool', '2101', 'Barton Springs Rd', 'Austin', 'Texas');
    this.locations['Game Over Video Games'] = new Location('Game Over Video Games', '3005', 'S Lamar Blvd', 'Austin', 'Texas');
    this.locations['Pinballz Arcade'] = new Location('Pinballz Arcade', '', '', 'Austin', 'Texas');
    this.locations['St. Edward\'s Park'] = new Location('St. Edward\'s Park', '7301', 'Spicewood Springs Rd', 'Austin', 'Texas');
    this.locations['Alamo Drafthouse Cinema'] = new Location('Alamo Drafthouse Cinema', '2700', 'W Anderson Ln', 'Austin', 'Texas');
};

/**
 * Returns a Location given its name
 * @param {string} name The name of the location
 * @return {Location} A Location object with the given name
 */
LocationModel.prototype.getLocationByName = function(name) {
    return this.locations[name];
};

var lm = new LocationModel();

var ViewModel = function() {
    var self = this;

    self.filter = ko.observable('');

    self.currentLocation = ko.observable({ 'location': { 'name': '' } });

    self.locationList = ko.observableArray([]);

    for (var key in lm.locations) {
        if ( lm.locations.hasOwnProperty(key) ) {
            self.locationList.push( lm.locations[key] );
        }
    }

    self.setActiveLocation = function(data, event) {
        mainMap.setActiveMarker(data.name);
        mainMap.openInfoWindowAtLocation(data.name);

        self.currentLocation( { location: data } );
    };

    self.filterLocations = ko.computed(function () {
        if (!self.filter()) {
            if ( mainMap ) { // MAP NOT YET LOADED
                mainMap.setAllMarkersVisible(true);
            }

            return self.locationList();
        }
        else {
            return ko.utils.arrayFilter(self.locationList(), function (locationItem) {
                var locName = locationItem.name;
                var show = locName.toLowerCase().indexOf(self.filter().toLowerCase()) !== -1;

                if ( show === false ) {
                    mainMap.setLocationMarkerInactive(locName);

                    if ( locName === self.currentLocation().location.name ) {
                        self.currentLocation({ 'location': { 'name': '' } });
                        mainMap.hideInfoWindow();
                    }

                }

                mainMap.setLocationMarkerVisible(locName, show);
                return show;
            });
        }
    });
};

var vm = new ViewModel();

var Map = function(containerId) {

    this.container = document.getElementById(containerId);
    this.map;
    this.infoWindow = new google.maps.InfoWindow( { content: "" } );

    this._DESELECTED_MARKER_ICON = 'https://www.google.com/mapfiles/marker.png';
    this._SELECTED_MARKER_ICON = 'https://www.google.com/mapfiles/marker_green.png';
};

/**
 * Displays a map with location markers on the screen
 */
Map.prototype.render = function() {
    var mapOptions = {
        disableDefaultUI: true
    };

    this.map = new google.maps.Map(document.getElementById('googleMap'), mapOptions);

    window.mapBounds = new google.maps.LatLngBounds();

    this._addLocationMarkers();
};

/**
 * Resizes the map to use all available space
 */
Map.prototype.resizeMap = function() {
    var center = this.map.getCenter();
    google.maps.event.trigger(this.map, 'resize');
    this.map.setCenter(center);
};

/**
 * Makes all map markers visible or invisible
 * @param {boolean} makeVisible True to make all map markers visible, false to make all map markers invisible
 */
Map.prototype.setAllMarkersVisible = function(makeVisible) {
    for (var key in lm.locations) {
        if ( lm.locations.hasOwnProperty(key) ) {
            lm.locations[key].marker.setVisible(makeVisible);
        }
    }
};

/**
 * Shows or hides a location's map marker
 * @param {string} locationName The name of the location
 * @param {boolean} isVisible True to make the location visible, false to make it invisible
 */
Map.prototype.setLocationMarkerVisible = function(locationName, isVisible) {
    var location = lm.getLocationByName(locationName);
    var marker = location.marker;

    if ( marker !== null ) {
        marker.setVisible(isVisible);
    }
};

/**
 * Makes the marker at the specified location active and all other markers inactive. (Active markers are green, others are red)
 * @param {string} locationName The name of the location whose marker is to be made active
 */
Map.prototype.setActiveMarker = function(locationName) {
    var location = lm.getLocationByName(locationName);
    var marker = location.marker;

    if ( marker !== null ) {
        this._setActiveMarker(marker);
    }
};

/**
 * Opens an infoWindow at the location's map marker
 * @param {string} locationName The name of the location which will have an infoWindow appear at its map marker
 */
Map.prototype.openInfoWindowAtLocation = function(locationName) {
    var location = lm.getLocationByName(locationName);

    if ( location !== null ) {
        this.infoWindow.setContent( location.infoWindowContent );
        this.infoWindow.open(this.map, location.marker);
    }
};

/**
 * Makes the marker at the specified location active and all other markers inactive. (Active markers are green, others are red)
 * @param {string} locationName The name of the location whose marker is to be made active
 */
Map.prototype.hideInfoWindow = function() {
    this.infoWindow.close();
};

/**
 * Makes the marker at the specified location inactive (marker will be made red)
 * @param {string} locationName The name of the location whose marker is to be made inactive
 */
Map.prototype.setLocationMarkerInactive = function(locationName) {
    var location = lm.getLocationByName(locationName);
    var marker = location.marker;

    marker.setIcon(this._DESELECTED_MARKER_ICON);
};

/**
 * Makes the marker passed in active and all other markers inactive. (Active markers are green, others are red)
 * @param {string} marker The marker to be made active
 */
Map.prototype._setActiveMarker = function(marker) {
    for (var key in lm.locations) {
        if ( lm.locations.hasOwnProperty(key) ) {
            lm.locations[key].marker.setIcon(this._DESELECTED_MARKER_ICON);
        }
    }

    marker.setIcon(this._SELECTED_MARKER_ICON);
};

/**
 * Creates a map marker on the map for each location in the location model
 */
Map.prototype._addLocationMarkers = function () {
    var self = this;

    var service = new google.maps.places.PlacesService(this.map);

    for (var key in lm.locations) {
        if ( lm.locations.hasOwnProperty(key) ) {
            var location = lm.locations[key];
            var locationQuery = location.name + ' ' + location.getFormattedAddress();

            var request = {
                query: locationQuery
            };

            (function(loc) {
                service.textSearch(request, function(results, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        self._createMapMarker(results[0], loc);
                    }
                    else {
                        $('#googleMap').append('<h2>Oh noes! Could not load place data from google maps for ' + location.name +'.</h2>');
                    }
                });
            })(location);
        }
    }
};

/**
 * Creates a map marker from a location and the result of a google place search on the location
 * @param {?????} result The result of a google place search on the location
 * @param {Location} location
 */
Map.prototype._createMapMarker = function(result, location) {
    var lat = result.geometry.location.lat(),
        lon = result.geometry.location.lng(),
        //name = result.formatted_address;   // name of the place from the place service
        name = location.name,
        bounds = window.mapBounds;

    var marker = new google.maps.Marker({
      map: this.map,
      position: result.geometry.location,
      title: name,
      icon: this._DESELECTED_MARKER_ICON
    });

    var infoWindowContent = '<div>' +
                                '<h1 class="info-window-header">' + location.name + '</h1>' +
                                '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowAddressIcon.png">' +
                                    '<span>' + location.getFormattedAddress()  + '</span>' +
                                '</div>';
    if ( location.fourSquareInfo.categories.length !== 0 ) {
            infoWindowContent += '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowAddressIcon.png" alt="Categories">' +
                                    '<span>';
                                    var numCategories = location.fourSquareInfo.categories.length;
                                    for (var i = 0; i < numCategories; i++) {
                                        infoWindowContent += location.fourSquareInfo.categories[i];

                                        if (i !== numCategories - 1) {
                                            infoWindowContent += ", ";
                                        }
                                    }
            infoWindowContent +=    '</span>';
            infoWindowContent += '</div>';
    }
    //TODO: Target is still not working
    if ( location.fourSquareInfo.phone ) {
            infoWindowContent += '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowPhoneIcon.png">' +
                                    '<a href="tel:' + location.fourSquareInfo.phone + '">' + location.fourSquareInfo.getFormattedPhoneNumber() + '</a>' +
                                '</div>';
    }
    if ( location.fourSquareInfo.twitter ) {
           infoWindowContent += '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowWebsiteIcon.png">' +
                                    '<a href="http://www.twitter.com/' + location.fourSquareInfo.twitter + '" target="_blank">www.twitter.com/' + location.fourSquareInfo.twitter + '</a>' +
                                '</div>';
    }
    if ( location.fourSquareInfo.facebookUsername ) {
           infoWindowContent += '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowWebsiteIcon.png">' +
                                    '<a href="http://www.facebook.com/' + location.fourSquareInfo.facebookUsername + '" target="_blank">www.facebook.com/' + location.fourSquareInfo.facebookUsername + '</a>' +
                                '</div>';
    }
    if ( location.fourSquareInfo.website ) {
           infoWindowContent += '<div>' +
                                    '<img class="info-window-icon" src="img/infoWindowWebsiteIcon.png">' +
                                    '<a href="' + location.fourSquareInfo.website + '" target="_blank">' + location.fourSquareInfo.website + '</a>' +
                                '</div>' +
                             '</div>';
    }

    location.marker = marker;
    location.infoWindowContent = infoWindowContent;

    google.maps.event.addListener(marker, 'click', function() {
        vm.currentLocation( { location: location } );
        this._setActiveMarker(marker);  //TODO: Should maybe use a callback

        this.infoWindow.setContent(location.infoWindowContent);

        this.infoWindow.open(this.map, marker);
    }.bind(this));

    bounds.extend(new google.maps.LatLng(lat, lon));
    this.map.fitBounds(bounds);
    this.map.setCenter(bounds.getCenter());
};

/**
 * Initializes the google map
 */
function initMap() {
    ko.applyBindings( vm );
    mainMap = new Map('googleMap');
    mainMap.render();

    window.onresize = function() {
        mainMap.resizeMap();
        mainMap.map.setCenter(mainMap.map.getCenter());
    };
}

/**
 * Alerts the user that google maps could not be loaded
 */
function googleMapsError() {
    alert('Oh Noes! Could not load google maps.');
}