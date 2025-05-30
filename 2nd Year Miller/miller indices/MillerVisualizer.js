// MillerVisualizer.js

class MillerVisualizer {
    constructor(containerId) {
        if (!window.THREE || !window.CONFIG || !window.InterceptCalculator || !window.AxisSystem) {
            throw new Error('MillerVisualizer: Missing required dependencies (THREE, CONFIG, InterceptCalculator, AxisSystem).');
        }
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error('MillerVisualizer: Container not found: ' + containerId);
        }
        this.config = window.CONFIG;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.axisSystem = null;
        this.calculator = new window.InterceptCalculator();
        this.planeMesh = null;
        this.intersectionPointMeshes = [];
        this.animationFrame = null;

        this.initSceneCameraRenderer();
    }

    initSceneCameraRenderer() {
        try {
            CONFIG_UTILS.debug('MillerVisualizer: Initializing Scene, Camera, Renderer...', 'info');
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupControls();
            this.setupEventListeners();
            this.animate();
            CONFIG_UTILS.debug('MillerVisualizer: Scene, Camera, Renderer initialized.', 'info');
        } catch (error) {
            console.error('MillerVisualizer: Core setup error:', error);
            CONFIG_UTILS.debug('MillerVisualizer: Core setup error - ' + error.message, 'error', error);
            this.dispose();
            throw error;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.SCENE.BACKGROUND_COLOR);
    }

    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            this.config.SCENE.FOV, aspect, this.config.SCENE.NEAR, this.config.SCENE.FAR
        );
        this.resetCameraPosition();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.PERFORMANCE.antialiasing,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.PERFORMANCE.maxPixelRatio || 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(this.config.SCENE.LIGHTING.ambient.color, this.config.SCENE.LIGHTING.ambient.intensity);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(this.config.SCENE.LIGHTING.point.color, this.config.SCENE.LIGHTING.point.intensity);
        pointLight.position.set(this.config.SCENE.LIGHTING.point.position.x, this.config.SCENE.LIGHTING.point.position.y, this.config.SCENE.LIGHTING.point.position.z);
        this.scene.add(pointLight);
    }

    setupControls() {
        if (!window.OrbitControls) {
            throw new Error('OrbitControls not available.');
        }
        this.controls = new window.OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(this.controls, this.config.SCENE.CONTROLS);
        this.controls.update();
    }

    setupEventListeners() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(this.container);
        } else {
            this.boundResizeHandler = this.handleResize.bind(this);
            window.addEventListener('resize', this.boundResizeHandler);
        }
    }

    handleResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        if (!this.renderer) return;
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
        if (this.controls) this.controls.update();
        if (this.config.PERFORMANCE.autoRotate && this.axisSystem && this.axisSystem.shapeGroup && this.axisSystem.shapeGroup.children.length > 0) {
             this.axisSystem.shapeGroup.rotation.y += 0.001;
        }
        this.renderer.render(this.scene, this.camera);
    }

    visualize(params) {
        try {
            CONFIG_UTILS.debug(`MillerVisualizer: Visualizing for system: ${params.system}, params: (${params.h},${params.k},${params.i !== undefined ? params.i + ',' : ''}${params.l})`, 'info', params.axialRatios);

            if (!this.axisSystem) {
                this.axisSystem = new window.AxisSystem(this.scene, params.system, params.axialRatios);
            } else {
                this.axisSystem.setSystem(params.system, params.axialRatios);
            }

            this.clearVisualizationElements();
            const calculationResult = this.calculator.calculateIntercepts(params);
            this.createPlane(calculationResult);
            this.createIntersectionPoints(calculationResult.intersections);

            CONFIG_UTILS.debug('MillerVisualizer: Visualization complete.', 'info');
            return true;
        } catch (error) {
            console.error('MillerVisualizer: Visualization error:', error);
            CONFIG_UTILS.debug('MillerVisualizer: Visualization error - ' + error.message, 'error', error);
            this.clearVisualizationElements();
            return false;
        }
    }

    createPlane(result) {
        if (!result || !result.normal || !result.intersections) {
             CONFIG_UTILS.debug('MillerVisualizer: Cannot create plane - invalid calculation result.', 'error', result);
             return;
        }

        const planeConfig = this.config.PLANE;
        const scaled_a = this.axisSystem.scaled_a_length;
        const scaled_b = this.axisSystem.scaled_b_length;
        const scaled_c = this.axisSystem.scaled_c_length;

        let geometry;
        const params = result.parameters;
        const visualIntersects = result.intersections;

        CONFIG_UTILS.debug(`Creating plane for system: ${params.system}, indices: (${params.h},${params.k},${params.i !== undefined ? params.i+',' : ''}${params.l})`, 'info');
        CONFIG_UTILS.debug('Visual Intercepts for plane creation:', 'info', JSON.parse(JSON.stringify(visualIntersects)));

        if (params.system === 'cubic') {
            const validCubicIntersects = Object.values(visualIntersects).filter(p => p instanceof THREE.Vector3);
            if (validCubicIntersects.length === 3) {
                geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array(validCubicIntersects.flatMap(v => v.toArray()));
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                geometry.setIndex([0, 1, 2]);
            } else if (validCubicIntersects.length === 1 && validCubicIntersects[0]) {
                if (visualIntersects.x) { 
                    geometry = new THREE.PlaneGeometry(scaled_c, scaled_a);
                } else if (visualIntersects.y) {
                    geometry = new THREE.PlaneGeometry(scaled_b, scaled_a);
                } else if (visualIntersects.z) {
                    geometry = new THREE.PlaneGeometry(scaled_b, scaled_c);
                } else { 
                    geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                }
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.copy(validCubicIntersects[0]); 
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            } else { 
                geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.copy(result.center);
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            }
        } else if (params.system === 'hexagonal') {
            const cPoint = visualIntersects.c;
            const a1Point = visualIntersects.a1;
            const a2Point = visualIntersects.a2;
            const a3Point = visualIntersects.a3;
            const finiteAIntersects = [a1Point, a2Point, a3Point].filter(p => p instanceof THREE.Vector3);
            const hexShapeConfig = CONFIG_UTILS.getShapeConfig('hexagonal');
            const effectiveRadiusForPlane = this.axisSystem.scaled_a_length * (hexShapeConfig.radiusFactor || 1.0);
            const effectiveHalfHeightForPlane = (this.axisSystem.scaled_c_length * (hexShapeConfig.heightFactor || 1.0)) / 2;

            if (params.h === 0 && params.k === 0 && params.i === 0 && params.l !== 0 && cPoint) {
                CONFIG_UTILS.debug('Hex Plane: Basal (000l)', 'info');
                const shape = new THREE.Shape();
                for (let j = 0; j < 6; j++) {
                    const angle = (Math.PI / 3) * j;
                    const x = effectiveRadiusForPlane * Math.cos(angle);
                    const z_prime = effectiveRadiusForPlane * Math.sin(angle);
                    if (j === 0) shape.moveTo(x, z_prime); else shape.lineTo(x, z_prime);
                }
                shape.closePath();
                geometry = new THREE.ShapeGeometry(shape);
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.set(0, cPoint.y, 0); 
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            } else if (params.l === 0 && finiteAIntersects.length >= 2) {
                CONFIG_UTILS.debug('Hex Plane: Prism (hki0)', 'info');
                let p1_basal = null, p2_basal = null;
                if (finiteAIntersects.length >= 2) {
                    p1_basal = finiteAIntersects[0];
                    for(let j=1; j < finiteAIntersects.length; j++) {
                        if (finiteAIntersects[j].distanceToSquared(p1_basal) > 1e-4) {
                            p2_basal = finiteAIntersects[j];
                            break;
                        }
                    }
                }
                if (p1_basal && p2_basal) {
                    geometry = new THREE.BufferGeometry();
                    const rectVertices = new Float32Array([
                        p1_basal.x,  effectiveHalfHeightForPlane, p1_basal.z,
                        p1_basal.x, -effectiveHalfHeightForPlane, p1_basal.z,
                        p2_basal.x,  effectiveHalfHeightForPlane, p2_basal.z,
                        p2_basal.x, -effectiveHalfHeightForPlane, p2_basal.z
                    ]);
                    geometry.setAttribute('position', new THREE.BufferAttribute(rectVertices, 3));
                    geometry.setIndex([0, 1, 2, 1, 3, 2]);
                } else {
                    CONFIG_UTILS.debug('Hex Prism: Not enough distinct finite a-intercepts for rectangle, fallback.', 'warn');
                    geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                    this.planeMesh = new THREE.Mesh(geometry, null); 
                }
            } else if (params.l !== 0 && cPoint && finiteAIntersects.length >= 2) {
                 CONFIG_UTILS.debug('Hex Plane: Pyramidal/General (hkil)', 'info');
                 let p_a_1 = null, p_a_2 = null;
                 if (finiteAIntersects.length >= 2) {
                    p_a_1 = finiteAIntersects[0];
                    for(let j=1; j < finiteAIntersects.length; j++) {
                        if (finiteAIntersects[j].distanceToSquared(p_a_1) > 1e-4) {
                            p_a_2 = finiteAIntersects[j];
                            break;
                        }
                    }
                 }
                if (p_a_1 && p_a_2) {
                    geometry = new THREE.BufferGeometry();
                    const triVertices = new Float32Array([
                        cPoint.x, cPoint.y, cPoint.z,
                        p_a_1.x, p_a_1.y, p_a_1.z, 
                        p_a_2.x, p_a_2.y, p_a_2.z,
                    ]);
                    geometry.setAttribute('position', new THREE.BufferAttribute(triVertices, 3));
                    geometry.setIndex([0, 1, 2]); 
                } else {
                     CONFIG_UTILS.debug('Hex Pyramidal: Not enough distinct a-intercepts for triangle, fallback.', 'warn');
                     geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                     this.planeMesh = new THREE.Mesh(geometry, null); 
                }
            } else { 
                CONFIG_UTILS.debug('Hex Plane: Fallback geometry', 'info');
                geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                this.planeMesh = new THREE.Mesh(geometry, null); 
            }
            if (this.planeMesh && (geometry instanceof THREE.PlaneGeometry || (geometry instanceof THREE.ShapeGeometry && !(params.h === 0 && params.k === 0 && params.i === 0 && params.l !== 0)))) {
                this.planeMesh.position.copy(result.center);
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            }
        } else {
            geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
            this.planeMesh = new THREE.Mesh(geometry, null);
            this.planeMesh.position.copy(result.center);
            this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
        }

        if (geometry && !geometry.attributes.normal && !(geometry instanceof THREE.PlaneGeometry) && !(geometry instanceof THREE.ShapeGeometry)) {
            geometry.computeVertexNormals(); 
        } else if (geometry && (geometry instanceof THREE.ShapeGeometry || geometry instanceof THREE.PlaneGeometry)) {
             geometry.computeVertexNormals();
        }

        const material = new THREE.MeshPhongMaterial({
            color: planeConfig.COLOR, opacity: planeConfig.OPACITY,
            transparent: planeConfig.OPACITY < 1.0, side: THREE.DoubleSide,
            shininess: planeConfig.STYLES.shininess || 30,
            wireframe: planeConfig.STYLES.wireframe || false
        });
        
        // ---- Z-FIGHTING FIX: TRY MORE AGGRESSIVE OFFSET ----
        material.polygonOffset = true;
        material.polygonOffsetFactor = -5; // Increased negative factor
        material.polygonOffsetUnits = -1;  // Units can often be kept smaller, factor has more impact
        // ---- END OF Z-FIGHTING FIX ----

        if (!this.planeMesh) { 
            this.planeMesh = new THREE.Mesh(geometry, material);
        } else { 
            if(this.planeMesh.geometry && this.planeMesh.geometry !== geometry) this.planeMesh.geometry.dispose();
            this.planeMesh.geometry = geometry;
            if (this.planeMesh.material && this.planeMesh.material !== material) {
                const oldMaterials = Array.isArray(this.planeMesh.material) ? this.planeMesh.material : [this.planeMesh.material];
                oldMaterials.forEach(m => m.dispose());
            }
            this.planeMesh.material = material;
        }
        this.scene.add(this.planeMesh);
    }

    createIntersectionPoints(intersections) {
        if (!intersections) return;
        const pointConfig = this.config.HELPERS.INTERSECTION_POINT;
        const sphereGeometry = new THREE.SphereGeometry(pointConfig.SIZE, pointConfig.SEGMENTS, pointConfig.SEGMENTS);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: pointConfig.COLOR });

        Object.values(intersections).forEach(point => {
            if (point instanceof THREE.Vector3) {
                const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
                sphereMesh.position.copy(point);
                this.scene.add(sphereMesh);
                this.intersectionPointMeshes.push(sphereMesh);
            }
        });
    }

    clearVisualizationElements() {
        if (this.planeMesh) {
            this.scene.remove(this.planeMesh);
            if (this.planeMesh.geometry) this.planeMesh.geometry.dispose();
            if (this.planeMesh.material) {
                const materials = Array.isArray(this.planeMesh.material) ? this.planeMesh.material : [this.planeMesh.material];
                materials.forEach(m => m.dispose());
            }
            this.planeMesh = null;
        }

        let sharedGeo, sharedMat;
        if (this.intersectionPointMeshes.length > 0) {
            sharedGeo = this.intersectionPointMeshes[0].geometry;
            sharedMat = this.intersectionPointMeshes[0].material;
        }
        this.intersectionPointMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.intersectionPointMeshes = [];
        if (sharedGeo) sharedGeo.dispose();
        if (sharedMat) sharedMat.dispose();
    }

    resetCameraPosition() {
         const pos = this.config.SCENE.CAMERA_POSITION;
         this.camera.position.set(pos.x, pos.y, pos.z);
         this.camera.lookAt(0, 0, 0);
         if (this.controls) {
             this.controls.target.set(0, 0, 0);
             this.controls.update();
         }
    }

    dispose() {
        CONFIG_UTILS.debug('MillerVisualizer: Disposing...', 'info');
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        } else if (this.boundResizeHandler) {
            window.removeEventListener('resize', this.boundResizeHandler);
        }
        if (this.axisSystem) this.axisSystem.dispose();
        this.clearVisualizationElements(); 
        if (this.controls) this.controls.dispose();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                 try { this.container.removeChild(this.renderer.domElement); }
                 catch (e) { CONFIG_UTILS.debug('Error removing renderer DOM element:', 'warn', e); }
            }
        }
        this.scene = null; this.camera = null; this.renderer = null; this.controls = null;
        this.axisSystem = null; this.config = null; this.calculator = null;
        this.intersectionPointMeshes = []; this.planeMesh = null;
        CONFIG_UTILS.debug('MillerVisualizer: Disposed successfully.', 'info');
    }
}
window.MillerVisualizer = MillerVisualizer;
