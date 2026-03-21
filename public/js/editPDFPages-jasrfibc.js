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

// Touch gesture state
let lastTouchDistance = null;
let lastTouchCenter = null;

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
                fontSize: 50,
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
        canvas.freeDrawingBrush.width = 10;
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
        canvas.freeDrawingBrush.color = "#ff7373";
        canvas.freeDrawingBrush.width = 40;
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
                fill: "#ffb5b5",
                stroke: "#ef4444",
                strokeWidth: 2,
            });
            break;
        case "circle":
            shape = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 70,
                fill: "#b7d3ff",
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
                fill: "#bdffd5",
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
            const maxW = canvas.width * 0.8;
            const maxH = canvas.height * 0.8;
            if (img.width > maxW || img.height > maxH) {
                const scale = Math.min(maxW / img.width, maxH / img.height);
                img.scale(scale);
            }

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

            e.target.value = "";
        });
    };
    reader.readAsDataURL(file);
}

// ────────────────────────────────────────────────
// Pan & Zoom logic (mouse + touch)
// ────────────────────────────────────────────────

function applyTransform() {
    const wrapper = document.getElementById("canvas-wrapper");
    if (wrapper) {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        wrapper.style.transformOrigin = "0 0";
    }
}

// Mouse wheel zoom (desktop)
container.addEventListener("wheel", (e) => {
    if (activeTool !== "move") return;
    e.preventDefault();

    const factor = 0.990 ** e.deltaY;
    const oldZoom = zoom;
    zoom = Math.min(Math.max(MIN_ZOOM, zoom * factor), MAX_ZOOM);

    // Zoom toward mouse position
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (zoom / oldZoom);
    panY = mouseY - (mouseY - panY) * (zoom / oldZoom);

    applyTransform();
}, { passive: false });

// ─────────────── Mouse panning ───────────────
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

// ─────────────── Touch gestures (pinch + 2-finger pan) ───────────────
container.addEventListener("touchstart", (e) => {
    if (activeTool !== "move") return;

    if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        lastTouchDistance = Math.hypot(
            t2.clientX - t1.clientX,
            t2.clientY - t1.clientY
        );

        lastTouchCenter = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    }
}, { passive: false });

container.addEventListener("touchmove", (e) => {
    if (activeTool !== "move") return;

    if (e.touches.length === 2) {
        e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDistance = Math.hypot(
            t2.clientX - t1.clientX,
            t2.clientY - t1.clientY
        );

        const currentCenter = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };

        // Zoom
        if (lastTouchDistance > 0) {
            const scaleFactor = currentDistance / lastTouchDistance;
            const oldZoom = zoom;
            zoom *= scaleFactor;
            zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

            // Zoom toward center of pinch
            panX = currentCenter.x - (currentCenter.x - panX) * (zoom / oldZoom);
            panY = currentCenter.y - (currentCenter.y - panY) * (zoom / oldZoom);
        }

        // Pan
        panX += currentCenter.x - lastTouchCenter.x;
        panY += currentCenter.y - lastTouchCenter.y;

        lastTouchDistance = currentDistance;
        lastTouchCenter = currentCenter;

        applyTransform();
    }
}, { passive: false });

container.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
        lastTouchDistance = null;
        lastTouchCenter = null;
    }
}, { passive: false });

// ────────────────────────────────────────────────
// Settings panel (unchanged)
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

    const common = `
    <div class="space-y-5 p-5 bg-white rounded-xl border border-purple-200 shadow-sm">
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-gray-700">Fill Color</label>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border border-gray-300 shadow-sm overflow-hidden flex items-center justify-center bg-white">
          <input type="color" id="prop-fill" value="${selectedObject.fill || '#ffffff'}" class="w-[140%] h-[140%] border-none cursor-pointer appearance-none" style="padding:0;margin:0;">
        </div>
        <span class="text-gray-500 font-mono">${selectedObject.fill || '#ffffff'}</span>
      </div>
    </div>

    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-gray-700">Stroke Color</label>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border border-gray-300 shadow-sm overflow-hidden flex items-center justify-center bg-white">
          <input type="color" id="prop-stroke" value="${selectedObject.stroke || '#000000'}" class="w-[140%] h-[140%] border-none cursor-pointer appearance-none" style="padding:0;margin:0;">
        </div>
        <span class="text-gray-500 font-mono">${selectedObject.stroke || '#000000'}</span>
      </div>
    </div>

    <div class="space-y-1.5">
      <div class="flex justify-between items-center">
        <label class="text-sm font-medium text-gray-700">Stroke Width</label>
        <span class="text-sm font-medium text-gray-500" id="strokeWidthVal">${selectedObject.strokeWidth || 1}px</span>
      </div>
      <input type="range" id="prop-strokeWidth" min="0" max="20" step="1" value="${selectedObject.strokeWidth || 1}" class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary">
    </div>

    <div class="space-y-1.5">
      <div class="flex justify-between items-center">
        <label class="text-sm font-medium text-gray-700">Opacity</label>
        <span class="text-sm font-medium text-gray-500" id="opacityVal">${Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
      </div>
      <input type="range" id="prop-opacity" min="0" max="1" step="0.01" value="${selectedObject.opacity ?? 1}" class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary">
    </div>
  </div>
`;

    html += common;

    if (['rect', 'circle', 'triangle'].includes(selectedObject.type)) {
        html += `
    <div class="mt-6 space-y-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div class="space-y-1.5">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-gray-700">Corner Radius</label>
          <span class="text-sm font-medium text-gray-500" id="rxVal">${selectedObject.rx || 0}px</span>
        </div>
        <input type="range" id="prop-rx" min="0" max="50" step="1" value="${selectedObject.rx || 0}" class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary">
      </div>
    </div>`;
    }

    else if (selectedObject.type === 'i-text') {
        html += `
    <div class="mt-6 space-y-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div class="space-y-1.5">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-gray-700">Font Size</label>
          <span class="text-sm font-medium text-gray-500" id="fontSizeVal">${selectedObject.fontSize || 24}px</span>
        </div>
        <input type="range" id="prop-fontSize" min="8" max="120" step="1" value="${selectedObject.fontSize || 24}" class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary">
      </div>

      <div class="space-y-1.5">
        <label class="block text-sm font-medium text-gray-700">Font Family</label>
        <select id="prop-fontFamily" class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm transition-colors">
          <option value="sans-serif" ${selectedObject.fontFamily === 'sans-serif' ? 'selected' : ''}>Sans Serif</option>
          <option value="serif" ${selectedObject.fontFamily === 'serif' ? 'selected' : ''}>Serif</option>
          <option value="monospace" ${selectedObject.fontFamily === 'monospace' ? 'selected' : ''}>Monospace</option>
          <option value="Arial" ${selectedObject.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
          <option value="Times New Roman" ${selectedObject.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
        </select>
      </div>
    </div>`;
    }

    content.innerHTML = html;
    attachPropertyListeners();
}

function attachPropertyListeners() {
    if (!selectedObject) return;

    const updateProp = (prop, value, isNumber = false) => {
        selectedObject.set(prop, isNumber ? Number(value) : value);
        canvas.requestRenderAll();
        shapesArray = canvas.getObjects().slice();
        historyManager.saveState(canvas);
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
    const canvasW = cw;
    const canvasH = ch;

    console.log(`canvas width is ${canvasW} and Height is ${canvasH}`)

    canvas = new fabric.Canvas("fabric-canvas", {
        width: canvasW,
        height: canvasH,
        backgroundColor: "#ffffff",
    });



    // ───── Style Fabric Controls ─────
    fabric.Object.prototype.cornerColor = "#6366f1";      // control color
    fabric.Object.prototype.cornerStrokeColor = "#ffffff";
    fabric.Object.prototype.cornerSize = 15;
    fabric.Object.prototype.cornerStyle = "circle";       // circle or rect
    fabric.Object.prototype.transparentCorners = false;

    fabric.Object.prototype.borderColor = "#6366f1";      // selection border
    fabric.Object.prototype.borderScaleFactor = 2;

    fabric.Object.prototype.padding = 6;

    

    console.log("this is init  function......")

    setActiveTool(canvas, null, "move");
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

    canvas.on("text:created", () => setActiveTool(canvas, "text", "select"));
    canvas.on("shape:created", () => setActiveTool(canvas, "shapes", "select"));
    canvas.on("image:added", () => setActiveTool(canvas, "image", "select"));

    canvas.on("mouse:down", onShapesDown);

    const imageInput = document.getElementById("imageUpload");
    if (imageInput) {
        imageInput.addEventListener("change", handleImageUpload);
    }

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

    new ResizeObserver(() => {
        if (typeof renderPage === "function" && pdfDoc) {
            renderPage(currentPage); // re-fit the PDF
        }
    }).observe(container);

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