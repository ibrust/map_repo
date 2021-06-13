export function fetchArcAPI(completion) {
  // endpoints in the array passed to require must have a 1 to 1 ordered correspondence with parameters in its callback 
  // except for dojo/domReady!, which must always remain at the end 
  require(["esri/Map", "esri/views/MapView", "esri/widgets/Zoom", "esri/layers/TileLayer", "esri/request", "esri/widgets/Legend", "esri/Basemap", 
           "esri/widgets/BasemapToggle", "esri/widgets/Search", "esri/Graphic", "esri/core/watchUtils", "esri/geometry/Circle", 
           "esri/geometry/support/webMercatorUtils", "esri/geometry/geometryEngine", "esri/geometry/Point", "esri/geometry/Polyline", 
           "esri/geometry/geometryEngineAsync", "esri/geometry/Polygon", "esri/layers/FeatureLayer", "esri/widgets/ScaleBar", "esri/widgets/Print", 
           "esri/geometry/projection", "esri/geometry/SpatialReference", "esri/layers/support/Field", "esri/PopupTemplate", "esri/popup/FieldInfo", 
           "dojo/domReady!"],
  function(MapObject, MapView, Zoom, TileLayer, ArcRequest, Legend, Basemap, BasemapToggle, Search, Graphic, Watch, Circle, WebMercTools, GeometryEngine, 
           Point, Line, AsyncGeometryEngine, Polygon, FeatureLayer, ScaleBar, Print, Projection, SpatialReference, Field, PopupTemplate, FieldInfo){
            API.ArcRequest = ArcRequest; 
            API.Watch = Watch; 
            API.MapObject = MapObject;
            API.Basemap = Basemap;
            API.MapView = MapView; 
            API.TileLayer = TileLayer; 
            API.FeatureLayer = FeatureLayer;
            API.PopupTemplate = PopupTemplate;
            API.Field = Field;
            API.FieldInfo = FieldInfo;
            API.Zoom = Zoom;
            API.Legend = Legend;
            API.Search = Search;
            API.BasemapToggle = BasemapToggle;
            API.ScaleBar = ScaleBar;
            API.Print = Print;
            API.Polygon = Polygon;
            API.Circle = Circle;
            API.Point = Point;
            API.Line = Line;
            API.Graphic = Graphic;
            API.GeometryEngine = GeometryEngine;
            API.AsyncGeometryEngine = AsyncGeometryEngine;
            API.Projection = Projection;
            API.SpatialReference = SpatialReference;
            API.WebMercTools = WebMercTools;
            Object.freeze(API);
    completion()
  });
}
export var API = {}


