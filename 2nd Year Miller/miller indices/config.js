// config.js

const CONFIG = {
    // Scene Configuration
    SCENE: {
        BACKGROUND_COLOR: 0x121212,
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        CAMERA_POSITION: { x: 2.5, y: 2, z: 3 },
        CONTROLS: {
            enableDamping: true,
            dampingFactor: 0.05,
            rotateSpeed: 0.5,
            maxDistance: 10,
            minDistance: 1,
            enablePan: true,
            enableZoom: true
        },
        LIGHTING: {
            ambient: {
                color: 0xffffff,
                intensity: 0.8
            },
            point: {
                color: 0xffffff,
                intensity: 1,
                position: { x: 2, y: 3, z: 4 }
            }
        }
    },

    // Axis Configuration
    AXIS: {
        LENGTH: 2, // This will be the reference length for b-axis in general, or a-axis in hexagonal/tetragonal
        LABEL_SIZE: 0.15,
        GRID_DIVISIONS: 10,
        GRID_SIZE: 2, // Base grid size, might need dynamic adjustment based on axial ratios
        CUBIC: {
            COLORS: { B_AXIS: 0xff0000, C_AXIS: 0x00ff00, A_AXIS: 0x0000ff }, // a=Z, b=X, c=Y
            LABELS: {
                OFFSET: 0.2, TEXT: { a: 'a', b: 'b', c: 'c' },
                SPRITE: {
                    fontFace: 'Arial', fontSize: 48, borderThickness: 0,
                    borderColor: { r:0, g:0, b:0, a:0 },
                    backgroundColor: { r:0, g:0, b:0, a:0.0 },
                    canvasWidth: 128, canvasHeight: 64
                }
            },
            DEFAULT_AXIAL_RATIOS: { a_b: 1.0, c_b: 1.0 } // a/b, c/b
        },
        HEXAGONAL: {
            COLORS: { A1_AXIS: 0xff0000, A2_AXIS: 0x00ff00, A3_AXIS: 0x0000ff, C_AXIS: 0xff00ff }, // c=Y
            LABELS: {
                OFFSET: 0.2, TEXT: { a1: 'a₁', a2: 'a₂', a3: 'a₃', c: 'c' },
                SPRITE: {
                    fontFace: 'Arial', fontSize: 48, borderThickness: 0,
                    borderColor: { r:0, g:0, b:0, a:0 },
                    backgroundColor: { r:0, g:0, b:0, a:0.0 },
                    canvasWidth: 128, canvasHeight: 64
                }
            },
            DEFAULT_AXIAL_RATIOS: { c_a: 1.1001 } // c/a (e.g., Quartz)
        }
        // Future systems like Orthorhombic, Tetragonal will have their defaults here
    },

    DEFAULT_SHAPE: {
        CUBIC: {
            enabled: true,
            wireframe: true,
            color: 0xaaaaaa,
            opacity: 0.15,
            // sizeFactor is now relative to scaled axes
        },
        HEXAGONAL: {
            enabled: true,
            wireframe: true,
            color: 0xaaaaaa,
            opacity: 0.15,
            // ---- START: Added/Adjusted factors for visual proportion ----
            radiusFactor: 0.7, // Makes the prism's radius 70% of the scaled_a_length
            heightFactor: 2.0   // Makes the prism's height 200% of the scaled_c_length
            // ---- END: Added/Adjusted factors for visual proportion ----
        }
    },

    PLANE: {
        COLOR: 0xaaaaaa,
        OPACITY: 0.9,
        DEFAULT_SIZE: 3, // This might need to be dynamic based on unit cell size
        MAX_SIZE: 10,
        STYLES: {
            wireframe: false,
            transparent: true,
            side: 'double', // THREE.DoubleSide, but as string for config
            shininess: 10
        },
        HOVER: {
            highlightColor: 0xFF7F50,
            transitionSpeed: 0.3
        }
    },

    HELPERS: {
        INTERSECTION_POINT: {
            SIZE: 0.05,
            COLOR: 0xffff00,
            SEGMENTS: 16
        },
        ORIGIN_POINT: {
            SIZE: 0.08,
            COLOR: 0xffffff,
            SEGMENTS: 16
        },
        GRID: {
            COLOR: 0x444444,
        }
    },

    FEEDBACK: {
        SUCCESS: { color: '#4CAF50', duration: 3000 },
        ERROR:   { color: '#ff4444', duration: 5000 },
        WARNING: { color: '#FFC107', duration: 4000 },
        INFO:    { color: '#2196f3', duration: 2000 }
    },

    TEXT: {
         LABELS: { // This was likely intended for 3D text geometry, sprites have their own config
            size: 0.1, height: 0.02, curveSegments: 4, bevelEnabled: false
         }
    },

    VALIDATION: {
        MILLER_INDICES: { 
            MIN_VALUE: -99,
            MAX_VALUE: 99,
            ALLOWED_KEYS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'Delete', '.'] // Added '.' just in case, though indices are integers
        },
        AXIAL_RATIOS: {
            MIN_VALUE: 0.01, 
            MAX_VALUE: 100.0,
            STEP: 0.01, 
            ALLOWED_KEYS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'Delete']
        }
    },

    ANIMATION: {
        DURATION: 1000,
        EASING: 'easeInOutCubic', // Needs an easing library or custom functions if used for JS animations
        FPS: 60,
        TRANSITION: { enter: 300, exit: 200 } // For UI element transitions perhaps
    },

    PERFORMANCE: {
        antialiasing: true,
        shadowsEnabled: false, // Typically false for this kind of viz to save performance
        maxFPS: 60,
        pixelRatio: window.devicePixelRatio, // Use device pixel ratio
        maxPixelRatio: 2, // Cap pixel ratio to avoid performance issues on very high DPI displays
        autoRotate: false, // Added this based on MillerVisualizer.js
        throttleMS: 16 // Approx 60 FPS, for event throttling if needed
    },

    DEBUG: {
        enabled: true,
        showHelpers: false, // General toggle for extra THREE.js helpers
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showStats: false, // For performance stats (e.g., stats.js)
        showAxesHelper: false, // THREE.AxesHelper for world axes
        showGridHelper: true, // Master toggle for grids defined in AxisSystem
        showXYGridForHexagonal: true, // Specific grid for hexagonal
        showPerpendicularGridForHexagonal: false // Another optional grid for hex
    }
};

const CONFIG_UTILS = {
    validateMillerIndexInput: function(value) { 
        const numValue = Number(value);
        if (isNaN(numValue)) {
             if (String(value).trim() !== '') { throw new Error('Input must be a valid number'); }
             return false; // Or treat empty as valid if not required immediately
        }
        if (!Number.isInteger(numValue)) { throw new Error('Input must be an integer'); }
        if (numValue < CONFIG.VALIDATION.MILLER_INDICES.MIN_VALUE || numValue > CONFIG.VALIDATION.MILLER_INDICES.MAX_VALUE) {
            throw new Error(`Value must be between ${CONFIG.VALIDATION.MILLER_INDICES.MIN_VALUE} and ${CONFIG.VALIDATION.MILLER_INDICES.MAX_VALUE}`);
        }
        return true;
    },
    validateAxialRatioInput: function(value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            if (String(value).trim() !== '') { throw new Error('Ratio must be a valid number'); }
            return false; // Or treat empty as valid if not required immediately
        }
        if (numValue < CONFIG.VALIDATION.AXIAL_RATIOS.MIN_VALUE || numValue > CONFIG.VALIDATION.AXIAL_RATIOS.MAX_VALUE) {
            throw new Error(`Ratio must be between ${CONFIG.VALIDATION.AXIAL_RATIOS.MIN_VALUE} and ${CONFIG.VALIDATION.AXIAL_RATIOS.MAX_VALUE}`);
        }
        if (numValue <= 0) { 
            throw new Error('Ratio must be a positive value.');
        }
        return true;
    },
    getAxisConfig: function(system) {
        return CONFIG.AXIS[(system || 'cubic').toUpperCase()] || CONFIG.AXIS.CUBIC;
    },
    getAxisColor: function(axisName, system) {
         const systemConfig = this.getAxisConfig(system);
         if (systemConfig && systemConfig.COLORS) {
             const key = `${axisName.toUpperCase()}_AXIS`; // e.g., A_AXIS, B_AXIS
             return systemConfig.COLORS[key];
         }
         return 0xffffff; // Default color if not found
     },
    getShapeConfig: function(system) {
        return CONFIG.DEFAULT_SHAPE[(system || 'cubic').toUpperCase()] || CONFIG.DEFAULT_SHAPE.CUBIC;
    },
    validateKeyForMillerIndex: function(event) { 
        if (event.ctrlKey || event.metaKey || event.altKey) { return true; } // Allow modifiers
        return CONFIG.VALIDATION.MILLER_INDICES.ALLOWED_KEYS.includes(event.key);
    },
    validateKeyForAxialRatio: function(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) { return true; }
        if (event.key === '.' && event.target.value.includes('.')) { // Prevent multiple decimal points
            return false;
        }
        return CONFIG.VALIDATION.AXIAL_RATIOS.ALLOWED_KEYS.includes(event.key);
    },
    debug: function(message, level = 'info', data = null) {
        if (!CONFIG.DEBUG.enabled) return;
        
        // Handle case where 'level' might be data if only two args are passed.
        const levelString = (typeof level === 'string') ? level.toLowerCase() : 'info';
        if (typeof level === 'object' && level !== null && data === null) {
            data = level; // The 'level' was actually the data object.
        }

        const levelMap = { 'debug': 4, 'info': 3, 'warn': 2, 'error': 1 };
        const configLevel = levelMap[CONFIG.DEBUG.logLevel.toLowerCase()] || 3; // Default to 'info'
        const messageLevel = levelMap[levelString] || 3; // Default to 'info'

        if (messageLevel <= configLevel) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}][${levelString.toUpperCase()}]`;
            const logArgs = [`${prefix} ${message}`];
            if (data !== null && data !== undefined) { // Check for undefined too
                logArgs.push(data);
            }
            switch(levelString) {
                case 'error': console.error(...logArgs); break;
                case 'warn':  console.warn(...logArgs); break;
                case 'info':  console.info(...logArgs); break;
                case 'debug': console.debug(...logArgs); break; // Changed from console.log for 'debug'
                default:      console.log(...logArgs); // Fallback
            }
        }
    }
};

window.CONFIG = CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS;
