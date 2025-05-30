(() => {
    let scene, camera, renderer, controls, loader, clock;
    let modelSelect, viewerContainer, modelCanvas, loadingIndicator;
    let animationSelect, playPauseBtn, timeSlider, timeDisplay, masterPlayAllBtn, pauseAllBtn;
    let individualAnimationControlsDiv, allAnimationControlsDiv;
    let animationModeRadios;
    let currentModel, mixer, animations, currentAction;
    let areAllPlayingPaused = false;
    let playAllHasStarted = false;
    let playAllStartTime = 0;
    let maxOverallDuration = 0;
    let masterTimeSlider, masterTimeDisplay, masterPlaybackControlsDiv;

    // This will be populated by listing files from the '3D models/animated' directory
    const animatedModelFiles = [
        'rhombic-dipyramidal animation.glb',
        'animatin rhombic.glb',
        'rectangle.glb',
        'fold 2 animation.glb',
        'fold2.2 animation.glb',
        'fold2.3 animation.glb',
        'fold 3.1 animation.glb',
        'fold3.2 animation.glb',
        'fold4.1 animation.glb',
        'fold4.2 animation.glb',
        'fold6.1 animation.glb',
        'fold1 animation.glb'
    ];

    function init() {
        // DOM Elements
        modelSelect = document.getElementById('modelSelect');
        viewerContainer = document.getElementById('viewerContainer');
        modelCanvas = document.getElementById('modelCanvas');
        loadingIndicator = document.getElementById('loadingIndicator');
        
        individualAnimationControlsDiv = document.getElementById('individualAnimationControls');
        allAnimationControlsDiv = document.getElementById('allAnimationControls');
        animationModeRadios = document.querySelectorAll('input[name="animationMode"]');

        animationSelect = document.getElementById('animationSelect');
        playPauseBtn = document.getElementById('playPauseBtn');
        masterPlayAllBtn = document.getElementById('masterPlayAllBtn');
        pauseAllBtn = document.getElementById('pauseAllBtn');
        timeSlider = document.getElementById('timeSlider');
        timeDisplay = document.getElementById('timeDisplay');

        masterTimeSlider = document.getElementById('masterTimeSlider');
        masterTimeDisplay = document.getElementById('masterTimeDisplay');
        masterPlaybackControlsDiv = document.getElementById('masterPlaybackControls');

        if (!modelSelect || !viewerContainer || !modelCanvas || !loadingIndicator || 
            !individualAnimationControlsDiv || !allAnimationControlsDiv || animationModeRadios.length === 0 ||
            !animationSelect || !playPauseBtn || !masterPlayAllBtn || !pauseAllBtn || 
            !timeSlider || !timeDisplay || !masterTimeSlider || !masterTimeDisplay || !masterPlaybackControlsDiv) {
            console.error("Required HTML elements not found for animated 3D viewer.");
            return;
        }

        clock = new THREE.Clock();

        // --- Scene, Camera, Renderer, Controls (similar to static viewer) ---
        scene = new THREE.Scene();
        scene.background = null; // Transparent background to see shared WebGL background
        camera = new THREE.PerspectiveCamera(75, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
        camera.position.set(2, 2, 5);
        renderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true, alpha: true }); // alpha: true
        renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Slightly increased intensity
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Slightly increased intensity
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        loader = new THREE.GLTFLoader();

        populateAnimatedModelSelect();

        // Event Listeners
        modelSelect.addEventListener('change', onAnimatedModelSelectChange);
        animationModeRadios.forEach(radio => radio.addEventListener('change', updateAnimationControlsVisibility));
        animationSelect.addEventListener('change', onAnimationSelectChange);
        playPauseBtn.addEventListener('click', togglePlayPauseAnimation);
        masterPlayAllBtn.addEventListener('click', masterPlayAllClickHandler);
        pauseAllBtn.addEventListener('click', pauseAllAnimationsHandler);
        timeSlider.addEventListener('input', onTimeSliderChange);
        masterTimeSlider.addEventListener('input', onMasterTimeSliderChange);
        window.addEventListener('resize', onWindowResize);

        updateAnimationControlsVisibility(); // Initial setup of control visibility
        updateMasterPlaybackControlsVisibility(false); // Initially hidden
        animate();
    }

    function updateAnimationControlsVisibility() {
        const selectedMode = document.querySelector('input[name="animationMode"]:checked').value;
        resetPlayAllStates(); 
        if (selectedMode === 'individual') {
            individualAnimationControlsDiv.style.display = 'flex';
            allAnimationControlsDiv.style.display = 'none';
            if (mixer) {
                const currentActionWasPlaying = currentAction && !currentAction.paused;
                mixer.stopAllAction();
                if (currentAction && currentActionWasPlaying) {
                    currentAction.reset().play(); 
                    currentAction.loop = THREE.LoopRepeat;
                    playPauseBtn.textContent = 'Pause';
                } else if (currentAction) {
                    playPauseBtn.textContent = 'Play';
                }
            }

        } else { 
            individualAnimationControlsDiv.style.display = 'none';
            allAnimationControlsDiv.style.display = 'flex'; 
            if (currentAction && !currentAction.paused) {
                currentAction.stop();
                playPauseBtn.textContent = 'Play'; 
            }
            masterPlayAllBtn.textContent = 'Play All Animations'; 
        }
        const modelHasAnimations = animations && animations.length > 0;
        if(modelHasAnimations){
            if (selectedMode === 'individual') individualAnimationControlsDiv.style.display = 'flex';
            else allAnimationControlsDiv.style.display = 'flex';
        } else {
            individualAnimationControlsDiv.style.display = 'none';
            allAnimationControlsDiv.style.display = 'none';
        }
    }

    function populateAnimatedModelSelect() {
        if (animatedModelFiles.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No animated models found (add to animated_viewer.js)";
            modelSelect.appendChild(option);
            modelSelect.disabled = true;
            individualAnimationControlsDiv.style.display = 'none'; 
            allAnimationControlsDiv.style.display = 'none';
        } else {
            animatedModelFiles.forEach(fileName => {
                const option = document.createElement('option');
                option.value = `animated/${fileName}`; 
                option.textContent = fileName.replace(/\.glb$/i, '').replace(/_/g, ' ');
                modelSelect.appendChild(option);
            });
            if (animatedModelFiles.length > 0) {
                loadAnimatedModel(`animated/${animatedModelFiles[0]}`);
            }
        }
    }

    function onAnimatedModelSelectChange(event) {
        const modelPath = event.target.value;
        if (modelPath) {
            loadAnimatedModel(modelPath);
        }
    }

    function loadAnimatedModel(modelPath) {
        loadingIndicator.style.display = 'block';
        modelSelect.disabled = true;
        // individualAnimationControlsDiv.style.display = 'none'; // Keep visible to allow mode switch
        // allAnimationControlsDiv.style.display = 'none';
        resetAnimationControls();
        resetPlayAllStates(); 

        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.isMaterial) cleanMaterial(child.material);
                    else for (const material of child.material) cleanMaterial(material);
                }
            });
        }
        if (mixer) mixer = null; 

        loader.load(
            modelPath, 
            (gltf) => {
                currentModel = gltf.scene;
                animations = gltf.animations;
                const box = new THREE.Box3().setFromObject(currentModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                currentModel.position.sub(center);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 2.5 / maxDim; // Adjusted scale factor for better visibility
                currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
                scene.add(currentModel);
                controls.target.copy(currentModel.position); 
                controls.update();

                if (animations && animations.length) {
                    mixer = new THREE.AnimationMixer(currentModel);
                    populateAnimationSelect();
                    playAnimation(animations[0]); 
                } else {
                    console.log("Model has no animations.");
                    resetAnimationControls(); // Ensure controls are reset if no animations
                }
                updateAnimationControlsVisibility();
                loadingIndicator.style.display = 'none';
                modelSelect.disabled = false;
            },
            undefined, 
            (error) => {
                console.error(`Error loading animated model ${modelPath}:`, error);
                loadingIndicator.textContent = `Error loading ${modelPath.split('/').pop()}. Try another model.`;
                modelSelect.disabled = false;
                resetAnimationControls();
                updateAnimationControlsVisibility();
            }
        );
    }

    function populateAnimationSelect() {
        animationSelect.innerHTML = ''; 
        animations.forEach((clip, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = clip.name || `Animation ${index + 1}`;
            animationSelect.appendChild(option);
        });
        // If there are animations, select the first one by default
        if (animations.length > 0) {
             animationSelect.value = "0"; // Select the first animation
        }
    }

    function onAnimationSelectChange(event) {
        const animationIndex = parseInt(event.target.value);
        if (animations && animations[animationIndex]) {
            playAnimation(animations[animationIndex]);
        }
    }

    function playAnimation(clip) {
        if (!mixer || !clip) return;
        if (currentAction) {
            currentAction.stop(); 
        }
        currentAction = mixer.clipAction(clip);
        if (!currentAction) return; 

        currentAction.loop = THREE.LoopRepeat; 
        currentAction.reset().play(); 
        currentAction.paused = false; 

        playPauseBtn.textContent = 'Pause';
        timeSlider.value = 0;
        if (clip && typeof clip.duration !== 'undefined') { 
            timeSlider.max = clip.duration;
        } else {
            timeSlider.max = 1; 
            console.warn("Animation clip duration not found, defaulting slider max to 1.");
        }
        updateTimeDisplay(); 
    }

    function togglePlayPauseAnimation() {
        if (!currentAction) return;

        if (currentAction.paused) {
            currentAction.paused = false;
            playPauseBtn.textContent = 'Pause';
        } else {
            currentAction.paused = true;
            playPauseBtn.textContent = 'Play';
        }
    }

    function masterPlayAllClickHandler() {
        if (!mixer || !animations || animations.length === 0) return;

        if (areAllPlayingPaused) { 
            animations.forEach(clip => {
                const action = mixer.existingAction(clip);
                if (action && action.paused) {
                    action.paused = false;
                }
            });
            playAllStartTime = clock.getElapsedTime() - parseFloat(masterTimeSlider.value);
            masterPlayAllBtn.textContent = 'Playing All...'; 
        } else { 
            maxOverallDuration = 0;
            animations.forEach(clip => {
                if (clip) { 
                    const action = mixer.clipAction(clip);
                    if (action) { 
                        action.loop = THREE.LoopOnce; 
                        action.reset().play();
                        action.paused = false; 
                        if (clip.duration > maxOverallDuration) {
                            maxOverallDuration = clip.duration;
                        }
                    }
                }
            });
            playAllHasStarted = true; 
            masterPlayAllBtn.textContent = 'Playing All...'; 
            masterTimeSlider.max = maxOverallDuration > 0 ? maxOverallDuration : 1; // Prevent max 0
            masterTimeSlider.value = 0;
            playAllStartTime = clock.getElapsedTime();
        }
        areAllPlayingPaused = false;
        updateMasterPlaybackControlsVisibility(true);
    }

    function pauseAllAnimationsHandler() { 
        if (!mixer || !playAllHasStarted || areAllPlayingPaused) { 
            return;
        }
        let anActionWasActuallyPaused = false;
        animations.forEach(clip => {
            const action = mixer.existingAction(clip); 
            if (action && !action.paused && action.isRunning()) { 
                action.paused = true;
                anActionWasActuallyPaused = true;
            }
        });
        if (anActionWasActuallyPaused) {
            areAllPlayingPaused = true;
            masterPlayAllBtn.textContent = 'Resume All'; 
            updateMasterPlaybackControlsVisibility(true); 
        }
    }

    function onTimeSliderChange() {
        if (!currentAction || !mixer) return;
        const newTime = parseFloat(timeSlider.value);
        // For individual animation, currentAction.time is the authority when scrubbing paused animation
        currentAction.time = newTime; 
        if (currentAction.paused) {
            mixer.update(0); // Update the visual state to this new time
        } else {
             // If playing, mixer's overall time might need adjustment too, though usually it's driven by delta
            mixer.setTime(newTime); // This might be more forceful if needed
        }
        updateTimeDisplay(); 
    }
    

    function updateAnimationTime() {
        if (mixer && currentAction && currentAction.isRunning() && !currentAction.paused) {
            const time = currentAction.time;
            timeSlider.value = time;
            updateTimeDisplay();
        }
    }

    function updateTimeDisplay() {
        if (currentAction && currentAction.getClip()) {
            let displayTime = parseFloat(timeSlider.value); 
            const duration = currentAction.getClip().duration;
            const durationText = (typeof duration === 'number' && isFinite(duration)) ? duration.toFixed(2) : 'N/A';
            timeDisplay.textContent = `${displayTime.toFixed(2)}s / ${durationText}s`;
        } else {
            timeDisplay.textContent = '0.00s / N/As'; 
        }
    }

    function resetAnimationControls() {
        if(mixer) mixer.stopAllAction();
        currentAction = null;
        animationSelect.innerHTML = '<option value="">No animations</option>'; // Placeholder
        playPauseBtn.textContent = 'Play';
        playPauseBtn.disabled = true; // Disable if no animation
        timeSlider.value = 0;
        timeSlider.max = 1;
        timeSlider.disabled = true; // Disable if no animation
        timeDisplay.textContent = '0.00s / N/As';

        // Enable controls if animations are present later
        if (animations && animations.length > 0) {
            playPauseBtn.disabled = false;
            timeSlider.disabled = false;
        }
    }

    function cleanMaterial(material) { 
        material.dispose();
        for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && typeof value.dispose === 'function') value.dispose();
        }
    }

    function onWindowResize() { 
        if (!renderer || !camera || !viewerContainer) return;
        camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    }

    function updateMasterPlaybackControlsVisibility(show) {
        if (masterPlaybackControlsDiv) {
            masterPlaybackControlsDiv.style.display = show && playAllHasStarted ? 'flex' : 'none';
        }
    }

    function onMasterTimeSliderChange() {
        if (!mixer || !playAllHasStarted || !areAllPlayingPaused) return; 

        const newTime = parseFloat(masterTimeSlider.value);
        animations.forEach(clip => {
            const action = mixer.existingAction(clip);
            if (action) {
                // Ensure action.time is not set beyond its own clip's duration
                action.time = Math.min(newTime, action.getClip().duration);
            }
        });
        mixer.update(0); 
        masterTimeDisplay.textContent = `${newTime.toFixed(2)}s / ${maxOverallDuration.toFixed(2)}s`;
    }

    function resetPlayAllStates() {
        areAllPlayingPaused = false;
        playAllHasStarted = false;
        playAllStartTime = 0;
        maxOverallDuration = 0;
        if (masterPlayAllBtn) masterPlayAllBtn.textContent = 'Play All Animations';
        updateMasterPlaybackControlsVisibility(false);
        if(masterTimeSlider) {
            masterTimeSlider.value = 0;
            masterTimeSlider.max = 1; // Reset max
        }
        if(masterTimeDisplay) masterTimeDisplay.textContent = '0.00s / 0.00s';
    }

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (playAllHasStarted && !areAllPlayingPaused && mixer) {
            let allActionsFinishedInLoop = true; // Check if ALL animations have finished *this frame*
            animations.forEach(clip => {
                const action = mixer.existingAction(clip);
                if (action && action.isRunning() && !action.paused) {
                    if (action.time < action.getClip().duration - 0.01) { // Check if not at the end
                        allActionsFinishedInLoop = false;
                    } else if (!action.clampWhenFinished) { // if it doesn't clamp, it might loop back if LoopOnce isn't perfectly handled
                         action.paused = true; // Explicitly pause if it reached the end
                    }
                }
            });
    
            if (allActionsFinishedInLoop) {
                playAllHasStarted = false; 
                areAllPlayingPaused = false; 
                masterPlayAllBtn.textContent = 'Play All Animations';
                updateMasterPlaybackControlsVisibility(false); 
            } else {
                const elapsedSincePlayAllStart = clock.getElapsedTime() - playAllStartTime;
                const currentMasterTime = Math.min(elapsedSincePlayAllStart, maxOverallDuration);
                masterTimeSlider.value = currentMasterTime;
                masterTimeDisplay.textContent = `${parseFloat(currentMasterTime).toFixed(2)}s / ${maxOverallDuration.toFixed(2)}s`;
            }
        }

        if (mixer) {
            mixer.update(delta);
        }
        if (currentAction && !currentAction.paused && individualAnimationControlsDiv.style.display !== 'none') {
            updateAnimationTime(); 
        }
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }

    document.addEventListener('DOMContentLoaded', init); 
})(); 