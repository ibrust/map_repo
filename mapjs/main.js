
import * as Listeners from './listeners.js';
import * as Utils from './utils.js';
import * as Colors from './colors.js';
import * as State from './state.js';
import * as ArcGIS from './ArcGIS.js';

export function start() {
    Listeners.setup();
    Utils.setup();
    ArcGIS.fetchArcAPI(setupMap);
}


function setupMap(){
  var brownmap =  new ArcGIS.API.Basemap ({
		baseLayers: [new ArcGIS.API.TileLayer ({
      url: "http://server.arcgisonline.com/arcgis/rest/services/World_Shaded_Relief/MapServer", 
      title: "world_physical_basemap"})], 
		title: "historically accurate", 
		id: "brownmap", 
		thumbnailUrl: "images/brownmap_icon.PNG"
	});
    // create basemap (green one, looks better than others)
	var greenmap = new ArcGIS.API.Basemap({
		baseLayers: [new ArcGIS.API.TileLayer({
        url: "http://server.arcgisonline.com/arcgis/rest/services/World_Physical_Map/MapServer", 
        title: "world_physical_basemap"}
      )],	
      title: "natural earth", 
      id: "greenmap", 
		thumbnailUrl: "images/greenmap_icon.PNG"
	});
	// load the default basemap 
	State.MapProperties.map_object = new ArcGIS.API.MapObject({basemap: brownmap});
	
  /* used to establish the zoom levels for the basemap & resolutions for each level */

	State.MapProperties.map_view = new ArcGIS.API.MapView({
		container: "map_view_container",
		map: State.MapProperties.map_object, 
		center: [-85.18798828122625, 32.86113232280214], 
		zoom: 3, 
		constraints: {lods: Utils.extended_tilelods}
	});

	// create widgets & add to view
	State.MapProperties.map_view.ui.components = ["attribution"];
	
  var zoom = new ArcGIS.API.Zoom({
    view: State.MapProperties.map_view, 
    container: "zoom_widget"
  });
	State.MapProperties.map_view.ui.add(zoom, "manual"); // manual specifies that you will position the element manually, in this case within the zoom_widget div 
	
  var legend = new ArcGIS.API.Legend({
    view: State.MapProperties.map_view, 
    defaultsymbol: false, 
    container: "legend_widget"
  });
	State.MapProperties.map_view.ui.add(legend, "manual");
	
  let ESRI_search = new ArcGIS.API.Search({
    view: State.MapProperties.map_view, 
    container: "search_widget"
  });
	State.MapProperties.map_view.ui.add(ESRI_search, "manual");

  var scale_bar = new ArcGIS.API.ScaleBar({
    view: State.MapProperties.map_view, 
    container: "scalebar_widget", 
    unit: "non-metric", 
    style: "ruler", 
  });
  State.MapProperties.map_view.ui.add(scale_bar, {position: "manual"});

  var print_obj = new ArcGIS.API.Print({
    view: State.MapProperties.map_view, 
    container: "print_widget", 
    printServiceUrl: State.URLProperties.base_url + "Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
  });
  State.MapProperties.map_view.ui.add(print_obj, {position: "manual"});
	
    // toggles between 2 baemaps - if you need more than 2 basemaps you have to use the basemap gallery widget 
	var basemapToggle = new ArcGIS.API.BasemapToggle({
		view: State.MapProperties.map_view,
		nextBasemap: greenmap,
		container: "toggle_widget",
		titleVisible: false
	});
	State.MapProperties.map_view.ui.add(basemapToggle, "manual");

	// fill the services selector w/ the initial services
	populate_services();
	// prime listeners for the 3 radio buttons that select page sizes on attribute table 
	let total_results = 12;
	for (let x = 1; x <= 3; x++){
    closure(x, total_results);
    total_results *= 2;
	} 
  function closure(input_value, results){
    let radio_button_id = "count_button_" + input_value;
    let radio_button = document.getElementById(radio_button_id);
    radio_button.addEventListener("click", function(){change_results_count(results);}); 
  }

	// set up an event listener for the REST URL box
  var service_input = document.getElementById("service_input");
	service_input.addEventListener("change", change_services_url);
}

// add services to the drop down list of services on the layers pane, prime event listeners to load them, then call load_service to load the first service in the list
function populate_services(){
	ArcGIS.API.ArcRequest(State.URLProperties.base_url + "?f=json", {responseType: "json"})
	.then(function(response){
        var service_selector = document.getElementById("service_selector");
		let server_json = response.data;
		// add event listeners so that when a new service is selected - fetch that service, render it on the map, & fill the layers pane with checkboxes for its layers
		service_selector.addEventListener("change", function(){
			load_service(false);
		});
		let total_elements = service_selector.childElementCount;
		for (var x = 0; x < total_elements; x++){
			service_selector.removeChild(service_selector.childNodes[0]);
		}

		// populate the drop down list of services with all available services names
		for (var x = 0; x < server_json.services.length; x++){
      let service_type = server_json.services[x].type; 
      if (service_type == "FeatureServer"){
        let new_option = document.createElement("option");
        new_option.textContent = server_json.services[x].name;
        if (new_option.textContent == State.URLProperties.default_service){
          new_option.selected = true;
        }
        service_selector.appendChild(new_option);
      }
		}
		load_service(true);
	}); /* end promised request */
} /* end populate services */

function load_service(first_time){
    var heatmap_layer_selector = document.getElementById("heatmap_layer_selector");
    var service_selector = document.getElementById("service_selector");
	// get the name of the currently selected service from the service selector in the layers pane 
	State.URLProperties.selected_service_name = service_selector.options[service_selector.selectedIndex].textContent;
	// remove any old service from the map
	State.MapProperties.map_object.removeAll();

  // make a json request to find out how many layers there are 
  let featureserver_info_url = State.URLProperties.base_url + State.URLProperties.selected_service_name + "/FeatureServer?f=pjson"; 

  ArcGIS.API.ArcRequest(featureserver_info_url).then(function(service_json_response){
    State.MapProperties.feature_layers = []; 
    State.MapProperties.background_layers = []; 
    State.UIProperties.all_title_fields = [];
    State.MapGraphics.enable_graphics = false; 
    State.MapGraphics.polygon_outline_widths = []; 
    State.MapProperties.queried_features = []; 
    State.MapProperties.queried_background_features = []; 
    State.MapGraphics.previous_graphic = null; 
    State.MapProperties.saved_complete_query = null; 

    var promises_array = []; 
    var total_layers = service_json_response.data.layers.length;

    if (!first_time){
      clear_graphics_layer();
    }
    else{
      State.MapProperties.map_view.graphics = []; 
    }

    var layer_objects = service_json_response.data.layers;       // get the layer ids for each layer in the service ...
    State.MapProperties.layer_ids = []; 
    for (let x = 0; x < layer_objects.length; x++){
      State.MapProperties.layer_ids.push(layer_objects[x].id)
    }

    var server_query_url = State.URLProperties.base_url + State.URLProperties.selected_service_name + "/FeatureServer/"; 
    var json_query = "?f=pjson"; 

    for (let x = 0; x < total_layers; x++){

      let layer_query_url = server_query_url + State.MapProperties.layer_ids[x];      
      let promise = ArcGIS.API.ArcRequest(layer_query_url + json_query).then(function(layer_json_response){
          
        let fields = layer_json_response.data.fields; 
        let popup_field_infos = [];
        let popup_field_names = []; 
        for (let y = 0; y < fields.length; y++){
          popup_field_infos.push(new ArcGIS.API.FieldInfo({
            fieldName: fields[y].name,
            label: fields[y].alias,
            visible: true, 
            isEditable: true
          }));
          popup_field_names.push(fields[y].name); 
        }
        let display_field = layer_json_response.data.displayField; 

        let popup_template = new ArcGIS.API.PopupTemplate({
          content: [{
            type: "fields", 
            fieldInfos: popup_field_infos
          }]
        });

        let new_feature_layer = new ArcGIS.API.FeatureLayer({
          url: layer_query_url, 
          outFields: popup_field_names, 
          popupTemplate: popup_template
        });

        let promise = new_feature_layer.load().then(function(){
          State.MapProperties.feature_layers.push(new_feature_layer);                 
        });
        return promise;
      });

      promises_array.push(promise);
    }
    return Promise.all(promises_array);
  }).then(function(){

    var geometry_types = ["polygon", "polyline", "point"];
    for (let y = 0; y < 3; y++){
      for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
        if (State.MapProperties.feature_layers[x].geometryType == geometry_types[y]){
          State.MapProperties.map_object.add(State.MapProperties.feature_layers[x]);
        }
      }
    }        

    State.MapProperties.feature_layers.sort(function(a, b){
      return a.layerId - b.layerId; 
    });

    // get rid of the layer checkboxes listed by any prior service
    State.UIProperties.grid_divs_list = [];
    State.UIProperties.next_grid_line = 1;
    let child_count = layers_list.childElementCount;
    for (let y = 0; y < child_count; y++){
      layers_list.removeChild(layers_list.childNodes[0]); 
    }

    for (let x = 0; x < State.MapProperties.layer_ids.length; x++){  
      let layer_id = State.MapProperties.layer_ids[x];
      let feature_layer = State.MapProperties.feature_layers[x]; 

      let checkbox = document.createElement("input");

      checkbox.classList.add("w-checkbox-input");
      checkbox.classList.add("w-checkbox-input--inputType-custom");
      checkbox.classList.add("checkbox");

      checkbox.type = "checkbox";								// set new checkbox's attributes
      checkbox.value = feature_layer.layerId;
      checkbox.checked = feature_layer.visible;
      checkbox.style.position = "absolute";
      checkbox.style.display = "inline-block";
      checkbox.style.left = "0px";
      checkbox.style.height = "12px";
      
      checkbox.addEventListener("click", function(e){			// associate checkbox clicks with turning a layer on/off 
        feature_layer.visible = e.target.checked;
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
      checkbox_label.id = "services_checkbox_label_" + layer_id;          // needed later to append the feature counts to the checkboxes 

      let label_text = feature_layer.title;			// get the text for the new label 
      checkbox_label.textContent = label_text;

      let new_div = document.createElement("div");
      
      new_div.classList.add("w-checkbox");
      new_div.classList.add("checkbox-field"); 

      checkbox_label.style.overflow = "hidden";
      new_div.style.gridRowStart = State.UIProperties.next_grid_line;
      State.UIProperties.next_grid_line += 1;
      new_div.style.gridRowEnd = State.UIProperties.next_grid_line;
      new_div.id = layer_id;
      new_div.append(checkbox);
      new_div.append(checkbox_label);
      new_div.style.overflow = "hidden";
      new_div.style.padding = "0px";

      State.UIProperties.grid_divs_list.push(new_div); 
      layers_list.style.gridTemplateRows += " 25px"; 
      layers_list.append(new_div);
    }// end of loop for adding layer checkboxes

    // remove any old layer selector options throughout the various panels 
    for (let x = 0; x < Utils.selector_elements_list.length; x++){
      let old_count = Utils.selector_elements_list[x].childElementCount;
      for (let y = 0; y < old_count; y++){
        Utils.selector_elements_list[x].removeChild(Utils.selector_elements_list[x].childNodes[0]); 
      }
    }
    let heatmap_child_count = heatmap_layer_selector.childElementCount; 
    for (let y = 0; y < heatmap_child_count; y++){
      heatmap_layer_selector.removeChild(heatmap_layer_selector.childNodes[0]); 
    }
    // now populate the selectors with the new layers 
    for (let x = 0; x < State.MapProperties.layer_ids.length; x++){
      let layer_id = State.MapProperties.layer_ids[x]; 
      let featurelayer = State.MapProperties.feature_layers[x];
      for (let z = 0; z < Utils.selector_elements_list.length; z++){
        add_option(Utils.selector_elements_list[z], featurelayer, layer_id);
      }
    }
    for (let x = 0; x < State.MapProperties.layer_ids.length; x++){
      let layer_id = State.MapProperties.layer_ids[x]; 
      let featurelayer = State.MapProperties.feature_layers[x];
      let geometry_type = featurelayer.geometryType; 
      if (geometry_type == "point"){
        add_option(heatmap_layer_selector, featurelayer, layer_id);
      }
    }

    function add_option(element, featurelayer, layer_id){
      let layer_option = document.createElement("option");
      layer_option.textContent = featurelayer.title;
      layer_option.id = layer_id;                 // id is needed later by the options handler when an option is selected 
      element.append(layer_option);
    }
      
    // spatially project the new layers of the fetched service onto the map and zoom to the extent 
    project_and_zoom(State.MapProperties.feature_layers[0].fullExtent);

    // establish the current features in the array for all layers 
    var promise_array = []; 
    State.MapProperties.queried_features = []; 
    for (let x = 0; x < State.MapProperties.feature_layers.length; x++){
      let feature_layer = State.MapProperties.feature_layers[x]; 
      let query = feature_layer.createQuery();
      let query_promise = feature_layer.queryFeatures(query);
      
      let promise = query_promise.then(function(query_results){
        
        let query_object = {"data": query_results, "layer_id": State.MapProperties.layer_ids[x]}; 
        State.MapProperties.queried_features.push(query_object); 

        if (x == 0){                // initialize the attribute table with the data from the top layer in the service
          State.MapProperties.current_layers_query = query_object; 
          fill_attribute_table(1, true);

          // set these event listeners only when the map is first loaded 
          if (first_time == true){
            initialize_listeners(); 
          }
        }
      },
      function reject(reason){
        if (x == 0){
          console.log("error in load_service for layer id: ", State.MapProperties.layer_ids[0], reason);
          table_load_handler(reason);
        }
        else{
          console.log("error in load_service for layer id: ", State.MapProperties.layer_ids[x], " ", reason);
        }
      });
      promise_array.push(promise);
    }
    Promise.all(promise_array).then(() => {

      const WGS84_spatial_reference = new ArcGIS.API.SpatialReference({wkid: 4326});

      ArcGIS.API.Projection.load().then(function(){
        for (let x = 0; x < State.MapProperties.queried_features.length; x++){
          let prior_spatial_reference
          if (State.MapProperties.queried_features[x]["data"].spatialReference.wkid != null){
            prior_spatial_reference = new ArcGIS.API.SpatialReference({
              wkid: State.MapProperties.queried_features[x]["data"].spatialReference.wkid
            });
          }
          else if (State.MapProperties.queried_features[x]["data"].spatialReference.wkt != null){
            prior_spatial_reference = new ArcGIS.API.SpatialReference({
              wkt: State.MapProperties.queried_features[x]["data"].spatialReference.wkt
            });
          }

          let transformation_object = ArcGIS.API.Projection.getTransformation(prior_spatial_reference, WGS84_spatial_reference);
          
          State.MapProperties.queried_features[x]["data"].features.forEach(function(element) {
            element.geometry = ArcGIS.API.Projection.project(element.geometry, WGS84_spatial_reference);
          });
        }
      }, 
      function(reject){
        console.log("failed to reproject layer: ", reject.message); 
      }).then(function(){
        // polygon layers, when their features are selected, use an outline width. 
        // the width is calculated here, and is based on the average size of their features 
        let promise = set_polygon_outline_widths();
        append_feature_counts();
        promise.then(function(){
          create_graphic_layers();
        });     
      
      }), 
      function(reject){
        console.log("failed to calculate polygon widths: ", reject.message); 
      };
    });
  },
	function(reject){
  	console.log("failed to load service: ", reject.message); 
  	table_load_handler(reject);
  });
}

function create_graphic_layers(){
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

function create_graphics_object(geometry, options){
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

function create_point_graphic(x, y, color, size, style, attributes){
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

function create_polygon_graphic(rings, fill_color, fill_style, outline_color, outline_style, width, cap, join, attributes){
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

function append_feature_counts(){
  for (let x = 0; x < State.MapProperties.queried_features.length; x++){
    let checkbox_label_id = "services_checkbox_label_" + State.MapProperties.layer_ids[x]; 
    let checkbox_label = document.getElementById(checkbox_label_id);

    for (let y = 0; y < State.MapProperties.queried_features.length; y++){
      if (State.MapProperties.queried_features[y]["layer_id"] == State.MapProperties.layer_ids[x]){
        let feature_count = State.MapProperties.queried_features[y]["data"].features.length; 
        checkbox_label.textContent += " (" + feature_count + ")"; 
      }
    }    
  }
}

function create_geometry_class_object(input_geometry){
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

function set_polygon_outline_widths(){
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

// this will spatially project an input featurelayers extent onto the map and zoom to the extent. it's called when you load a new service
function project_and_zoom(fullExtent){
	let url = State.URLProperties.base_url + "Utilities/Geometry/GeometryServer/project";
	// this is a query to the spatial projection utility provided by the REST API 
	let options = {
		responseType: "json", 
		query: {
			f: "json", 
			inSR: JSON.stringify(fullExtent.spatialReference), 
			outSR: 4326, 
			geometries: JSON.stringify({
				"geometryType": "esriGeometryPoint", 
				"geometries": [
					{"x": fullExtent.xmin, "y": fullExtent.ymin}, 
					{"x": fullExtent.xmax, "y": fullExtent.ymax}
				]
			})
		}// end query 
	}// end options 

	ArcGIS.API.ArcRequest(url, options)
	.then(response => {
		// construct a custom extent object with the response 
		let extent_object = {};
		let data = response.data;
		extent_object.xmin = data.geometries[0].x; 
		extent_object.ymin = data.geometries[0].y; 
		extent_object.xmax = data.geometries[1].x; 
		extent_object.ymax = data.geometries[1].y; 
		extent_object.spatialReference = 4326;
		// add that custom extent object to the map view
		State.MapProperties.map_view.extent = extent_object;
	});
}// end project_and_zoom()

function fill_attribute_table(input_page, reload_buttons, from_search_button){
    var attribute_table = document.getElementById("attribute_table");
    var table_error_div = document.getElementById("table_error_div");

    var result_offset = input_page * State.UIProperties.results_per_page - State.UIProperties.results_per_page;
    var padding = "4px";
    var cursor_style = "pointer";

    // remove all rows from the table
    var count = attribute_table.childNodes.length;
    let start = 0; 
    let original_title = attribute_table.childNodes[0]; 
    for (let start = 0; start < count; start++){
        attribute_table.removeChild(attribute_table.childNodes[0]);
    }

    let fields = State.MapProperties.current_layers_query["data"].fields;
    let features = State.MapProperties.current_layers_query["data"].features;

    // update the results count text
    if (result_offset + State.UIProperties.results_per_page > features.length + 1){
        results_count_text.innerHTML = "Showing " + (result_offset + 1) + "-" + features.length + " of " + features.length; 
    } else{
        results_count_text.innerHTML = "Showing " + (result_offset + 1) + "-" + (result_offset + State.UIProperties.results_per_page) + " of " + features.length; 
    }

    if (reload_buttons == true){
        State.UIProperties.field_widths = {}; 
        for (let x = 0; x < fields.length; x++){
            if (fields[x].type == "string" && features[0].attributes[fields[x].name] != null && State.UIProperties.field_widths[fields[x].name] != null){
                State.UIProperties.field_widths[fields[x].name] = fields[x].name.length
                let max; 
                if (features.length < 50){
                    max = features.length;
                } else {
                    max = 50
                }
                for (let y = 0; y < max; y++){
                    if (feautres[y].attributes[fields[x].name] != null && features[y].attributes[fields[x].name].length > State.UIProperties.field_widths[fields[x].name]){
                        State.UIProperties.field_widths[fields[x].name] = features[y].attributes[fields[x].name].length
                    }
                }
            } else {
                State.UIProperties.field_widths[fields[x].name] = 10; 
            }
        }
    }

    if (from_search_button != true){
        create_title_row(fields);     // create the top row of the table that contains the column titles 
    } else{
        attribute_table.appendChild(original_title);
    }

    for (let x = result_offset; x < result_offset + State.UIProperties.results_per_page && x < features.length; x++){    // for all the requested features, add a row to the table 
        create_normal_row(features[x].attributes, x, fields);                    
    }
  
    // reinitializes the buttons, but only if a new kind of table was created. fill attribute table is called in many circumstances. 
    if (reload_buttons == true){  // it's called if a page number is changed, a layer changes, a service changes, with filter by extent or mouse select, etc.
    
        State.UIProperties.old_clicked_page = 0;
        if (State.filterActive.get() == true){
            initialize_page_buttons(1, true);
        }
        else if (State.MapGraphics.enable_graphics == true){
            initialize_page_buttons(input_page, true);
        }
        else{
            initialize_page_buttons(1, true);
        }
    }

    attribute_table.style.display = "block"; 
    table_error_div.innerHTML = ""; 
    table_error_div.style.display = "none";      

    // various utility functions for constructing the table 
    function style_title_column(element, innerHTML){
        element.innerHTML = innerHTML;
        element.style.cursor = cursor_style;  
        element.style.padding = padding;
        element.style.overflow = "hidden";
    }
    function create_title_row(input_fields){
        State.UIProperties.all_title_fields = []; 
        var title_row = document.createElement("tr");  
        title_row.style.fontWeight = "bold";
        //add various title fields to the top row of the table
        var zoom_title_column = document.createElement("td");
        title_row.appendChild(zoom_title_column);

        for (let x = 0; x < input_fields.length; x++) {
            let title_column = document.createElement("td"); 
            style_title_column(title_column, input_fields[x].name);

            title_column.style.width = (State.UIProperties.field_widths[input_fields[x].name] * 5.5)+ "px";

            title_column["id"] = x;

            // listeners for reversing the sort of the table with reference to a given column when yuo click the title field
            title_column.addEventListener("click", function(){
                let index = null;
                for (let y = 0; y < State.UIProperties.all_title_fields.length; y++){
                    if (State.UIProperties.all_title_fields[y]["element"]["id"] == x){
                        if (State.UIProperties.all_title_fields[y]["increment"] == "even"){
                            table_reorder(input_fields[x], "ascending");
                            State.UIProperties.all_title_fields[y]["increment"] = "odd";
                        }
                        else if (State.UIProperties.all_title_fields[y]["increment"] == "odd"){
                            table_reorder(input_fields[x], "descending");
                            State.UIProperties.all_title_fields[y]["increment"] = "even";
                        }
                        fill_attribute_table(1, true, true);
                    }
                }
            });
            title_row.appendChild(title_column);
            State.UIProperties.all_title_fields.push({"element": title_column, "id": x, "increment": "even"});
        }
        attribute_table.appendChild(title_row);
    }

    function create_normal_row(feature_attributes, loop_iterator, fields){
        let new_row = document.createElement("tr");     
        let zoom_column = document.createElement("td");
        zoom_column.style.width = "30px";
        zoom_column.style.height = "30px";
        style_normal_column(zoom_column);
        
        let zoom_image_button = document.createElement("img");
        zoom_image_button.style.width = "20x";
        zoom_image_button.style.height = "20px"; 
        zoom_image_button.src = "images/zoom_button_unpressed.png";
        zoom_image_button.style.padding = "0px 0px 4px 4px";
        zoom_image_button.style.cursor = cursor_style;

        zoom_image_button.addEventListener("click", function(e){
            if (State.filterActive.get() == false){
                zoom_to_feature(e);
            }
            else{
                State.filterActive.set(false);
                zoom_to_feature(e);
            }
        });

        zoom_image_button.addEventListener("mouseover", function(){
            zoom_image_button.src = "images/zoom_button_pressed.png"; 
        });
        zoom_image_button.addEventListener("mouseout", function(){
            zoom_image_button.src = "images/zoom_button_unpressed.png"; 
        });

        zoom_column.appendChild(zoom_image_button); 
        new_row.appendChild(zoom_column); 

        // loop through each column in the current row and add a new cell, and put data inside the cell  
        for (let y = 0; y < fields.length; y++){
            let field = fields[y]; 
            let new_column = document.createElement("td"); 
            style_normal_column(new_column); 
            new_column.style.width = (State.UIProperties.field_widths[field.name] * 5.5)+ "px";
            // a few if statements check the type of the field and perform special actions 
            if (field.type === "esriFieldTypeOID" || field.type == "oid"){     // the oid field is eventually needed by the zoom button, so store that data on the button
                zoom_image_button.object_id = feature_attributes[field.name];
            }					
            if (field.type === "esriFieldTypeDate" || field.type == "date"){    // reformat dates from timestamp to readable form
                let date_obj = new Date(feature_attributes[field.name]);
                let formatted_date = String(date_obj).split(' ');
                formatted_date = formatted_date[0] + " " + formatted_date[1] + " " + formatted_date[2] + " " + formatted_date[3];
                new_column.textContent = formatted_date;
            }
            else{
                new_column.textContent = feature_attributes[field.name];
            }
            new_row.appendChild(new_column);
        } 
        attribute_table.appendChild(new_row); 
    }
    function style_normal_column(element){
        element.style.padding = padding;
        element.style.overflow = "hidden";
    }
} // end fill attribute table function 

function initialize_page_buttons(starting_page, from_refill_table){
    var page_numbers = document.getElementById("page_numbers"); 

	let old_page_count = page_numbers.childElementCount;
	for (let x = 0; x < old_page_count; x++){                   // remove all the old page buttons
		page_numbers.removeChild(page_numbers.childNodes[0]);
	}
    create_buttons(State.MapProperties.current_layers_query["data"].features.length);

    function create_buttons(feature_count){
        let total_pages = Math.ceil(feature_count / State.UIProperties.results_per_page);   // math for determining total page buttons that will be needed 

        for (let button_number = 1; button_number <= total_pages; button_number++){
            let new_button = document.createElement("button");
            new_button.name = button_number;
            new_button.innerHTML = button_number;
            new_button.id = "page_button_" + button_number;
            new_button.style.width = "30px";
            new_button.classList.add("page-number-button");
            //new_button.classList.add("w-button");

            new_button.style.color = "grey";
            
            new_button.style.display = "flex"; 
            new_button.style.flexWrap = "wrap"; 
            new_button.style.alignContent = "center";
            new_button.style.justifyContent = "center"; 

            // each page button has a listener to update the display of the page buttons as they're pressed
            // the listener also calls fill_attribute_table to adjust the table data depending on which button was pressed 
            new_button.addEventListener("click", function(){adjust_page_buttons(button_number, total_pages, false)});
            // each page button also needs listeners for creating the hover effect, because the webflow hover effect is broken 
            new_button.addEventListener("mouseover", function(){
                if (button_number != State.UIProperties.current_page){    // make sure the button isn't currently pressed 
                new_button.style.backgroundColor = Colors.getColor("webflowcolor", "darkorange");
                new_button.style.color = Colors.getColor("webflowcolor", "white"); 
                new_button.style.opacity = 0.65; 
                }
            });
            new_button.addEventListener("mouseout", function(){
                if (button_number != State.UIProperties.current_page){    // make sure the button isn't currently pressed 
                new_button.style.backgroundColor = Colors.getColor("webflowcolor", "white"); 
                new_button.style.opacity = 1
                new_button.style.color = "grey"; 
                }
            });

            page_numbers.appendChild(new_button);	        // append the newly styled page buttons to the list of buttons
		}

		adjust_page_buttons(starting_page, total_pages, from_refill_table);
    }// end create_buttons()
} // end initialize_page_buttons

function adjust_page_buttons(newly_clicked_page, total_pages, from_refill_table){
    var page_numbers = document.getElementById("page_numbers"); 

	State.UIProperties.old_clicked_page = State.UIProperties.current_page; 
	State.UIProperties.current_page = newly_clicked_page;				// old & State.UIProperties.current_page are global variables and useful throughout the code, they're set here 
	
	// find the boundaries of the paging range
	let center_point = 4; 
	let span = 7; 
	var lower_boundary, upper_boundary;
	if (newly_clicked_page <= center_point){
		lower_boundary = 1;
		if (total_pages > span){ 							// current page is <= 9 and total pages > 17; (left edge case)
			upper_boundary = span;
		}
		else{ 											// current page is <= 9 and total pages < 17 (left edge case w/ few total pages)
			upper_boundary = total_pages; 
		}
	}
	else if (newly_clicked_page > center_point){
		if (total_pages > (newly_clicked_page + center_point + 1)){ 	// current page is >= 9 and total pages > current page + 15 (middle case ) 
			upper_boundary = newly_clicked_page + center_point - 1;
			lower_boundary = newly_clicked_page - center_point + 1;
		}
		else{ 											// current page is >= 9 and total_pages <= current page + 9 (right edge case) 
			upper_boundary = total_pages;
			lower_boundary = total_pages - span + 1; 
		}
	}
	// now just show / hide the buttons as necessary 
	let page_count = page_numbers.childElementCount;

	for (let x = 0; x < page_count; x++){
		if ((x + 1) < lower_boundary || (x + 1) > upper_boundary){
			page_numbers.childNodes[x].style.display = "none"; 
		}
		else{
			page_numbers.childNodes[x].style.display = "inline-block";
			if ((x + 1) == newly_clicked_page){
				page_numbers.childNodes[x].style.backgroundColor = Colors.getColor("webflowcolor", "darkorange");
        page_numbers.childNodes[x].style.opacity = 1; 
        page_numbers.childNodes[x].style.color = Colors.getColor("webflowcolor", "white"); 
      }
		}
	}
	// change the previously selected button back to white 
	if (State.UIProperties.old_clicked_page != 0 && State.UIProperties.old_clicked_page != newly_clicked_page){
		page_numbers.childNodes[State.UIProperties.old_clicked_page - 1].style.backgroundColor = Colors.getColor("webflowcolor", "white"); 
    page_numbers.childNodes[State.UIProperties.old_clicked_page - 1].style.color = "grey"; 
	}
  
	if (from_refill_table == false){
		fill_attribute_table(newly_clicked_page, false); 
	}
} // end adjust_page_buttons 

function clear_graphics_layer(){
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
  fill_attribute_table(1, true);
}

// the function called when a URL is entered into the REST servuce URL box, changes all the services
function change_services_url(){
  var service_input = document.getElementById("service_input");
	State.URLProperties.base_url = service_input.value;
	if (State.URLProperties.base_url[-1] != "/"){
		State.URLProperties.base_url += "/";
	} 
	populate_services();
}

export function filter_by_extent(mode){
    var table_dataset_selector = document.getElementById("table_dataset_selector");

  if (mode == "on"){
    State.MapProperties.map_view.graphics = [];
    if (State.MapGraphics.enable_graphics == true){
      clear_graphics_layer(); 
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
          fill_attribute_table(1, true);
        });
      }
      else{
        State.MapProperties.current_layers_query = {"data": query_results, "layer_id": selected_id};
        fill_attribute_table(1, true);
      }
    });
  }
  else if (mode == "off"){
    State.MapProperties.current_layers_query = State.MapProperties.saved_complete_query; 
  } 
}

function change_results_count(count){
  let multiple = count / State.UIProperties.results_per_page;
  
  State.UIProperties.old_clicked_page--; 
  State.UIProperties.old_clicked_page = Math.floor(State.UIProperties.old_clicked_page / multiple); 
  State.UIProperties.old_clicked_page++; 
  State.UIProperties.current_page--; 
  State.UIProperties.current_page = Math.floor(State.UIProperties.current_page / multiple); 
  State.UIProperties.current_page++; 

  State.UIProperties.results_per_page = count;        // update the global results count to whatever the radio button is now
  if (State.filterActive.get() == false){
    initialize_page_buttons(State.UIProperties.current_page, false);
  }
	else{   // filter_by_extent refills the attribute table differently, it must be called instead of initialize_page_buttons if the filter is active 
    filter_by_extent("on");
  }
}

function initialize_listeners(){ 
    var table_dataset_selector = document.getElementById("table_dataset_selector");
  // prime the dataset selector in the table to fetch & populate the table upon selection of a new dataset  
	table_dataset_selector.addEventListener("change", function(){table_select_handler();});
  
  // with this listener, every time the map stops moving and the filter button is active, the filter function gets called. this ongoingly filters
	ArcGIS.API.Watch.whenTrue(State.MapProperties.map_view, "stationary", function() {
		if (State.filterActive.get() == true){
            filter_by_extent("on");
		}
	});

  // a variety of functions can be called when the map is clicked or dragged upon, here we choose which to call if any 
	State.MapProperties.map_view.on("click", function(e){
		if (State.itemSelectorActive.get() == true){
			if (e.button == 0){
				click_select_function(e);
			}
		}
		if (e.button == 2){
            State.MapProperties.map_view.graphics = [];
            if (State.MapGraphics.enable_graphics == true){
                clear_graphics_layer(); 
            }
            State.itemSelectorActive.set(false);
		}
	});
	State.MapProperties.map_view.on("drag", function(e){
		if (State.itemSelectorActive.get() == true){
			drag_select_function(e);
		}
	});

    // listener for handling submissions from various toolboxes
    document.getElementById("intersection_submit_button").addEventListener("click", function(){
		intersect_function();
	});
  
	document.getElementById("buffer_submit_button").addEventListener("click", function(){
		buffer_function();
	});
  
    document.getElementById("heatmap_submit_button").addEventListener("click", function(){
		heatmap_function();
	});
	document.getElementById("submit_search_button").addEventListener("click", function(){
		search_function();
	});
}

function intersect_function(){
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
        error_handler(reject.message, intersect_error_div, intersection_panel);
        error_flag = true;
      });
      return all_promised; 
    });
    return all_promised; 
  },
  function(reject){ 
    error_handler(reject.message, intersect_error_div, intersection_panel);
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
          let class_geometry_object = create_geometry_class_object(State.MapProperties.current_layers_query["data"].features[x].geometry);
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
          let class_geometry_object = create_geometry_class_object(WGS84_intersected_results[x]);
          let area = ArcGIS.API.GeometryEngine.geodesicArea(class_geometry_object, "square-miles");
          if (area > 100000){
            continue; 
          }
        }
        
        options["attributes"] = joined_attributes[x];
        let graphic_object = create_graphics_object(WGS84_intersected_results[x], options);
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

          fill_attribute_table(1, true);

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
              fill_attribute_table(1, true);
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
          table_load_handler(reason);
        });
      });
    }
    else{
      if (error_flag == false){
        error_handler("The geometries do not intersect.", intersect_error_div);
      }
    }
  },
  function(error){
    error_handler(error.message, intersect_error_div, intersection_panel);
  });
}

function error_handler(error_message, error_div, parent_div){
  console.log(error_message); 
  error_div.innerHTML = error_message; 
  error_div.style.overflowY = "scroll";
  console.log("parent div height: ", parent_div.style.height, "|"); 
  let int_slice = parent_div.style.height; 
  int_slice = Number(int_slice.slice(0, 3)); 
  int_slice += 50; 
  let px_size = int_slice + "px"; 
  if (parent_div != null){
    parent_div.style.height = px_size; 
  }
}

function buffer_function(){
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
                error_handler(reject.message, buffer_error_div, buffer_panel);
            }).then(function(){
                // now do the buffer analysis
                var geometry_type = query_results.geometryType; 

                for (let x = 0; x < query_results.features.length; x++){
                    let esri_object = create_geometry_class_object(query_results.features[x].geometry);

                    if (geometry_type == "polygon"){
                        let areas_array = []; 

                        let class_geometry_object = create_geometry_class_object(query_results.features[x].geometry);
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
                error_handler(reject.message, buffer_error_div, buffer_panel);
            });
            return all_promised; 
        }
    },
    function(reject){
        error_handler(reject.message, buffer_error_div, buffer_panel);
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
                let class_geometry_object = create_geometry_class_object(WSG84_buffer_results[x]["geometry"]);
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
                    let graphic_object = create_polygon_graphic(WSG84_buffer_results[x]["geometry"].rings, fill_color, options["fill_style"], outline_color, options["outline_style"], options["width"], options["cap"], options["join"], options["attributes"]);
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
                                fill_attribute_table(1, true);
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

function heatmap_function(){
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
            let buffer_object = create_graphics_object(buffer, {}); 
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
                let graphic_point = create_point_graphic(point.x, point.y, "#777777", 9, "circle", attributes);
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

function search_function(){
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
        
        fill_attribute_table(1, true);
    },
    function(reject){
        error_handler(reject.message, search_error_div, search_panel);
    });
}

function table_load_handler(reason){
    var attribute_table = document.getElementById("attribute_table");
    var table_error_div = document.getElementById("table_error_div");

	table_error_div.style.display = "block"; 
	attribute_table.style.display = "none"; 
	table_error_div.innerHTML = reason.message; 
	// remove all rows from the table
	var count = attribute_table.childNodes.length; 
	for (let x = 0; x < count; x++){
		attribute_table.removeChild(attribute_table.childNodes[0]);
	}
}

function table_reorder(field, mode){
    var field_name = field.name; 
    for (let x = 0; x < State.MapProperties.current_layers_query["data"].fields.length; x++){
        if (field_name == State.MapProperties.current_layers_query["data"].fields[x].name){
            var field_type = field.type; 
            if (mode == "ascending"){
                if (field_type == "small-integer" || field_type == "integer" || field_type == "single" || field_type == "double" || field_type == "long" || field_type == "oid" || field_type == "date"){
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return a.attributes[field_name] - b.attributes[field_name]; 
                    });
                }
                else if (field_type == "string"){
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return a.attributes[field_name].localeCompare(b.attributes[field_name]);  
                    }); 
                }
                else{
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return -1; 
                    }); 
                }
            }
            else if (mode == "descending"){
                if (field_type == "small-integer" || field_type == "integer" || field_type == "single" || field_type == "double" || field_type == "long" || field_type == "oid" || field_type == "date"){
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return b.attributes[field_name] - a.attributes[field_name]; 
                    });
                }
                else if (field_type == "string") {
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return b.attributes[field_name].localeCompare(a.attributes[field_name]); 
                    });
                }
                else{
                    State.MapProperties.current_layers_query["data"].features.sort(function(a, b){
                        return -1; 
                    }); 
                }
            }
            break;
        }
    }
}

function zoom_to_feature(e){ 
    State.MapProperties.map_view.graphics = []; 
	  let object_id = e.target.object_id;			// each zoom button was assigned the object_id to use in this spatial query 
    var graphic = null;
    var oid_field_name = null;
    let layer_id = null; 
    if (State.MapGraphics.enable_graphics == true){
        layer_id = State.MapProperties.current_layers_query["parent_layer_id"]; 
    }
    else{
        layer_id = State.MapProperties.current_layers_query["layer_id"];
    }

    for (let x = 0; x < State.MapProperties.current_layers_query["data"].fields.length; x++){
        if (State.MapProperties.current_layers_query["data"].fields[x].type == "oid"){
            oid_field_name = State.MapProperties.current_layers_query["data"].fields[x].name; 
            break; 
        }
    }
    // you need to handle finding the object_id for background layerse differently... don't you? look into that ...
    let target_geometry = null; 
    
    for (let x = 0; x < State.MapProperties.current_layers_query["data"].features.length; x++){
        if (object_id == State.MapProperties.current_layers_query["data"].features[x].attributes[oid_field_name]){
            target_geometry = State.MapProperties.current_layers_query["data"].features[x].geometry;
            break; 
        }
    }

    let geometry_type = State.MapProperties.current_layers_query["data"].geometryType; 
    let symbol = null;

    if (geometry_type == "point"){
        symbol = {
            type: "simple-marker", 
            color: Colors.getColor("maptools", "seagreen"),
            size: 9,
            style: "circle"
        }
        let point = {
            type: "point", 
            longitude: target_geometry.longitude, 
            latitude: target_geometry.latitude, 
            x: target_geometry.x, 
            y: target_geometry.y
        }
        graphic = new ArcGIS.API.Graphic({geometry: point, symbol: symbol}); 
    }
    else if (geometry_type == "polyline"){
        symbol = {
            join: "bevel",
            type: "simple-line", 
            cap: "round", 
            color: Colors.getColor("maptools", "seagreen"),  
            width: 3.7, 
            style: "solid"
        }
        let lines = {
            type: "polyline", 
            paths: target_geometry.paths
        }
        graphic = new ArcGIS.API.Graphic({geometry: lines, symbol: symbol}); 
    }
    else if (geometry_type == "polygon"){
        let outline_color = Colors.hex_to_hsla(Colors.getColor("maptools", "seagreen"), .95); 
        let fill_color = Colors.hex_to_hsla(Colors.getColor("maptools", "seagreen"), .55);
        
        symbol = {
            type: "simple-fill", 
            color: fill_color, 
            style: "forward-diagonal",
            outline: {
                width: 3.7,
                color: outline_color, 
                style: "dash-dot",
                cap: "round", 
                join: "bevel", 
            }
        }
        let polygon = {
            type: "polygon", 
            rings: target_geometry.rings
        }
        graphic = new ArcGIS.API.Graphic({geometry: polygon, symbol: symbol}); 
    }

    State.MapProperties.map_view.graphics.add(graphic);
    State.MapProperties.map_view.goTo(graphic);
}

function table_select_handler(){
    var table_dataset_selector = document.getElementById("table_dataset_selector");

	State.UIProperties.old_clicked_page = 0;
  State.UIProperties.current_page = 1; 
  let selected_id = table_dataset_selector.options[table_dataset_selector.selectedIndex].id;
  // State.MapProperties.current_layers_query
  if (State.MapGraphics.enable_graphics == false){
    for (let x = 0; x < State.MapProperties.queried_features.length; x++){
      if (State.MapProperties.queried_features[x]["layer_id"] == selected_id){
        State.MapProperties.current_layers_query = State.MapProperties.queried_features[x]; 
        break;
      }
    }
  }
  else if (State.MapGraphics.enable_graphics == true){
    for (let x = 0; x < State.MapProperties.queried_background_features.length; x++){
      if (State.MapProperties.queried_background_features[x]["parent_layer_id"] == selected_id){
        State.MapProperties.current_layers_query = State.MapProperties.queried_background_features[x]; 
        break;
      }
    }
  }
  if (State.filterActive.get() == true){
    filter_by_extent("on");         // this calls fill_attribute_table 
  }
  else{   // called regardless of if we're using graphics for the data source, the only check needed is State.filterActive.get() == true
    fill_attribute_table(1, true);
  }
}

function click_select_function(e){
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
      fill_attribute_table(page_number, true);
    });
      
  });
}

// a giant function that handles the drag select part of the feature selection tool 
function drag_select_function(e){
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
      fill_attribute_table(page_number, true);
    }); 
  } // end of mousedown 
}