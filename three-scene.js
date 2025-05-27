// --- Three.js Scene, Earth, and Shader Background Logic ---

let scene, camera, renderer, earthModel, directionalLight;
let backgroundMesh, backgroundMaterial; // For Nebula
let stars; // Variable for the new advanced starfield
let clock; // THREE.Clock for managing time

// --- Camera Animation State ---
let isCameraAnimating = false;
let originalCameraPosition = new THREE.Vector3();
let originalCameraQuaternion = new THREE.Quaternion(); // Or original lookAt target
let originalStarsOpacity = 1.0;
let originalNebulaOpacity = 1.0;

// --- Mouse Interaction Variables for Earth Rotation ---
let isEarthDragging = false;
const previousMousePosition = {
    x: 0,
    y: 0
};

// --- FPS Counter Variables ---
let fpsDisplay;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsElapsedTime = 0; // To track time for averaging FPS

const backgroundPlaneScaleFactor = 1.5; // Scale factor to make the background plane larger

// --- UNIFORMS FOR NEBULA (BACKGROUND) SHADER ---
// These are used by the backgroundMaterial for the nebula
const nebulaShaderUniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

// --- SHADERS FROM CANVAS VERSION ---

// Vertex Shader for Nebula (from Canvas - identical to original backgroundVertexShader)
const canvasNebulaVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment Shader for Nebula (from Canvas - "Smoke Nebula")
const canvasNebulaFragmentShader = `
    varying vec2 vUv; // Normalized coordinates (0.0 to 1.0)
    uniform float u_time;
    uniform vec2 u_resolution; // u_resolution is available but not explicitly used in this version

    // Helper GLSL functions from Canvas version
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st); 
        vec2 f = fract(st); 
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }

    float fbm(vec2 st, int octaves, float persistence, float lacunarity) {
        float total = 0.0;
        float frequency = 1.0;
        float amplitude = 1.0;
        float maxValue = 0.0; 

        for (int i = 0; i < octaves; i++) {
            total += noise(st * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence; 
            frequency *= lacunarity;  
        }
        return total / maxValue; 
    }

    void main() {
        vec2 baseUv = vUv;
        baseUv += u_time * 0.008; 

        float time_slow = u_time * 0.025;
        float time_medium = u_time * 0.05;
        float time_fast = u_time * 0.1;

        float shape_scale = 1.0;
        vec2 uv_shape = baseUv * shape_scale + vec2(time_slow * 0.5, time_slow * 0.25); 
        float shape_noise = fbm(uv_shape, 4, 0.5, 2.0); 

        float edge_evolution_speed_1 = time_medium * 0.3;
        float edge_evolution_speed_2 = time_medium * 0.2;
        float edge_lower_bound = 0.3 + noise(vec2(edge_evolution_speed_1, shape_noise * 2.5)) * 0.15; 
        float edge_upper_bound = 0.55 + noise(vec2(shape_noise * 2.5 + 5.0, edge_evolution_speed_2)) * 0.15;
        edge_upper_bound = max(edge_upper_bound, edge_lower_bound + 0.1);
        float distinct_shape = smoothstep(edge_lower_bound, edge_upper_bound, shape_noise);

        float warp_main_scale = 1.5; 
        float warp_detail_scale = 3.0; 

        vec2 warp_uv_coarse = baseUv * warp_main_scale + vec2(time_medium * 0.8, time_medium * 0.5);
        vec2 warp_field_coarse = vec2(fbm(warp_uv_coarse, 3, 0.5, 2.0), 
                                      fbm(warp_uv_coarse + vec2(5.2,1.3), 3, 0.5, 2.0));
        
        vec2 warp_uv_fine = baseUv * warp_detail_scale + vec2(time_fast * 0.6, time_fast * 0.9);
        vec2 warp_field_fine = vec2(fbm(warp_uv_fine + vec2(1.7, 4.8), 4, 0.45, 2.1), 
                                    fbm(warp_uv_fine + vec2(9.1, 3.2), 4, 0.45, 2.1));

        vec2 warp_offset = (warp_field_coarse - 0.5) * 0.9 + (warp_field_fine - 0.5) * 0.4;

        float detail_texture_scale = 4.0; 
        vec2 smoke_drift_direction = vec2(0.015, 0.035); 
        vec2 smoke_drift = smoke_drift_direction * u_time * 0.5; 

        vec2 uv_detail = baseUv * detail_texture_scale + warp_offset + vec2(time_fast * 0.15, time_fast * 0.1) + smoke_drift;
        float detail_noise = fbm(uv_detail, 5, 0.4, 2.2); 

        float final_density = detail_noise * distinct_shape;

        float pulse_value = (sin(time_medium + noise(baseUv * 2.0 + time_slow) * 3.14159) + 1.0) * 0.5;
        float density_modulator = 0.7 + pulse_value * 0.3; 
        final_density *= density_modulator;
        final_density = clamp(final_density, 0.0, 1.3); 

        float color_time_shift = (sin(u_time * 0.06) + 1.0) * 0.5; 
        vec3 color_pink_red = vec3(0.6 + color_time_shift * 0.2, 0.2 - color_time_shift * 0.05, 0.3 + color_time_shift * 0.1); 
        
        vec3 color_bright_yellow = vec3(0.9, 0.8, 0.4);
        vec3 color_deep_red = vec3(0.35, 0.05, 0.1);
        vec3 color_dark_dust = vec3(0.1, 0.08, 0.07);
        vec3 color_purple_shadow = vec3(0.15, 0.1, 0.25);

        vec3 final_color = mix(color_dark_dust, color_deep_red, smoothstep(0.3, 0.6, shape_noise));
        final_color = mix(final_color, color_pink_red, smoothstep(0.15, 0.65, final_density));

        float core_brightness = pow(shape_noise, 3.5) * distinct_shape;
        final_color = mix(final_color, color_bright_yellow, smoothstep(0.35, 0.75, core_brightness * detail_noise));

        final_color = mix(final_color, color_purple_shadow, smoothstep(0.6, 0.9, noise(baseUv * 8.0 - time_slow)) * (1.0 - distinct_shape) * 0.5 );

        final_color *= (0.45 + final_density * 0.75 + core_brightness * 0.35); 
        final_color = clamp(final_color, 0.015, 1.15); 

        float alpha = distinct_shape * smoothstep(0.05, 0.65, final_density); 
        alpha = pow(alpha, 1.3); 

        gl_FragColor = vec4(final_color, alpha * 0.75); 
    }
`;

// Vertex Shader for Stars (from Canvas)
const canvasStarVertexShader = `
    attribute float a_size;
    attribute vec3 a_twinkle; // x: twinkle_speed, y: twinkle_offset, z: is_twinkling (0 or 1)
    uniform float u_time;
    varying vec3 vColor;
    varying float v_alpha_mod;

    void main() {
        vColor = color; 
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        float base_size = a_size;
        float twinkle_factor = 0.0;
        v_alpha_mod = 1.0; 

        if (a_twinkle.z > 0.5) {
            twinkle_factor = (sin(u_time * a_twinkle.x + a_twinkle.y) + 1.0) * 0.5; 
            twinkle_factor = 0.5 + pow(twinkle_factor, 4.0); 
            v_alpha_mod = 0.7 + twinkle_factor * 0.5;
        }

        float final_size = base_size * (1.0 + (twinkle_factor - 1.0) * 0.5); 
        gl_PointSize = final_size * (800.0 / -mvPosition.z); // Distance attenuation
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment Shader for Stars (from Canvas)
const canvasStarFragmentShader = `
    varying vec3 vColor;
    varying float v_alpha_mod;

    void main() {
        float dist = distance(gl_PointCoord, vec2(0.5)); 
        float strength = 1.0 - smoothstep(0.0, 0.5, dist);
        if (strength < 0.01) discard;
        gl_FragColor = vec4(vColor, strength * v_alpha_mod);
    }
`;

// --- UNIFORMS FOR STAR SHADER ---
// Separate uniforms object for star material for clarity, though u_time is the primary one.
const starShaderUniforms = {
    u_time: { value: 0.0 }
};


// --- ADAPTED STARFIELD CREATION FUNCTION (FROM CANVAS) ---
function createCanvasStarfield() {
    const starCount = 35000; 
    const starPositions = new Float32Array(starCount * 3); 
    const starColors = new Float32Array(starCount * 3);    
    const starSizes = new Float32Array(starCount);         
    const starTwinkles = new Float32Array(starCount * 3);  

    const starColorPalette = [ // Using THREE.Color directly as it's available
        new THREE.Color(0.7, 0.8, 1.0), new THREE.Color(1.0, 1.0, 0.9), 
        new THREE.Color(1.0, 0.9, 0.7), new THREE.Color(1.0, 0.7, 0.6), 
        new THREE.Color(0.95, 0.95, 0.95) 
    ];

    const starSphereRadiusMin = 1500; // These define a spherical distribution
    const starSphereRadiusMax = 4000; // This will be different from original three-scene.js star box
    const largeStarThreshold = 0.9; 

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3; 
        
        const phi = Math.random() * Math.PI * 2;
        const costheta = Math.random() * 2 - 1;
        const theta = Math.acos(costheta);
        const u = Math.random(); 
        const radius = starSphereRadiusMin + (starSphereRadiusMax - starSphereRadiusMin) * Math.cbrt(u);

        starPositions[i3] = radius * Math.sin(theta) * Math.cos(phi);
        starPositions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
        starPositions[i3 + 2] = radius * Math.cos(theta);

        const color = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
        const brightnessVariation = 0.7 + Math.random() * 0.3;
        starColors[i3] = color.r * brightnessVariation;
        starColors[i3 + 1] = color.g * brightnessVariation;
        starColors[i3 + 2] = color.b * brightnessVariation;

        const sizeRoll = Math.random();
        if (sizeRoll > largeStarThreshold) { 
            starSizes[i] = Math.random() * 20 + 15; 
            starTwinkles[i3] = Math.random() * 0.15 + 0.05;   // Slow twinkle speed
            starTwinkles[i3 + 1] = Math.random() * Math.PI * 2; 
            starTwinkles[i3 + 2] = 1.0; // Is twinkling flag set to true
        } else { 
            starSizes[i] = Math.random() * 8 + 5; 
            starTwinkles[i3 + 2] = 0.0; 
        }
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('a_size', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('a_twinkle', new THREE.BufferAttribute(starTwinkles, 3));

    const newStarMaterial = new THREE.ShaderMaterial({
        uniforms: starShaderUniforms, // Use the separate uniforms object for stars
        vertexShader: canvasStarVertexShader,
        fragmentShader: canvasStarFragmentShader,
        vertexColors: true,     
        transparent: true,      
        blending: THREE.AdditiveBlending, 
        depthWrite: false,
        opacity: 1.0 // Store initial opacity
    });

    const newStarField = new THREE.Points(starGeometry, newStarMaterial);
    // Set renderOrder for stars here, to be behind nebula
    newStarField.renderOrder = -2; 
    return newStarField;
}


function initThreeJS() { 
    // const earthContainer = document.getElementById('earthContainer'); // Not directly used for canvas parent in this script
    // const earthContainerWrapper = document.getElementById('earthContainerWrapper'); 

    scene = new THREE.Scene();
    clock = new THREE.Clock(); 
    
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 10000); // Increased near plane to 1, far plane 10000
    camera.position.set(0, 0.2, 4.5); 
    originalCameraPosition.copy(camera.position);
    originalCameraQuaternion.copy(camera.quaternion);
    camera.lookAt(0, 0, 0);

    const canvas = document.getElementById('spaceBackgroundCanvas'); 
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: false // Explicitly disable logarithmic depth buffer
    });
    renderer.setSize(window.innerWidth, window.innerHeight); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.sortObjects = false; // Disable automatic sorting, rely on renderOrder
    
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "-1"; 

    fpsDisplay = document.getElementById('fpsCounter'); 
    lastFrameTime = performance.now(); 
    frameCount = 0;
    fpsElapsedTime = 0;

    // --- Shader Background (Nebula) Setup ---
    // Plane sizing logic remains the same, fitting to camera view, which is good.
    const fov = camera.fov * (Math.PI / 180);
    const bgPlaneZ = -100; // Pushed nebula much further back (was -20)
    let bgPlaneHeight = 2 * Math.tan(fov / 2) * Math.abs(bgPlaneZ);
    let bgPlaneWidth = bgPlaneHeight * camera.aspect;

    bgPlaneHeight *= backgroundPlaneScaleFactor;
    bgPlaneWidth *= backgroundPlaneScaleFactor;

    const backgroundPlaneGeometry = new THREE.PlaneGeometry(bgPlaneWidth, bgPlaneHeight);
    // Use the new nebula shaders
    backgroundMaterial = new THREE.ShaderMaterial({
        uniforms: nebulaShaderUniforms, 
        vertexShader: canvasNebulaVertexShader,   
        fragmentShader: canvasNebulaFragmentShader, 
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false, 
        depthTest: false,
        premultipliedAlpha: false, 
        blending: THREE.NormalBlending,
        opacity: 1.0 // Store initial opacity
    });

    backgroundMesh = new THREE.Mesh(backgroundPlaneGeometry, backgroundMaterial);
    backgroundMesh.position.z = bgPlaneZ; 
    backgroundMesh.renderOrder = -1; // Stars are -2, Earth is 0 (or higher now)
    scene.add(backgroundMesh); // DIAGNOSTIC: Restore nebula to scene

    // --- Starfield Setup (Using the new advanced starfield) ---
    stars = createCanvasStarfield(); // This function now returns the configured THREE.Points object
    // renderOrder is set inside createCanvasStarfield
    scene.add(stars);


    // --- Mouse Event Listeners for Earth Rotation ---
    renderer.domElement.addEventListener('mousedown', (e) => {
        if (earthModel) { // Only drag if earthModel is loaded
            isEarthDragging = true;
            previousMousePosition.x = e.clientX;
            previousMousePosition.y = e.clientY;
        }
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isEarthDragging && earthModel) {
            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };

            // Adjust earth rotation based on mouse movement
            // The sensitivity factor (e.g., 0.005) can be tuned
            earthModel.rotation.y += deltaMove.x * 0.005;
            earthModel.rotation.x += deltaMove.y * 0.005;

            previousMousePosition.x = e.clientX;
            previousMousePosition.y = e.clientY;
        }
    });

    const stopDragging = () => {
        isEarthDragging = false;
    };
    renderer.domElement.addEventListener('mouseup', stopDragging);
    renderer.domElement.addEventListener('mouseleave', stopDragging);
    // Add touch event listeners for mobile compatibility
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (earthModel && e.touches.length === 1) {
            isEarthDragging = true;
            previousMousePosition.x = e.touches[0].clientX;
            previousMousePosition.y = e.touches[0].clientY;
        }
    }, { passive: true }); // Use passive for performance if not calling preventDefault

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (isEarthDragging && earthModel && e.touches.length === 1) {
            const deltaMove = {
                x: e.touches[0].clientX - previousMousePosition.x,
                y: e.touches[0].clientY - previousMousePosition.y
            };
            earthModel.rotation.y += deltaMove.x * 0.005;
            earthModel.rotation.x += deltaMove.y * 0.005;
            previousMousePosition.x = e.touches[0].clientX;
            previousMousePosition.y = e.touches[0].clientY;
        }
    }, { passive: true });

    renderer.domElement.addEventListener('touchend', stopDragging);
    renderer.domElement.addEventListener('touchcancel', stopDragging);


    // --- Earth Lighting and Model (Existing logic) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Softer ambient light
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Brighter directional light
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const loader = new THREE.GLTFLoader(); // GLTFLoader should be part of THREE object from CDN
    const earthLoadingIndicator = document.getElementById('earthLoadingIndicator');
    if (earthLoadingIndicator) earthLoadingIndicator.style.display = 'flex';

    loader.load('earth.glb', (gltf) => { 
        earthModel = gltf.scene;

        earthModel.traverse(function (child) {
            if (child.isMesh) {
                if (child.material) {
                    console.log(`Earth Mesh Child: Name: '${child.name}', Material Name: '${child.material.name}', Material Type: '${child.material.type}'`);

                    const matName = child.material.name;

                    if (matName === 'phong1') {
                        // Apply settings based on user observation for tint issue
                        child.material.transparent = true;     // KEY: Force transparent rendering path
                        child.material.opacity = 0.999;        // Visually opaque, but technically < 1.0
                        child.material.depthWrite = true;      // Should still occlude
                        child.material.depthTest = true;
                        child.material.blending = THREE.NormalBlending;
                        // child.material.alphaTest = 0.01; // Not typically needed if opacity < 1 and transparent=true
                        child.renderOrder = 0; 
                        console.log(`Applied TRANSPARENT path settings to material: ${matName} (renderOrder 0)`);
                    } else if (matName === 'lambert7') {
                        // Clouds / Outer Atmosphere (transparent)
                        child.material.transparent = true;
                        child.material.opacity = 1.0; 
                        child.material.alphaTest = 0.1; 
                        child.material.depthWrite = false;
                        child.material.depthTest = true;
                        child.material.blending = THREE.NormalBlending;
                        child.renderOrder = 2;
                        console.log(`Applied transparent settings with alphaTest to material: ${matName} (renderOrder 2)`);
                    } else if (matName === 'lambert6') {
                        // Inner Atmosphere / Haze (transparent)
                        child.material.transparent = true;
                        child.material.opacity = 1.0; 
                        child.material.alphaTest = 0.01; 
                        child.material.depthWrite = false;
                        child.material.depthTest = true;
                        child.material.blending = THREE.NormalBlending;
                        child.renderOrder = 1;
                        console.log(`Applied transparent settings with alphaTest to material: ${matName} (renderOrder 1)`);
                    } else {
                        // Default for any other materials - treat as opaque but use transparent path like phong1 if they exist
                        // This else block might not be strictly necessary if phong1 is the only main surface material.
                        // If other opaque surfaces exist and show tinting, they might need similar treatment.
                        child.material.transparent = true; 
                        child.material.opacity = 0.999;
                        child.material.depthWrite = true;
                        child.material.depthTest = true;
                        child.material.blending = THREE.NormalBlending;
                        child.renderOrder = 0; 
                        console.log(`Applied TRANSPARENT path settings to DEFAULT material: ${matName} (renderOrder 0)`);
                    }
                    child.material.needsUpdate = true;  // Ensure changes apply
                }
            }
        });
        
        earthModel.rotation.y = Math.PI * 0.1;
        earthModel.rotation.x = Math.PI * 0.05;
        
        const box = new THREE.Box3().setFromObject(earthModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const desiredEarthRadius = 1.0;
        let scale = (desiredEarthRadius * 2) / maxDim;
        if (maxDim === 0 || !isFinite(scale) || scale <= 0) scale = 1.0; 
        earthModel.scale.set(scale, scale, scale);
        earthModel.position.copy(center).multiplyScalar(-scale); 
        scene.add(earthModel); // Earth will render on top due to default renderOrder (0) and depth test
        if (earthLoadingIndicator) earthLoadingIndicator.style.display = 'none';
    }, undefined, (error) => {
        console.error('Error loading 3D model (earth.glb):', error);
        if (earthLoadingIndicator) {
            earthLoadingIndicator.innerHTML = `<p style="color:var(--accent-secondary);">Error loading 3D Earth.</p>`;
        }
    });
    console.log('Three.js Scene Initialized (with Integrated Canvas Effects).');
}

// --- Earth Zoom/Reset Functions ---
const ANIMATION_DURATION = 1500; // ms

function zoomToEarthLocation(targetLat, targetLon, zoomDistance, onCompleteCallback) {
    console.log("[Three.js] zoomToEarthLocation called.", 
        "isCameraAnimating:", isCameraAnimating, 
        "earthModel loaded:", !!earthModel, 
        "Target:", targetLat, targetLon, zoomDistance); // Log A
    if (isCameraAnimating || !earthModel) {
        console.warn("[Three.js] Zoom aborted. Animating or Earth model not ready."); // Log B
        if(onCompleteCallback && isCameraAnimating) { /* If animating, maybe call callback immediately? Or not? */ }
        else if(onCompleteCallback && !earthModel) { onCompleteCallback(); } // If no model, proceed to switch
        return;
    }
    isCameraAnimating = true;
    isEarthDragging = false; // Disable dragging during animation
    console.log("[Three.js] Starting zoom animation."); // Log C

    const targetQuaternion = new THREE.Quaternion();
    // Convert lat/lon to spherical coordinates, then to Cartesian for lookAt
    // Positive Y up, Z towards viewer initially, X to the right
    const phi = THREE.MathUtils.degToRad(90 - targetLat); // Polar angle from Y-axis
    const theta = THREE.MathUtils.degToRad(targetLon + 90); // Azimuthal angle from Z-axis (towards positive X)

    // Calculate a point on the sphere to look at (this is simplified)
    const lookAtPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    earthModel.worldToLocal(lookAtPosition); // If earthModel has its own rotation, this might be needed

    // Target camera position: slightly offset from the Earth's surface along the lookAt vector
    const cameraTargetPosition = new THREE.Vector3()
        .copy(lookAtPosition)
        .normalize()
        .multiplyScalar(earthModel.scale.x + zoomDistance) // earthModel.scale.x is an approximation of radius
        .add(earthModel.position); // Add Earth's world position
    
    // To orient the camera correctly, we often make it lookAt the center of the target area
    // For simplicity, we make the Earth rotate to face the camera, then camera moves.
    // More advanced: calculate camera quaternion to look at the target point with a specific up vector.

    // Rotate Earth to face the target towards the default camera view (Z-axis)
    // This is an approximation and might need refinement for precise targeting.
    const earthTargetRotation = new THREE.Euler(0, -theta, phi - Math.PI / 2);
    // Instead of directly setting earth rotation, calculate camera quaternion

    // Determine target camera orientation (quaternion)
    const tempCamera = camera.clone(); // Use a temporary camera to calculate lookAt
    tempCamera.position.copy(cameraTargetPosition);
    tempCamera.lookAt(earthModel.position); // Look at the center of the Earth for simplicity
    targetQuaternion.copy(tempCamera.quaternion);

    let startTime = null;

    function animateZoom(timestamp) {
        if (!startTime) {
            startTime = timestamp;
            console.log("[Three.js] animateZoom loop started."); // Log D
        }
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1);
        const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in-out

        camera.position.lerpVectors(originalCameraPosition, cameraTargetPosition, easedProgress);
        camera.quaternion.slerpQuaternions(originalCameraQuaternion, targetQuaternion, easedProgress);
        
        if (stars && stars.material) stars.material.opacity = originalStarsOpacity * (1 - easedProgress);
        if (backgroundMesh && backgroundMesh.material) backgroundMesh.material.opacity = originalNebulaOpacity * (1 - easedProgress);

        if (progress < 1) {
            requestAnimationFrame(animateZoom);
        } else {
            console.log("[Three.js] animateZoom loop finished."); // Log E
            if (stars) stars.visible = false;
            if (backgroundMesh) backgroundMesh.visible = false;
            isCameraAnimating = false;
            if (onCompleteCallback) onCompleteCallback();
        }
    }
    requestAnimationFrame(animateZoom);
}

function resetEarthZoom(onCompleteCallback) {
    if (isCameraAnimating) return;
    isCameraAnimating = true;

    if (stars) stars.visible = true;
    if (backgroundMesh) backgroundMesh.visible = true;
    
    // Use stored original opacities
    const targetStarsOpacity = originalStarsOpacity;
    const targetNebulaOpacity = originalNebulaOpacity;
    const currentStarsOpacity = stars && stars.material ? stars.material.opacity : 0;
    const currentNebulaOpacity = backgroundMesh && backgroundMesh.material ? backgroundMesh.material.opacity : 0;

    let startTime = null;

    function animateReset(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1);
        const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in-out

        camera.position.lerpVectors(camera.position, originalCameraPosition, easedProgress);
        camera.quaternion.slerpQuaternions(camera.quaternion, originalCameraQuaternion, easedProgress);

        if (stars && stars.material) stars.material.opacity = currentStarsOpacity + (targetStarsOpacity - currentStarsOpacity) * easedProgress;
        if (backgroundMesh && backgroundMesh.material) backgroundMesh.material.opacity = currentNebulaOpacity + (targetNebulaOpacity - currentNebulaOpacity) * easedProgress;

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        } else {
            isEarthDragging = true; // Re-enable dragging
            isCameraAnimating = false;
            if (onCompleteCallback) onCompleteCallback();
        }
    }
    requestAnimationFrame(animateReset);
}

// API for script.js to call
window.geoRealmThreeD = {
    zoomToLocation: zoomToEarthLocation,
    resetZoom: resetEarthZoom,
    isAnimating: () => isCameraAnimating
};

function animateThreeJS() { 
    requestAnimationFrame(animateThreeJS);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; 
    lastFrameTime = currentTime;
    fpsElapsedTime += deltaTime;
    frameCount++;

    if (fpsElapsedTime >= 1.0) {
        if (fpsDisplay) { 
            const fps = Math.round(frameCount / fpsElapsedTime);
            fpsDisplay.textContent = `FPS: ${fps}`;
        }
        frameCount = 0;
        fpsElapsedTime -= 1.0; 
    }
    
    const elapsedTimeForShader = clock.getElapsedTime(); 

    // Update Nebula uniforms
    if (backgroundMaterial && nebulaShaderUniforms.u_time) { // Check specific uniform
        nebulaShaderUniforms.u_time.value = elapsedTimeForShader; 
    }

    // Update Star uniforms
    if (stars && stars.material && stars.material.uniforms && stars.material.uniforms.u_time) {
        stars.material.uniforms.u_time.value = elapsedTimeForShader;
    }

    // Starfield rotation from Canvas version
    if (stars) {
        stars.rotation.y += 0.00003;
        stars.rotation.x += 0.000015;
    }

    if (earthModel) {
        earthModel.rotation.y += 0.0008;
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function handleThreeSceneResize() { 
    if (camera && renderer) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        
        if (nebulaShaderUniforms && nebulaShaderUniforms.u_resolution) { // Check specific uniform
            nebulaShaderUniforms.u_resolution.value.set(newWidth, newHeight);
        }

        if (backgroundMesh && backgroundMesh.geometry.type === "PlaneGeometry") {
            const fov = camera.fov * (Math.PI / 180);
            const bgPlaneZ = backgroundMesh.position.z; 
            let newBgPlaneHeight = 2 * Math.tan(fov / 2) * Math.abs(bgPlaneZ);
            let newBgPlaneWidth = newBgPlaneHeight * camera.aspect;

            newBgPlaneHeight *= backgroundPlaneScaleFactor;
            newBgPlaneWidth *= backgroundPlaneScaleFactor;
            
            backgroundMesh.geometry.dispose(); 
            backgroundMesh.geometry = new THREE.PlaneGeometry(newBgPlaneWidth, newBgPlaneHeight);
        }
    }
}

// It's assumed that initThreeJS will be called by the HTML, for example:
// if (document.readyState === 'complete' || document.readyState === 'interactive') {
//     initThreeJS();
//     animateThreeJS();
//     window.addEventListener('resize', handleThreeSceneResize);
// } else {
//     document.addEventListener('DOMContentLoaded', () => {
//         initThreeJS();
//         animateThreeJS();
//         window.addEventListener('resize', handleThreeSceneResize);
//     });
// }
// For the purpose of this file, we just define the functions.
// The calling mechanism should be in the HTML or a master script.