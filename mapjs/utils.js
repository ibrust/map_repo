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
export const closeButtons = [
    { buttonSetter: buttonIdentifiers.TABLEBUTTON.buttonState.set, button: document.getElementById("table_close_button") },
    { buttonSetter: buttonIdentifiers.INTERSECTBUTTON.buttonState.set, button: document.getElementById("intersection_close_button") },
    { buttonSetter: buttonIdentifiers.BUFFERBUTTON.buttonState.set, button: document.getElementById("buffer_close_button") },
    { buttonSetter: buttonIdentifiers.LAYERSBUTTON.buttonState.set, button: document.getElementById("close_layers_panel") },
    { buttonSetter: buttonIdentifiers.HEATMAPBUTTON.buttonState.set, button: document.getElementById("heatmap_close_button") }
]

export const extended_tilelods = [        // establishes the zoom levels for the basemap & resolutions for each level
    {"level": 3, "resolution": 19567.879241000017, "scale": 73957190.94894437},
    {"level": 4, "resolution": 9783.939620500008, "scale": 36978595.47447219},
    {"level": 5, "resolution": 4891.969810250004, "scale": 18489297.737236094},
    {"level": 6, "resolution": 2445.984905125002, "scale": 9244648.868618047},
    {"level": 7, "resolution": 1222.992452562501, "scale": 4622324.434309023},
    {"level": 8, "resolution": 611.4962262812505, "scale": 2311162.2171545117}, 
    {"level": 9, "resolution": 305.74811314055756, "scale": 1155581.108577}, 
    {"level": 10, "resolution": 152.87405657041106, "scale": 577790.554289}, 
    {"level": 11, "resolution": 76.43702828507324, "scale": 288895.277144}, 
    {"level": 12, "resolution": 38.21851414253662, "scale": 144447.638572}, 
    {"level": 13, "resolution": 19.10925707126831, "scale": 72223.819286},
    {"level": 14, "resolution": 9.554628535634155, "scale": 36111.909643}, 
    {"level": 15, "resolution": 4.77731426794937, "scale": 18055.954822}, 
    {"level": 16, "resolution": 2.388657133974685, "scale": 9027.977411}
];

export const selector_elements_list = [document.getElementById("table_dataset_selector"), 
                                       document.getElementById("intersection_layer_selector_1"), 
                                       document.getElementById("intersection_layer_selector_2"), 
                                       document.getElementById("buffer_layer_selector"), 
                                       document.getElementById("search_layer_selector")];




/*
    const distance_options = ["miles", "kilometers", "meters", "feet", "nautical-miles", "yards"]; 
    for (var x = 0; x < distance_options.length; x++){
        let new_option = document.createElement("option");
        new_option.textContent = distance_options[x];
        if (new_option.textContent == "miles"){
            new_option.selected = true; 
        }
        buffer_distance_selector.appendChild(new_option);
    }

    intersection_panel.style.height = "450px"; 
    buffer_panel.style.height = "345px";
    heatmap_panel.style.height = "330px";
    search_panel.style.height = "265px";
*/