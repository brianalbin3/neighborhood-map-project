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

var LocationModel = {
    locations: [
                 new Location('Barton Springs Pool', '2101', 'Barton Springs Rd', 'Austin', 'Texas'),
                 new Location('Game Over Video Games', '3005', 'S Lamar Blvd', 'Austin', 'Texas'),
                 new Location('Pinballz Arcade', '', '', 'Austin', 'Texas'),
                 new Location('St. Edward\'s Park', '7301', 'Spicewood Springs Rd', 'Austin', 'Texas'),
                 new Location('Alamo Drafthouse Cinema', '2700', 'W Anderson Ln', 'Austin', 'Texas')
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

    self.filter = ko.observable('');

    self.currentLocation = ko.observable({ 'location': { 'name': '' } });

    self.locationList = ko.observableArray([]);

    LocationModel.locations.forEach(function(locationItem){
        self.locationList.push( locationItem );
    });

    self.setActiveLocation = function(data, event) {
        console.log("setActiveLocation data="+data);
        mainMap.setActiveMarker(data.name);
        mainMap.openLocationInfoWindowAtLocation(data.name);

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
                var show = locName.toLowerCase().includes(self.filter().toLowerCase());

                if ( locName == self.currentLocation().location.name ) {
                    mainMap.setLocationMarkerInactive(locName);
                    mainMap.hideLocationInfoWindow(locName);

                    if ( show === false ) {
                        self.currentLocation({ 'location': { 'name': '' } });
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

Map.prototype.render = function() {
    var mapOptions = {
        disableDefaultUI: true
    };

    this.map = new google.maps.Map(document.getElementById('googleMap'), mapOptions);

    window.mapBounds = new google.maps.LatLngBounds();

    this._addLocationMarkers();
};

Map.prototype.resizeMap = function() {
    var center = this.map.getCenter();
    google.maps.event.trigger(this.map, 'resize');
    this.map.setCenter(center);
};

Map.prototype.setAllMarkersVisible = function(makeVisible) {

    var numLocations = LocationModel.locations.length;

    for (var i = 0; i < numLocations; i++) {
        LocationModel.locations[i].marker.setVisible(makeVisible);
    }
};

Map.prototype.setLocationMarkerVisible = function(locationName, isVisible) {
    var location = LocationModel.getLocationByName(locationName);
    var marker = location.marker;

    if ( marker !== null ) {
        marker.setVisible(isVisible);
    }
};

Map.prototype.setActiveMarker = function(locationName) {
    var location = LocationModel.getLocationByName(locationName);
    var marker = location.marker;

    if ( marker !== null ) {
        this._setActiveMarker(marker);
    }
};

Map.prototype.openLocationInfoWindowAtLocation = function(locationName) { //TODO: Rename this
    var location = LocationModel.getLocationByName(locationName);

    if ( location !== null ) {
        this.infoWindow.setContent( location.infoWindowContent );
        this.infoWindow.open(this.map, location.marker);
    }
};

Map.prototype.hideLocationInfoWindow = function(locationName) {
    this.infoWindow.close();
};

Map.prototype.setLocationMarkerInactive = function(locationName) {
    var location = LocationModel.getLocationByName(locationName);
    var marker = location.marker;

    marker.setIcon(this._DESELECTED_MARKER_ICON);
};

Map.prototype._setActiveMarker = function(marker) {
    var numLocations = LocationModel.locations.length;
    for (var i = 0; i < numLocations; i++) {
        LocationModel.locations[i].marker.setIcon(this._DESELECTED_MARKER_ICON);
    }

    marker.setIcon(this._SELECTED_MARKER_ICON);
};

Map.prototype._addLocationMarkers = function () {
    var self = this; //TODO: SHOULD I MOVE THIS?

    var service = new google.maps.places.PlacesService(this.map);

    LocationModel.locations.forEach(function(location){

        var locationQuery = location.name + ' ' + location.getFormattedAddress();

        var request = {
            query: locationQuery
        };

        service.textSearch(request,  function(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                self._createMapMarker(results[0], location);
            }
            else {
                $('#googleMap').append('<h2>Oh noes! Could not load place data from google maps for ' + location.name +'.</h2>');
            }
        });
    });
};

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
                                    '<span class="info-window-icon">' + 'Address: ' + '</span>' +
                                    '<span>' + location.getFormattedAddress()  + '</span>' +
                                '</div>';
    if ( location.fourSquareInfo.phone ) {
            infoWindowContent += '<div>' +
                                    '<span class="info-window-icon">' + 'Phone: ' + '</span>' +
                                    '<span>' + location.fourSquareInfo.phone + '</span>' +
                                '</div>';
    }
    if ( location.fourSquareInfo.twitter ) {
           infoWindowContent += '<div>' +
                                    '<span class="info-window-icon">' + 'Twitter: ' + '</span>' +
                                    '<span><a href="http://www.twitter.com/' + location.fourSquareInfo.twitter + '" target="_blank">www.twitter.com/' + location.fourSquareInfo.twitter + '</a></span>' +
                                '</div>';
    }
    if ( location.fourSquareInfo.facebookUsername ) {
           infoWindowContent += '<div>' +
                                    '<span class="info-window-icon">' + 'Facebook: ' + '</span>' +
                                    '<span><a href="http://www.facebook.com/' + location.fourSquareInfo.facebookUsername + '" target="_blank">www.facebook.com/' + location.fourSquareInfo.facebookUsername + '</a></span>' +
                                '</div>';
    }
/*
                                "<div>" +
                                    "<span class='info-window-icon'>" + "Categories" + "</span>" +
                                    "<span>" + "" + "</span>" +
                                "</div>" +
*/
    if ( location.fourSquareInfo.website ) {
           infoWindowContent += '<div>' +
                                    '<span class="info-window-icon">' + 'Website: ' + '</span>' +
                                    '<span><a href="' + location.fourSquareInfo.website + ' target="_blank">' + location.fourSquareInfo.website + '</span>' +
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

Map.prototype.closeInfoWindow = function() {
    this.infoWindow.close();
};

function initMap() {
    ko.applyBindings( vm );
    mainMap = new Map('googleMap');
    mainMap.render();

    window.onresize = function() {
        mainMap.resizeMap();
        mainMap.map.setCenter(mainMap.map.getCenter());
    };
}

function googleMapsError() {
    alert('Oh Noes! Could not load google maps.');
}
