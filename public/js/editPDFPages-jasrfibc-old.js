// ────────────────────────────────────────────────
// Global variables & state
// ────────────────────────────────────────────────

let canvas;
const container = document.getElementById("container");
let activeTool = "select";

const toolRegistry = {};
let shapesArray = [];

// Pan / Zoom state
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastPos = { x: 0, y: 0 };

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Current shape type
let currentShapeType = "rect";

// ────────────────────────────────────────────────
// Tool registration helpers
// ────────────────────────────────────────────────

function registerTool(name, tool) {
    toolRegistry[name] = tool;
}

function setActiveTool(canvas, currentTool, newTool) {
    const current = toolRegistry[currentTool];
    if (current && current.deactivate) current.deactivate(canvas);

    activeTool = newTool;

    const next = toolRegistry[newTool];
    if (next && next.activate) next.activate(canvas);

    // Close shapes dropdown when switching away from shapes tool
    if (currentTool === "shapes" && newTool !== "shapes") {
        const dropdown = document.getElementById("shapesDropdown");
        if (dropdown) dropdown.style.display = "none";
    }

    updateToolbarUI();
    return newTool;
}

// ────────────────────────────────────────────────
// History Manager
// ────────────────────────────────────────────────

const historyManager = {
    undoStack: [],
    redoStack: [],
    isRestoring: false,

    get canUndo() { return this.undoStack.length > 1; },
    get canRedo() { return this.redoStack.length > 0; },

    saveState(canvas) {
        if (this.isRestoring) return;
        this.undoStack.push(JSON.stringify(canvas.toJSON(['selectable', 'evented'])));
        this.redoStack = [];
    },

    undo(canvas, callback) {
        if (!this.canUndo) return;
        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = this.undoStack[this.undoStack.length - 1];
        this._restore(canvas, previous, callback);
    },

    redo(canvas, callback) {
        if (!this.canRedo) return;
        const next = this.redoStack.pop();
        this.undoStack.push(next);
        this._restore(canvas, next, callback);
    },

    _restore(canvas, state, callback) {
        this.isRestoring = true;
        canvas.loadFromJSON(JSON.parse(state), () => {
            canvas.renderAll();
            this.isRestoring = false;
            if (callback) callback();
        });
    }
};

// ────────────────────────────────────────────────
// Selection Manager
// ────────────────────────────────────────────────

const selectionManager = {
    selectedElements: [],

    attach(canvas, onChange) {
        const update = () => {
            this.selectedElements = canvas.getActiveObjects() || [];
            onChange(this.selectedElements);
            updateSettingsPanel(this.selectedElements);
        };

        canvas.on("selection:created", update);
        canvas.on("selection:updated", update);
        canvas.on("selection:cleared", () => {
            this.selectedElements = [];
            onChange([]);
            updateSettingsPanel([]);
        });
    },

    deleteSelected(canvas) {
        const objects = canvas.getActiveObjects();
        if (!objects || objects.length === 0) return;

        objects.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        this.selectedElements = [];
    }
};

// ────────────────────────────────────────────────
// Tools
// ────────────────────────────────────────────────

const moveTool = {
    name: "move",

    activate(canvas) {
        canvas.selection = false;
        canvas.defaultCursor = "grab";
        canvas.hoverCursor = "grab";

        canvas.getObjects().forEach(o => {
            o.selectable = false;
            o.evented = false;
        });
        canvas.discardActiveObject().requestRenderAll();
    },

    deactivate(canvas) {
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";

        canvas.getObjects().forEach(o => {
            o.selectable = true;
            o.evented = true;
        });
        canvas.requestRenderAll();
    }
};

const selectTool = {
    name: "select",

    activate(canvas) {
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";
    },

    deactivate(canvas) { }
};

const textTool = {
    name: "text",

    activate(canvas) {
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";

        const onDown = (opt) => {
            if (activeTool !== "text") return;
            const pointer = canvas.getPointer(opt.e);
            const text = new fabric.IText("Type here", {
                left: pointer.x,
                top: pointer.y,
                fontSize: 24,
                fontFamily: "sans-serif",
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            text.enterEditing();
            text.selectAll();
            canvas.fire("text:created");
        };

        canvas.on("mouse:down", onDown);
        canvas.__textMouseDown = onDown;
    },

    deactivate(canvas) {
        if (canvas.__textMouseDown) {
            canvas.off("mouse:down", canvas.__textMouseDown);
            delete canvas.__textMouseDown;
        }
        canvas.defaultCursor = "default";
        canvas.selection = true;
    }
};

const drawTool = {
    name: "draw",

    activate(canvas) {
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
        canvas.isDrawingMode = true;

        if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = "#000000";
        canvas.freeDrawingBrush.width = 4;
    },

    deactivate(canvas) {
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "default";
        canvas.selection = true;
    }
};

const highlightTool = {
    name: "highlight",

    activate(canvas) {
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
        canvas.isDrawingMode = true;

        if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = "rgba(255, 0, 0, 0.3)"; // Light red, semi-transparent
        canvas.freeDrawingBrush.width = 20; // Thicker for highlighter feel
    },

    deactivate(canvas) {
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "default";
        canvas.selection = true;
    }
};

const shapesTool = {
    name: "shapes",

    activate(canvas) {
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
        document.getElementById("shapesDropdown").style.display = "block";
    },

    deactivate(canvas) {
        canvas.defaultCursor = "default";
        canvas.selection = true;
        document.getElementById("shapesDropdown").style.display = "none";
    }
};

const imageTool = {
    name: "image",

    activate(canvas) {
        // Open file picker immediately
        const imageInput = document.getElementById("imageUpload");
        if (imageInput) imageInput.click();

        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
    },

    deactivate(canvas) {
        canvas.defaultCursor = "default";
        canvas.selection = true;
    }
};

// Register tools
registerTool("move", moveTool);
registerTool("select", selectTool);
registerTool("text", textTool);
registerTool("draw", drawTool);
registerTool("highlight", highlightTool);
registerTool("shapes", shapesTool);
registerTool("image", imageTool);

// ────────────────────────────────────────────────
// Shapes creation logic
// ────────────────────────────────────────────────

const onShapesDown = (opt) => {
    if (activeTool !== "shapes") return;
    const pointer = canvas.getPointer(opt.e);
    let shape;

    switch (currentShapeType) {
        case "rect":
            shape = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 140,
                height: 90,
                fill: "rgba(239,68,68,0.35)",
                stroke: "#ef4444",
                strokeWidth: 2,
            });
            break;
        case "circle":
            shape = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 70,
                fill: "rgba(59,130,246,0.35)",
                stroke: "#3b82f6",
                strokeWidth: 2,
            });
            break;
        case "triangle":
            shape = new fabric.Triangle({
                left: pointer.x,
                top: pointer.y,
                width: 120,
                height: 100,
                fill: "rgba(34,197,94,0.35)",
                stroke: "#22c55e",
                strokeWidth: 2,
            });
            break;
        case "line":
            shape = new fabric.Line([pointer.x, pointer.y, pointer.x + 160, pointer.y + 100], {
                stroke: "#4b5563",
                strokeWidth: 3,
            });
            break;
        default:
            return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
    canvas.fire("shape:created");
};

// ────────────────────────────────────────────────
// Image upload handler
// ────────────────────────────────────────────────

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        fabric.Image.fromURL(event.target.result, (img) => {
            // Auto-scale if too large
            const maxW = canvas.width * 0.8;
            const maxH = canvas.height * 0.8;
            if (img.width > maxW || img.height > maxH) {
                const scale = Math.min(maxW / img.width, maxH / img.height);
                img.scale(scale);
            }

            // Center image
            img.set({
                left: (canvas.width - img.width * img.scaleX) / 2,
                top: (canvas.height - img.height * img.scaleY) / 2,
                selectable: true,
                evented: true
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            canvas.fire("image:added");

            // Reset input
            e.target.value = "";
        });
    };
    reader.readAsDataURL(file);
}

// ────────────────────────────────────────────────
// Pan & Zoom logic
// ────────────────────────────────────────────────

function applyTransform() {
    const wrapper = document.getElementById("canvas-wrapper");
    if (wrapper) {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
}

container.addEventListener("wheel", (e) => {
    if (activeTool !== "move") return;
    e.preventDefault();
    const factor = 0.990 ** e.deltaY;
    zoom = Math.min(Math.max(MIN_ZOOM, zoom * factor), MAX_ZOOM);
    applyTransform();
}, { passive: false });

container.addEventListener("pointerdown", (e) => {
    if (activeTool !== "move") return;
    if (e.button !== 0) return;

    isPanning = true;
    lastPos.x = e.clientX;
    lastPos.y = e.clientY;
    container.classList.add("panning");
    container.setPointerCapture(e.pointerId);
});

container.addEventListener("pointermove", (e) => {
    if (!isPanning) return;
    panX += e.clientX - lastPos.x;
    panY += e.clientY - lastPos.y;
    lastPos.x = e.clientX;
    lastPos.y = e.clientY;
    applyTransform();
});

function endPan() {
    if (!isPanning) return;
    isPanning = false;
    container.classList.remove("panning");
}

container.addEventListener("pointerup", endPan);
container.addEventListener("pointercancel", endPan);
container.addEventListener("pointerleave", endPan);

// ────────────────────────────────────────────────
// Settings panel
// ────────────────────────────────────────────────

let selectedObject = null;

function updateSettingsPanel(selected) {
    const panel = document.getElementById("settingsPanel");
    const content = document.getElementById("properties-content");

    if (selected.length !== 1) {
        panel.classList.remove("visible");
        selectedObject = null;
        content.innerHTML = '';
        return;
    }

    selectedObject = selected[0];
    panel.classList.add("visible");

    let html = '';

    // Common properties for all shapes
    const common = `
    <div class="space-y-5 p-5 bg-white rounded-xl border border-purple-200 shadow-sm">
    <!-- Fill Color -->
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-gray-700">Fill Color</label>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border border-gray-300 shadow-sm overflow-hidden flex items-center justify-center bg-white">
          <input 
            type="color" 
            id="prop-fill" 
            value="${selectedObject.fill || '#ffffff'}"
            class="w-[140%] h-[140%] border-none cursor-pointer appearance-none"
            style="padding: 0; margin: 0;"
          >
        </div>
        <span class="text-gray-500 font-mono">${selectedObject.fill || '#ffffff'}</span>
      </div>
    </div>

    <!-- Stroke Color – same pattern -->
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-gray-700">Stroke Color</label>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border border-gray-300 shadow-sm overflow-hidden flex items-center justify-center bg-white">
          <input 
            type="color" 
            id="prop-stroke" 
            value="${selectedObject.stroke || '#000000'}"
            class="w-[140%] h-[140%] border-none cursor-pointer appearance-none"
            style="padding: 0; margin: 0;"
          >
        </div>
        <span class="text-gray-500 font-mono">${selectedObject.stroke || '#000000'}</span>
      </div>
    </div>

    <!-- Stroke Width -->
    <div class="space-y-1.5">
      <div class="flex justify-between items-center">
        <label class="text-sm font-medium text-gray-700">Stroke Width</label>
        <span class="text-sm font-medium text-gray-500" id="strokeWidthVal">${selectedObject.strokeWidth || 1}px</span>
      </div>
      <input 
        type="range" 
        id="prop-strokeWidth" 
        min="0" 
        max="20" 
        step="1" 
        value="${selectedObject.strokeWidth || 1}"
        class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      >
    </div>

    <!-- Opacity -->
    <div class="space-y-1.5">
      <div class="flex justify-between items-center">
        <label class="text-sm font-medium text-gray-700">Opacity</label>
        <span class="text-sm font-medium text-gray-500" id="opacityVal">${Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
      </div>
      <input 
        type="range" 
        id="prop-opacity" 
        min="0" 
        max="1" 
        step="0.01" 
        value="${selectedObject.opacity ?? 1}"
        class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      >
    </div>
  </div>
`;

    html += common;

    // Type-specific properties
    if (['rect', 'circle', 'triangle'].includes(selectedObject.type)) {
        html += `
    <div class="mt-6 space-y-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div class="space-y-1.5">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-gray-700">Corner Radius</label>
          <span class="text-sm font-medium text-gray-500" id="rxVal">${selectedObject.rx || 0}px</span>
        </div>
        <input 
          type="range" 
          id="prop-rx" 
          min="0" 
          max="50" 
          step="1" 
          value="${selectedObject.rx || 0}"
          class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        >
      </div>
    </div>
  `;
    }

    else if (selectedObject.type === 'i-text') {
        html += `
    <div class="mt-6 space-y-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <!-- Font Size -->
      <div class="space-y-1.5">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-gray-700">Font Size</label>
          <span class="text-sm font-medium text-gray-500" id="fontSizeVal">${selectedObject.fontSize || 24}px</span>
        </div>
        <input 
          type="range" 
          id="prop-fontSize" 
          min="8" 
          max="120" 
          step="1" 
          value="${selectedObject.fontSize || 24}"
          class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        >
      </div>

      <!-- Font Family -->
      <div class="space-y-1.5">
        <label class="block text-sm font-medium text-gray-700">Font Family</label>
        <select 
          id="prop-fontFamily" 
          class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm transition-colors"
        >
          <option value="sans-serif" ${selectedObject.fontFamily === 'sans-serif' ? 'selected' : ''}>Sans Serif</option>
          <option value="serif" ${selectedObject.fontFamily === 'serif' ? 'selected' : ''}>Serif</option>
          <option value="monospace" ${selectedObject.fontFamily === 'monospace' ? 'selected' : ''}>Monospace</option>
          <option value="Arial" ${selectedObject.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
          <option value="Times New Roman" ${selectedObject.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
        </select>
      </div>
    </div>
  `;
    }

    content.innerHTML = html;

    // Attach listeners for live updates
    attachPropertyListeners();
}

function attachPropertyListeners() {
    if (!selectedObject) return;

    const updateProp = (prop, value, isNumber = false) => {
        selectedObject.set(prop, isNumber ? Number(value) : value);
        canvas.requestRenderAll();
        shapesArray = canvas.getObjects().slice(); // Update shapesArray
        historyManager.saveState(canvas); // Save to history
        updateHistoryButtons();
    };

    const fillInput = document.getElementById("prop-fill");
    if (fillInput) fillInput.addEventListener("input", e => updateProp("fill", e.target.value));

    const strokeInput = document.getElementById("prop-stroke");
    if (strokeInput) strokeInput.addEventListener("input", e => updateProp("stroke", e.target.value));

    const strokeWidthInput = document.getElementById("prop-strokeWidth");
    if (strokeWidthInput) {
        strokeWidthInput.addEventListener("input", e => {
            const v = e.target.value;
            updateProp("strokeWidth", v, true);
            document.getElementById("strokeWidthVal").textContent = `${v}px`;
        });
    }

    const opacityInput = document.getElementById("prop-opacity");
    if (opacityInput) {
        opacityInput.addEventListener("input", e => {
            const v = e.target.value;
            updateProp("opacity", v, true);
            document.getElementById("opacityVal").textContent = `${Math.round(v * 100)}%`;
        });
    }

    const rxInput = document.getElementById("prop-rx");
    if (rxInput) {
        rxInput.addEventListener("input", e => {
            const v = e.target.value;
            selectedObject.set({ rx: Number(v), ry: Number(v) });
            canvas.requestRenderAll();
            shapesArray = canvas.getObjects().slice();
            historyManager.saveState(canvas);
            updateHistoryButtons();
            document.getElementById("rxVal").textContent = `${v}px`;
        });
    }

    const fontSizeInput = document.getElementById("prop-fontSize");
    if (fontSizeInput) {
        fontSizeInput.addEventListener("input", e => {
            const v = e.target.value;
            updateProp("fontSize", v, true);
            document.getElementById("fontSizeVal").textContent = `${v}px`;
        });
    }

    const fontFamilySelect = document.getElementById("prop-fontFamily");
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener("change", e => updateProp("fontFamily", e.target.value));
    }
}

// ────────────────────────────────────────────────
// Core init
// ────────────────────────────────────────────────

function init() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const canvasW = Math.floor(cw / 2);
    const canvasH = Math.floor(ch / 2);

    canvas = new fabric.Canvas("fabric-canvas", {
        width: canvasW,
        height: canvasH,
        backgroundColor: "#ffffff",
    });

    setActiveTool(canvas, null, "select");
    historyManager.saveState(canvas);

    selectionManager.attach(canvas, (elements) => {
        document.querySelectorAll(".deleteBtn").forEach(btn => {
            btn.disabled = elements.length === 0;
        });
    });

    canvas.on("object:added", () => {
        shapesArray = canvas.getObjects().slice();
        historyManager.saveState(canvas);
        updateHistoryButtons();
    });

    canvas.on("object:removed", () => {
        shapesArray = canvas.getObjects().slice();
        historyManager.saveState(canvas);
        updateHistoryButtons();
    });

    canvas.on("object:modified", () => {
        shapesArray = canvas.getObjects().slice();
        historyManager.saveState(canvas);
        updateHistoryButtons();
    });

    // Auto switch after creation
    canvas.on("text:created", () => setActiveTool(canvas, "text", "select"));
    canvas.on("shape:created", () => setActiveTool(canvas, "shapes", "select"));
    canvas.on("image:added", () => setActiveTool(canvas, "image", "select"));

    // Attach handlers
    canvas.on("mouse:down", onShapesDown);

    const imageInput = document.getElementById("imageUpload");
    if (imageInput) {
        imageInput.addEventListener("change", handleImageUpload);
    }

    // Shapes dropdown selection
    document.querySelectorAll("#shapesDropdown button").forEach(btn => {
        btn.addEventListener("click", () => {
            currentShapeType = btn.dataset.shape;

            const originalBg = btn.style.backgroundColor;
            btn.style.backgroundColor = "#dbeafe";

            setTimeout(() => {
                btn.style.backgroundColor = originalBg || "";
            }, 150);

            document.getElementById("shapesDropdown").style.display = "none";
        });
    });

    // Responsive resize
    const handleResize = () => {
        canvas.setWidth(Math.floor(container.clientWidth / 2));
        canvas.setHeight(Math.floor(container.clientHeight / 2));
        canvas.renderAll();
    };

    new ResizeObserver(handleResize).observe(container);

    shapesArray = canvas.getObjects().slice();
}

// ────────────────────────────────────────────────
// Toolbar & actions
// ────────────────────────────────────────────────

function switchTool(tool) {
    setActiveTool(canvas, activeTool, tool);
}

function updateToolbarUI() {
    document.querySelectorAll("[data-tool]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tool === activeTool);
    });
}

function updateHistoryButtons() {
    document.querySelectorAll(".undoBtn").forEach(btn => {
        btn.disabled = !historyManager.canUndo;
    });

    document.querySelectorAll(".redoBtn").forEach(btn => {
        btn.disabled = !historyManager.canRedo;
    });
}

function undo() {
    historyManager.undo(canvas, () => {
        shapesArray = canvas.getObjects().slice();
        updateHistoryButtons();
    });
}

function redo() {
    historyManager.redo(canvas, () => {
        shapesArray = canvas.getObjects().slice();
        updateHistoryButtons();
    });
}

function deleteSelected() {
    selectionManager.deleteSelected(canvas);
}

// Start
window.addEventListener("DOMContentLoaded", init);