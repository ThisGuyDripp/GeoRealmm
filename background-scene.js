// background-scene.js

let scene, camera, renderer;
let backgroundMesh, backgroundMaterial; // For Nebula
let stars; // Variable for the starfield
let clock; // THREE.Clock for managing time

const backgroundPlaneScaleFactor = 1.5; 

const nebulaShaderUniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const canvasNebulaVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const canvasNebulaFragmentShader = `
    varying vec2 vUv;
    uniform float u_time;
    uniform vec2 u_resolution;

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

const canvasStarVertexShader = `
    attribute float a_size;
    attribute vec3 a_twinkle; 
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
        gl_PointSize = final_size * (800.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

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

const starShaderUniforms = {
    u_time: { value: 0.0 }
};

function createCanvasStarfield() {
    const starCount = 20000; 
    const starPositions = new Float32Array(starCount * 3); 
    const starColors = new Float32Array(starCount * 3);    
    const starSizes = new Float32Array(starCount);         
    const starTwinkles = new Float32Array(starCount * 3);  

    const starColorPalette = [
        new THREE.Color(0.7, 0.8, 1.0), new THREE.Color(1.0, 1.0, 0.9), 
        new THREE.Color(1.0, 0.9, 0.7), new THREE.Color(1.0, 0.7, 0.6), 
        new THREE.Color(0.95, 0.95, 0.95) 
    ];

    const starSphereRadiusMin = 800;
    const starSphereRadiusMax = 2500;
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
            starSizes[i] = Math.random() * 15 + 10; 
            starTwinkles[i3] = Math.random() * 0.15 + 0.05;
            starTwinkles[i3 + 1] = Math.random() * Math.PI * 2; 
            starTwinkles[i3 + 2] = 1.0;
        } else { 
            starSizes[i] = Math.random() * 6 + 3; 
            starTwinkles[i3 + 2] = 0.0; 
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    geometry.setAttribute('a_size', new THREE.BufferAttribute(starSizes, 1));
    geometry.setAttribute('a_twinkle', new THREE.BufferAttribute(starTwinkles, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: starShaderUniforms,
        vertexShader: canvasStarVertexShader,
        fragmentShader: canvasStarFragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false, 
        transparent: true,
        vertexColors: true
    });
    return new THREE.Points(geometry, material);
}

function initBackgroundScene() {
    const canvas = document.getElementById('spaceBackgroundCanvas');
    if (!canvas) {
        console.error("spaceBackgroundCanvas not found!");
        return;
    }

    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000); // Adjusted far plane for stars
    camera.position.z = 1; // Camera can be relatively close for a background plane

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // --- Nebula Background Plane ---
    const planeHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
    const planeWidth = planeHeight * camera.aspect;
    const backgroundGeometry = new THREE.PlaneGeometry(planeWidth * backgroundPlaneScaleFactor, planeHeight * backgroundPlaneScaleFactor);
    backgroundMaterial = new THREE.ShaderMaterial({
        uniforms: nebulaShaderUniforms,
        vertexShader: canvasNebulaVertexShader,
        fragmentShader: canvasNebulaFragmentShader,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.z = -Math.min(camera.far * 0.5, 1000); // Place it far but within frustum
    scene.add(backgroundMesh);

    // --- Starfield ---
    stars = createCanvasStarfield();
    scene.add(stars);

    window.addEventListener('resize', handleBackgroundSceneResize);
    animateBackgroundScene();
}

function animateBackgroundScene() {
    requestAnimationFrame(animateBackgroundScene);
    const elapsedTime = clock.getElapsedTime();
    nebulaShaderUniforms.u_time.value = elapsedTime;
    if (stars) {
        stars.material.uniforms.u_time.value = elapsedTime;
    }
    renderer.render(scene, camera);
}

function handleBackgroundSceneResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    nebulaShaderUniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);

    // Update background plane size
    if (backgroundMesh) {
        const planeHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
        const planeWidth = planeHeight * camera.aspect;
        backgroundMesh.geometry.dispose(); 
        backgroundMesh.geometry = new THREE.PlaneGeometry(planeWidth * backgroundPlaneScaleFactor, planeHeight * backgroundPlaneScaleFactor);
    }
}
document.addEventListener('DOMContentLoaded', initBackgroundScene); 