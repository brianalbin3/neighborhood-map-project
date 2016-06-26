
function loadData() {

    var $body = $('body');
    var $wikiElem = $('#wikipedia-links');
    var $nytHeaderElem = $('#nytimes-header');
    var $nytElem = $('#nytimes-articles');
    var $greeting = $('#greeting');

    // clear out old data before new request
    $wikiElem.text("");
    $nytElem.text("");

    var streetStr = $('#street').val();
    var cityStr = $('#city').val();
    var address = streetStr + ", " + cityStr;

    var streetView = "http://maps.googleapis.com/maps/api/streetview?size=600x400&location=" + address;

    var img = "<img class='bgimg' src='" + streetView + "'>";

    $body.append(img);

    var nytURL = "https://api.nytimes.com/svc/search/v2/articlesearch.json?q=" + cityStr + "&sort=newest&api-key=21194f3076904c6a8341f5ca054555a0";
    $.getJSON( nytURL, function( data ) {
        var numArticles = data.response.docs.length;

        var articleURL;
        var leadParagraph;
        var headline;

        var listItem = "<li class='article'></li>";
        var articleLink;
        var articleParagraph;

        $nytHeaderElem.text("New York Times Articles About " + cityStr);

        for (var i = 0; i < numArticles; i++) {
            articleURL = data.response.docs[i].web_url;
            headline = data.response.docs[i].headline.main;
            snippet = data.response.docs[i].snippet;

            $nytElem.append("<li class='article'>" + "<a href='" + articleURL + "'>" + headline + "</a>" + "<p>" + snippet + "</p>" + "</li>");
        }
    }).error(function(e) {
        $nytHeaderElem.text("New York Times Articles Could Not Be Loaded");
    });

    var wikiURL = "http://en.wikipedia.org/w/api.php?action=opensearch&search=" + cityStr + "&format=json&callback=wikiCallback";

    var wikiRequestTimeout = setTimeout(function() {
        $wikiElem.text("failed to get wikipedia resources");
    }, 8000);

    $.ajax({
        url: wikiURL,
        dataType: "jsonp",
        success: function( response ) {
            var articleList = response[1];

            for (var i = 0; i < articleList.length; i++) {
                articleStr = articleList[i];
                var url = "http://en.wikipedia.org/wiki/" + articleStr;
                $wikiElem.append("<li><a href='" + url + "'>" + articleStr + "</a></li>");
            };

            clearTimeout(wikiRequestTimeout);
        }
    });


    return false;
};

$('#form-container').submit(loadData);
/*
Map.prototype.render = function() {

    var map;
    var lat, lon;

    var geocoder =  new google.maps.Geocoder();

    var addr = this.city + ", " + this.state;
    console.log(addr);

    geocoder.geocode( { "address": addr}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            lat = results[0].geometry.location.lat()
            lon = results[0].geometry.location.lng();
            var mapProp = {
                center: new google.maps.LatLng(lat,lon),
                zoom: 11,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            map=new google.maps.Map(document.getElementById("googleMap"),mapProp);
        }
        else {
            alert("Something got wrong " + status); // TODO: IMPROOVE THIS
        }
    });
}
*/


var Location = function(name, streetNo, streetName, city, state) {
    this.name = name;   //TODO: REMOVE THIS MAYBE?
    this.streetNo = streetNo;
    this.streetName = streetName;
    this.city = city;
    this.state = state;
};

Location.prototype.getFormattedLocation = function() {
    return this.streetNo + " " + this.streetName + " " + this.city + ", " + this.state;
}

var Map = function(city, state, containerId) {
    this.city = city;
    this.state = state;

    this.container = document.getElementById(containerId);

    this.locations = [];

    this.map;
};

Map.prototype.addLocation = function(name, streetNo, streetName, city, state) {
    var newLoc = new Location(name, streetNo, streetName, city, state);
    this.locations.push(newLoc);
}

Map.prototype._addLocationMarkers = function () {
    var self = this; //TODO: THIS IS HACKY
    // creates a Google place search service object. PlacesService does the work of
    // actually searching for location data.
    var service = new google.maps.places.PlacesService(this.map);

    // Iterates through the array of locations, creates a search object for each location
    this.locations.forEach(function(location){
        // the search request object
        var request = {
            query: location.getFormattedLocation()
        };

        // Actually searches the Google Maps API for location data and calls createMapMarker with the results
        service.textSearch(request,  function(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                self._createMapMarker(results[0]);
            }
            else {
                //TODO: ERROR HANDLING
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

    // hmmmm, I wonder what this is about...
    google.maps.event.addListener(marker, 'click', function() {
      // your code goes here!
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
}



window.addEventListener('load', function() {
    var mainMap = new Map("Austin", "Texas", "googleMap");
    mainMap.addLocation("The Domain", "11410", "Century Oaks Terrace", "Austin", "Texas");
    mainMap.render();
});
