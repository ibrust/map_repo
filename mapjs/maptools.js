import * as Utils from './utils.js';
import * as Colors from './colors.js';
import * as State from './state.js';
import * as ArcGIS from './ArcGIS.js'; 
import * as Graphics from './graphics.js';
import * as Table from './table.js';

export function search_function(){
  var search_panel = document.getElementById("search_panel");
  var search_layer_selector = document.getElementById("search_layer_selector");
  var search_error_div = document.getElementById("search_error_div");

  if (search_error_div.innerHTML != ""){
    let int_slice = search_panel.style.height; 
    int_slice = Number(int_slice.slice(0, 3)); 
    int_slice -= 50; 
    let px_size = int_slice + "px"; 
    search_panel.style.height = px_size;
  }
  search_error_div.innerHTML = ""; 
  search_error_div.style.overflowY = "hidden"; 
    
  var feature_layer = null; 
  var selected_id = search_layer_selector.options[search_layer_selector.selectedIndex].id;

  var SQL_query = document.getElementById("search_SQL_input").value;
  if (SQL_query == ""){
    SQL_query = "1=1";
  }

  for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
      if (State.MapProperties.feature_layers[x].layerId == selected_id){
          feature_layer = State.MapProperties.feature_layers[x]; 
          break; 
      }
  }

  var query = feature_layer.createQuery();
  query.where = SQL_query; 
  query.sqlFormat = "standard"; 

  var query_promise = feature_layer.queryFeatures(query);

  query_promise.then(function(query_results){
      var fields = State.MapProperties.current_layers_query["data"].fields; 
      if (query_results.fields == null){
          query_results.fields = fields;
      }
      State.MapProperties.current_layers_query = {"data": query_results, "selected_id": selected_id};
      if (State.filterActive.get() == true){
          State.filterActive.set(false);
      } 
      if (State.itemSelectorActive.get() == true){
          State.itemSelectorActive.set(false);
      }
      
      Table.fill_attribute_table(1, true);
  },
  function(reject){
      Utils.error_handler(reject.message, search_error_div, search_panel);
  });
}

export function filter_by_extent(mode){
  var table_dataset_selector = document.getElementById("table_dataset_selector");

if (mode == "on"){
  State.MapProperties.map_view.graphics = [];
  if (State.MapGraphics.enable_graphics == true){
    Graphics.clear_graphics_layer(); 
  }
  var feature_layer = null; 
  var selected_id = Number(table_dataset_selector.options[table_dataset_selector.selectedIndex].id);      // get the currently selected layer_id

  for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
    if (State.MapProperties.feature_layers[x].layerId == selected_id){
      feature_layer = State.MapProperties.feature_layers[x]; 
      break; 
    }
  }

  var query = feature_layer.createQuery();
  query.geometry = State.MapProperties.map_view.extent; 

  var query_promise = feature_layer.queryFeatures(query);
  State.MapProperties.saved_complete_query = State.MapProperties.current_layers_query; 

  query_promise.then(function(query_results){
    var fields = State.MapProperties.current_layers_query["data"].fields; 

    if (query_results.fields == null){
      query_results.fields = fields; 
    }

    if (query_results.features.length > 0 && query_results.spatialReference.isWGS84 == false){
      let prior_spatial_reference; 
      const WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});

      let all_promised = ArcGIS.API.Projection.load().then(function(){
        if (query_results.spatialReference.wkid != null){
          prior_spatial_reference = new ArcGIS.API.SpatialReference({wkid: query_results.spatialReference.wkid});
        }
        else if (query_results.spatialReference.wkt != null){
          prior_spatial_reference = new ArcGIS.API.SpatialReference({wkt: query_results.spatialReference.wkt});
        }

        let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);

        for (let x = 0; x < query_results.features.length; x++){
          query_results.features[x].geometry = ArcGIS.API.Projection.project(query_results.features[x].geometry, WGS84_spatial_reference, transformation_object);
        }
        State.MapProperties.current_layers_query = {"data": query_results, "layer_id": selected_id};
        Table.fill_attribute_table(1, true);
      });
    }
    else{
      State.MapProperties.current_layers_query = {"data": query_results, "layer_id": selected_id};
      Table.fill_attribute_table(1, true);
    }
  });
}
else if (mode == "off"){
  State.MapProperties.current_layers_query = State.MapProperties.saved_complete_query; 
} 
}

export function click_select_function(e){
  var clicked_point = e.mapPoint;                 // the point on the map that was clicked 
  var point = e.mapPoint;

  var current_pixel_width = State.MapProperties.map_view.resolution; 
	var tolerance_radius = current_pixel_width * 770;
	
  if (tolerance_radius > 6359560){			// when the number gets too large (zooming too far out), it overloads the GeometryEngine it seems
		tolerance_radius = 6359560;				// 1300 & 6359560 are dependent, so be careful with adjusting either 
	}

  var WGS84_center_point = ArcGIS.API.WebMercTools.webMercatorToGeographic({"x": clicked_point.x, "y": clicked_point.y});
	var WGS84_edge_point = ArcGIS.API.WebMercTools.webMercatorToGeographic({"x": point.x  - tolerance_radius, "y": point.y}); // you might need to check if this needs flipping from + to - at some point 
	var WGS84_radius = Math.abs(WGS84_center_point.x - WGS84_edge_point.x);

    // needed to create a circle around the mouse click point 
	var WGS84_center_point_object = new ArcGIS.API.Point({
		x: WGS84_center_point.x, 
		y: WGS84_center_point.y, 
		spatialReference: 4326
	});
	// get a circular buffer around the central point. geodesic buffers ended up more buggy at the map edges than regular circles with their oblong shape
  var search_circle = new ArcGIS.API.Circle(
		WGS84_center_point_object, 
		{
			"radius": tolerance_radius * .00001, 
			"radiusUnit": "miles" 
		}
	);
  var small_search_circle = new ArcGIS.API.Circle(
		WGS84_center_point_object, 
		{
			"radius": (tolerance_radius * .00001) * 0.13, 
			"radiusUnit": "miles" 
		}
	);
    // loop through the layers by geometry type and look for a found geometry 
  var geometry_types = ["point", "polyline", "polygon"];
  var new_promises_array = []; 
  let found_flag = false; 
  for (let w = 0; w < 3 && found_flag == false; w++){
    let promises_array = [];
    
    for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
      let feature_layer = State.MapProperties.feature_layers[x]; 
      let geometry_type = feature_layer.geometryType;
      let chosen_feature = null;

      // if the layer qualifies for examination - is the current geometry type, is visible, isn't a temporary layer 
      console.log("here"); 
      if (geometry_type == geometry_types[w] && feature_layer.visible == true && feature_layer.hasOwnProperty("client_generated") == false){
        // query the layer with the search circle
        let query = feature_layer.createQuery();
        
        if (geometry_type == "point" || geometry_type == "polyline"){
            query.geometry = search_circle;
        }
        else if (geometry_type == "polygon"){
            query.geometry = small_search_circle;
        }
            
        let query_promise = feature_layer.queryFeatures(query);
        let promise = query_promise.then(function(query_results){
            
          let promise_2 = null;
          // if anything was within the search circle 
          if (query_results.features.length > 0){
            let features = query_results.features;
            let background_layer = null;
            // get the background layer that corresponds with the currently examined feature layer 
            for (let y = 0; y < State.MapProperties.background_layers.length; y++){
              if (State.MapProperties.background_layers[y]["parent_layer_id"] == feature_layer.layerId){
                background_layer = State.MapProperties.background_layers[y]; 
                break; 
              }
            }
            // query that later for its features within the circle to sort out any geometries that have already been highlighted 
            let query_2 = background_layer.createQuery();
            query_2.geometry = search_circle 
            let query_promise_2 = background_layer.queryFeatures(); 

            promise_2 = query_promise_2.then(function(query_results_2){
              let layer_data = []; 
              let fields = query_results.fields; 
              let oid_field_name = null;
              // identify features already highlighted with the oid field 
              for (let z = 0; z < fields.length; z++){
                if (fields[z].type == "oid"){
                  oid_field_name = fields[z].name;
                  break;
                }
              }
              // so now you're looping through the features within the circle 
              for (let z = 0; z < query_results.features.length; z++){
                let symbol = null;
                let new_geometry = null;
                let query_geometry = query_results.features[z].geometry;
                let attributes = query_results.features[z].attributes;

                let feature_oid = attributes[oid_field_name];
                let match = false;

                // now you've got all the features in the background layer circle, you discard anything that already matches
                for (let V = 0; V < query_results_2.features.length; V++){
                  if (query_results_2.features[V].attributes[oid_field_name] == feature_oid){
                    match = true;
                    break;
                  }
                }
                if (match == true){
                  continue; 
                }
                found_flag = true; 
                layer_data.push(query_results.features[z]); 
              }
              return layer_data;
            }); // end query 2 
          }
          return promise_2; 
        }); // end query 1
        promises_array.push(promise); 
      } // end if 
    }
    let new_promise = Promise.all(promises_array).then(function(array_results){
      let closest_point = null;
      let smallest_distance = null 
      let closest_line = null; 
      let smallest_distance_2 = null; 
      let closest_polygon = null; 
      let smallest_area = null;
      let layer_id = null; 
      let final_features = null;
      let background_layer = null; 
      let background_query = null; 
      let index = null;
      let background_index = null; 

      // array_results is a 2d array. all the arrays in array_results should be the same geometry type.
      for (let x = 0; x < array_results.length; x++){
        let geometry_type = null;
        
        if (array_results[x] != null){

          if (array_results[x].length > 0){
            geometry_type = array_results[x][0].layer.geometryType;
          }
          let graphic = null;
          let updated_geometry_flag = false; 
          if (geometry_type == "point"){
            // add all the points into an array
            for (let y = 0; y < array_results[x].length; y++){
              let layers_single_attribute = array_results[x][y].attributes;
              let layers_single_geometry = array_results[x][y].geometry;

              // get the distance from the center point to that geometry.
              let distance_from_center = new ArcGIS.API.Line({
                paths: [
                  [layers_single_geometry.x, layers_single_geometry.y],
                  [WGS84_center_point.x, WGS84_center_point.y]
                ],
                spatialReference: 4326
              });
              let distance = ArcGIS.API.GeometryEngine.geodesicLength(distance_from_center, "miles");
              if (closest_point == null || smallest_distance > distance){
                updated_geometry_flag = true; 
                smallest_distance = distance;
                closest_point = layers_single_geometry;
                layer_id = array_results[x][y].layer.layerId; 
                final_features = array_results[x][y]; 
              }
            }
          }
          else if (geometry_type == "polyline"){

            for (let y = 0; y < array_results[x].length; y++){
              let layers_single_attribute = array_results[x][y].attributes;
              let layers_single_geometry = array_results[x][y].geometry;

              let path = layers_single_geometry.paths; 
              let nearest_point = ArcGIS.API.GeometryEngine.nearestCoordinate(layers_single_geometry, WGS84_center_point_object);
              let clipped_line = new ArcGIS.API.Line({
                paths: [
                  [nearest_point.coordinate.x, nearest_point.coordinate.y], 
                  [WGS84_center_point.x, WGS84_center_point.y]
                ], 
                spatialreference: 4326
              });
              if (smallest_distance_2 == null || nearest_point.distance < smallest_distance_2){
                updated_geometry_flag = true; 
                smallest_distance_2 = nearest_point.distance; 
                closest_line = layers_single_geometry;
                layer_id = array_results[x][y].layer.layerId; 
                final_features = array_results[x][y]; 
              }
            }    
          }
          else if (geometry_type == "polygon"){

            for (let y = 0; y < array_results[x].length; y++){
              let layers_single_attribute = array_results[x][y].attributes;
              let layers_single_geometry = array_results[x][y].geometry;

              let area = ArcGIS.API.GeometryEngine.geodesicArea(layers_single_geometry, "square-miles");

              if (smallest_area == null || area < smallest_area){
                updated_geometry_flag = true; 
                smallest_area = area;
                closest_polygon = layers_single_geometry;
                layer_id = array_results[x][y].layer.layerId;
                final_features = array_results[x][y];
              }
            }
          }
          if (updated_geometry_flag == true){
            for (let z = 0; z < State.MapProperties.background_layers.length; z++){
              if (layer_id == State.MapProperties.background_layers[z]["parent_layer_id"]){
                background_layer = State.MapProperties.background_layers[z];
                index = z;
                break; 
              }
            }
            for (let z = 0; z < State.MapProperties.queried_background_features.length; z++){
              if (State.MapProperties.queried_background_features[z]["parent_layer_id"] == layer_id){
                background_query = State.MapProperties.queried_background_features[z];
                background_index = z;
                break;
              }
            }
          }

        }
      }
      // now you want to add those geometries to the background arrays and the ongoing query parameters... and then return from the entire function 
      let graphic = null; 
      let symbol = null; 
      let new_geometry = null; 
      
      if (closest_point != null){ 
        symbol = {
          type: "simple-marker",
          style: "square"
        }
        new_geometry = {
          type: "point",
          longitude: closest_point.longitude,
          latitude: closest_point.latitude, 
          x: closest_point.x, 
          y: closest_point.y
        }
        graphic = new ArcGIS.API.Graphic({geometry: new_geometry, symbol: symbol, attributes: final_features.attributes});
        return {"graphic": graphic, "index": index, "background_index": background_index}; 
      }
      else if (closest_line != null){
        symbol = {
          type: "simple-line",
          style: "solid"
        }
        new_geometry = {
          type: "polyline",
          paths: closest_line.paths
        }
        graphic = new ArcGIS.API.Graphic({geometry: new_geometry, symbol: symbol, attributes: final_features.attributes});
        return {"graphic": graphic, "index": index, "background_index": background_index}; 
      }
      else if (closest_polygon != null){
        symbol = {
          type: "simple-fill",
          style: "solid",
        }
        new_geometry = {
          type: "polygon",
          rings: closest_polygon.rings
        }
        graphic = new ArcGIS.API.Graphic({geometry: new_geometry, symbol: symbol, attributes: final_features.attributes});
        return {"graphic": graphic, "index": index, "background_index": background_index};
      }
    });
    new_promises_array.push(new_promise);
  }

  Promise.all(new_promises_array).then(function(array_results){
    let found_flag = false; 
    let final_graphic = null; 
    let final_index = null; 
    let final_background_index = null; 

    for (let w = 0; w < 3 && found_flag == false; w++){
      for (let x = 0; x < array_results.length; x++){
        if (array_results[x] != undefined && array_results[x]["graphic"].geometry.type == geometry_types[w]){
          final_graphic = array_results[x]["graphic"]; 
          final_index = array_results[x]["index"];
          final_background_index = array_results[x]["background_index"]; 
          found_flag = true; 
          break; 
        }
      }
    }

    State.MapProperties.queried_background_features[final_background_index]["data"].features.push(final_graphic);

    let add_edits = {
      addFeatures: [final_graphic]
    };
    State.MapProperties.background_layers[final_index].applyEdits(add_edits)
    .then(function(){
      // now set the current query and fill the attribute table. 
      let page_number = null; 
      if (State.MapGraphics.enable_graphics == true){
        page_number = State.UIProperties.current_page;
      }
      else{
        page_number = 1;
        State.UIProperties.current_page = 1;
        State.MapGraphics.enable_graphics = true; 
      }

      State.MapProperties.current_layers_query = State.MapProperties.queried_background_features[final_background_index]; 
      Table.fill_attribute_table(page_number, true);
    });
      
  });
}

export function drag_select_function(e){
    var table_dataset_selector = document.getElementById("table_dataset_selector");

  e.stopPropagation();                    // prevent the drag from moving the map around as well 
  if (State.MapGraphics.previous_graphic != null){          // this will clear the drag select box 
		State.MapProperties.map_view.graphics.remove(State.MapGraphics.previous_graphic); 
	}

  var current_point = State.MapProperties.map_view.toMap(e); 
	var original_point = State.MapProperties.map_view.toMap(e.origin); 
	var WGS84_original_point = ArcGIS.API.WebMercTools.webMercatorToGeographic({"x": original_point.x, "y": original_point.y});
	var WGS84_current_point = ArcGIS.API.WebMercTools.webMercatorToGeographic({"x": current_point.x, "y": current_point.y});

  var rectangle_rings = [
		[[WGS84_original_point.x, WGS84_original_point.y], 
		[WGS84_current_point.x, WGS84_original_point.y], 
		[WGS84_current_point.x, WGS84_current_point.y], 
		[WGS84_original_point.x, WGS84_current_point.y], 
		[WGS84_original_point.x, WGS84_original_point.y]]
	];
	var new_rectangle = new ArcGIS.API.Polygon({
		rings: rectangle_rings, 
		spatialReference: 4326
	});
	var symbol = {
		type: "simple-fill", 
		color: Colors.getColor("maptools", "transparentgreen"), 
		style: "cross",
		outline: {
			width: 3.1, 
			color: Colors.getColor("maptools", "maroon"), 
			style: "short-dash", 
			cap: "square", 
			join: "miter"
		}
	}
	State.MapGraphics.previous_graphic = new ArcGIS.API.Graphic({geometry: new_rectangle, symbol: symbol});
	State.MapProperties.map_view.graphics.add(State.MapGraphics.previous_graphic);

  var promises_array = [];

	if (e.action == "end"){										// the drag has ended 
		State.MapProperties.map_view.graphics.remove(State.MapGraphics.previous_graphic);
		State.MapGraphics.previous_graphic = null;
  
    for (let i = 0; i < State.MapProperties.feature_layers.length; i++){
      let feature_layer = State.MapProperties.feature_layers[i];
      let layer_id = feature_layer.layerId; 
      let chosen_features = [];

      if (feature_layer.visible == true && feature_layer.hasOwnProperty("client_generated") == false){

        let query = feature_layer.createQuery();
        query.geometry = new_rectangle;

        if (State.MapProperties.feature_layers[i].geometryType == "polygon"){
          query.spatialRelationship = "contains"; 
        }

        let query_promise = feature_layer.queryFeatures(query);
        let promise = query_promise.then(function(query_results){

          let promise_2 = null; 

          if (query_results.features.length > 0){
            let features = query_results.features;
            let background_layer = null;

            for (let y = 0; y < State.MapProperties.background_layers.length; y++){
              if (State.MapProperties.background_layers[y]["parent_layer_id"] == State.MapProperties.feature_layers[i].layerId){
                background_layer = State.MapProperties.background_layers[y]; 
                break; 
              }
            }

            let query_2 = background_layer.createQuery(); 
            let query_promise_2 = background_layer.queryFeatures(); 

            promise_2 = query_promise_2.then(function(query_results_2){
              let graphics_objects_array = [];
              let geometry_type = State.MapProperties.feature_layers[i].geometryType;
              let fields = query_results.fields; 
              let oid_field_name = null; 
              for (let z = 0; z < fields.length; z++){
                if (fields[z].type == "oid"){
                  oid_field_name = fields[z].name;
                  break;
                }
              }

              // get the current State.MapProperties.queried_background_features element 
              let index = null; 
              for (let u = 0; u < State.MapProperties.queried_background_features.length; u++){
                if (State.MapProperties.queried_background_features[u]["layer_id"] == background_layer.layerId){
                  index = u; 
                  break; 
                }
              }

              let new_object_array = Object.assign({}, query_results.features);

              for (let z = 0; z < query_results.features.length; z++){

                let symbol = null;
                let new_geometry = null;
                let query_geometry = new_object_array[z].geometry;
                let attributes = new_object_array[z].attributes;

                let feature_oid = attributes[oid_field_name];
                let match = false; 

                for (let w = 0; w < query_results_2.features.length; w++){
                  if (query_results_2.features[w].attributes[oid_field_name] == feature_oid){
                    match = true; 
                    break; 
                  }
                }
                if (match == true){
                  continue; 
                }

                State.MapProperties.queried_background_features[index]["data"].features.push(new_object_array[z]);

                if (geometry_type == "point"){
                  symbol = {
                    type: "simple-marker",
                    style: "square"
                  }
                  new_geometry = {
                    type: "point",
                    longitude: query_geometry.longitude,
                    latitude: query_geometry.latitude, 
                    x: query_geometry.x, 
                    y: query_geometry.y
                  }
                }
                else if (geometry_type == "polyline"){
                  symbol = {
                    type: "simple-line",
                    style: "solid"
                  }
                  new_geometry = {
                    type: "polyline",
                    paths: query_geometry.paths
                  }
                }
                else if (geometry_type == "polygon"){
                  symbol = {
                    type: "simple-fill",
                    style: "solid",
                  }
                  new_geometry = {
                    type: "polygon",
                    rings: query_geometry.rings
                  }
                }
                let graphic = new ArcGIS.API.Graphic({geometry: new_geometry, symbol: symbol, attributes: attributes}); 
                graphics_objects_array.push(graphic); 
              }
              // add the features to the background layer
              let add_edits = {
                addFeatures: graphics_objects_array
              };
              let promise_3 = background_layer.applyEdits(add_edits); 

              return promise_3; 
            }); // end of query_results_2 
          }// end if query_results.length > 0 
          return promise_2; 
        });
        promises_array.push(promise);
      }
    }
    Promise.all(promises_array).then(function(array_results){
      // now set the current query and fill the attribute table. 
      let page_number = null; 
      if (State.MapGraphics.enable_graphics == true){
        page_number = State.UIProperties.current_page;
      }
      else{
        page_number = 1;
        State.UIProperties.current_page = 1;
        State.MapGraphics.enable_graphics = true; 
      }

      let selected_id = table_dataset_selector.options[table_dataset_selector.selectedIndex].id; 
      for (let x = 0; x < State.MapProperties.queried_background_features.length; x++){
        if (State.MapProperties.queried_background_features[x]["parent_layer_id"] == selected_id){
          State.MapProperties.current_layers_query = State.MapProperties.queried_background_features[x]; 
          break; 
        }
      }
      Table.fill_attribute_table(page_number, true);
    }); 
  } // end of mousedown 
}

export function buffer_function(){
    var buffer_layer_selector = document.getElementById("buffer_layer_selector");
    var buffer_error_div = document.getElementById("buffer_error_div");
    var buffer_distance_textbox = document.getElementById("buffer_distance_textbox");
    var buffer_distance_selector = document.getElementById("buffer_distance_selector");
    var table_dataset_selector = document.getElementById("table_dataset_selector");
    var buffer_panel = document.getElementById("buffer_panel");

    if (buffer_error_div.innerHTML != ""){
      let int_slice = buffer_panel.style.height; 
      int_slice = Number(int_slice.slice(0, 3)); 
      int_slice -= 50; 
      let px_size = int_slice + "px"; 
      buffer_panel.style.height = px_size;
    }

    buffer_error_div.innerHTML = "";
    buffer_error_div.style.overflowY = "hidden";

    var layer_id = Number(buffer_layer_selector.options[buffer_layer_selector.selectedIndex].id);
    
    var SQL_query = document.getElementById("buffer_SQL_input").value;
    var units = buffer_distance_selector.value;
    var distance = buffer_distance_textbox.value; 
    
    if (SQL_query == ""){
      SQL_query = "1=1";
    }
    if (distance == ""){
        distance = 10; 
    }

    var input_feature_layer = null; 
    for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
        if (State.MapProperties.feature_layers[x].layerId == layer_id){
            input_feature_layer = State.MapProperties.feature_layers[x]; 
            break;
        }
    }

    var query = input_feature_layer.createQuery();
    query.where = SQL_query; 
    query.sqlFormat = "standard"; 

    var WSG84_buffer_results = [];
    var promises_array = [];
    var query_fields = null; 

    let all_promised = input_feature_layer.queryFeatures(query)
    .then(function(query_results){
        query_fields = query_results.fields; 

        // convert the
        if (query_results.features.length > 0){
            const WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});
            let all_promised = ArcGIS.API.Projection.load().then(function(){
                let prior_spatial_reference; 

                if (query_results.spatialReference.isWGS84 == false){

                    if (query_results.spatialReference.wkid != null){
                        prior_spatial_reference = new ArcGIS.API.SpatialReference({wkid: query_results.spatialReference.wkid});
                    }
                    else if (query_results.spatialReference.wkt != null){
                        prior_spatial_reference = new ArcGIS.API.SpatialReference({wkt: query_results.spatialReference.wkt});
                    }

                    let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);
                    
                    for (let x = 0; x < query_results.features.length; x++){
                        query_results.features[x].geometry = ArcGIS.API.Projection.project(query_results.features[x].geometry, WGS84_spatial_reference, transformation_object);
                    }
                }
                
            },
            function(reject){
                Utils.error_handler(reject.message, buffer_error_div, buffer_panel);
            }).then(function(){
                // now do the buffer analysis
                var geometry_type = query_results.geometryType; 

                for (let x = 0; x < query_results.features.length; x++){
                    let esri_object = Graphics.create_geometry_class_object(query_results.features[x].geometry);

                    if (geometry_type == "polygon"){
                        let areas_array = []; 

                        let class_geometry_object = Graphics.create_geometry_class_object(query_results.features[x].geometry);
                        let area = ArcGIS.API.GeometryEngine.geodesicArea(class_geometry_object, "square-miles");
                        if (area > 100000){
                            continue; 
                        }
                    }
                    let buffer_object = ArcGIS.API.AsyncGeometryEngine.geodesicBuffer(esri_object, distance, units)
                    .then(function(response){
                        WSG84_buffer_results.push({"geometry": response, "attributes": query_results.features[x].attributes});
                        return response;
                    });
                    promises_array.push(buffer_object); 
                }

                return Promise.all(promises_array); 
            },
            function(reject){
                Utils.error_handler(reject.message, buffer_error_div, buffer_panel);
            });
            return all_promised; 
        }
    },
    function(reject){
        Utils.error_handler(reject.message, buffer_error_div, buffer_panel);
    });

    all_promised.then(function(){
        if (WSG84_buffer_results.length > 0){
            var max_id = State.MapProperties.feature_layers[0].layerId;                   // get the layers new layer_id 
        
            for (let x = 1; x < State.MapProperties.feature_layers.length; x++){
                if (State.MapProperties.feature_layers[x].layerId > max_id){
                    max_id = State.MapProperties.feature_layers[x].layerId; 
                }
            }
        
            var new_layer_id = max_id + 1;
            State.MapProperties.layer_ids.push(new_layer_id);

            // construct a graphics array for the new feature layer 
            var graphics_objects_array = [];
            var areas_array = [];
            var promises_array = [];

            for (let x = 0; x < WSG84_buffer_results.length; x++){
                let class_geometry_object = Graphics.create_geometry_class_object(WSG84_buffer_results[x]["geometry"]);
                let promise = ArcGIS.API.AsyncGeometryEngine.geodesicArea(class_geometry_object, "square-miles")
                .then(function(results){
                    if (!(results > 100000)){
                        areas_array.push(results);
                    }
                });
                promises_array.push(promise);
            }
            
            Promise.all(promises_array).then(function(){
                var count = 0;
                var sum = 0;
                
                for (let x = 0; x < areas_array.length; x++){
                    sum += areas_array[x];
                    count++;
                }
                
                var average = Math.floor(sum / count);

                var sizes = [400, 1170, 1900, 2400, 3000, 4200, 9700, 26000, 41000, 50000, 75000, 103000, 118000, 137000, 160000, 210000, 240000];
                var widths = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 1.8, 2.1, 2.6, 2.7, 2.9, 3.2, 3.5, 3.6, 3.7, 3.8];
                
                var new_width = null;
                var found_flag = false;

                for (let y = 0; y < sizes.length; y++){
                    if (average <= sizes[y]){
                        found_flag = true; 
                        new_width = widths[y]; 
                        break; 
                    }
                }
                if (found_flag == false){
                    new_width = 3.9;
                }

                State.MapGraphics.polygon_outline_widths.push({"width": new_width, "layer_id": new_layer_id});

                let options = {
                    color: Colors.getColor("newlayer", null),
                    fill_style: "solid",
                    outline_style: "solid",
                    cap: "round", 
                    join: "bevel", 
                    width: new_width,
                }

                // find out what the title should be 
                var count = 1;
                for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
                    if (State.MapProperties.feature_layers[x]["client_generated"] == true && State.MapProperties.feature_layers[x]["analysis_type"] == "buffer"){
                        count += 1; 
                    }
                }
                var new_title = "buffer " + count.toString(); 

                var outline_color = Colors.hex_to_hsla(options["color"], .95); 
                var fill_color = Colors.hex_to_hsla(options["color"], .24);
                for (let x = 0; x < WSG84_buffer_results.length; x++){
                    options["attributes"] = WSG84_buffer_results[x]["attributes"];
                    let graphic_object = Graphics.create_polygon_graphic(WSG84_buffer_results[x]["geometry"].rings, fill_color, options["fill_style"], outline_color, options["outline_style"], options["width"], options["cap"], options["join"], options["attributes"]);
                    graphics_objects_array.push(graphic_object); 
                }

                var custom_renderer = {
                    type: "simple", 
                    symbol: graphics_objects_array[0].symbol
                };

                var oid_name = null; 
                for (let x = 0; x < query_fields.length; x++){
                    if (query_fields[x].type == "oid"){
                        oid_name = query_fields[x].name; 
                        break; 
                    }
                }

                var reduced_fields = Object.getOwnPropertyNames(WSG84_buffer_results[0]["attributes"]);

                var new_feature_layer = new ArcGIS.API.FeatureLayer({              // now construct the new feature layer & add it to the map  
                    source: graphics_objects_array,
                    fields: query_fields,
                    outFields: reduced_fields,
                    objectIdField: oid_name,
                    geometryType: "polygon", 
                    layerId: new_layer_id,
                    maximumNumberOfFeatures: 60000, 
                    title: new_title, 
                    renderer: custom_renderer
                });

                new_feature_layer["client_generated"] = true;
                new_feature_layer["analysis_type"] = "buffer";

                new_feature_layer.load().then(function(){
                    State.MapProperties.map_object.add(new_feature_layer);

                    State.MapProperties.feature_layers.push(new_feature_layer); 
                    State.MapProperties.feature_layers.sort(function(a, b){
                        return a.layerId - b.layerId;
                    });

                    let query = new_feature_layer.createQuery();
                    let query_promise = new_feature_layer.queryFeatures(query);

                    query_promise.then(function(query_results){
                        let query_object = {"data": query_results, "layer_id": new_layer_id};

                        State.MapProperties.queried_features.push(query_object);
                        State.MapProperties.current_layers_query = query_object;

                        // now add the new feature layer to selectors throughout the map 
                        for (let z = 0; z < Utils.selector_elements_list.length; z++){
                            let layer_option = document.createElement("option");
                            layer_option.textContent = new_feature_layer.title;
                            layer_option.id = new_layer_id;                 // id is needed later by the options handler when an option is selected 
                            Utils.selector_elements_list[z].append(layer_option);
                        }

                        let checkbox = document.createElement("input");
                        checkbox.type = "checkbox";								// set new checkbox's attributes 
                        
                        checkbox.classList.add("w-checkbox-input");
                        checkbox.classList.add("w-checkbox-input--inputType-custom");
                        checkbox.classList.add("checkbox");

                        checkbox.value = new_feature_layer.layerId;
                        checkbox.checked = new_feature_layer.visible;
                        checkbox.style.position = "absolute";
                        checkbox.style.display = "inline-block"; 
                        checkbox.style.left = "7px";
                        checkbox.style.height = "12px"; 
                        
                        checkbox.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
                          new_feature_layer.visible = e.target.checked;
                        });

                        let checkbox_label = document.createElement("label");		// create a label for the new checkbox & set its CSS attributes 

                        checkbox_label.classList.add("checkbox-button-label");
                        checkbox_label.classList.add("w-form-label");

                        checkbox_label.style.position = "absolute";
                        checkbox_label.style.display = "inline-block"; 
                        checkbox_label.style.left = "15px";
                        checkbox_label.style.right = "0px";
                        checkbox_label.style.height = "20px"; 
                        checkbox_label.style.overflow = "hidden";
                        checkbox_label.style.whiteSpace = "nowrap";
                        checkbox_label.id = "services_checkbox_label_" + new_layer_id;          // needed later to append the feature counts to the checkboxes 

                        let close_box = document.createElement("input"); 
                        close_box.type = "image";	
                        close_box.src = "images/close_button.png";							// set new checkbox's attributes 

                        close_box.value = new_feature_layer.layerId;
                        checkbox.checked = new_feature_layer.visible;
                        close_box.style.position = "absolute";
                        close_box.style.left = "-18px";
                        close_box.style.width = "13px";
                        close_box.style.height = "13px"; 

                        let label_text = new_feature_layer.title;			// get the text for the new label 
                        checkbox_label.textContent = label_text;

                        let new_div = document.createElement("div");

                        checkbox_label.style.overflow = "hidden";
                        new_div.classList.add("w-checkbox");
                        new_div.classList.add("checkbox-field"); 

                        new_div.style.gridRowStart = State.UIProperties.next_grid_line; 
                        State.UIProperties.next_grid_line += 1; 
                        new_div.style.gridRowEnd = State.UIProperties.next_grid_line; 
                        new_div.id = new_layer_id;
                        new_div.append(close_box);  
                        new_div.append(checkbox); 
                        new_div.append(checkbox_label); 
                        new_div.style.overflow = "hidden";
                        new_div.style.padding = "0px";  

                        State.UIProperties.grid_divs_list.push(new_div);
                        layers_list.style.gridTemplateRows += " 25px";  
                        layers_list.append(new_div);

                        let saved_layers_query = State.MapProperties.current_layers_query;
                        close_box.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
                            // remove the layer frmo the map object  
                            new_feature_layer.visible = false;
                            State.MapProperties.map_object.remove(new_feature_layer);

                            // remove the layer from the global lists of layers 
                            var index = State.MapProperties.feature_layers.indexOf(new_feature_layer);
                            let new_array = []; 
                            for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
                                if (x != index){
                                    new_array.push(State.MapProperties.feature_layers[x]); 
                                }
                            }
                            State.MapProperties.feature_layers = new_array; 

                            index = State.MapProperties.queried_features.indexOf(saved_layers_query);
                            new_array = []; 
                            for (let x = 0; x < State.MapProperties.queried_features.length; x++){
                                if (x != index){
                                    new_array.push(State.MapProperties.queried_features[x]); 
                                }
                            }
                            State.MapProperties.queried_features = new_array;

                            let selected_id = table_dataset_selector.options[table_dataset_selector.selectedIndex].id;
                            let flag = false; 
                            for (let x = 0; x < State.MapProperties.queried_features.length; x++){
                                if (State.MapProperties.queried_features[x]["layer_id"] == selected_id && selected_id != new_layer_id){
                                    flag = true; 
                                    break;
                                }
                            }
                            if (flag == false){
                                State.MapProperties.current_layers_query = State.MapProperties.queried_features[0];
                                Table.fill_attribute_table(1, true);
                            }

                            State.MapProperties.layer_ids = []; 
                            for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
                                State.MapProperties.layer_ids.push(State.MapProperties.feature_layers[x].layerId); 
                            }

                            // remove the option from various selectors 
                            for (let x = 0; x < Utils.selector_elements_list.length; x++){
                                for (let y = 0; y < Utils.selector_elements_list[x].length; y++){
                                    if (Utils.selector_elements_list[x].options[y].id == new_layer_id){
                                        Utils.selector_elements_list[x].remove(y); 
                                    }
                                }
                            }

                            let layer_divs = layers_list.children;
                            let found_flag = false; 
                            for (let V = 0; V < layer_divs.length; V++){
                                if (layer_divs[V].id == new_div.id){
                                    found_flag = true; 
                                    continue; 
                                }
                                if (found_flag == true){
                                    layer_divs[V].style.gridRowStart -= 1; 
                                    layer_divs[V].style.gridRowEnd -= 1;
                                }
                            }

                            // remove the elements in the layers panel  
                            checkbox_label.parentNode.removeChild(checkbox_label);
                            checkbox.parentNode.removeChild(checkbox); 
                            close_box.parentNode.removeChild(close_box);
                            new_div.parentNode.removeChild(new_div); 
                            State.UIProperties.next_grid_line -= 1; 
                        });
                    },
                    function reject(reason){
                        console.log("error querying new layer & loading it into attribute table: ", reason);
                    });
                });
            });
        }
    });
}

export function heatmap_function(){
    var heatmap_layer_selector = document.getElementById("heatmap_layer_selector");

    var layer_id = Number(heatmap_layer_selector.options[heatmap_layer_selector.selectedIndex].id);
 
    var blur_radius = Math.ceil(heatmap_blur_range.value * 0.4) + 8; 
    var input_intensity = heatmap_intensity_range.value;

    var feature_layer = null; 
    var queried_features = null;
    for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
        if (State.MapProperties.feature_layers[x].layerId == layer_id){
            feature_layer = State.MapProperties.feature_layers[x]; 
            break;
        }
    }     
    for (let x = 0; x < State.MapProperties.queried_features.length; x++){
        if (State.MapProperties.queried_features[x]["layer_id"] == layer_id){
            queried_features = State.MapProperties.queried_features[x]; 
            break;
        }
    }

    var current_pixel_width = State.MapProperties.map_view.resolution; 
	  var tolerance_radius = current_pixel_width * .00885;

    if (tolerance_radius > 6359560){			// when the number gets too large (zooming too far out), it overloads the GeometryEngine it seems
      tolerance_radius = 6359560;				// 1300 & 6359560 are dependent, so be careful with adjusting either 
    }

    var pixel_intensity = 9; 
    var promises_array = []; 
    var random_indices = []; 

    // create some buffers to get an approximation of what the max intensity should be 
    for (let x = 0; x < queried_features["data"].features.length && x < 100; x++){
        let valid_number = false; 
        let random_index = null; 
        while (valid_number == false){
            random_index = Math.floor(Math.random() * queried_features["data"].features.length);
            let found_flag = false; 
            for (let y = 0; y < random_indices.length; y++){
                if (random_indices[y] == random_index){
                    found_flag = true; 
                }
            }
            if (found_flag == false){
                valid_number = true; 
            }
        }
        random_indices.push(random_index);
        
        let center_point = queried_features["data"].features[random_indices[x]].geometry; 
        let edge_point = new ArcGIS.API.Point({
            x: center_point.x  - tolerance_radius, 
            y: center_point.y, 
            spatialReference: 4326
        });
        let radius = Math.abs(center_point.x - edge_point.x) * Math.ceil(blur_radius * 0.1);

        if (radius > 220){
            radius = 220;  
        }

        // now get a geodesic buffer around that point
        let promise = ArcGIS.API.AsyncGeometryEngine.geodesicBuffer(center_point, radius, "miles").then(function(buffer){
            let buffer_object = Graphics.create_graphics_object(buffer, {}); 
            let count = 0; 

            let query = feature_layer.createQuery();
            query.geometry = buffer_object.geometry;
            let query_promise = feature_layer.queryFeatures(query);

            let promise = query_promise.then(function(query_results){
                count = query_results.features.length;
                return count; 
            });

            return promise; 
        }, 
        function(error){
            console.log("error in creating test buffer: ", error, error.message);
        });
        promises_array.push(promise); 
    }

    Promise.all(promises_array).then(function(results){
        let max_value = results.reduce(function(a, b){
            return Math.max(a, b);
        });
        let final_max_intensity = Math.ceil(max_value * ((100 - input_intensity) / 100) * 10) + (max_value * 4) + 10; // 0.86

        var renderer = {
            type: "heatmap",
            colorStops: Colors.heatmap_colorstops,
            maxPixelIntensity: final_max_intensity,
            minPixelIntensity: 0, 
            blurRadius: blur_radius
        }

        // create a new feature layer which is a clone of the old one
        var count = 1;
        for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
            if (State.MapProperties.feature_layers[x]["client_generated"] == true && State.MapProperties.feature_layers[x]["analysis_type"] == "heatmap"){
                count += 1; 
            }
        }
        var new_title = "heatmap " + count.toString(); 

        let max_id = State.MapProperties.feature_layers[0].layerId; 
            for (let z = 1; z < State.MapProperties.feature_layers.length; z++){
                if (State.MapProperties.feature_layers[z].layerId > max_id){
                    max_id = State.MapProperties.feature_layers[z].layerId; 
                }
            }
            for (let z = 0; z < State.MapProperties.background_layers.length; z++){
                if (State.MapProperties.background_layers[z].layerId > max_id){
                    max_id = State.MapProperties.background_layers[z].layerId; 
                }
            }
        let new_layer_id = max_id + 1;

        const WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});

        let graphics_objects_array = [];
        var oid_name = null;
        var reduced_fields= null; 
        var fields = null; 

        let query_results = queried_features["data"]; 
 
        let promise = ArcGIS.API.Projection.load().then(function(){
            for (let x = 0; x < query_results.features.length; x++){
                let prior_spatial_reference
                if (query_results.spatialReference.wkid != null){
                    prior_spatial_reference = new ArcGIS.API.SpatialReference({
                        wkid: query_results.spatialReference.wkid
                    });
                }
                else if (query_results.spatialReference.wkt != null){
                    prior_spatial_reference = new ArcGIS.API.SpatialReference({
                        wkt: query_results.spatialReference.wkt
                    });
                }

                let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);
                
                query_results.features.forEach(function(element) {
                    element.geometry = ArcGIS.API.Projection.project(element.geometry, WGS84_spatial_reference);
                });
            }
            return null; 
        }, 
        function(reject){
            console.log("failed to reproject layer: ", reject.message); 
        }).then(function(){

            for (let x = 0; x < query_results.features.length; x++){
                let point = query_results.features[x].geometry;
                let attributes = query_results.features[x].attributes;
                let graphic_point = Graphics.create_point_graphic(point.x, point.y, "#777777", 9, "circle", attributes);
                graphics_objects_array.push(graphic_point);
            }

            fields = query_results.fields; 

            for (let x = 0; x < fields.length; x++){
                if (fields[x].type == "oid"){
                    oid_name = fields[x].name;
                    break;
                }
            }
            
            reduced_fields = Object.getOwnPropertyNames(query_results.features[0].attributes);

        }).then(function(){

            let new_feature_layer = new ArcGIS.API.FeatureLayer({              // now construct the new feature layer & add it to the map  
                source: graphics_objects_array,
                maximumNumberOfFeatures: 60000, 
                layerId: new_layer_id,
                title: new_title,
                renderer: renderer,
                fields: fields,
                outFields: reduced_fields,
                legendEnabled: false, 
                objectIdField: oid_name,
                geometryType: "point", 
                spatialReference: WGS84_spatial_reference, 
                popupEnabled: false
            });

            new_feature_layer.load().then(function(){

                State.MapProperties.map_object.add(new_feature_layer);

                let parent_id = feature_layer.layerId;
                new_feature_layer["parent_layer_id"] = parent_id;
                new_feature_layer["client_generated"] = true; 
                new_feature_layer["analysis_type"] = "heatmap";
                
                State.MapProperties.feature_layers.push(new_feature_layer); 
                State.MapProperties.feature_layers.sort(function(a, b){
                    return a.layerId - b.layerId;
                });

                let query = new_feature_layer.createQuery();
                let query_promise = new_feature_layer.queryFeatures(query);

                query_promise.then(function(query_results){
                    let query_object = {"data": query_results, "layer_id": new_layer_id};

                    State.MapProperties.queried_features.push(query_object);

                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox";								// set new checkbox's attributes 
                    
                    checkbox.classList.add("w-checkbox-input");
                    checkbox.classList.add("w-checkbox-input--inputType-custom");
                    checkbox.classList.add("checkbox");

                    checkbox.value = new_feature_layer.layerId;
                    checkbox.checked = new_feature_layer.visible;
                    checkbox.style.position = "absolute";
                    checkbox.style.display = "inline-block"; 
                    checkbox.style.left = "7px";
                    checkbox.style.height = "12px"; 
                    
                    checkbox.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
                      new_feature_layer.visible = e.target.checked;
                    });

                    let checkbox_label = document.createElement("label");		// create a label for the new checkbox & set its CSS attributes 

                    checkbox_label.classList.add("checkbox-button-label");
                    checkbox_label.classList.add("w-form-label");

                    checkbox_label.style.position = "absolute";
                    checkbox_label.style.display = "inline-block"; 
                    checkbox_label.style.left = "15px";
                    checkbox_label.style.right = "0px";
                    checkbox_label.style.height = "20px"; 
                    checkbox_label.style.overflow = "hidden";
                    checkbox_label.style.whiteSpace = "nowrap";
                    checkbox_label.id = "services_checkbox_label_" + new_layer_id;          // needed later to append the feature counts to the checkboxes 

                    let close_box = document.createElement("input"); 
                    close_box.type = "image";	
                    close_box.src = "images/close_button.png";							// set new checkbox's attributes 

                    close_box.value = new_feature_layer.layerId;
                    checkbox.checked = new_feature_layer.visible;
                    close_box.style.position = "absolute";
                    close_box.style.left = "-18px";
                    close_box.style.width = "13px";
                    close_box.style.height = "13px";  

                    let label_text = new_feature_layer.title;			// get the text for the new label 
                    checkbox_label.textContent = label_text;

                    let new_div = document.createElement("div");

                    checkbox_label.style.overflow = "hidden";
                    new_div.classList.add("w-checkbox");
                    new_div.classList.add("checkbox-field"); 

                    new_div.style.gridRowStart = State.UIProperties.next_grid_line; 
                    State.UIProperties.next_grid_line += 1; 
                    new_div.style.gridRowEnd = State.UIProperties.next_grid_line; 
                    new_div.id = new_layer_id;
                    new_div.append(close_box);  
                    new_div.append(checkbox); 
                    new_div.append(checkbox_label); 
                    new_div.style.overflow = "hidden";
                    new_div.style.padding = "0px";  

                    State.UIProperties.grid_divs_list.push(new_div);
                    layers_list.style.gridTemplateRows += " 25px";  
                    layers_list.append(new_div);

                    close_box.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
                        // remove the layer frmo the map object  
                        new_feature_layer.visible = false;
                        State.MapProperties.map_object.remove(new_feature_layer);

                        // remove the layer from the global lists of layers 
                        var index = State.MapProperties.feature_layers.indexOf(new_feature_layer);
                        let new_array = []; 
                        for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
                            if (x != index){
                                new_array.push(State.MapProperties.feature_layers[x]); 
                            }
                        }
                        State.MapProperties.feature_layers = new_array; 

                        new_array = []; 
                        for (let x = 0; x < State.MapProperties.queried_features.length; x++){
                            if (State.MapProperties.queried_features["layer_id"] != new_layer_id){
                                new_array.push(State.MapProperties.queried_features[x]); 
                            }
                        }
                        State.MapProperties.queried_features = new_array;

                        State.MapProperties.layer_ids = []; 
                        for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
                            State.MapProperties.layer_ids.push(State.MapProperties.feature_layers[x].layerId); 
                        }

                        let layer_divs = layers_list.children;
                        let found_flag = false; 
                        for (let V = 0; V < layer_divs.length; V++){
                            if (layer_divs[V].id == new_div.id){
                                found_flag = true; 
                                continue; 
                            }
                            if (found_flag == true){
                                layer_divs[V].style.gridRowStart -= 1; 
                                layer_divs[V].style.gridRowEnd -= 1;
                            }
                        }

                        // remove the elements in the layers panel  
                        checkbox_label.parentNode.removeChild(checkbox_label);
                        checkbox.parentNode.removeChild(checkbox); 
                        close_box.parentNode.removeChild(close_box);
                        new_div.parentNode.removeChild(new_div); 
                        State.UIProperties.next_grid_line -= 1; 
                    });
                },
                function reject(reason){
                    console.log("error querying new layer & loading it into attribute table: ", reason);
                });
            });


            // print relevant info on the heatmap to the panel: current zoom level, pixel radius, max point intensity
        });

    });
}

export function intersect_function(){
    var intersection_panel = document.getElementById("intersection_panel");
    var intersect_error_div = document.getElementById("intersect_error_div");
    var intersection_layer_selector_1 = document.getElementById("intersection_layer_selector_1");
    var intersection_layer_selector_2 = document.getElementById("intersection_layer_selector_2");
    var table_dataset_selector = document.getElementById("table_dataset_selector");
    var heatmap_layer_selector = document.getElementById("heatmap_layer_selector");

  if (intersect_error_div.innerHTML != ""){
    let int_slice = intersection_panel.style.height; 
    int_slice = Number(int_slice.slice(0, 3)); 
    int_slice -= 50; 
    let px_size = int_slice + "px"; 
    intersection_panel.style.height = px_size;
  }
	intersect_error_div.innerHTML = ""; 
	intersect_error_div.style.overflowY = "hidden";

	var layer_id_one = Number(intersection_layer_selector_1.options[intersection_layer_selector_1.selectedIndex].id);
	var layer_id_two = Number(intersection_layer_selector_2.options[intersection_layer_selector_2.selectedIndex].id);

	var SQL_query_one = document.getElementById("intersection_SQL_input_1").value; 
	var SQL_query_two = document.getElementById("intersection_SQL_input_2").value;

	if (SQL_query_one == ""){
		SQL_query_one = "1=1";
	}
	if (SQL_query_two == ""){
		SQL_query_two = "1=1";
	}

  var feature_layer_one = null; 
  var feature_layer_two = null; 

  for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
      if (State.MapProperties.feature_layers[x].layerId == layer_id_one){
          feature_layer_one = State.MapProperties.feature_layers[x]; 
      }
      if (State.MapProperties.feature_layers[x].layerId == layer_id_two){
          feature_layer_two = State.MapProperties.feature_layers[x]; 
      }
  }

  var query_one = feature_layer_one.createQuery();
  query_one.where = SQL_query_one;
  query_one.sqlFormat = "standard"; 

  var query_two = feature_layer_two.createQuery();
  query_two.where = SQL_query_two;
  query_two.sqlFormat = "standard"; 

  var WGS84_intersected_results = []; 
  var intersected_attributes_one = []; 
  var intersected_attributes_two = [];
  var intersected_fields_one = null; 
  var intersected_fields_two = null;
  var error_flag = false; 
  var promises_array = [];
  const WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});

  let all_promised = feature_layer_one.queryFeatures(query_one)
  .then(function(query_one_results){
      
    let all_promised = ArcGIS.API.Projection.load().then(function(){
        let prior_spatial_reference; 

        if (query_one_results.features.length > 0 && query_one_results.spatialReference.isWGS84 == false){

            if (query_one_results.spatialReference.wkid != null){
                prior_spatial_reference = new ArcGIS.API.SpatialReference({wkid: query_one_results.spatialReference.wkid});
            }
            else if (query_one_results.spatialReference.wkt != null){
                prior_spatial_reference = new ArcGIS.API.SpatialReference({wkt: query_one_results.spatialReference.wkt});
            }

            let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);
            
            for (let x = 0; x < query_one_results.features.length; x++){
                query_one_results.features[x].geometry = ArcGIS.API.Projection.project(query_one_results.features[x].geometry, WGS84_spatial_reference, transformation_object);
            }
        }
    }).then(function(){
      let all_promised = feature_layer_two.queryFeatures(query_two)
      .then(function(query_two_results){
        let all_promised = ArcGIS.API.Projection.load().then(function(){
          let prior_spatial_reference; 
          if (query_two_results.features.length > 0 && query_two_results.spatialReference.isWGS84 == false){
            if (query_two_results.spatialReference.wkid != null){
              prior_spatial_reference = new ArcGIS.API.SpatialReference({wkid: query_two_results.spatialReference.wkid});
            }
            else if (query_two_results.spatialReference.wkt != null){
              prior_spatial_reference = new ArcGIS.API.SpatialReference({wkt: query_two_results.spatialReference.wkt});
            }
            let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);
            
            for (let x = 0; x < query_two_results.features.length; x++){
              query_two_results.features[x].geometry = ArcGIS.API.Projection.project(query_two_results.features[x].geometry, WGS84_spatial_reference, transformation_object);
            }
          }
              
        }).then(function(){
          intersected_fields_one = query_one_results.fields;
          intersected_fields_two = query_two_results.fields;

          for (let x = 0; x < query_one_results.features.length; x++){
            let geometry_one = query_one_results.features[x].geometry;
            let attributes_one = query_one_results.features[x].attributes; 

            for (let y = 0; y < query_two_results.features.length; y++){
              let geometry_two = query_two_results.features[y].geometry; 

              let promised_indicator = ArcGIS.API.AsyncGeometryEngine.intersects(geometry_one, geometry_two)
              .then(function(results){
                if (results == true){
                  let promised_geometry = ArcGIS.API.AsyncGeometryEngine.intersect(geometry_one, geometry_two)
                  .then(function(results){
                    if (results != null){
                      var duplicate = false 
                      for (var index = 0; index < WGS84_intersected_results.length; index++){
                        if (results.x == WGS84_intersected_results[index].x && results.y == WGS84_intersected_results[index].y){
                          duplicate = true;
                          break;
                        }
                      }
                      if (duplicate == false){
                        WGS84_intersected_results.push(results);
                        // fill the attributes arrays with deep copies. Eventually you might want to change the code to make this a shallow copy for editing 
                        intersected_attributes_one.push(Object.assign({}, attributes_one));
                        intersected_attributes_two.push(Object.assign({}, query_two_results.features[y].attributes));
                      }
                    }
                    return results; 
                  });
                  return promised_geometry; 
                }
                return results; 
              });
              promises_array.push(promised_indicator); 
            }
          }
          return Promise.all(promises_array);
        });
        return all_promised;  
      },
      function(reject){
        Utils.error_handler(reject.message, intersect_error_div, intersection_panel);
        error_flag = true;
      });
      return all_promised; 
    });
    return all_promised; 
  },
  function(reject){ 
    Utils.error_handler(reject.message, intersect_error_div, intersection_panel);
    error_flag = true; 
  });

  all_promised.then(function(){
    if (WGS84_intersected_results.length > 0){

      // remove duplicate results 
      //WGS84_intersected_results = [...new Set(WGS84_intersected_results)]; 
      // construct a featurelayer and add it to the map. first join the attributes of both layers for inclusion in the new layer
      var joined_fields = []; 
      var joined_attributes = [];            
      var oid_one = null, oid_two = null, oid_one_name = null, oid_two_name = null, new_oid_name = null, new_oid_field = null;

      for (let x = 0; x < intersected_fields_one.length; x++){
        if (intersected_fields_one[x].type == "oid"){
          oid_one = intersected_fields_one[x];
          oid_one_name = intersected_fields_one[x]["name"];

          new_oid_name = "new__oid";
          new_oid_field = new ArcGIS.API.Field({
            alias: new_oid_name, 
            defaultValue: intersected_fields_one[x]["defaultValue"], 
            description: intersected_fields_one[x]["description"], 
            domain: intersected_fields_one[x]["domain"], 
            editable: false, 
            name: new_oid_name, 
            type: "oid", 
            valueType: "unique-identifier"
          });
        }
        else{
            joined_fields.push(intersected_fields_one[x]);
        }
      }
      for (let x = 0; x < intersected_fields_two.length; x++){
        if (intersected_fields_two[x].type == "oid"){
          oid_two = intersected_fields_two[x];
          oid_two_name = intersected_fields_two[x]["name"];
        }
        else{
          joined_fields.push(intersected_fields_two[x]);
        }
      }
      joined_fields.push(new_oid_field);

      // attempt to delete the oid fields to avoid duplicates (sometimes delete doesn't work)
      for (let x = 0; x < intersected_attributes_one.length; x++){    // both arrays are the same length
        delete intersected_attributes_one[x][oid_one_name]; 
        delete intersected_attributes_two[x][oid_two_name]; 

        let joined_object = {
          ...intersected_attributes_one[x], 
          ...intersected_attributes_two[x]
        }
        joined_object[new_oid_name] = x; 
        joined_attributes.push(joined_object);
      }

      var reduced_fields = Object.getOwnPropertyNames(joined_attributes[0]);
      var final_fields = [];             
      for (let x = 0; x < reduced_fields.length; x++){
        for (let y = 0; y < joined_fields.length; y++){
          if (joined_fields[y]["name"] == reduced_fields[x]){
            reduced_fields[x] = null; 
            final_fields.unshift(joined_fields[y]); 
          }
        }
      }

      // get the next layer_id 
      let max_id = State.MapProperties.feature_layers[0].layerId; 
      for (let x = 1; x < State.MapProperties.feature_layers.length; x++){
        if (State.MapProperties.feature_layers[x].layerId > max_id){
          max_id = State.MapProperties.feature_layers[x].layerId; 
        }
      }
      let new_layer_id = max_id + 1; 
      State.MapProperties.layer_ids.push(new_layer_id); 

      // construct a graphics array for the new feature layer 
      let graphics_objects_array = [];
      let geometry_type = WGS84_intersected_results[0].type; 
      let options = null; 

      if (geometry_type == "point"){
        options = {
          color: Colors.getColor("newlayer", null),
          size: "7px",
          style: "circle"
        }
      }
      else if (geometry_type == "polyline"){
        options = {             //options["color"], options["cap"], options["join"], options["width"], options["style"]
          color: Colors.getColor("newlayer", null), 
          cap: "round", 
          join: "bevel", 
          width: 2.5, 
          style: "solid"
        }
      }
      else if (geometry_type == "polygon"){
        let areas_array = [];

        for (let x = 0; x < State.MapProperties.current_layers_query["data"].features.length; x++){
          let class_geometry_object = Graphics.create_geometry_class_object(State.MapProperties.current_layers_query["data"].features[x].geometry);
          let area = ArcGIS.API.GeometryEngine.geodesicArea(class_geometry_object, "square-miles");
          if (area > 100000){
            continue; 
          }
          areas_array.push(area); 
        }            

        let count = 0; 
        let sum = 0; 
        
        for (let x = 0; x < areas_array.length; x++){
          sum += areas_array[x]; 
          count++; 
        }
        
        let average = Math.floor(sum / count);

        let sizes = [400, 1170, 1900, 2400, 3000, 4200, 9700, 26000, 41000, 50000, 75000, 103000, 118000, 137000, 160000, 210000, 240000]; 
        let widths = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 1.8, 2.1, 2.6, 2.7, 2.9, 3.2, 3.5, 3.6, 3.7, 3.8];
        
        let new_width = null; 
        let found_flag = false; 

        for (let y = 0; y < sizes.length; y++){
          if (average <= sizes[y]){
            found_flag = true; 
            new_width = widths[y]; 
            break; 
          }
        }
        if (found_flag == false){
          new_width = 3.9; 
        }

        State.MapGraphics.polygon_outline_widths.push({"width": new_width, "layer_id": new_layer_id});

        options = {   // options["color"], options["fill_style"], options["outline_style"], options["width"], options["cap"], options["join"]
          color: Colors.getColor("newlayer", null), 
          fill_style: "solid",
          outline_style: "short-dash-dot",
          cap: "round", 
          join: "bevel", 
          width: new_width,
        }    
      }

      for (let x = 0; x < WGS84_intersected_results.length; x++){
        // get area to make sure you don't have a full extent object
        if (geometry_type == "polygon"){
          let class_geometry_object = Graphics.create_geometry_class_object(WGS84_intersected_results[x]);
          let area = ArcGIS.API.GeometryEngine.geodesicArea(class_geometry_object, "square-miles");
          if (area > 100000){
            continue; 
          }
        }
        
        options["attributes"] = joined_attributes[x];
        let graphic_object = Graphics.create_graphics_object(WGS84_intersected_results[x], options);
        graphics_objects_array.push(graphic_object); 
      }

      var custom_renderer = {
        type: "simple", 
        symbol: graphics_objects_array[0].symbol
      };

      var reduced_fields = Object.getOwnPropertyNames(joined_attributes[0]);

      // find out what the title should be 
      var count = 1;
      for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
        if (State.MapProperties.feature_layers[x]["client_generated"] == true && State.MapProperties.feature_layers[x]["analysis_type"] == "intersection"){
          count += 1; 
        }
      }
      var new_title = "intersection " + count.toString(); 

      // now construct the new feature layer & add it to the map             
      var new_feature_layer = new ArcGIS.API.FeatureLayer({
        source: graphics_objects_array,
        fields: final_fields,
        outFields: reduced_fields,
        objectIdField: new_oid_name,
        geometryType: geometry_type, 
        layerId: new_layer_id,
        maximumNumberOfFeatures: 60000, 
        title: new_title, 
        renderer: custom_renderer
      });

      new_feature_layer["client_generated"] = true; 
      new_feature_layer["analysis_type"] = "intersection";

      new_feature_layer.load().then(function(){
        State.MapProperties.map_object.add(new_feature_layer);

        State.MapProperties.feature_layers.push(new_feature_layer); 
        State.MapProperties.feature_layers.sort(function(a, b){
          return a.layerId - b.layerId;
        });

        let query = new_feature_layer.createQuery();
        let query_promise = new_feature_layer.queryFeatures(query);

        query_promise.then(function(query_results){
          let query_object = {"data": query_results, "layer_id": new_layer_id}; 

          State.MapProperties.queried_features.push(query_object); 
          State.MapProperties.current_layers_query = query_object;

          Table.fill_attribute_table(1, true);

          // now add the new feature layer to selectors throughout the map 
          for (let z = 0; z < Utils.selector_elements_list.length; z++){
            let layer_option = document.createElement("option");
            layer_option.textContent = new_feature_layer.title;
            layer_option.id = new_layer_id;                 // id is needed later by the options handler when an option is selected 
            Utils.selector_elements_list[z].append(layer_option);
          }
          table_dataset_selector[table_dataset_selector.length - 1].selected = true;

          // for heatmap selector 
          if (geometry_type == "point"){
            let layer_option = document.createElement("option");
            layer_option.textContent = new_feature_layer.title;
            layer_option.id = new_layer_id;                 // id is needed later by the options handler when an option is selected 
            heatmap_layer_selector.append(layer_option);
          }

          let checkbox = document.createElement("input");
          checkbox.type = "checkbox";								// set new checkbox's attributes 
          
          checkbox.classList.add("w-checkbox-input");
          checkbox.classList.add("w-checkbox-input--inputType-custom");
          checkbox.classList.add("checkbox");

          checkbox.value = new_feature_layer.layerId;
          checkbox.checked = new_feature_layer.visible;
          checkbox.style.position = "absolute";
          checkbox.style.display = "inline-block"; 
          checkbox.style.left = "7px";
          checkbox.style.height = "12px"; 
          
          checkbox.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
            new_feature_layer.visible = e.target.checked;
          });

          let checkbox_label = document.createElement("label");		// create a label for the new checkbox & set its CSS attributes 

          checkbox_label.classList.add("checkbox-button-label");
          checkbox_label.classList.add("w-form-label");

          checkbox_label.style.position = "absolute";
          checkbox_label.style.display = "inline-block"; 
          checkbox_label.style.left = "15px";
          checkbox_label.style.right = "0px";
          checkbox_label.style.height = "20px"; 
          checkbox_label.style.overflow = "hidden";
          checkbox_label.style.whiteSpace = "nowrap";
          checkbox_label.id = "services_checkbox_label_" + new_layer_id;          // needed later to append the feature counts to the checkboxes 

          let close_box = document.createElement("input"); 
          close_box.type = "image";	
          close_box.src = "images/close_button.png";							// set new checkbox's attributes 

          close_box.value = new_feature_layer.layerId;
          checkbox.checked = new_feature_layer.visible;
          close_box.style.position = "absolute";
          close_box.style.left = "-18px";
          close_box.style.width = "13px";
          close_box.style.height = "13px"; 

          let label_text = new_feature_layer.title;			// get the text for the new label 
          checkbox_label.textContent = label_text;

          let new_div = document.createElement("div");

          checkbox_label.style.overflow = "hidden";
          new_div.classList.add("w-checkbox");
          new_div.classList.add("checkbox-field"); 

          new_div.style.gridRowStart = State.UIProperties.next_grid_line; 
          State.UIProperties.next_grid_line += 1; 
          new_div.style.gridRowEnd = State.UIProperties.next_grid_line; 
          new_div.id = new_layer_id;
          new_div.append(close_box);  
          new_div.append(checkbox);
          new_div.append(checkbox_label); 
          new_div.style.overflow = "hidden";
          new_div.style.padding = "0px";  

          State.UIProperties.grid_divs_list.push(new_div);
          layers_list.style.gridTemplateRows += " 25px";  
          layers_list.append(new_div);

          let saved_layers_query = State.MapProperties.current_layers_query;
          close_box.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
            // remove the layer frmo the map object  
            new_feature_layer.visible = false;
            State.MapProperties.map_object.remove(new_feature_layer); 

            // remove the layer from the global lists of layers 
            var index = State.MapProperties.feature_layers.indexOf(new_feature_layer);
            let new_array = []; 
            for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
              if (x != index){
                new_array.push(State.MapProperties.feature_layers[x]); 
              }
            }
            State.MapProperties.feature_layers = new_array; 

            index = State.MapProperties.queried_features.indexOf(saved_layers_query);
            new_array = []; 
            for (let x = 0; x < State.MapProperties.queried_features.length; x++){
              if (x != index){
                new_array.push(State.MapProperties.queried_features[x]); 
              }
            }
            State.MapProperties.queried_features = new_array;
            
            let selected_id = table_dataset_selector.options[table_dataset_selector.selectedIndex].id;
            let flag = false; 
            for (let x = 0; x < State.MapProperties.queried_features.length; x++){
              if (State.MapProperties.queried_features[x]["layer_id"] == selected_id && selected_id != new_layer_id){
                flag = true; 
                break;
              }
            }
            if (flag == false){
              State.MapProperties.current_layers_query = State.MapProperties.queried_features[0];
              Table.fill_attribute_table(1, true);
            }

            State.MapProperties.layer_ids = []; 
            for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
              State.MapProperties.layer_ids.push(State.MapProperties.feature_layers[x].layerId); 
            }
            // remove the option from various selectors 
            for (let x = 0; x < Utils.selector_elements_list.length; x++){
              for (let y = 0; y < Utils.selector_elements_list[x].length; y++){
                if (Utils.selector_elements_list[x].options[y].id == new_layer_id){
                  Utils.selector_elements_list[x].remove(y); 
                }
              }
            }
            for (let y = 0; y < heatmap_layer_selector.length; y++){
              if (heatmap_layer_selector.options[y].id == new_layer_id){
                heatmap_layer_selector.remove(y); 
              }
            }

            let layer_divs = layers_list.children;
            let found_flag = false; 
            for (let V = 0; V < layer_divs.length; V++){
              if (layer_divs[V].id == new_div.id){
                found_flag = true; 
                continue; 
              }
              if (found_flag == true){
                layer_divs[V].style.gridRowStart -= 1; 
                layer_divs[V].style.gridRowEnd -= 1;
              }
            }

            // remove the elements in the layers panel  
            checkbox_label.parentNode.removeChild(checkbox_label);
            checkbox.parentNode.removeChild(checkbox); 
            close_box.parentNode.removeChild(close_box);
            new_div.parentNode.removeChild(new_div); 
            State.UIProperties.next_grid_line -= 1; 
          });

          let feature_count = State.MapProperties.current_layers_query["data"].features.length; 
          checkbox_label.textContent += " (" + feature_count + ")"; 

        },
        function reject(reason){
          console.log("error querying new layer & loading it into attribute table: ", reason);
          error_flag = true; 
          Table.table_load_handler(reason);
        });
      });
    }
    else{
      if (error_flag == false){
        Utils.error_handler("The geometries do not intersect.", intersect_error_div);
      }
    }
  },
  function(error){
    Utils.error_handler(error.message, intersect_error_div, intersection_panel);
  });
}
