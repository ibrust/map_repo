import * as Colors from './colors.js';
import * as State from './state.js';
import * as ArcGIS from './ArcGIS.js';
import * as MapTools from './maptools.js'; 


export function fill_attribute_table(input_page, reload_buttons, from_search_button){
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
                            Table.table_reorder(input_fields[x], "ascending");
                            State.UIProperties.all_title_fields[y]["increment"] = "odd";
                        }
                        else if (State.UIProperties.all_title_fields[y]["increment"] == "odd"){
                            Table.table_reorder(input_fields[x], "descending");
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
                Table.zoom_to_feature(e);
            }
            else{
                State.filterActive.set(false);
                Table.zoom_to_feature(e);
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
}

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
}

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
}

export function change_results_count(count){
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
	else {   // filter_by_extent refills the attribute table differently, it must be called instead of initialize_page_buttons if the filter is active 
        MapTools.filter_by_extent("on");
    }
}

export function table_load_handler(reason){
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

export function table_reorder(field, mode){
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

export function zoom_to_feature(e){ 
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

export function table_select_handler(){
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
        MapTools.filter_by_extent("on");         // this calls fill_attribute_table 
    }
    else{   // called regardless of if we're using graphics for the data source, the only check needed is State.filterActive.get() == true
        fill_attribute_table(1, true);
    }
}