import * as Utils from './utils.js';
import * as Colors from './colors.js';
import * as Listeners from './listeners.js';

var _legend_active = false;
var _layers_panel_active = false;
var _print_widget_active = false; 
var _popups_active = false;  
var _table_active = false; 
var _intersection_panel_active = false; 
var _buffer_panel_active = false; 
var _heatmap_panel_active = false;
var _filter_active = false;
var _item_selector_active = false;

export const legendActive = {
  set: (boolean_value) => {
    document.getElementById("legend_widget").style.display = boolean_value ? "block" : "none";
    Colors.highlightButton(Utils.buttonIdentifiers.LEGENDBUTTON, boolean_value);
    _legend_active = boolean_value
  },
  get: () => { return _legend_active }
}
export const layersPanelActive = {
  set: (boolean_value) => { 
    document.getElementById("layers_panel").style.display = boolean_value ? "block" : "none";
    Colors.highlightButton(Utils.buttonIdentifiers.LAYERSBUTTON, boolean_value);
    _layers_panel_active = boolean_value 
  },
  get: () => { return _layers_panel_active }
}
export const printWidgetActive = {
  set: (boolean_value) => { 
    document.getElementById("print_widget").style.display = boolean_value ? "block" : "none";
    Colors.highlightButton(Utils.buttonIdentifiers.PRINTBUTTON, boolean_value);
    _print_widget_active = boolean_value
  } ,
  get: () => { return _print_widget_active }
}
export const popupsActive = {
  set: (boolean_value) => {
    Colors.highlightButton(Utils.buttonIdentifiers.POPUPSBUTTON, boolean_value);
    _popups_active = boolean_value
  },
  get: () => { return _popups_active }
}
export const tableActive = {
  set: (boolean_value) => {
    document.getElementById("table_and_tools_wrapper").style.display = boolean_value ? "block" : "none";
    Colors.highlightButton(Utils.buttonIdentifiers.TABLEBUTTON, boolean_value);
    _table_active = boolean_value
  },
  get: () => { return _table_active }
}
export const intersectionPanelActive = {
  set: (boolean_value) => {
    let intersection_panel = document.getElementById("intersection_panel")
    intersection_panel.style.display = boolean_value ? "block" : "none";
    if (boolean_value == true) { 
      Listeners.increase_z_index(intersection_panel); 
    }
    Colors.highlightButton(Utils.buttonIdentifiers.INTERSECTBUTTON, boolean_value);
    _intersection_panel_active = boolean_value
  },
  get: () => { return _intersection_panel_active }
}
export const bufferPanelActive = {
  set: (boolean_value) => {
    let buffer_panel = document.getElementById("buffer_panel")
    buffer_panel.style.display = boolean_value ? "block" : "none";
    if (boolean_value == true) { 
      Listeners.increase_z_index(buffer_panel); 
    }
    Colors.highlightButton(Utils.buttonIdentifiers.BUFFERBUTTON, boolean_value);
    _buffer_panel_active = boolean_value
  },
  get: () => { return _buffer_panel_active }
}
export const heatmapPanelActive = {
  set: (boolean_value) => { 
    let heatmap_panel = document.getElementById("heatmap_panel")
    heatmap_panel.style.display = boolean_value ? "block" : "none";
    if (boolean_value == true) { 
      Listeners.increase_z_index(heatmap_panel); 
    }
    Colors.highlightButton(Utils.buttonIdentifiers.HEATMAPBUTTON, boolean_value);
    _heatmap_panel_active = boolean_value
  },
  get: () => { return _heatmap_panel_active }
}
export const filterActive = {
  set: (boolean_value) => {
    Colors.highlightButton(Utils.buttonIdentifiers.FILTERBUTTON, boolean_value);
    _filter_active = boolean_value
  },
  get: () => { return _filter_active }
}
export const itemSelectorActive = {
  set: (boolean_value) => {
    Colors.highlightButton(Utils.buttonIdentifiers.ITEMSELECTORBUTTON, boolean_value);
    _item_selector_active = boolean_value
  },
  get: () => { return _item_selector_active }
}

Object.freeze(legendActive);
Object.freeze(layersPanelActive);
Object.freeze(printWidgetActive);
Object.freeze(popupsActive);
Object.freeze(tableActive);
Object.freeze(intersectionPanelActive);
Object.freeze(bufferPanelActive);
Object.freeze(heatmapPanelActive);
Object.freeze(filterActive);
Object.freeze(itemSelectorActive);


// maybe rename the setters to buttons.layersPanel.active(true); or false? 
// restructure it and rename it to something... 


export var URLProperties = {
  default_service: "OilSandsProjectBoundaries",
  selected_service_name: null,
  base_url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/"
}

export var UIProperties = {
  field_widths: [], 
  grid_divs_list: [], 
  next_grid_line: 1,
  all_title_fields: [],
  results_per_page: 12,
  current_page: 0,
  old_clicked_page: 0
}

export var MapProperties = {
  map_object: null,
  map_view: null,
  feature_layers_array: [],
  background_layers: [],
  layer_ids: [],
  queried_features_array: [],
  queried_background_features: [],
  current_layers_query: null,
  saved_complete_query: null
}

export var MapGraphics = {
  graphic: undefined,
  previous_graphic: null,
  global_use_graphics: false,
  polygon_outline_widths: []
}


