const colors_for_new_layers =   ["#04470a", "#0c9d3a", "#0201d7", "#167a23", "#f8b46c", "#321b53", "#f29dd6", "#54b054", 
                                 "#b1281d", "#4098b8", "#ba976b", "#4bf3a3", "#0cee5d", "#86f51c", "#6ee298", "#f8844f", 
                                 "#87a20c", "#7b5dc3", "#9be2ce", "#fff53d", "#80a32a"];
var _new_layer_count = 0

export function getColor(type, name) {
    switch(type) {
        case "maptools": 
            switch(name){
                case "seagreen":
                    return "#43dcb2"
                case "maroon":
                    return "#952d64"
                case "transparentgreen":
                    return "hsla(139, 54%, 46%, 0.5)"
            }
        case "newlayer":
            _new_layer_count += 1
            console.log("layer count: ", _new_layer_count)
            if (_new_layer_count >= colors_for_new_layers.length) {
                _new_layer_count = 0
                console.log("reset")
            }
            return colors_for_new_layers[_new_layer_count]
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

export function hex_to_hsla(hex, opacity){

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    var red = parseInt(result[1], 16);
    var green = parseInt(result[2], 16);
    var blue = parseInt(result[3], 16);
    red /= 255; 
	green /= 255;
	blue /= 255;

    var max = Math.max(red, green, blue), min = Math.min(red, green, blue);
    var hue, saturation, lightness = (max + min) / 2;

    if (max == min){
        hue = 0; 
		saturation = 0;
    } else {
        var distance = max - min;
        saturation = lightness > 0.5 ? distance / (2 - max - min) : distance / (max + min);
        switch(max) {
            case red: hue = (green - blue) / distance + (green < blue ? 6 : 0); break;
            case green: hue = (blue - red) / distance + 2; break;
            case blue: hue = (red - green) / distance + 4; break;
        }
        hue /= 6;
    }

	hue = Math.round(hue * 360); 
    saturation = Math.round(saturation * 100); 
    lightness = Math.round(lightness * 100); 

	let buggy_string = "hsla(";// concatenating hsla( + hue + the rest in one line doesn't work, not sure why, maybe js engine expects function from hsla( 
	buggy_string += hue;
	buggy_string += ", " + saturation + "%, " + lightness + "%, " + opacity + ")"; 

    return buggy_string; 
}

export const heatmap_colorstops = [
    { color: "rgba(22, 192, 15, 0)", ratio: 0 },
    { color: "rgb(22, 192, 15)", ratio: 0.083 },
    { color: "rgb(49, 162, 24)", ratio: 0.166 },
    { color: "rgb(76, 132, 33)", ratio: 0.249 },
    { color: "rgb(103, 102, 42)", ratio: 0.332 },
    { color: "rgb(130, 72, 52)", ratio: 0.415 },
    { color: "rgb(157, 42, 61)", ratio: 0.498 },
    { color: "rgb(184, 12, 70)", ratio: 0.581 },
    { color: "rgb(182, 51, 98)", ratio: 0.664 },
    { color: "rgb(180, 90, 127)", ratio: 0.747 },
    { color: "rgb(178, 128, 155)", ratio: 0.83 },
    { color: "rgb(176, 166, 184)", ratio: 0.913 },
    { color: "rgb(174, 205, 212)", ratio: 1 }
]
export function highlightButton(buttonIdentifier, highlight) {
    let button = document.getElementById(buttonIdentifier.button);
    let button_icon = document.getElementById(buttonIdentifier.icon);
    let button_div = document.getElementById(buttonIdentifier.div);
    let button_wrapper = document.getElementById(buttonIdentifier.wrapper);

    if (highlight == true) {
        button.style.backgroundColor = getColor("webflowcolor", "darkorange");
        button_icon.style.opacity = 1;
        button_div.style.opacity = 1; 
        button_wrapper.style.opacity = 1;
    } else {
        button.style.backgroundColor = getColor("webflowcolor", "lightorange");
        button_wrapper.style.opacity = 0.65;
    }
}