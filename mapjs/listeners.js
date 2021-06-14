import * as Colors from './colors.js';
import * as Utils from './utils.js';
import interact from 'https://cdn.interactjs.io/v1.9.19/interactjs/index.js';       // interact allows boxes to be dragged & resized

const overlapping_elements = [document.getElementById("search_panel"), 
                              document.getElementById("intersection_panel"), 
                              document.getElementById("buffer_panel"), 
                              document.getElementById("heatmap_panel")];

var _mouseover_draggable = false;
const mouseover_draggable = {
    set: (boolean_value) => { _mouseover_draggable = boolean_value },
    get: () => { return _mouseover_draggable }
}
Object.freeze(mouseover_draggable);

function increase_z_index(clicked_element){
    clicked_element.style.zIndex = "4000";
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].style.zIndex = (Number(overlapping_elements[x].style.zIndex) - 1).toString(); 
    }
}

export function setup_tools() { 
    var table_dataset_selector = document.getElementById("table_dataset_selector");
  // prime the dataset selector in the table to fetch & populate the table upon selection of a new dataset  
	table_dataset_selector.addEventListener("change", function(){ Table.table_select_handler(); });
  
  // with this listener, every time the map stops moving and the filter button is active, the filter function gets called. this ongoingly filters
	ArcGIS.API.Watch.whenTrue(State.MapProperties.map_view, "stationary", function() {
		if (State.filterActive.get() == true){
            MapTools.filter_by_extent("on");
		}
	});

  // a variety of functions can be called when the map is clicked or dragged upon, here we choose which to call if any 
	State.MapProperties.map_view.on("click", function(e){
		if (State.itemSelectorActive.get() == true){
			if (e.button == 0){
				MapTools.click_select_function(e);
			}
		}
		if (e.button == 2){
            State.MapProperties.map_view.graphics = [];
            if (State.MapGraphics.enable_graphics == true){
                Graphics.clear_graphics_layer(); 
            }
            State.itemSelectorActive.set(false);
		}
	});
	State.MapProperties.map_view.on("drag", function(e){
		if (State.itemSelectorActive.get() == true){
			MapTools.drag_select_function(e);
		}
	});

    // listener for handling submissions from various toolboxes
    document.getElementById("intersection_submit_button").addEventListener("click", function(){
		MapTools.intersect_function();
	});
  
	document.getElementById("buffer_submit_button").addEventListener("click", function(){
		MapTools.buffer_function();
	});
  
    document.getElementById("heatmap_submit_button").addEventListener("click", function(){
		MapTools.heatmap_function();
	});
	document.getElementById("submit_search_button").addEventListener("click", function(){
		MapTools.search_function();
	});
}

export function setup() {
    setup_zindex_adjustment_listeners();
    setup_drag_bars();
    setup_button_hover_listeners();
    setup_button_click_listeners();
    setup_close_buttons();
    setup_interact();
}

function setup_zindex_adjustment_listeners() {
    for (let x = 0; x < overlapping_elements.length; x++){
        overlapping_elements[x].addEventListener("click", function(){
            increase_z_index(overlapping_elements[x]);
        });
    }
}

function setup_drag_bars() {
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

function setup_button_hover_listeners() {
    for (let x = 0; x < Utils.buttonIdentifiersArray.length; x++) {
        let buttonIdentifier = Utils.buttonIdentifiersArray[x];
        let button = document.getElementById(buttonIdentifier.button);
        button.addEventListener("mouseover", function() {
            if (buttonIdentifier.buttonState.get() == false) {
                Colors.highlightButton(buttonIdentifier, true);
            }
        });
        button.addEventListener("mouseout", function() {
            if (buttonIdentifier.buttonState.get() == false) { 
                Colors.highlightButton(buttonIdentifier, false);
            }
        });
    }
}

function setup_button_click_listeners() {
    for (let x = 0; x < Utils.buttonIdentifiersArray.length; x++) {
        let button = document.getElementById(Utils.buttonIdentifiersArray[x].button);
        button.addEventListener("click", function() {
            Utils.buttonIdentifiersArray[x].buttonState.set(!Utils.buttonIdentifiersArray[x].buttonState.get());
        });
    }
    document.getElementById("search_button").addEventListener("click", function(){
        let search_panel = document.getElementById("search_panel")
        search_panel.style.display = "block"; 
        increase_z_index(search_panel);
    });
}

function setup_close_buttons() {
    document.getElementById("search_close_button").addEventListener("click", function(){
        document.getElementById("search_panel").style.display = "none"; 
    });
    for (let x = 0; x < Utils.closeButtons.length; x++) {
        console.log("closebutton: ", Utils.closeButtons[x]);
        Utils.closeButtons[x].button.addEventListener("click", function() {
            Utils.closeButtons[x].buttonSetter(false);
        });
    }
}

function setup_interact() {
    function dragListener(event) {				// called whenever the box is dragged, sets the transform & updates the elements x/y attributes 
        var target = event.target;
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;				// store the dragged position in the data-x/data-y attributes
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // without this test statement the mouse behaves sticky & a variety of bugs arise
        if (mouseover_draggable.get() == true){
            target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';    // this is the actual drag operation
            target.setAttribute('data-x', x);												// updates the position attributes 
            target.setAttribute('data-y', y);
        }
    }

    function domElement_resizeHandler(event) {
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

    interact('.layers-pane-div')
    .resizable({ 
        edges: { left: false, right: true, bottom: true, top: false },			// resize from right and bottom 
        listeners: {
            move (event) {
                domElement_resizeHandler(event)
            }
        },
        modifiers: [
            interact.modifiers.restrictEdges({outer: 'parent'}),
            interact.modifiers.restrictSize({min: { width: 120, height: 184 }})		// minimum size
        ],
        inertia: true
    });
    interact('.popups')
    .draggable({							// makes the search box draggable as well as resizable 
        inertia: false,								// disable inertial throwing - inertia can throw off the titlebars mouseover listener
        modifiers: [								// keep the element within the area of its parent
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ],
        autoScroll: true, 
        listeners: {move: dragListener}			// call this function on every dragmove event
    });
    interact('#scalebar_widget')
    .draggable({ 
            inertia: false, 
            modifiers: [ 
                interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ],
        autoScroll: true, 
        listeners: {move: dragListener} 
    });
}