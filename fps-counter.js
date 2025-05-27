// webpage/fps-counter.js

// Variables for FPS calculation
let fpsDisplay;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsElapsedTime = 0; // To track time for averaging FPS

/**
 * Initializes the FPS counter.
 * Finds the display element and sets up initial values.
 */
export function initFpsCounter() {
    fpsDisplay = document.getElementById('fpsCounter');
    if (!fpsDisplay) {
        console.warn('FPS counter display element (#fpsCounter) not found. FPS will not be displayed.');
        return;
    }
    lastFrameTime = performance.now();
    frameCount = 0;
    fpsElapsedTime = 0;
    console.log('FPS Counter Initialized.');
}

/**
 * Updates the FPS counter display.
 * This function should be called in the main animation loop.
 * @param {number} now - The current timestamp, typically from performance.now() or requestAnimationFrame.
 */
export function updateFps(now) {
    if (!fpsDisplay) return; // Don't run if the display element isn't found

    const deltaTime = (now - lastFrameTime) / 1000; // Delta time in seconds
    lastFrameTime = now;
    fpsElapsedTime += deltaTime;
    frameCount++;

    // Update FPS display roughly every second
    if (fpsElapsedTime >= 1.0) {
        const fps = Math.round(frameCount / fpsElapsedTime);
        fpsDisplay.textContent = `FPS: ${fps}`;
        
        frameCount = 0;
        fpsElapsedTime -= 1.0; // Subtract 1 second, don't reset to 0 to keep remainder for accuracy
    }
}
