

var colors_for_map_tools = 		["#43dcb2", "hsl(328, 54%, 38%)", "hsla(139, 54%, 46%, 0.5)", "#35c784", "#fdcd30", "hsl(194, 48%, 43%)", 
  "hsla(194, 48%, 43%, 0.45)"];
var colors_for_polygons = 		["#6ee298", "#f8844f", "#87a20c", "#7b5dc3", "#9be2ce", "#fff53d", "#80a32a"];
var colors_for_lines = 			  ["#7f84cb", "#bb40e4", "#33b472", "#1a5dfb", "#90a3dd", "#101aaf", "#3df691"];
var colors_for_points = 		  ["#8fb659", "#8fd054", "#dabad2", "#0475d1", "#fe2c7c", "#fce258", "#4a94f1"];
var colors_for_new_layers =   ["#0c9d3a", "#0201d7", "#167a23", "#f8b46c", "#321b53", "#f29dd6", "#54b054", "#b1281d", "#4098b8", 
"#ba976b", "#4bf3a3", "#0cee5d", "#86f51c", "#04470a"];

// create an function that will take a color name and return the specific color 
// and how about the color type, too...? 

export function getColor(type, name) {
    switch(type) {
        case "maptools": 
            break;
        case "polygon": 
            break;
        case "line": 
            break;
        case "point": 
            break;
        case "newlayer":
            break;
        case "webflowcolor":
            switch(name){
                case "lightorange":
                    return "#c36d4a"
                case "darkorange":
                    return "#b86240"
                case "white":
                    return "#ffffff"
            }
    }
    return "#ffffff"
}