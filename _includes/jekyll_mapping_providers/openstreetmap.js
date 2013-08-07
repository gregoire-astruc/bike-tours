<script src="http://www.openlayers.org/api/OpenLayers.js"></script>
<script type="text/javascript">
var jekyllMapping = (function () {
    'use strict';
    OpenLayers.Format.Flickr = OpenLayers.Class(OpenLayers.Format, {
      read: function(obj) {
        if(obj.stat === 'fail') {
          throw new Error(
            ['Flickr failure response (',
             obj.code,
             '): ',
             obj.message].join(''));
        }
        if(!obj || !obj.photoset ||
           !OpenLayers.Util.isArray(obj.photoset.photo)) {
          throw new Error(
            'Unexpected Flickr response');
        }
        var photos = obj.photoset.photo, photo,
          x, y, point,
          feature, features = [];
        for(var i=0,l=photos.length; i<l; i++) {
          photo = photos[i];
          x = photo.longitude;
          y = photo.latitude;
          point = new OpenLayers.Geometry.Point(x, y);
          feature = new OpenLayers.Feature.Vector(point, {
            title: photo.title,
            thumbnail: photo.url_t,
            image: photo.url_o
          });
          console.log(feature);
          features.push(feature);
        }
        return features;
      }
    });
    var settings;
    var obj = {
        plotArray: function(locations) {
            function jekyllMapListen (m, s) {
                if (s.link) {
                    m.events.register('click', m, function() {
                        window.location.href = s.link;
                    });
                }
            }
            var s, l, m, bounds = new OpenLayers.Bounds();
            while (locations.length > 0) {
                s = locations.pop();
                l = new OpenLayers.LonLat(s.longitude, s.latitude).transform( new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
                m = new OpenLayers.Marker(l)
                this.markers.addMarker(m)
                bounds.extend(l);
                jekyllMapListen(m, s);
            }
            this.map.zoomToExtent(bounds)
        },
        indexMap: function () {
            this.plotArray(settings.pages);
        },
        pageToMap: function () {
            if (typeof(settings.latitude) !== 'undefined' && typeof(settings.longitude) !== 'undefined') {
                this.center = new OpenLayers.LonLat(settings.longitude, settings.latitude).transform( new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
                this.map.setCenter(this.center, settings.zoom);
                this.markers.addMarker(new OpenLayers.Marker(this.center));
            }     

            if (settings.locations instanceof Array) {
                this.plotArray(settings.locations);
            }
            
            if (settings.layers) {
                while (settings.layers.length > 0){
                    var m = new OpenLayers.Layer.Vector("KML" + settings.layers.length, {
                            strategies: [new OpenLayers.Strategy.Fixed()],
                            protocol: new OpenLayers.Protocol.HTTP({
                                url: settings.layers.pop(),
                                format: new OpenLayers.Format.KML({
                                    extractStyles: true,
                                    extractAttributes: true,
                                    maxDepth: 2
                                })
                            })
                        });
                    this.map.addLayer(m)
                }
            }

            if (settings.photosets) {
              while (settings.photosets.length > 0) {
                var id = settings.photosets.pop();
                var photoset = new OpenLayer.Vector("Photoset #" + id, {
                  protocol: new OpenLayers.Protocol.Script({
                    url: "http://api.flickr.com/services/rest/",
                    callbackKey: "jsoncallback",
                    params: {
                      method: "flickr.photosets.getPhotos",
                      api_key: "{{ site.flickr_set.api_key }}",
                      photoset_id: id,
                      extras: "geo,url_t,url_o",
                      format: "json"
                    },
                    format: new OpenLayers.Format.Flickr(),
                  }),
                  strategies: [new Openlayers.Strategy.Fixed()],
                  styleMap: new OpenLayers.StyleMap({
                    "default": new OpenLayers.Style({ pointRadius: 10, externalGraphic: "${thumbnail}" }),
                  }),
                });

                var popupControl = new OpenLayers.Control.SelectFeature(photoset, {
                  onSelect: function(feature) { window.open(feature.attributes.image); }
                }); 
                this.map.addControl(popupControl);
            
                popupControl.activate();
      
                this.map.addLayer(photoset);
              }
            }
        },
        mappingInitialize: function (set) {
            settings = set;

            this.markers = new OpenLayers.Layer.Markers("Markers"),
            this.map = new OpenLayers.Map("jekyll-mapping");

            // Automatically update the viewport when a layer is added.
            this.map.events.register("addlayer", this.map, function(me) {
              me.layer.events.register("loadend", me.layer, function(le) {

                if (!le.object || !le.object.getDataExtent())
                  return;

                var bounds = me.object.calculateBounds() || le.object.getDataExtent();
                bounds.extend(le.object.getDataExtent());
                me.object.zoomToExtent(le.object.getDataExtent(), true);
              });
            });

            this.map.addLayer(new OpenLayers.Layer.OSM());
            this.map.addLayer(this.markers);

            if (settings.pages) {
                this.indexMap();
            } else {
                this.pageToMap();
            }
        }        
    };
    return obj
}());
</script>
