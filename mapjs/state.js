
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
  set: (boolean_value) => { _legend_active = boolean_value} ,
  get: () => { return _legend_active }
}
export const layersPanelActive = {
  set: (boolean_value) => { _layers_panel_active = boolean_value} ,
  get: () => { return _layers_panel_active }
}
export const printWidgetActive = {
  set: (boolean_value) => { _print_widget_active = boolean_value} ,
  get: () => { return _print_widget_active }
}
export const popupsActive = {
  set: (boolean_value) => { _popups_active = boolean_value} ,
  get: () => { return _popups_active }
}
export const tableActive = {
  set: (boolean_value) => { _table_active = boolean_value} ,
  get: () => { return _table_active }
}
export const intersectionPanelActive = {
  set: (boolean_value) => { _intersection_panel_active = boolean_value} ,
  get: () => { return _intersection_panel_active }
}
export const bufferPanelActive = {
  set: (boolean_value) => { _buffer_panel_active = boolean_value} ,
  get: () => { return _buffer_panel_active }
}
export const heatmapPanelActive = {
  set: (boolean_value) => { _heatmap_panel_active = boolean_value} ,
  get: () => { return _heatmap_panel_active }
}
export const filterActive = {
  set: (boolean_value) => { _filter_active = boolean_value} ,
  get: () => { return _filter_active }
}
export const itemSelectorActive = {
  set: (boolean_value) => { _item_selector_active = boolean_value} ,
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

