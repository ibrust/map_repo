import * as Colors from './colors.js';
import * as State from './state.js';
import * as ArcGIS from './ArcGIS.js';
import * as Table from './table.js';

export function create_graphics_object(geometry, options){
  var graphics_object = null;

  if (options.hasOwnProperty("color") == false){
    options["color"] = "#787878"; 
  }
  if (options.hasOwnProperty("attributes") == false){
    options["attributes"] = null; 
  }

  if (geometry.type == "point"){
    graphics_object = create_point_graphic(geometry.x, geometry.y, options["color"], options["size"], options["style"], options["attributes"])
  }
  else if (geometry.type == "polyline"){
    graphics_object = create_line_graphic(geometry.paths, options["color"], options["cap"], options["join"], options["width"], options["style"], options["attributes"]);
  }
  else if (geometry.type == "polygon"){
      let outline_color = Colors.hex_to_hsla(options["color"], .95); 
      let fill_color = Colors.hex_to_hsla(options["color"], .30);
      if (options.hasOwnProperty("fill_style") == false){
        options["fill_style"] = "solid"; 
      }
      if (options.hasOwnProperty("outline_style") == false){
        options["outline_style"] = "solid"; 
      }
      if (options.hasOwnProperty("cap") == false){
        options["cap"] = "round"; 
      }
      if (options.hasOwnProperty("join") == false){
        options["join"] = "bevel"; 
      }
      if (options.hasOwnProperty("width") == false){
        options["width"] = 3; 
      }
      graphics_object = create_polygon_graphic(geometry.rings, fill_color, options["fill_style"], outline_color, options["outline_style"], options["width"], options["cap"], options["join"], options["attributes"]); 
  }
  return graphics_object; 
}

export function create_point_graphic(x, y, color, size, style, attributes){
	let point = {
		type: "point", 
		longitude: x, 
		latitude: y
	}
	let symbol = {
		type: "simple-marker", 
		color: color, 
		size: size, 
		style: style
	}
	let graphic = new ArcGIS.API.Graphic({geometry: point, symbol: symbol, attributes: attributes}); 
	return graphic;
}

function create_line_graphic(paths, color, cap, join, width, style, attributes){
    let lines = {
		type: "polyline", 
		paths: paths
	}
	let symbol = {
		join: join, 
		type: "simple-line", 
		cap: cap, 
		color: color, 
		width: width, 
		style: style
	}
	let graphic = new ArcGIS.API.Graphic({geometry: lines, symbol: symbol, attributes: attributes}); 
	return graphic;
}

export function create_polygon_graphic(rings, fill_color, fill_style, outline_color, outline_style, width, cap, join, attributes){
	let polygon = {
		type: "polygon", 
		rings: rings
	}
	let symbol = {
		type: "simple-fill", 
		color: fill_color, 
		style: fill_style,
		outline: {
			width: width, 
			color: outline_color, 
			style: outline_style, 
			cap: cap, 
			join: join
		}
	}
  // why is this using a global graphic? 
	let graphic = new ArcGIS.API.Graphic({geometry: polygon, symbol: symbol, attributes: attributes}); 
	return graphic; 
}

export function create_graphic_layers(){
  // create empty background layers for each foreground feature layer that's not a temporary layer 
  let promises_array = []; 
  for (let x = 0; x < State.MapProperties.feature_layers.length; x++){

    if (State.MapProperties.feature_layers[x].hasOwnProperty("client_generated") == false){
      let found_flag = false; 
      let feature_fields = State.MapProperties.feature_layers[x].fields;
      let fields = []; 
      for (let y = 0; y < feature_fields.length; y++){
        fields.push(
          new ArcGIS.API.Field({
            alias: feature_fields[y].alias,
            editable: true, 
            name: feature_fields[y].name, 
            type: feature_fields[y].type, 
            valueType: feature_fields[y].valueType
          })
        )
      }
      let parent_id = State.MapProperties.feature_layers[x].layerId;

      for (let z = 0; z < fields.length; z++){
        if (fields[z].editable == false){
          fields[z].editable = true; 
        }
        if (fields[z].type == "oid"){
          fields[z].type = "integer"; 
        }
      }

      let reduced_fields = []; 
      let found_oid = false; 
      let new_oid_field = new ArcGIS.API.Field({
        alias: "new__oid",
        editable: true, 
        name: "new__oid", 
        type: "oid", 
        valueType: "unique-identifier"
      });
      fields.unshift(new_oid_field);

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

      let geometry_type = State.MapProperties.feature_layers[x].geometryType;
      let symbol = null;

      if (geometry_type == "point"){
        symbol = {
          type: "simple-marker", 
          color: Colors.getColor("newlayer", null),
          size: "7px",
          style: "square"
        }
      }
      else if (geometry_type == "polyline"){
        symbol = {
          join: "bevel",
          type: "simple-line", 
          cap: "round", 
          color: Colors.getColor("newlayer", null),  
          width: 2.5, 
          style: "solid"
        }
      }
      else if (geometry_type == "polygon"){
        let color = Colors.getColor("newlayer", null)
        let outline_color = Colors.hex_to_hsla(color, .95); 
        let fill_color = Colors.hex_to_hsla(color, .30);
        let new_width = null;

        for (let z = 0; z < State.MapGraphics.polygon_outline_widths.length; z++){
          if (State.MapGraphics.polygon_outline_widths[z]["layer_id"] == State.MapProperties.feature_layers[x].layerId){
            new_width = State.MapGraphics.polygon_outline_widths[z]["width"];
            break;
          }
        }
        symbol = {
          type: "simple-fill", 
          color: fill_color, 
          style: "solid",
          outline: {
            width: new_width,
            color: outline_color, 
            style: "short-dash-dot",
            cap: "round", 
            join: "bevel", 
          }
        }
      }

      let custom_renderer = {
        type: "simple", 
        symbol: symbol
      };

      for (let z = 0; z < fields.length; z++){
        reduced_fields.push(fields[z].name);
      }

      let WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});

      let new_feature_layer = new ArcGIS.API.FeatureLayer({
        source: [],
        fields: fields,
        outFields: reduced_fields,
        legendEnabled: false, 
        objectIdField: new_oid_field.name,
        geometryType: State.MapProperties.feature_layers[x].geometryType, 
        layerId: new_layer_id,
        maximumNumberOfFeatures: 60000,
        renderer: custom_renderer,
        spatialReference: WGS84_spatial_reference
      });

      new_feature_layer["parent_layer_id"] = parent_id;
      new_feature_layer["client_generated"] = true; 
      new_feature_layer["analysis_type"] = "background_layer";

      State.MapProperties.background_layers.push(new_feature_layer);

      // construct the global State.MapProperties.queried_background_features array - later when you add features to the background layers you'll also append them to this global array 
      let promise = new_feature_layer.load().then(function(new_layer){
        let query = new_layer.createQuery();
        let query_promise = new_layer.queryFeatures(query);
        let promise = query_promise.then(function(query_results){
          let query_object = {"data": query_results, "layer_id": new_layer.layerId, "parent_layer_id": parent_id}; 
          State.MapProperties.queried_background_features.push(query_object);
        });
        return promise; 
      });
      promises_array.push(promise); 
    } // end if 
  } // end for 
  var geometry_types = ["polygon", "polyline", "point"];
  for (let y = 0; y < 3; y++){
    for (let x = 0; x < State.MapProperties.background_layers.length; x++){
      if (State.MapProperties.background_layers[x].geometryType == geometry_types[y]){
        State.MapProperties.map_object.add(State.MapProperties.background_layers[x]);
      }
    }
  }
}

export function create_geometry_class_object(input_geometry){
	var class_object; 
	if (input_geometry.rings != undefined){
		class_object = new ArcGIS.API.Polygon({
			rings: input_geometry.rings, 
			spatialReference: 4326, 
		});
	}
	else if (input_geometry.paths != undefined){
		class_object = new ArcGIS.API.Line({
			paths: input_geometry.paths, 
			spatialReference: 4326
		});
	}
	else{
		class_object = new ArcGIS.API.Point({
			x: input_geometry.x, 
			y: input_geometry.y, 
			spatialReference: 4326
		});
	}
	return class_object;
}

export function set_polygon_outline_widths(){
  let promises_array = [];
  let averages_array = [];

  for (let y = 0; y < State.MapProperties.queried_features.length; y++){
    let queried_layer = State.MapProperties.queried_features[y];
    let layer_id = queried_layer["layer_id"];
    
    if (queried_layer["data"].geometryType == "polygon"){
      let features = queried_layer["data"].features;
      let areas_array = [];

      for (let x = 0; x < features.length; x++){
        let class_geometry_object = create_geometry_class_object(features[x].geometry);
        let promise = ArcGIS.API.AsyncGeometryEngine.geodesicArea(class_geometry_object, "square-miles")
        .then(function(area){
          areas_array.push(area);
          let count = 0;
          let sum = 0;
          
          for (let x = 0; x < areas_array.length; x++){
            sum += areas_array[x]; 
            count++; 
          }
          
          let average = Math.floor(sum / count);
          let average_object = {
            "average": average, 
            "layer_id": layer_id 
          }
          averages_array.push(average_object);
        });
        promises_array.push(promise);  
      }
    }
  }
  let promise = Promise.all(promises_array).then(function(){
    State.MapGraphics.polygon_outline_widths = [];    // global array that holds the calculated outline widths used when selecting features from each polygon layer

    averages_array.sort(function(a, b){
      let temp = a["average"] - b["average"]; 
      return temp; 
    });
    let sizes = [400, 1170, 1900, 2400, 3000, 4200, 9700, 26000, 41000, 50000, 75000, 103000, 118000, 137000, 160000, 210000, 240000]; 
    let widths = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 1.8, 2.1, 2.6, 2.7, 2.9, 3.2, 3.5, 3.6, 3.7, 3.8];
    
    for (let x = 0; x < averages_array.length; x++){
      let width = null; 
      let found_flag = false; 
      for (let y = 0; y < sizes.length; y++){
        if (averages_array[x]["average"] <= sizes[y]){
          found_flag = true; 
          width = widths[y]; 
          break; 
        }
      }
      if (found_flag == false){
        width = 3.9; 
      }
      State.MapGraphics.polygon_outline_widths.push({
        "layer_id": averages_array[x]["layer_id"],
        "width": width
      });
    }
    return null; 
  });
  return promise; 
}

export function clear_graphics_layer(){
    var table_dataset_selector = document.getElementById("table_dataset_selector");

  State.MapGraphics.enable_graphics = false;
  // now you need to clear all the State.MapProperties.background_layers 
  for (let x = 0; x < State.MapProperties.background_layers.length; x++){
    let query = State.MapProperties.background_layers[x].createQuery();
    let query_promise = State.MapProperties.background_layers[x].queryFeatures(query);
    let index = null; 

    for (let y = 0; y < State.MapProperties.queried_background_features.length; y++){
      if (State.MapProperties.background_layers[x].layerId == State.MapProperties.queried_background_features[y]["layer_id"]){
        index = y; 
        break;
      }
    }
    let delete_edits = {
      deleteFeatures: State.MapProperties.queried_background_features[index]["data"].features
    };
    let promise = State.MapProperties.background_layers[x].applyEdits(delete_edits);
  }
  for (let y = 0; y < State.MapProperties.queried_background_features.length; y++){
    State.MapProperties.queried_background_features[y]["data"].features = []; 
  }
  let selected_id = table_dataset_selector.options[table_dataset_selector.selectedIndex].id
  for (let x = 0; x < State.MapProperties.queried_features.length; x++){
    if (State.MapProperties.queried_features[x]["layer_id"] == selected_id){
      State.MapProperties.current_layers_query = State.MapProperties.queried_features[x]; 
      break; 
    }
  }
  Table.fill_attribute_table(1, true);
}
