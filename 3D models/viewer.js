let scene, camera, renderer, controls, loader;
let modelSelect, viewerContainer, modelCanvas, loadingIndicator;
let currentModel;

// This would ideally be fetched or dynamically discovered
// For now, let's hardcode a few potential model names
// We'll later populate this by listing files from the '3D models' directory
const modelFiles = [
    'tetrahedron.glb',
    'tetragonal trapezohedral.glb',
    'tetragonal scalenohedral.glb',
    'tetragonal disphenoidal.glb',
    'diamond.glb',
    'ditetragonal dipyramidal (1).glb'
]; 

function init() {
    modelSelect = document.getElementById('modelSelect');
    viewerContainer = document.getElementById('viewerContainer');
    modelCanvas = document.getElementById('modelCanvas');
    loadingIndicator = document.getElementById('loadingIndicator');

    if (!modelSelect || !viewerContainer || !modelCanvas || !loadingIndicator) {
        console.error("Required HTML elements not found for 3D viewer.");
        return;
    }

    // --- Scene Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222); // Match viewerContainer background

    // --- Camera Setup ---
    camera = new THREE.PerspectiveCamera(75, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 5); // Adjusted initial camera position

    // --- Renderer Setup ---
    renderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true });
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding; // For GLTF models

    // --- Controls Setup ---
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.target.set(0, 0.5, 0); // Adjust target to center typical models better

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, -5, -5);
    scene.add(pointLight);

    // --- GLTF Loader ---
    loader = new THREE.GLTFLoader();

    // --- Populate Model Select Dropdown ---
    // This part will be enhanced later to list files from the directory
    if (modelFiles.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No models found (add to viewer.js)";
        modelSelect.appendChild(option);
        modelSelect.disabled = true;
    } else {
        modelFiles.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName; // Assuming files are in the same directory as viewer.html
            option.textContent = fileName.replace(/\.glb$/i, '').replace(/_/g, ' '); // Clean up name
            modelSelect.appendChild(option);
        });
        modelSelect.addEventListener('change', onModelSelectChange);
        if (modelFiles.length > 0) {
            loadModel(modelFiles[0]); // Load the first model by default
        }
    }

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);

    animate();
}

function onModelSelectChange(event) {
    const modelFileName = event.target.value;
    if (modelFileName) {
        loadModel(modelFileName);
    }
}

function loadModel(modelFileName) {
    if (!loader) return;

    loadingIndicator.style.display = 'block';
    modelSelect.disabled = true;

    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.isMaterial) {
                    cleanMaterial(child.material);
                } else {
                    // an array of materials
                    for (const material of child.material) cleanMaterial(material);
                }
            }
        });
    }

    loader.load(
        modelFileName, // Path relative to viewer.html
        (gltf) => {
            currentModel = gltf.scene;
            // Center and scale model
            const box = new THREE.Box3().setFromObject(currentModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            currentModel.position.x += (currentModel.position.x - center.x);
            currentModel.position.y += (currentModel.position.y - center.y);
            currentModel.position.z += (currentModel.position.z - center.z);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim; // Scale to fit a ~2 unit space
            currentModel.scale.set(scale, scale, scale);

            scene.add(currentModel);
            controls.target.copy(center.multiplyScalar(scale)); // Adjust controls target to new center
            controls.update();
            
            loadingIndicator.style.display = 'none';
            modelSelect.disabled = false;
            console.log(`Loaded model: ${modelFileName}`);
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            // You could update a progress bar here if desired
        },
        (error) => {
            console.error('An error happened while loading the model:', error);
            loadingIndicator.textContent = `Error loading ${modelFileName}.`;
            // Keep loadingIndicator visible if error
            modelSelect.disabled = false;
        }
    );
}

function cleanMaterial(material) {
    material.dispose();
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value.dispose === 'function') {
            value.dispose();
        }
    }
}

function onWindowResize() {
    if (!camera || !renderer || !viewerContainer) return;
    camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update(); // only required if controls.enableDamping or controls.autoRotate are set to true
    if (renderer) renderer.render(scene, camera);
}

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', init); 
 
let modelSelect, viewerContainer, modelCanvas, loadingIndicator;
let currentModel;

// This would ideally be fetched or dynamically discovered
// For now, let's hardcode a few potential model names
// We'll later populate this by listing files from the '3D models' directory
const modelFiles = [
    'tetrahedron.glb',
    'tetragonal trapezohedral.glb',
    'tetragonal scalenohedral.glb',
    'tetragonal disphenoidal.glb',
    'diamond.glb',
    'ditetragonal dipyramidal (1).glb'
]; 

function init() {
    modelSelect = document.getElementById('modelSelect');
    viewerContainer = document.getElementById('viewerContainer');
    modelCanvas = document.getElementById('modelCanvas');
    loadingIndicator = document.getElementById('loadingIndicator');

    if (!modelSelect || !viewerContainer || !modelCanvas || !loadingIndicator) {
        console.error("Required HTML elements not found for 3D viewer.");
        return;
    }

    // --- Scene Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222); // Match viewerContainer background

    // --- Camera Setup ---
    camera = new THREE.PerspectiveCamera(75, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 5); // Adjusted initial camera position

    // --- Renderer Setup ---
    renderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true });
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding; // For GLTF models

    // --- Controls Setup ---
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.target.set(0, 0.5, 0); // Adjust target to center typical models better

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, -5, -5);
    scene.add(pointLight);

    // --- GLTF Loader ---
    loader = new THREE.GLTFLoader();

    // --- Populate Model Select Dropdown ---
    // This part will be enhanced later to list files from the directory
    if (modelFiles.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No models found (add to viewer.js)";
        modelSelect.appendChild(option);
        modelSelect.disabled = true;
    } else {
        modelFiles.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName; // Assuming files are in the same directory as viewer.html
            option.textContent = fileName.replace(/\.glb$/i, '').replace(/_/g, ' '); // Clean up name
            modelSelect.appendChild(option);
        });
        modelSelect.addEventListener('change', onModelSelectChange);
        if (modelFiles.length > 0) {
            loadModel(modelFiles[0]); // Load the first model by default
        }
    }

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);

    animate();
}

function onModelSelectChange(event) {
    const modelFileName = event.target.value;
    if (modelFileName) {
        loadModel(modelFileName);
    }
}

function loadModel(modelFileName) {
    if (!loader) return;

    loadingIndicator.style.display = 'block';
    modelSelect.disabled = true;

    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.isMaterial) {
                    cleanMaterial(child.material);
                } else {
                    // an array of materials
                    for (const material of child.material) cleanMaterial(material);
                }
            }
        });
    }

    loader.load(
        modelFileName, // Path relative to viewer.html
        (gltf) => {
            currentModel = gltf.scene;
            // Center and scale model
            const box = new THREE.Box3().setFromObject(currentModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            currentModel.position.x += (currentModel.position.x - center.x);
            currentModel.position.y += (currentModel.position.y - center.y);
            currentModel.position.z += (currentModel.position.z - center.z);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim; // Scale to fit a ~2 unit space
            currentModel.scale.set(scale, scale, scale);

            scene.add(currentModel);
            controls.target.copy(center.multiplyScalar(scale)); // Adjust controls target to new center
            controls.update();
            
            loadingIndicator.style.display = 'none';
            modelSelect.disabled = false;
            console.log(`Loaded model: ${modelFileName}`);
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            // You could update a progress bar here if desired
        },
        (error) => {
            console.error('An error happened while loading the model:', error);
            loadingIndicator.textContent = `Error loading ${modelFileName}.`;
            // Keep loadingIndicator visible if error
            modelSelect.disabled = false;
        }
    );
}

function cleanMaterial(material) {
    material.dispose();
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value.dispose === 'function') {
            value.dispose();
        }
    }
}

function onWindowResize() {
    if (!camera || !renderer || !viewerContainer) return;
    camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update(); // only required if controls.enableDamping or controls.autoRotate are set to true
    if (renderer) renderer.render(scene, camera);
}

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', init); 