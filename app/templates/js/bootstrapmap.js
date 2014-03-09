define(["esri/map", "esri/dijit/Popup", "dojo/_base/declare", "dojo/on", "dojo/dom", "dojo/_base/lang", "dojo/dom-style", "dojo/query", "dojo/domReady!"], 
  function(Map, Popup, declare, on, dom, lang, style, query) {
    "use strict";        
    return {
      create: function(divId,options) {
        if (divId && options) {
          var smartResizer = new this._smartResizer(divId,options);
          var mapOut = smartResizer.createMap();
          mapOut._smartResizer = smartResizer;
          return mapOut;
        }
      },
      bindTo: function(map) {
        if (map) {
          var smartResizer = new this._smartResizer(map.id,map._params);
          var mapOut = smartResizer.bindToMap(map);
          mapOut._smartResizer = smartResizer;
          return mapOut;
        }
      },
      clearBaseMap: function(map){
        if(map.basemapLayerIds.length > 0){
          dojo.forEach(map.basemapLayerIds, function(lid){
            console.log('removing ' + lid);
            map.removeLayer(map.getLayer(lid));
          });
          map.basemapLayerIds = [];
        }else{
          map.removeLayer(map.getLayer(map.layerIds[0]));
        }
      },
      destroy: function(map) {
        function _disconnect(resizer) {
          if (resizer._handles) {
            var h;
            var i = resizer._handles.length;
            while (i--) {
              resizer._handles[i].remove();
              resizer._handles.splice(i,1);
            }
          }
        }
        if (map && map._smartResizer){
          _disconnect(map._smartResizer);
        }
      },
      // SmartResizer
      _smartResizer: declare(null, {
        _mapDivId: null,
        _mapDiv: null,
        _map: null,
        _delay: 100,
        _w: 0,
        constructor: function(mapDivId,options) {
          this._mapDivId = mapDivId;
          this._mapDiv = dom.byId(mapDivId);
          this._options = options;
          this._handles = [];
        },
        createMap: function() {
          this._setMapDiv(true);
          lang.mixin(this._options,{smartNavigation:false});
          this._map = new Map(this._mapDivId,this._options);
          this._bindEvents();
          this._mapDiv.__map = this._map;
          return this._map;
        },
        bindToMap: function(map) {
          this._setMapDiv(true);
          this._map = map;
          this._map.resize();
          this._bindEvents();
          this._setTouchBehavior();
          this._mapDiv.__map = this._map;
          return this._map;
        },
        _setTouchBehavior: function() {
          this._map.disableScrollWheelZoom();
        },
        _bindEvents: function(){
          if (!this._map) {
            console.log("BootstrapMap: Invalid map object. Please check map reference.");
            return;
          }
          // Touch behavior
          var setTouch = function(e) {
            this._setTouchBehavior();
          };
          this._handles.push(on(this._map,'load', lang.hitch(this, setTouch)));

          // InfoWindow restyle and reposition
          var setInfoWin = function(e) {
            this._map.infoWindow.anchor = "top";

            var updatePopup = function(obj) {
              var f = obj._map.infoWindow.getSelectedFeature();
              if (f) {
                var pt;
                if (f.geometry.type == "point") {
                  pt = f.geometry;
                } else {
                  pt = f.geometry.getExtent().getCenter();
                }
                window.setTimeout(function() {
                  obj._repositionInfoWin(pt);
                }, 250); 
              }
            };

            // GraphicLayers
            on(this._map.graphics, "click", lang.hitch(this, function(g){
              updatePopup(this);
            }));

            // FeatureLayers
            on(this._map.infoWindow, "selection-change", lang.hitch(this, function(g){
             updatePopup(this);
            }));
            
            //on(this._map, "pan-end", lang.hitch(this, function(e){
              // Causes issues on mobile
              // if (this._map.infoWindow.isShowing){
              //   this._map.infoWindow.reposition();
              // }
            //}));
          };
          this._handles.push(on(this._map,'load', lang.hitch(this, setInfoWin)));
          
          if (this._map.loaded) {
            lang.hitch(this, setInfoWin).call();
          }

          // Responsive resize
          var resizeWin = function(evt){
            this._setMapDiv();
          };
          this._handles.push(on(window, "resize", lang.hitch(this, resizeWin)));
          // Auto-center map
          var recenter = function(extent, width, height) { 
            this._map.__resizeCenter = this._map.extent.getCenter();
            var timer = function() {
              if (this._map.infoWindow.isShowing){
                this._repositionInfoWin(this._map.infoWindow.features[0]);
              }
              this._map.centerAt(this._map.__resizeCenter);
            };
            setTimeout(lang.hitch(this, timer), this._delay);
          };
          this._handles.push(on(this._map, 'resize', lang.hitch(this, recenter)));

        },
        _calcSpace: function(e) {
          var s = style.get(e);
          var p = parseInt(s.paddingTop,10) + parseInt(s.paddingBottom,10);
          var g = parseInt(s.marginTop,10) + parseInt(s.marginBottom,10);
          var b = parseInt(s.borderTopWidth,10) + parseInt(s.borderBottomWidth,10);
          var h = p + g + b; 
          return h;
        },
        _setMapDiv: function() {
          if (!this._mapDivId) {
            return;
          }
          var w = window.innerHeight;
          var wd = window.innerWidth;

          if (w != this._w || wd != this._wd) {
            this._w = w;
            this._wd = wd;
            var b = document.body.clientHeight;
            var mh = this._mapDiv.clientHeight;
            var ms = this._calcSpace(this._mapDiv);
            var mh1 = mh - ms;
            var room = w - b;
            var mh2 = room + mh1;
            style.set(this._mapDivId, {"height": mh2+"px"});
            //console.log("Window:"+ w + " Body:" + b + " Room: " + room + " MapInner:" + mh + " MapSpace:"+ms + " OldMapHeight:"+mh1+ " NewMapHeight:"+mh2);
          }
        },
        _repositionInfoWin: function(graphicCenterPt) {     
          // Determine the upper right, and center, coordinates of the map
          var maxPoint = new esri.geometry.Point(this._map.extent.xmax, this._map.extent.ymax, this._map.spatialReference);
          var centerPoint = new esri.geometry.Point(this._map.extent.getCenter());
          // Convert to screen coordinates
          var maxPointScreen = this._map.toScreen(maxPoint);
          var centerPointScreen = this._map.toScreen(centerPoint);
          var graphicPointScreen = this._map.toScreen(graphicCenterPt);  // Points only
          // Buffer
          var marginLR = 10;
          var marginTop = 3;
          var infoWin = this._map.infoWindow.domNode.childNodes[0];
          var infoWidth = infoWin.clientWidth;
          var infoHeight = infoWin.clientHeight + this._map.infoWindow.marginTop;
          // X
          var lOff = graphicPointScreen.x - infoWidth/2;
          var rOff = graphicPointScreen.x + infoWidth/2;
          var l = lOff - marginLR < 0;
          var r = rOff > maxPointScreen.x - marginLR;
          if (l) {
            centerPointScreen.x -= (Math.abs(lOff) + marginLR) < marginLR ? marginLR : Math.abs(lOff) + marginLR;
          } else if (r) {
            centerPointScreen.x += (rOff - maxPointScreen.x) + marginLR;
          }
          // Y
          var yOff = this._map.infoWindow.offsetY;
          var tOff = graphicPointScreen.y - infoHeight - yOff;
          var t = tOff - marginTop < 0;
          if (t) {
            centerPointScreen.y += tOff - marginTop;
          }
          //Pan the ap to the new centerpoint  
          if (r || l || t) {
            centerPoint = this._map.toMap(centerPointScreen);
            this._map.centerAt(centerPoint);        
          }         
        } 
      }) // _smartResizer
    }; // return
  } // function
); // define