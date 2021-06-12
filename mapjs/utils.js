import * as State from './state.js';
export const buttonIdentifiers = Object.freeze({
    LAYERSBUTTON: { button: "layers_button", icon: "layers_button_icon", div: "layers_button_div", wrapper: "layers_button_wrapper", buttonState: State.layersPanelActive },
    TABLEBUTTON: { button: "table_button", icon: "table_button_icon", div: "table_button_div", wrapper: "table_button_wrapper", buttonState: State.tableActive },
    PRINTBUTTON: { button: "print_button", icon: "print_button_icon", div: "print_button_div", wrapper: "print_button_wrapper", buttonState: State.printWidgetActive },
    POPUPSBUTTON: { button: "popups_button", icon: "popups_button_icon", div: "popups_button_div", wrapper: "popups_button_wrapper", buttonState: State.popupsActive },
    LEGENDBUTTON: { button: "legend_button", icon: "legend_button_icon", div: "legend_button_div", wrapper: "legend_button_wrapper", buttonState: State.legendActive },
    FILTERBUTTON: { button: "filter_button", icon: "filter_button_image", div: "filter_button_text", wrapper: "filter_button_wrapper", buttonState: State.filterActive },
    ITEMSELECTORBUTTON: { button: "item_selector_button", icon: "item_selector_button_image", div: "item_selector_button_text", wrapper: "item_selector_button_wrapper", buttonState: State.itemSelectorActive },
    INTERSECTBUTTON: { button: "intersect_button", icon: "intersect_button_image", div: "intersect_button_text", wrapper: "intersect_button_wrapper", buttonState: State.intersectionPanelActive },
    BUFFERBUTTON: { button: "buffer_button", icon: "buffer_button_image", div: "buffer_button_text", wrapper: "buffer_button_wrapper", buttonState: State.bufferPanelActive },
    HEATMAPBUTTON: { button: "heatmap_button", icon: "heatmap_button_image", div: "heatmap_button_text", wrapper: "heatmap_button_wrapper", buttonState: State.heatmapPanelActive }
});

export const buttonIdentifiersArray = [buttonIdentifiers.LAYERSBUTTON, buttonIdentifiers.TABLEBUTTON, 
                                       buttonIdentifiers.PRINTBUTTON, buttonIdentifiers.POPUPSBUTTON, 
                                       buttonIdentifiers.LEGENDBUTTON, buttonIdentifiers.FILTERBUTTON, 
                                       buttonIdentifiers.ITEMSELECTORBUTTON, buttonIdentifiers.INTERSECTBUTTON, 
                                       buttonIdentifiers.BUFFERBUTTON, buttonIdentifiers.HEATMAPBUTTON]