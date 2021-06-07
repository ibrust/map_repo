
export function domElement_resizeHandler(event) {
    var target = event.target
    var x = (parseFloat(target.getAttribute('data-x')) || 0)
    var y = (parseFloat(target.getAttribute('data-y')) || 0)
    target.style.width = event.rect.width + 'px'; 					// update the element size
    target.style.height = event.rect.height + 'px'; 	
    x += event.deltaRect.left; 										// translate when resizing from top or left edges
    y += event.deltaRect.top; 	

    target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px,' + y + 'px)'
    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)
}

export function increase_z_index(clicked_element){
    clicked_element.style.zIndex = "4000";
    const overlapping_elements = [document.getElementById("custom_search_pane"), 
                                  document.getElementById("custom_intersection_pane"), 
                                  document.getElementById("custom_buffer_pane"), 
                                  document.getElementById("custom_heatmap_panel")];
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].style.zIndex = (Number(overlapping_elements[x].style.zIndex) - 1).toString(); 
    }
}

export function add_zindex_adjustment_listeners() {
    const overlapping_elements = [document.getElementById("custom_search_pane"), 
                                  document.getElementById("custom_intersection_pane"), 
                                  document.getElementById("custom_buffer_pane"), 
                                  document.getElementById("custom_heatmap_panel")];
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].addEventListener("click", function(){
            increase_z_index(overlapping_elements[x]);
        });
    }
}

var _mouseover_titlebar = false;
export const mouseover_titlebar = {
  set: (boolean_value) => { _mouseover_titlebar = boolean_value} ,
  get: () => { return _mouseover_titlebar }
}
Object.freeze(mouseover_titlebar);

export function setup_drag_listeners() {
    const title_bars = [document.getElementById("heatmap_title_bar"), 
                        document.getElementById("intersect_title_bar"), 
                        document.getElementById("search_title_bar"), 
                        document.getElementById("buffer_title_bar")];
    for (let x = 0; x < title_bars.length; x++) {
        title_bars[x].addEventListener("mouseover", function(e){
            mouseover_titlebar.set(true)
        });
        title_bars[x].addEventListener("mouseout", function(e){
            mouseover_titlebar.set(false)
        });
    }
}