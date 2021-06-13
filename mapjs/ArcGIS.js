export function fetchArcAPI(completion) {
  // endpoints in the array passed to require must have a 1 to 1 ordered correspondence with parameters in its callback 
  // except for dojo/domReady!, which must always remain at the end 
  require(["esri/Map", "esri/views/MapView", "esri/widgets/Zoom", "esri/layers/TileLayer", "esri/request", "esri/widgets/Legend", "esri/Basemap", 
           "esri/widgets/BasemapToggle", "esri/widgets/Search", "esri/Graphic", "esri/core/watchUtils", "esri/geometry/Circle", 
           "esri/geometry/support/webMercatorUtils", "esri/geometry/geometryEngine", "esri/geometry/Point", "esri/geometry/Polyline", 
           "esri/geometry/geometryEngineAsync", "esri/geometry/Polygon", "esri/layers/FeatureLayer",
           "esri/widgets/ScaleBar", "esri/widgets/Print", "esri/geometry/projection", "esri/geometry/SpatialReference", 
           "esri/layers/support/Field", "esri/PopupTemplate", "esri/popup/FieldInfo", "dojo/domReady!"],
  function(eMapObject, eMapView, eZoom, eTileLayer, eArcRequest,  eLegend, eBasemap, eBasemapToggle, eSearch, eGraphic, eWatch, eCircle, eWebMercTools, 
           eGeometryEngine, ePoint, eLine, eAsyncGeometryEngine, ePolygon, eFeatureLayer, eScaleBar, ePrint, 
           eProjection, eSpatialReference, eField, ePopupTemplate, eFieldInfo){
            API.ArcRequest = eArcRequest; 
            API.Watch = eWatch; 
            API.MapObject = eMapObject;
            API.Basemap = eBasemap;
            API.MapView = eMapView; 
            API.TileLayer = eTileLayer; 
            API.FeatureLayer = eFeatureLayer;
            API.PopupTemplate = ePopupTemplate;
            API.Field = eField;
            API.FieldInfo = eFieldInfo;
            API.Zoom = eZoom;
            API.Legend = eLegend;
            API.Search = eSearch;
            API.BasemapToggle = eBasemapToggle;
            API.ScaleBar = eScaleBar;
            API.Print = ePrint;
            API.Polygon = ePolygon;
            API.Circle = eCircle;
            API.Point = ePoint;
            API.Line = eLine;
            API.Graphic = eGraphic;
            API.GeometryEngine = eGeometryEngine;
            API.AsyncGeometryEngine = eAsyncGeometryEngine;
            API.Projection = eProjection;
            API.SpatialReference = eSpatialReference;
            API.WebMercTools = eWebMercTools;
            Object.freeze(API);
    completion()
  });
}
export var API = {}


