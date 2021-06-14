import * as Listeners from './listeners.js';
import * as Utils from './utils.js';
import * as State from './state.js';
import * as ArcGIS from './ArcGIS.js';
import * as Graphics from './graphics.js';
import * as Table from './table.js';

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
    radio_button.addEventListener("click", function(){ Table.change_results_count(results); }); 
  }

	// set up an event listener for the REST URL box
  var service_input = document.getElementById("service_input");
	service_input.addEventListener("change", change_services_url);
}

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
}

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
        Graphics.clear_graphics_layer();
    } else{
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
    Utils.project_and_zoom(State.MapProperties.feature_layers[0].fullExtent);

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
          Table.fill_attribute_table(1, true);

          if (first_time == true){      // only setup tools when the map is first being initialized
            Listeners.setup_tools(); 
          }
        }
      },
      function reject(reason){
        if (x == 0){
          console.log("error in load_service for layer id: ", State.MapProperties.layer_ids[0], reason);
          Table.table_load_handler(reason);
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
        let promise = Graphics.set_polygon_outline_widths();
        Utils.append_feature_counts();
        promise.then(function(){
          Graphics.create_graphic_layers();
        });     
      
      }), 
      function(reject){
        console.log("failed to calculate polygon widths: ", reject.message); 
      };
    });
  },
	function(reject){
  	console.log("failed to load service: ", reject.message); 
  	Table.table_load_handler(reject);
  });
}

function change_services_url() {
    var service_input = document.getElementById("service_input");
    State.URLProperties.base_url = service_input.value;
    if (State.URLProperties.base_url[-1] != "/"){
        State.URLProperties.base_url += "/";
    } 
    populate_services();
}