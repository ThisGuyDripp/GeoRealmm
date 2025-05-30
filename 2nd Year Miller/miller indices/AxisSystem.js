// AxisSystem.js

class AxisSystem {
    constructor(scene, initialSystem = 'cubic', initialAxialRatios = null) {
        if (!scene || !window.CONFIG || !window.THREE || !window.CONFIG_UTILS) {
            throw new Error("AxisSystem: Missing required dependencies (Scene, CONFIG, THREE, CONFIG_UTILS).");
        }
        this.scene = scene;
        this.axisBaseConfig = window.CONFIG.AXIS;
        this.system = initialSystem;
        // Store the passed initialAxialRatios; it will be interpreted by setSystem/init
        this.axialRatios = initialAxialRatios ? { ...initialAxialRatios } : this.getDefaultAxialRatios(initialSystem);
        CONFIG_UTILS.debug(`AxisSystem Constructor: initialSystem=${initialSystem}, initialAxialRatios passed:`, 'info', initialAxialRatios ? JSON.parse(JSON.stringify(initialAxialRatios)) : null);
        CONFIG_UTILS.debug(`AxisSystem Constructor: this.axialRatios SET TO:`, 'info', JSON.parse(JSON.stringify(this.axialRatios)));


        this.scaled_a_length = this.axisBaseConfig.LENGTH;
        this.scaled_b_length = this.axisBaseConfig.LENGTH;
        this.scaled_c_length = this.axisBaseConfig.LENGTH;
        this.SQRT3 = Math.sqrt(3);

        this.axesGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.gridGroup = new THREE.Group();
        this.helpersGroup = new THREE.Group();
        this.shapeGroup = new THREE.Group();

        this.objects = {
            axesLines: [], arrowHeads: [], labels: [], grids: [],
            markers: [], origin: null, shape: null, originalShapeGeometry: null
        };

        this.scene.add(this.axesGroup);
        this.scene.add(this.labelsGroup);
        this.scene.add(this.gridGroup);
        this.scene.add(this.helpersGroup);
        this.scene.add(this.shapeGroup);

        this.init(); // init will use this.axialRatios
    }

    getDefaultAxialRatios(system) {
        const systemUpper = system.toUpperCase();
        if (CONFIG.AXIS[systemUpper] && CONFIG.AXIS[systemUpper].DEFAULT_AXIAL_RATIOS) {
            CONFIG_UTILS.debug(`getDefaultAxialRatios: Found defaults for ${systemUpper}:`, 'info', JSON.parse(JSON.stringify(CONFIG.AXIS[systemUpper].DEFAULT_AXIAL_RATIOS)));
            return { ...CONFIG.AXIS[systemUpper].DEFAULT_AXIAL_RATIOS };
        }
        CONFIG_UTILS.debug(`getDefaultAxialRatios: No CONFIG defaults for system '${system}', using absolute fallback.`, 'warn');
        return systemUpper === 'HEXAGONAL' ? { c_a: 1.0 } : { a_b: 1.0, c_b: 1.0 };
    }

    calculateScaledAxisLengths() {
        // This is the critical point. this.axialRatios should be correct here.
        let currentRatios = this.axialRatios;

        // Defensive check: if this.axialRatios is somehow not set or invalid, get defaults.
        if (!currentRatios || typeof currentRatios !== 'object' || Object.keys(currentRatios).length === 0) {
            CONFIG_UTILS.debug(`AxisSystem.calculateScaledAxisLengths(): this.axialRatios was invalid. Fetching defaults for ${this.system}. Original:`, 'warn', this.axialRatios);
            currentRatios = this.getDefaultAxialRatios(this.system);
        }
        
        CONFIG_UTILS.debug(`AxisSystem.calculateScaledAxisLengths() WILL USE ratios:`, 'info', JSON.parse(JSON.stringify(currentRatios)));

        const baseLength = this.axisBaseConfig.LENGTH;

        if (this.system === 'cubic') {
            this.scaled_b_length = baseLength;
            // Use currentRatios directly
            this.scaled_a_length = this.scaled_b_length * (currentRatios.a_b !== undefined ? currentRatios.a_b : 1.0);
            this.scaled_c_length = this.scaled_b_length * (currentRatios.c_b !== undefined ? currentRatios.c_b : 1.0);
             CONFIG_UTILS.debug(`CUBIC scaling: a_b_ratio=${currentRatios.a_b}, c_b_ratio=${currentRatios.c_b}`, 'info');
        } else if (this.system === 'hexagonal') {
            this.scaled_a_length = baseLength;
            this.scaled_c_length = this.scaled_a_length * (currentRatios.c_a !== undefined ? currentRatios.c_a : 1.0);
            this.scaled_b_length = baseLength; // Nominal
            CONFIG_UTILS.debug(`HEXAGONAL scaling: c_a_ratio=${currentRatios.c_a}`, 'info');
        } else {
            this.scaled_a_length = baseLength;
            this.scaled_b_length = baseLength;
            this.scaled_c_length = baseLength;
        }
        CONFIG_UTILS.debug(`FINAL Scaled lengths for ${this.system}: a(Z)=${this.scaled_a_length.toFixed(3)}, b(X)=${this.scaled_b_length.toFixed(3)}, c(Y)=${this.scaled_c_length.toFixed(3)}`, 'info');
    }

    init() {
        CONFIG_UTILS.debug(`AxisSystem.init() called for system: ${this.system}. Current this.axialRatios before calcScaled:`, 'info', JSON.parse(JSON.stringify(this.axialRatios)));
        this.clear();
        this.currentSystemConfig = CONFIG_UTILS.getAxisConfig(this.system);
        const shapeConfig = CONFIG_UTILS.getShapeConfig(this.system);

        if (!this.currentSystemConfig || !shapeConfig) {
             CONFIG_UTILS.debug(`AxisSystem init error: Config not found for system '${this.system}'`, 'error');
             return;
        }
        this.calculateScaledAxisLengths(); // This uses this.axialRatios

        if (this.system === 'cubic') {
            this.createCubicAxes();
            this.createCubicLabels();
            if (shapeConfig.enabled) this.createCubicShape(shapeConfig);
        } else if (this.system === 'hexagonal') {
            this.createHexagonalAxes();
            this.createHexagonalLabels();
             if (shapeConfig.enabled) this.createHexagonalShape_Custom(shapeConfig);
        }
        this.createGrid(); this.createOrigin(); this.createUnitMarkers();
    }

    setSystem(systemType, newAxialRatios = null) {
        const oldSystem = this.system;
        const oldRatiosJSON = this.axialRatios ? JSON.stringify(this.axialRatios) : "null_or_undefined";

        let newRatiosToActuallyUse;
        let newRatiosSourceInfo = "unknown";

        if (newAxialRatios !== null && typeof newAxialRatios === 'object' && Object.keys(newAxialRatios).length > 0) {
            newRatiosToActuallyUse = { ...newAxialRatios }; // Use a copy of valid provided ratios
            newRatiosSourceInfo = "explicitly_provided";
        } else {
            newRatiosToActuallyUse = this.getDefaultAxialRatios(systemType); // Fallback to defaults for the target system
            newRatiosSourceInfo = newAxialRatios === null ? "defaults_for_target_system (null_provided)" : "defaults_for_target_system (empty_or_invalid_provided)";
        }
        const newRatiosJSON = JSON.stringify(newRatiosToActuallyUse);

        const systemChanged = oldSystem !== systemType;
        const ratiosEffectivelyChanged = oldRatiosJSON !== newRatiosJSON;

        CONFIG_UTILS.debug(`AxisSystem.setSystem: oldSystem=${oldSystem}, newSystem=${systemType}, systemChanged=${systemChanged}`, 'info', {
            oldRatiosString: oldRatiosJSON,
            passedInNewAxialRatios: newAxialRatios, // Log what was passed
            newRatiosToActuallyUse: JSON.parse(newRatiosJSON), // Log what will be used
            newRatiosSourceInfo: newRatiosSourceInfo,
            ratiosEffectivelyChanged: ratiosEffectivelyChanged
        });

        if (systemChanged || ratiosEffectivelyChanged) {
            CONFIG_UTILS.debug(`AxisSystem: Updating system OR ratios. To system: ${systemType}. Ratios changed: ${ratiosEffectivelyChanged}.`, 'info');
            this.system = systemType;
            this.axialRatios = newRatiosToActuallyUse; // CRITICAL: Update internal state
            CONFIG_UTILS.debug(`AxisSystem: this.axialRatios is NOW SET TO:`, 'info', JSON.parse(JSON.stringify(this.axialRatios)));
            this.init(); // init() will use the newly set this.axialRatios
        } else {
            CONFIG_UTILS.debug(`AxisSystem.setSystem: No effective change to system ('${systemType}') or ratios. Not re-initializing.`, 'info');
        }
    }

    createCubicShape(shapeConfig) {
        CONFIG_UTILS.debug(`Creating Cubic Shape with dimensions: Width(b-X)=${this.scaled_b_length.toFixed(3)}, Height(c-Y)=${this.scaled_c_length.toFixed(3)}, Depth(a-Z)=${this.scaled_a_length.toFixed(3)}`, 'info');
        
        // Store scaled lengths for convenience (L_b is for X, L_c for Y, L_a for Z in BoxGeometry)
        const L_b_visual_X = this.scaled_b_length;
        const L_c_visual_Y = this.scaled_c_length;
        const L_a_visual_Z = this.scaled_a_length;
    
        const boxGeometry = new THREE.BoxGeometry(L_b_visual_X, L_c_visual_Y, L_a_visual_Z);
        
        let shapeMesh; // This will be the mesh we add to the scene
    
        if (shapeConfig.wireframe) {
            const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: shapeConfig.color, 
                opacity: shapeConfig.opacity, 
                transparent: shapeConfig.opacity < 1.0 
            });
            shapeMesh = new THREE.LineSegments(edgesGeometry, lineMaterial);
            this.objects.originalShapeGeometry = boxGeometry; // Keep reference if needed
        } else {
            const material = new THREE.MeshBasicMaterial({
                color: shapeConfig.color, 
                opacity: shapeConfig.opacity, 
                transparent: shapeConfig.opacity < 1.0, 
                depthWrite: shapeConfig.opacity === 1.0
            });
            shapeMesh = new THREE.Mesh(boxGeometry, material);
        }
    
        // ---- START OF MODIFICATION ----
        // Translate the shapeMesh so its corner is at the origin (0,0,0) 
        // and it extends into the positive X, Y, Z directions.
        // The center of the BoxGeometry is (0,0,0) locally.
        // To move its corner (locally -L/2, -L/2, -L/2) to world (0,0,0),
        // we need to translate the mesh by (L_b/2, L_c/2, L_a/2).
        shapeMesh.position.set(L_b_visual_X / 2, L_c_visual_Y / 2, L_a_visual_Z / 2);
        // ---- END OF MODIFICATION ----
    
        this.shapeGroup.add(shapeMesh); 
        this.objects.shape = shapeMesh; 
    }

    createCubicAxes() {
        const colors = this.currentSystemConfig.COLORS;
        // Axes definitions:
        // a-axis corresponds to visual Z-axis
        // b-axis corresponds to visual X-axis
        // c-axis corresponds to visual Y-axis
        const axesData = [
            { name: 'b', dir: new THREE.Vector3(1, 0, 0), color: colors.B_AXIS, length: this.scaled_b_length }, // X-axis
            { name: 'c', dir: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS, length: this.scaled_c_length }, // Y-axis
            { name: 'a', dir: new THREE.Vector3(0, 0, 1), color: colors.A_AXIS, length: this.scaled_a_length }  // Z-axis
        ];
        axesData.forEach(axis => {
            this.createAxisLine(axis.dir, axis.length, axis.color, true); // True for dashed negative part
            this.createArrowHead(axis.dir.clone().multiplyScalar(axis.length), axis.dir, axis.color);
        });
    }

    createCubicLabels() {
        const minScaledLength = Math.min(this.scaled_a_length, this.scaled_b_length, this.scaled_c_length) || this.axisBaseConfig.LENGTH;
        const labelOffsetFactor = 1.0 + (this.currentSystemConfig.LABELS.OFFSET / minScaledLength);
        const colors = this.currentSystemConfig.COLORS;
        const labelsText = this.currentSystemConfig.LABELS.TEXT;
        const spriteConfig = this.currentSystemConfig.LABELS.SPRITE;

        const labelsData = [
            { text: labelsText.b, pos: new THREE.Vector3(this.scaled_b_length * labelOffsetFactor, 0, 0), color: colors.B_AXIS },
            { text: labelsText.c, pos: new THREE.Vector3(0, this.scaled_c_length * labelOffsetFactor, 0), color: colors.C_AXIS },
            { text: labelsText.a, pos: new THREE.Vector3(0, 0, this.scaled_a_length * labelOffsetFactor), color: colors.A_AXIS }
        ];
        labelsData.forEach(label => {
             const sprite = this.createTextSprite(label.text, label.pos, spriteConfig, label.color);
             this.labelsGroup.add(sprite); this.objects.labels.push(sprite);
         });
    }

    createHexagonalAxes() {
        const colors = this.currentSystemConfig.COLORS;
        // Hexagonal axes definitions:
        // c-axis corresponds to visual Y-axis
        // a1-axis corresponds to visual X-axis
        // a2-axis is at 120 degrees to a1 in the XZ plane
        // a3-axis is at 240 degrees to a1 in the XZ plane (or -120 from a1)
        const hexAxesData = [
            { name: 'c',  dir: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS, length: this.scaled_c_length },
            { name: 'a1', dir: new THREE.Vector3(1, 0, 0), color: colors.A1_AXIS, length: this.scaled_a_length },
            { name: 'a2', dir: new THREE.Vector3(-0.5, 0, this.SQRT3 / 2), color: colors.A2_AXIS, length: this.scaled_a_length },
            { name: 'a3', dir: new THREE.Vector3(-0.5, 0, -this.SQRT3 / 2), color: colors.A3_AXIS, length: this.scaled_a_length }
        ];
         hexAxesData.forEach(axis => {
             const showDashedNegative = (axis.name !== 'c'); // Only c-axis has a distinct negative part shown typically
             this.createAxisLine(axis.dir, axis.length, axis.color, showDashedNegative);
             this.createArrowHead(axis.dir.clone().multiplyScalar(axis.length), axis.dir, axis.color);
         });
    }

     createHexagonalLabels() {
         const minScaledLength = Math.min(this.scaled_a_length, this.scaled_c_length) || this.axisBaseConfig.LENGTH;
         const labelOffsetFactor = 1.0 + (this.currentSystemConfig.LABELS.OFFSET / minScaledLength);
         const colors = this.currentSystemConfig.COLORS;
         const labelsText = this.currentSystemConfig.LABELS.TEXT;
         const spriteConfig = this.currentSystemConfig.LABELS.SPRITE;
         const hexLabelsData = [
             { text: labelsText.c,  pos: new THREE.Vector3(0, this.scaled_c_length * labelOffsetFactor, 0), color: colors.C_AXIS },
             { text: labelsText.a1, pos: new THREE.Vector3(this.scaled_a_length * labelOffsetFactor, 0, 0), color: colors.A1_AXIS },
             { text: labelsText.a2, pos: new THREE.Vector3((this.scaled_a_length * -0.5) * labelOffsetFactor, 0, (this.scaled_a_length * this.SQRT3 / 2) * labelOffsetFactor), color: colors.A2_AXIS },
             { text: labelsText.a3, pos: new THREE.Vector3((this.scaled_a_length * -0.5) * labelOffsetFactor, 0, (this.scaled_a_length * -this.SQRT3 / 2) * labelOffsetFactor), color: colors.A3_AXIS }
         ];
         hexLabelsData.forEach(label => {
             const sprite = this.createTextSprite( label.text, label.pos, spriteConfig, label.color);
             this.labelsGroup.add(sprite); this.objects.labels.push(sprite);
         });
     }

    createHexagonalShape_Custom(shapeConfig) {
        // This creates a hexagonal prism with pyramidal caps.
        // Radius is based on scaled_a_length (a-axes in hexagonal)
        // Height is based on scaled_c_length (c-axis in hexagonal)
        const radius = this.scaled_a_length * (shapeConfig.radiusFactor || 1.0); // Use config or default factor
        const totalHeight = this.scaled_c_length * (shapeConfig.heightFactor || 1.0); // Use config or default factor
        const halfHeight = totalHeight / 2;

        const vertices = [];
        // Top hexagon vertices (y = halfHeight)
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i; // 60 degrees increment
            vertices.push(radius * Math.cos(angle), halfHeight, radius * Math.sin(angle));
        }
        // Bottom hexagon vertices (y = -halfHeight)
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            vertices.push(radius * Math.cos(angle), -halfHeight, radius * Math.sin(angle));
        }
        // Top pyramid apex (could be adjusted for different pyramid height)
        // vertices.push(0, halfHeight + capHeight, 0); // index 12
        // Bottom pyramid apex
        // vertices.push(0, -halfHeight - capHeight, 0); // index 13

        const indices = [];
        // Sides of the prism
        for (let i = 0; i < 6; i++) {
            indices.push(i, (i + 1) % 6, i + 6); // Triangle 1 of side quad
            indices.push((i + 1) % 6, (i + 1) % 6 + 6, i + 6); // Triangle 2 of side quad
        }
        // Top face (hexagon made of 4 triangles, fanning from vertex 0)
        for (let i = 1; i < 5; i++) { // 0-1-2, 0-2-3, 0-3-4, 0-4-5
            indices.push(0, i, i + 1);
        }
        // Bottom face (hexagon made of 4 triangles, fanning from vertex 6)
        for (let i = 1; i < 5; i++) { // 6-7-8, 6-8-9, 6-9-10, 6-10-11
            indices.push(6, 6 + i, 6 + i + 1);
        }

        const hexGeometry = new THREE.BufferGeometry();
        hexGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        hexGeometry.setIndex(indices);

        if (shapeConfig.wireframe) {
            const edgesGeometry = new THREE.EdgesGeometry(hexGeometry); // EdgesGeometry is good for wireframes
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: shapeConfig.color, 
                opacity: shapeConfig.opacity, 
                transparent: shapeConfig.opacity < 1.0 
            });
            const hexEdges = new THREE.LineSegments(edgesGeometry, lineMaterial);
            this.shapeGroup.add(hexEdges); 
            this.objects.shape = hexEdges; 
            this.objects.originalShapeGeometry = hexGeometry; // Store original for potential re-use
        } else {
            hexGeometry.computeVertexNormals(); // Needed for smooth shading if not wireframe
            const material = new THREE.MeshBasicMaterial({ 
                color: shapeConfig.color, 
                opacity: shapeConfig.opacity, 
                transparent: shapeConfig.opacity < 1.0, 
                depthWrite: shapeConfig.opacity === 1.0, // Avoid issues with transparent objects
                side: THREE.DoubleSide // Render both sides
            });
            const hexMesh = new THREE.Mesh(hexGeometry, material);
            this.shapeGroup.add(hexMesh); 
            this.objects.shape = hexMesh;
        }
    }

    createAxisLine(direction, length, color, includeNegativeDashed) {
        const origin = new THREE.Vector3(0, 0, 0);
        const positiveEnd = direction.clone().multiplyScalar(length);
        const posGeometry = new THREE.BufferGeometry().setFromPoints([origin, positiveEnd]);
        const posMaterial = new THREE.LineBasicMaterial({ color: color });
        const posLine = new THREE.Line(posGeometry, posMaterial);
        this.axesGroup.add(posLine); this.objects.axesLines.push(posLine);

        if (includeNegativeDashed) {
            const negativeEnd = direction.clone().multiplyScalar(-length);
            const negGeometry = new THREE.BufferGeometry().setFromPoints([origin, negativeEnd]);
            // Adjust dashSize and gapSize relative to the axis length for better visual consistency
            const dashScale = Math.max(0.2, Math.min(1.0, length / this.axisBaseConfig.LENGTH)); // Scale factor based on relative length
            const negMaterial = new THREE.LineDashedMaterial({ color: color, dashSize: 0.1 * dashScale, gapSize: 0.05 * dashScale, scale:1 });
            const negLine = new THREE.Line(negGeometry, negMaterial);
            negLine.computeLineDistances(); // Important for dashed lines
            this.axesGroup.add(negLine); this.objects.axesLines.push(negLine);
        }
    }

    createArrowHead(positionAtEndOfAxis, directionOfAxis, color) {
        // Scale arrow head size based on average axis length to maintain proportion
        const avgScaledLength = (this.scaled_a_length + this.scaled_b_length + this.scaled_c_length) / 3;
        const baseHeadLength = 0.15; // Base size at default axis length
        const baseHeadWidth = 0.07;
        // Scale factor: if axes are much larger/smaller, scale the arrow head too, but within limits
        const scaleFactor = Math.min(1.5, Math.max(0.5, avgScaledLength / this.axisBaseConfig.LENGTH)); 
        const headLength = baseHeadLength * scaleFactor;
        const headWidth = baseHeadWidth * scaleFactor;

        const normalizedDir = directionOfAxis.clone().normalize(); // Ensure direction is normalized
        // ArrowHelper's length parameter is the length of the arrow's line part, not total.
        // We want just the head, so set line length to 0.
        const arrow = new THREE.ArrowHelper(normalizedDir, positionAtEndOfAxis, 0, color, headLength, headWidth);
        if (arrow.line && arrow.line.material) arrow.line.material.linewidth = 2; // Optional: thicker line for the cone base
        this.axesGroup.add(arrow); this.objects.arrowHeads.push(arrow);
    }

    createTextSprite(text, position, spriteConfig, textColor = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontFace = spriteConfig.fontFace || 'Arial';
        const fontSize = spriteConfig.fontSize || 48; // Base font size for high-res texture
        
        canvas.width = spriteConfig.canvasWidth || 256; // Power of 2 for textures
        canvas.height = spriteConfig.canvasHeight || 128;

        context.font = `Bold ${fontSize}px ${fontFace}`;

        // Background (transparent by default from config)
        const bgColor = spriteConfig.backgroundColor; // e.g., {r:0, g:0, b:0, a:0.0}
        context.fillStyle = `rgba(${Math.round(bgColor.r*255)}, ${Math.round(bgColor.g*255)}, ${Math.round(bgColor.b*255)}, ${bgColor.a})`;
        context.fillRect(0,0,canvas.width,canvas.height);

        // Border (optional)
        if (spriteConfig.borderThickness > 0) {
            const borderColor = spriteConfig.borderColor;
            context.strokeStyle = `rgba(${Math.round(borderColor.r*255)}, ${Math.round(borderColor.g*255)}, ${Math.round(borderColor.b*255)}, ${borderColor.a})`;
            context.lineWidth = spriteConfig.borderThickness;
            context.strokeRect(0,0,canvas.width,canvas.height);
        }
        
        // Text color
        context.fillStyle = new THREE.Color(textColor).getStyle(); // Use THREE.Color for consistency
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.1 }); // alphaTest for sharper edges if bg is transparent
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);

        // Scale sprite based on average axis length and desired visual size
        const avgScaledLength = (this.scaled_a_length + this.scaled_b_length + this.scaled_c_length) / 3;
        const baseSpriteScale = this.axisBaseConfig.LABEL_SIZE || 0.15; // Desired visual size in world units
        const spriteScaleFactor = Math.min(1.5, Math.max(0.7, avgScaledLength / this.axisBaseConfig.LENGTH)); // Adjust based on axis scale
        const finalSpriteScale = baseSpriteScale * spriteScaleFactor;

        sprite.scale.set(finalSpriteScale * (canvas.width/canvas.height), finalSpriteScale, 1.0); // Maintain aspect ratio

        return sprite;
    }

    createGrid() {
        // Clear existing grids
        this.objects.grids.forEach(grid => { 
            if(grid.geometry) grid.geometry.dispose(); 
            if(grid.material) grid.material.dispose(); 
            this.gridGroup.remove(grid); 
        });
        this.objects.grids = [];

        const maxScaledLength = Math.max(this.scaled_a_length, this.scaled_b_length, this.scaled_c_length, this.axisBaseConfig.GRID_SIZE);
        const gridSize = Math.max(this.axisBaseConfig.GRID_SIZE, maxScaledLength * 1.2); // Ensure grid is larger than axes
        const divisions = this.axisBaseConfig.GRID_DIVISIONS;
        const gridColor = CONFIG.HELPERS.GRID.COLOR || 0x444444;

        // XZ plane grid (standard horizontal grid)
        const gridXZ = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
        gridXZ.material.opacity = 0.2;
        gridXZ.material.transparent = true;
        this.gridGroup.add(gridXZ);
        this.objects.grids.push(gridXZ);

        // Optional: XY plane grid for hexagonal system if enabled in debug config
        if (this.system === 'hexagonal' && (CONFIG.DEBUG.showXYGridForHexagonal)) {
             const gridXY = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
             gridXY.rotation.x = Math.PI / 2; // Rotate to be in XY plane
             gridXY.material.opacity = 0.10; // Make it more subtle
             gridXY.material.transparent = true;
             this.gridGroup.add(gridXY);
             this.objects.grids.push(gridXY);
        }
        // Could add YZ plane grid similarly if needed
    }

    createOrigin() {
        const config = CONFIG.HELPERS.ORIGIN_POINT;
        const originGeometry = new THREE.SphereGeometry(config.SIZE, config.SEGMENTS, config.SEGMENTS);
        const originMaterial = new THREE.MeshBasicMaterial({ color: config.COLOR });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        this.helpersGroup.add(origin);
        this.objects.origin = origin;
    }

    createUnitMarkers() {
        const markerSize = 0.03; // Small sphere size for markers
        if (!this.currentSystemConfig) return;
        const colors = this.currentSystemConfig.COLORS;

        if (this.system === 'cubic') {
            // For cubic: visual X (b), Y (c), Z (a)
            const cubicAxesInfo = [
                 { posDir: new THREE.Vector3(1,0,0), length: this.scaled_b_length, color: colors.B_AXIS }, // b-axis
                 { posDir: new THREE.Vector3(0,1,0), length: this.scaled_c_length, color: colors.C_AXIS }, // c-axis
                 { posDir: new THREE.Vector3(0,0,1), length: this.scaled_a_length, color: colors.A_AXIS }  // a-axis
            ];
            cubicAxesInfo.forEach(axisInfo => {
                [-1, 1].forEach(sign => { // Markers on positive and negative ends
                    const marker = new THREE.Mesh(new THREE.SphereGeometry(markerSize, 8, 8), new THREE.MeshBasicMaterial({ color: axisInfo.color }));
                    marker.position.copy(axisInfo.posDir).multiplyScalar(axisInfo.length * sign);
                    this.helpersGroup.add(marker);
                    this.objects.markers.push(marker);
                });
            });
        } else if (this.system === 'hexagonal') {
             // For hexagonal: visual Y (c), visual X (a1), others in XZ
             const hexAxesInfo = [
                 { vec: new THREE.Vector3(0, 1, 0), length: this.scaled_c_length, color: colors.C_AXIS },
                 { vec: new THREE.Vector3(1, 0, 0), length: this.scaled_a_length, color: colors.A1_AXIS },
                 { vec: new THREE.Vector3(-0.5, 0, this.SQRT3 / 2), length: this.scaled_a_length, color: colors.A2_AXIS },
                 { vec: new THREE.Vector3(-0.5, 0, -this.SQRT3 / 2), length: this.scaled_a_length, color: colors.A3_AXIS }
             ];
              hexAxesInfo.forEach(axis => {
                 [-1, 1].forEach(sign => {
                     const marker = new THREE.Mesh(new THREE.SphereGeometry(markerSize, 8, 8), new THREE.MeshBasicMaterial({ color: axis.color }));
                     marker.position.copy(axis.vec).multiplyScalar(axis.length * sign);
                     this.helpersGroup.add(marker);
                     this.objects.markers.push(marker);
                 });
             });
        }
    }

    clear() {
         const disposeObject = (obj) => {
            if (!obj) return;
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                // Material can be an array (e.g. for multi-material objects) or single
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach(m => { 
                    if (m.map) m.map.dispose(); // Dispose texture if present
                    m.dispose(); 
                });
            }
         };

         // Iterate over all stored objects and remove them from their group, then dispose
         this.objects.axesLines.forEach(obj => { disposeObject(obj); if(obj.parent) obj.parent.remove(obj); });
         this.objects.arrowHeads.forEach(obj => { /* ArrowHelper manages its own line/cone disposal */ if(obj.parent) obj.parent.remove(obj); });
         this.objects.labels.forEach(obj => { disposeObject(obj); if(obj.parent) obj.parent.remove(obj); });
         this.objects.grids.forEach(obj => { disposeObject(obj); if(obj.parent) obj.parent.remove(obj); });
         this.objects.markers.forEach(obj => { disposeObject(obj); if(obj.parent) obj.parent.remove(obj); });
         
         if (this.objects.origin) { disposeObject(this.objects.origin); if(this.objects.origin.parent) this.objects.origin.parent.remove(this.objects.origin); }
         
         if (this.objects.shape) {
            disposeObject(this.objects.shape); // Disposes geometry and material of the shape mesh/linesegments
            if(this.objects.shape.parent) this.objects.shape.parent.remove(this.objects.shape);
            // If originalShapeGeometry was stored (e.g. for EdgesGeometry source) and is different from shape.geometry
            if (this.objects.originalShapeGeometry && this.objects.originalShapeGeometry !== (this.objects.shape.geometry)) {
                this.objects.originalShapeGeometry.dispose();
            }
         }

         // Reset the storage arrays/objects
         this.objects = {
             axesLines: [], arrowHeads: [], labels: [], grids: [],
             markers: [], origin: null, shape: null, originalShapeGeometry: null
         };
    }

    setVisibility(visible) {
        this.axesGroup.visible = visible; 
        this.labelsGroup.visible = visible;
        this.gridGroup.visible = visible; 
        this.helpersGroup.visible = visible;
        this.shapeGroup.visible = visible;
    }

    dispose() {
        this.clear(); // Dispose all managed THREE.js objects

        // Remove groups from the main scene if they were added
        if (this.scene) {
            if (this.axesGroup && this.axesGroup.parent === this.scene) this.scene.remove(this.axesGroup);
            if (this.labelsGroup && this.labelsGroup.parent === this.scene) this.scene.remove(this.labelsGroup);
            if (this.gridGroup && this.gridGroup.parent === this.scene) this.scene.remove(this.gridGroup);
            if (this.helpersGroup && this.helpersGroup.parent === this.scene) this.scene.remove(this.helpersGroup);
            if (this.shapeGroup && this.shapeGroup.parent === this.scene) this.scene.remove(this.shapeGroup);
        }

        // Nullify references to help with garbage collection
        this.scene = null; this.axisBaseConfig = null; this.currentSystemConfig = null;
        this.axesGroup = null; this.labelsGroup = null; this.gridGroup = null;
        this.helpersGroup = null; this.shapeGroup = null; this.objects = null; this.axialRatios = null;
        
        CONFIG_UTILS.debug("AxisSystem disposed.", "info");
    }

    // update method might be used for animations or dynamic label orientation if needed
    update(camera) {
        // Example: Make labels always face the camera (if they weren't sprites)
        // this.objects.labels.forEach(label => {
        //     if (label.isMesh) label.quaternion.copy(camera.quaternion);
        // });
    }
}

window.AxisSystem = AxisSystem;
