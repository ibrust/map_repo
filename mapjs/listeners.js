
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
    const overlapping_elements = [document.getElementById("search_panel"), 
                                  document.getElementById("intersection_panel"), 
                                  document.getElementById("buffer_panel"), 
                                  document.getElementById("heatmap_panel")];
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].style.zIndex = (Number(overlapping_elements[x].style.zIndex) - 1).toString(); 
    }
}

export function add_zindex_adjustment_listeners() {
    const overlapping_elements = [document.getElementById("search_panel"), 
                                  document.getElementById("intersection_panel"), 
                                  document.getElementById("buffer_panel"), 
                                  document.getElementById("heatmap_panel")];
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].addEventListener("click", function(){
            increase_z_index(overlapping_elements[x]);
        });
    }
}

var _mouseover_draggable = false;
export const mouseover_draggable = {
  set: (boolean_value) => { _mouseover_draggable = boolean_value} ,
  get: () => { return _mouseover_draggable }
}
Object.freeze(mouseover_draggable);

export function setup_drag_listeners() {
    const draggable_elements = [document.getElementById("heatmap_title_bar"), 
                                document.getElementById("intersection_title_bar"), 
                                document.getElementById("search_title_bar"), 
                                document.getElementById("buffer_title_bar"),
                                document.getElementById("scalebar_widget")];
    for (let x = 0; x < draggable_elements.length; x++) {
        draggable_elements[x].addEventListener("mouseover", function(e){
            mouseover_draggable.set(true)
        });
        draggable_elements[x].addEventListener("mouseout", function(e){
            mouseover_draggable.set(false)
        });
    }
}