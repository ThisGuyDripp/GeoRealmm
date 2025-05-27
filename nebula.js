// --- Nebula Logic for Space Background ---

let nebulas = [];
let spaceCanvasForNebula;
let ctxNebula;

const NEBULA_MOVEMENT_PARAMS = {
    MIN_SPEED: 0.01,
    MAX_SPEED: 0.08,
    MIN_ROTATION_SPEED: 0.00002,
    MAX_ROTATION_SPEED: 0.00015,
    VELOCITY_UPDATE_INTERVAL_MIN: 5000, // ms
    VELOCITY_UPDATE_INTERVAL_MAX: 15000, // ms
    ACCELERATION_FACTOR: 0.005 // How quickly speed/direction changes
};

/**
 * Initializes the nebulas.
 * @param {HTMLCanvasElement} canvas - The main space background canvas.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 */
function initNebulas(canvas, ctx) {
    spaceCanvasForNebula = canvas;
    ctxNebula = ctx;
    if (!spaceCanvasForNebula || !ctxNebula) return;

    nebulas = [];

    const now = Date.now();

    // Nebula 1: Main "Cloud-like" Nebula
    nebulas.push({
        id: "Nebula_CloudPrimary",
        x: spaceCanvasForNebula.width * 0.5,
        y: spaceCanvasForNebula.height * 0.5,
        radius: Math.min(spaceCanvasForNebula.width, spaceCanvasForNebula.height) * 0.4,
        layers: [
            // Core cloud mass - multiple slightly offset layers for irregularity
            { offsetRatio: 0.1, color: 'rgba(180, 150, 220, 0.22)', blur: 70, scale: 0.5, offsetX: -20, offsetY: 10 }, // Increased alpha
            { offsetRatio: 0.15, color: 'rgba(150, 180, 230, 0.25)', blur: 65, scale: 0.6, offsetX: 15, offsetY: -5 }, // Increased alpha
            { offsetRatio: 0.2, color: 'rgba(200, 160, 210, 0.20)', blur: 75, scale: 0.45, offsetX: 5, offsetY: 20 }, // Increased alpha
            
            // Mid-density cloud tendrils
            { offsetRatio: 0.3, color: 'rgba(120, 140, 200, 0.18)', blur: 80, scale: 0.75, offsetX: -30, offsetY: -15 }, // Increased alpha
            { offsetRatio: 0.4, color: 'rgba(160, 140, 190, 0.15)', blur: 85, scale: 0.85, offsetX: 25, offsetY: 5 }, // Increased alpha

            // Outer wisps - very diffuse
            { offsetRatio: 0.55, color: 'rgba(100, 120, 180, 0.12)', blur: 90, scale: 1.0, offsetX: 0, offsetY: 0 }, // Increased alpha
            { offsetRatio: 0.65, color: 'rgba(130, 110, 160, 0.10)', blur: 100, scale: 1.1, offsetX: 40, offsetY: -20 } // Increased alpha
        ],
        vx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.5,
        vy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.5,
        targetVx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.5,
        targetVy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.5,
        vxLastChange: now,
        vyLastChange: now,
        velocityUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN),
        acceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * (0.8 + Math.random() * 0.4),

        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.5,
        targetRotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.5,
        rotationSpeedLastChange: now,
        rotationSpeedUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN),
        rotationAcceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * 0.1 * (0.8 + Math.random() * 0.4),
        globalAlphaMultiplier: 0.95 // Increased global alpha
    });

    // Nebula 2: Smaller, faster moving cloud
    nebulas.push({
        id: "Nebula_CloudSecondary",
        x: spaceCanvasForNebula.width * 0.2,
        y: spaceCanvasForNebula.height * 0.3,
        radius: Math.min(spaceCanvasForNebula.width, spaceCanvasForNebula.height) * 0.28,
        layers: [
            { offsetRatio: 0.1, color: 'rgba(220, 180, 150, 0.18)', blur: 60, scale: 0.6, offsetX: 10, offsetY: -10 }, // Increased alpha
            { offsetRatio: 0.25, color: 'rgba(180, 160, 190, 0.15)', blur: 70, scale: 0.8, offsetX: -5, offsetY: 5 }, // Increased alpha
            { offsetRatio: 0.45, color: 'rgba(150, 190, 170, 0.12)', blur: 80, scale: 1.0, offsetX: 0, offsetY: 0 } // Increased alpha
        ],
        vx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.7,
        vy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.7,
        targetVx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.7,
        targetVy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.7,
        vxLastChange: now,
        vyLastChange: now,
        velocityUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN * 0.8 + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN) * 0.8,
        acceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * (1.0 + Math.random() * 0.4),

        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.7,
        targetRotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.7,
        rotationSpeedLastChange: now,
        rotationSpeedUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN * 0.8 + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN) * 0.8,
        rotationAcceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * 0.1 * (1.0 + Math.random() * 0.4),
        globalAlphaMultiplier: 0.85 // Increased global alpha
    });
    
    // Nebula 3: Distant, very diffuse cloud layer
    nebulas.push({
        id: "Nebula_CloudBackground",
        x: spaceCanvasForNebula.width * 0.7,
        y: spaceCanvasForNebula.height * 0.8,
        radius: Math.min(spaceCanvasForNebula.width, spaceCanvasForNebula.height) * 0.5, // Larger radius for background feel
        layers: [
            { offsetRatio: 0.2, color: 'rgba(100, 100, 140, 0.08)', blur: 100, scale: 0.7, offsetX: 0, offsetY: 0 }, // Increased alpha
            { offsetRatio: 0.5, color: 'rgba(120, 120, 150, 0.06)', blur: 120, scale: 1.0, offsetX: 0, offsetY: 0 } // Increased alpha
        ],
        vx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.3,
        vy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.3,
        targetVx: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.3,
        targetVy: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_SPEED * 0.3,
        vxLastChange: now,
        vyLastChange: now,
        velocityUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN * 1.2 + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN) * 1.2,
        acceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * (0.6 + Math.random() * 0.4),
        
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.3,
        targetRotationSpeed: (Math.random() - 0.5) * NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED * 0.3,
        rotationSpeedLastChange: now,
        rotationSpeedUpdateInterval: NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN * 1.2 + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN) * 1.2,
        rotationAcceleration: NEBULA_MOVEMENT_PARAMS.ACCELERATION_FACTOR * 0.1 * (0.6 + Math.random() * 0.4),
        globalAlphaMultiplier: 0.75 // Increased global alpha
    });
}

function drawNebulas() {
    if (!ctxNebula || !spaceCanvasForNebula || nebulas.length === 0) return;
    const now = Date.now();

    nebulas.forEach(nebula => {
        // Update Target Velocities (Roaming Logic)
        if (now - nebula.vxLastChange > nebula.velocityUpdateInterval) {
            nebula.targetVx = (Math.random() - 0.5) * (NEBULA_MOVEMENT_PARAMS.MAX_SPEED / (nebula.id === "Nebula_CloudBackground" ? 2 : 1)); // Slower for background
            nebula.vxLastChange = now + (Math.random() -0.5) * 2000; // Add some jitter to update interval
            nebula.velocityUpdateInterval = NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN);
        }
        if (now - nebula.vyLastChange > nebula.velocityUpdateInterval) { // Use same interval for simplicity or separate
            nebula.targetVy = (Math.random() - 0.5) * (NEBULA_MOVEMENT_PARAMS.MAX_SPEED / (nebula.id === "Nebula_CloudBackground" ? 2 : 1));
            nebula.vyLastChange = now + (Math.random() -0.5) * 2000;
        }

        // Interpolate current velocity towards target velocity
        nebula.vx += (nebula.targetVx - nebula.vx) * nebula.acceleration;
        nebula.vy += (nebula.targetVy - nebula.vy) * nebula.acceleration;
        nebula.vx = Math.max(-NEBULA_MOVEMENT_PARAMS.MAX_SPEED, Math.min(NEBULA_MOVEMENT_PARAMS.MAX_SPEED, nebula.vx)); // Clamp speed
        nebula.vy = Math.max(-NEBULA_MOVEMENT_PARAMS.MAX_SPEED, Math.min(NEBULA_MOVEMENT_PARAMS.MAX_SPEED, nebula.vy));


        // Update Target Rotation Speed
        if (now - nebula.rotationSpeedLastChange > nebula.rotationSpeedUpdateInterval) {
            nebula.targetRotationSpeed = (Math.random() - 0.5) * (NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED / (nebula.id === "Nebula_CloudBackground" ? 2 : 1));
            nebula.rotationSpeedLastChange = now + (Math.random() -0.5) * 2000;
            nebula.rotationSpeedUpdateInterval = NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN + Math.random() * (NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MAX - NEBULA_MOVEMENT_PARAMS.VELOCITY_UPDATE_INTERVAL_MIN);
        }
        nebula.rotationSpeed += (nebula.targetRotationSpeed - nebula.rotationSpeed) * nebula.rotationAcceleration;
        nebula.rotationSpeed = Math.max(-NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED, Math.min(NEBULA_MOVEMENT_PARAMS.MAX_ROTATION_SPEED, nebula.rotationSpeed));


        nebula.x += nebula.vx;
        nebula.y += nebula.vy;

        const maxNebulaSize = nebula.radius * Math.max(...nebula.layers.map(l => l.scale * 1.2)); // Add buffer for offset layers
        // Screen wrap logic
        if (nebula.x - maxNebulaSize > spaceCanvasForNebula.width) nebula.x = -maxNebulaSize;
        if (nebula.x + maxNebulaSize < 0) nebula.x = spaceCanvasForNebula.width + maxNebulaSize;
        if (nebula.y - maxNebulaSize > spaceCanvasForNebula.height) nebula.y = -maxNebulaSize;
        if (nebula.y + maxNebulaSize < 0) nebula.y = spaceCanvasForNebula.height + maxNebulaSize;

        nebula.rotation += nebula.rotationSpeed;

        ctxNebula.save();
        ctxNebula.translate(nebula.x, nebula.y);
        ctxNebula.rotate(nebula.rotation);
        
        // Adjusted baseAlpha for better visibility
        let baseAlpha = 0.7 + Math.sin(Date.now() * 0.00005 + nebula.x * 0.05 + nebula.y * 0.02) * 0.2; 
        baseAlpha = Math.max(0.5, Math.min(1.0, baseAlpha)); // Range 0.5 to 0.9 (effectively)
        ctxNebula.globalAlpha = baseAlpha * (nebula.globalAlphaMultiplier || 1);


        nebula.layers.forEach(layer => {
            if (!layer || typeof layer.color !== 'string') return;

            // Apply layer-specific offsets for cloud irregularity
            const layerX = layer.offsetX || 0;
            const layerY = layer.offsetY || 0;

            const currentRadius = nebula.radius * layer.scale;
            // Create gradient at the layer's potentially offset position
            const gradient = ctxNebula.createRadialGradient(layerX, layerY, 0, layerX, layerY, currentRadius);
            
            let colorFull = layer.color;
            let colorMid = 'rgba(0,0,0,0)';
            let colorEdge = 'rgba(0,0,0,0)';

            const alphaMatch = layer.color.match(/[\d\.]+\)$/); 
            let layerBaseAlpha = 0.1; 

            if (alphaMatch && alphaMatch[0]) {
                layerBaseAlpha = parseFloat(alphaMatch[0].slice(0, -1));
            }

            colorMid = layer.color.replace(/[\d\.]+\)$/, (layerBaseAlpha * 0.25).toFixed(3) + ')'); // Softer mid falloff for clouds
            colorEdge = layer.color.replace(/[\d\.]+\)$/, '0)');

            gradient.addColorStop(0, colorEdge); // Start transparent at the very center of the layer's gradient
            gradient.addColorStop(Math.max(0.05, layer.offsetRatio * 0.5 - 0.1), colorEdge); 
            gradient.addColorStop(layer.offsetRatio, colorFull); 
            gradient.addColorStop(Math.min(0.95, layer.offsetRatio + (1 - layer.offsetRatio) * 0.6 + 0.1), colorMid); 
            gradient.addColorStop(1, colorEdge); 

            ctxNebula.beginPath();
            ctxNebula.arc(layerX, layerY, currentRadius, 0, Math.PI * 2); // Draw arc at layer's offset
            ctxNebula.fillStyle = gradient;

            if (layer.blur > 0) {
                ctxNebula.shadowBlur = layer.blur;
                let shadowColorAlpha = layerBaseAlpha * 0.1; 
                 if (layer.color.startsWith('rgba')) {
                     const rgbValues = layer.color.match(/\d+/g);
                     if (rgbValues && rgbValues.length >= 3) {
                        ctxNebula.shadowColor = `rgba(${Math.max(0, parseInt(rgbValues[0])-70)}, ${Math.max(0, parseInt(rgbValues[1])-70)}, ${Math.max(0, parseInt(rgbValues[2])-70)}, ${shadowColorAlpha.toFixed(3)})`;
                     } else {
                        ctxNebula.shadowColor = `rgba(10,10,20,${shadowColorAlpha.toFixed(3)})`; 
                     }
                } else { 
                    ctxNebula.shadowColor = `rgba(10,10,20,${shadowColorAlpha.toFixed(3)})`;
                }
            }
            ctxNebula.fill();
            ctxNebula.shadowBlur = 0; 
        });
        ctxNebula.restore();
    });
}
