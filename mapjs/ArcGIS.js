var _ArcRequest, _Watch;
var _MapObject, _Basemap,  _MapView, _TileLayer, _FeatureLayer, _TileInfo, _PopupTemplate;
var _Collection, _Field, _FieldsContent, _FieldInfo;
var _Zoom, _Legend, _Search, _BasemapToggle, _ScaleBar, _Print;
var _Polygon, _Circle, _Point, _Line, _GraphicsLayer, _SimpleMarkerSymbol, _SimpleFillSymbol, _Graphic
var _GeometryEngine,  _AsyncGeometryEngine, _Projection, _SpatialReference, _WebMercTools;

export function fetchArcAPI(completion) {
  require(["esri/Map", "esri/views/MapView", "esri/widgets/Zoom", "esri/layers/TileLayer", 
           "esri/request", "esri/core/Collection", "esri/widgets/Legend", "esri/Basemap", "esri/layers/support/TileInfo", "esri/widgets/BasemapToggle",
           "esri/widgets/Search", "esri/Graphic", "esri/core/watchUtils", "esri/geometry/Circle", "esri/geometry/support/webMercatorUtils", 
           "esri/geometry/geometryEngine", "esri/geometry/Point", "esri/geometry/Polyline", "esri/geometry/geometryEngineAsync", "esri/geometry/Polygon", 
           "esri/layers/FeatureLayer", "esri/layers/GraphicsLayer", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleFillSymbol", 
           "esri/widgets/ScaleBar", "esri/widgets/Print", "esri/geometry/projection", "esri/geometry/SpatialReference", "esri/layers/support/Field", 
           "esri/PopupTemplate", "esri/popup/content/FieldsContent", "esri/popup/FieldInfo", "dojo/domReady!"],
  function(eMapObject, eMapView, eZoom, eTileLayer, eArcRequest, eCollection, eLegend, eBasemap, eTileInfo, eBasemapToggle, eSearch, 
           eGraphic, eWatch, eCircle, eWebMercTools, eGeometryEngine, ePoint, eLine, eAsyncGeometryEngine, ePolygon, eFeatureLayer, eWebMap, 
           eGraphicsLayer, eSimpleMarkerSymbol, eSimpleFillSymbol, eScaleBar, ePrint, eProjection, eSpatialReference, eField, ePopupTemplate, 
           eFieldsContent, eFieldInfo){
            _ArcRequest = eArcRequest; 
            _Watch = eWatch; 
            _MapObject = eMapObject;
            _Basemap = eBasemap;
            _MapView = eMapView; 
            _TileLayer = eTileLayer; 
            _FeatureLayer = eFeatureLayer; 
            _TileInfo = eTileInfo; 
            _PopupTemplate = ePopupTemplate;
            _Collection = eCollection;
            _Field = eField;
            _FieldsContent = eFieldsContent;
            _FieldInfo = eFieldInfo;
            _Zoom = eZoom;
            _Legend = eLegend;
            _Search = eSearch;
            _BasemapToggle = eBasemapToggle;
            _ScaleBar = eScaleBar;
            _Print = ePrint;
            _Polygon = ePolygon;
            _Circle = eCircle;
            _Point = ePoint;
            _Line = eLine; 
            _GraphicsLayer = eGraphicsLayer; 
            _SimpleMarkerSymbol = eSimpleMarkerSymbol; 
            _SimpleFillSymbol = eSimpleFillSymbol; 
            _Graphic = eGraphic;
            _GeometryEngine = eGeometryEngine;
            _AsyncGeometryEngine = eAsyncGeometryEngine;
            _Projection = eProjection;
            _SpatialReference = eSpatialReference;
            _WebMercTools = eWebMercTools;

    completion()
  });
}

// I might need to be careful when calling this completion... right? If it uses properties that aren't imported in this file? 
// I'm not really sure how that works. I guess I'll find out. 
// could that lead to data being stale....?
// The properties need to be accessed through singletons I think. I'm not sure, though. 
// you might just expose the map as a module and import it in here if there are any problems. 
// is the require statement going to be available in here, too...? It should be... the dom elements are. We will see. 


export const API = {
  ArcRequest: () => { return _ArcRequest },
  Watch: () => { return _Watch },
  MapObject: () => { return _MapObject }, 
  Basemap: () => { return _Basemap },
  MapView: () => { return _MapView },
  TileLayer: () => { return _TileLayer },
  FeatureLayer: () => { return _FeatureLayer },
  TileInfo: () => { return _TileInfo },
  PopupTemplate: () => { return _PopupTemplate },
  Collection: () => { return _Collection },
  Field: () => { return _Field },
  FieldsContent: () => { return _FieldsContent },
  FieldInfo: () => { return _FieldInfo },
  Zoom: () => { return _Zoom },
  Legend: () => { return _Legend },
  Search: () => { return _Search },
  BasemapToggle: () => { return _BasemapToggle },
  ScaleBar: () => { return _ScaleBar },
  Print: () => { return _Print },
  Polygon: () => { return _Polygon },
  Circle: () => { return _Circle },
  Point: () => { return _Point },
  Line: () => { return _Line },
  GraphicsLayer: () => { return _GraphicsLayer },
  SimpleMarkerSymbol: () => { return _SimpleMarkerSymbol },
  SimpleFillSymbol: () => { return _SimpleFillSymbol },
  Graphic: () => { return _Graphic },
  GeometryEngine: () => { return _GeometryEngine },
  AsyncGeometryEngine: () => { return _AsyncGeometryEngine },
  Projection: () => { return _Projection },
  SpatialReference: () => { return _SpatialReference },
  WebMercTools: () => { return _WebMercTools },
}


