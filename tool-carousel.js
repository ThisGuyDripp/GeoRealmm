// --- Interactive Tool Carousel Logic (Seamless Infinite Scroll) ---

const carouselContainer = document.querySelector('.carousel-container');
const carouselViewport = document.querySelector('.carousel-viewport');
const toolCardContainer = document.getElementById('toolCardContainer');
const sliderIndicatorsContainer = document.getElementById('sliderIndicators');
const prevButton = document.getElementById('carouselPrevBtn');
const nextButton = document.getElementById('carouselNextBtn');

// Description Panel Elements
const descriptionPanel = document.getElementById('toolDescriptionPanel');
const descriptionPanelTitle = document.getElementById('descriptionPanelTitle');
const descriptionPanelText = document.getElementById('descriptionPanelText');
const closeDescriptionPanelBtn = document.getElementById('closeDescriptionPanelBtn');

let originalToolCards = []; // To store the initial set of cards
let allToolCards = []; // To store original + clones
let currentToolIndex = 0; // Index relative to originalToolCards
let actualCardsLength = 0; // Length of originalToolCards
let cardWidthAndMargin = 0; 

let isCarouselDragging = false; 
let startX, currentTranslateX = 0, lastTranslateX = 0;
let carouselAnimationFrameId; 

// Tap and Hold Interaction
let holdTimer = null;
const HOLD_DURATION = 500; // ms
let touchStartX, touchStartY;
let activeCardElement = null;

// Hover Interaction with Delay
let hoverActivateTimer = null;
const HOVER_ACTIVATE_DELAY = 1000; // ms 
let leaveTimeout = null; 
const MOUSE_LEAVE_DEBOUNCE_DELAY = 50; // ms

const CLONE_COUNT_FACTOR = 1; // How many sets of original cards to clone on each side

// Original: No explicit exports. Functions are expected to be global.
function setupToolCarousel() {
    if (!carouselViewport || !toolCardContainer || !sliderIndicatorsContainer) {
        console.warn("Carousel elements not found, skipping setup.");
        return;
    }
    
    const initialCards = Array.from(toolCardContainer.children).filter(child => child.classList.contains('tool-card'));
    if (initialCards.length === 0) {
        console.warn("No tool cards found.");
        return;
    }
    originalToolCards = initialCards.map(card => card.cloneNode(true)); // Store clones of originals
    actualCardsLength = originalToolCards.length;

    if (actualCardsLength <= 1) { // No need for complex setup if 0 or 1 card
        // Corrected variable name: allToolCards instead of toolCards
        allToolCards = [...originalToolCards]; // Use originalToolCards if cloning is skipped
        if (toolCardContainer && allToolCards.length > 0) {
            toolCardContainer.innerHTML = ''; // Clear existing
            allToolCards.forEach(card => toolCardContainer.appendChild(card));
        }
        calculateCardWidth();
        // Basic setup for non-looping single/no item
        currentTranslateX = 0;
        if (toolCardContainer) toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
        lastTranslateX = currentTranslateX;
        updateNavButtonStates(); // Will disable buttons
        updateCarouselIndicators();
        addCardEventListeners(); // Add listeners to the original cards
        return;
    }
    
    // Clear container and rebuild with clones for infinite scroll
    toolCardContainer.innerHTML = ''; 

    // Prepend clones 
    for (let i = 0; i < CLONE_COUNT_FACTOR; i++) {
        originalToolCards.slice().reverse().forEach(cardNode => { 
            toolCardContainer.insertBefore(cardNode.cloneNode(true), toolCardContainer.firstChild);
        });
    }

    // Add original cards
    originalToolCards.forEach(cardNode => {
        toolCardContainer.appendChild(cardNode.cloneNode(true));
    });

    // Append clones
    for (let i = 0; i < CLONE_COUNT_FACTOR; i++) {
        originalToolCards.forEach(cardNode => {
            toolCardContainer.appendChild(cardNode.cloneNode(true));
        });
    }
    
    allToolCards = Array.from(toolCardContainer.children); // Update reference to all cards in DOM

    calculateCardWidth();
    if (!cardWidthAndMargin || cardWidthAndMargin === 0) {
        console.error("Card width is zero, carousel cannot function.");
        return;
    }
    
    // Initial position: show the first "actual" card (which is after the prepended clones)
    currentToolIndex = 0;
    currentTranslateX = -(CLONE_COUNT_FACTOR * actualCardsLength * cardWidthAndMargin);
    toolCardContainer.style.transition = 'none'; // No animation for initial set
    toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
    void toolCardContainer.offsetHeight; // Force reflow
    toolCardContainer.style.transition = ''; // Re-enable for subsequent animations
    lastTranslateX = currentTranslateX;

    createCarouselIndicators(); 
    updateCarouselVisuals(); 
    updateCarouselIndicators();
    updateNavButtonStates();

    addCardEventListeners(); 

    // Event Listeners for drag
    if (prevButton) prevButton.addEventListener('click', () => navigateCarousel(-1));
    if (nextButton) nextButton.addEventListener('click', () => navigateCarousel(1));
    if (carouselViewport) { 
        carouselViewport.addEventListener('mousedown', dragStart);
        carouselViewport.addEventListener('touchstart', dragStart, { passive: true }); 
    }
    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag, { passive: false }); 
    window.addEventListener('mouseup', dragEnd, true); // Original had 'true'
    window.addEventListener('touchend', dragEnd, true); // Original had 'true'
    document.documentElement.addEventListener('mouseleave', () => { 
        if (isCarouselDragging) dragEnd(); 
    });
    if (closeDescriptionPanelBtn && descriptionPanel) {
        closeDescriptionPanelBtn.addEventListener('click', deactivateDescriptionPanel);
        descriptionPanel.addEventListener('click', (event) => { 
            if (event.target === descriptionPanel) deactivateDescriptionPanel();
        });
    }
    console.log('Tool Carousel Initialized (Original Version).');
}

function addCardEventListeners() {
    const cardsInDOM = toolCardContainer.children;
    for (let card of cardsInDOM) {
        card.addEventListener('mouseenter', handleMouseEnter);
        card.addEventListener('mouseleave', handleMouseLeave);
        card.addEventListener('touchstart', handleTouchStart, { passive: true });
        card.addEventListener('touchmove', handleTouchMove); 
        card.addEventListener('touchend', handleTouchEnd);
        card.addEventListener('contextmenu', (e) => e.preventDefault()); 
    }
}


function calculateCardWidth() {
    const firstCardInDOM = toolCardContainer.firstChild;
     if (actualCardsLength > 0 && firstCardInDOM && firstCardInDOM.classList && firstCardInDOM.classList.contains('tool-card')) {
        const cardStyle = window.getComputedStyle(firstCardInDOM);
        const marginLeft = parseFloat(cardStyle.marginLeft || '0');
        const marginRight = parseFloat(cardStyle.marginRight || '0');
        cardWidthAndMargin = firstCardInDOM.offsetWidth + marginLeft + marginRight;
    } else {
        cardWidthAndMargin = 0; // Fallback
        console.warn("Could not calculate card width for carousel.");
    }
}

function calculateInitialOffset() { // This function was present but not directly used for setting initial X
    return 0; 
}

function navigateCarousel(direction) {
    if (actualCardsLength <= 1 || !cardWidthAndMargin) return;
    if (activeCardElement) deactivateDescriptionPanel(); // Close panel if open
    
    let newLogicalIndex = currentToolIndex + direction;
    let targetPhysicalTranslateX = currentTranslateX - (direction * cardWidthAndMargin);

    if (newLogicalIndex < 0) {
        currentToolIndex = actualCardsLength - 1;
    } else if (newLogicalIndex >= actualCardsLength) {
        currentToolIndex = 0;
    } else {
        currentToolIndex = newLogicalIndex;
    }
    
    animateSnapTo(targetPhysicalTranslateX);
}

function updateCarouselVisuals() {
    if (!isFinite(currentTranslateX)) currentTranslateX = 0;
    updateCarouselIndicators();
    updateNavButtonStates();
}

function dragStart(e) {
    if (descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) return; 
    if (e.type === 'mousedown' && e.button !== 0) return; 
    if (actualCardsLength <= 1) return; 

    isCarouselDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    lastTranslateX = currentTranslateX; 
    if (carouselAnimationFrameId) cancelAnimationFrame(carouselAnimationFrameId); 
    if (toolCardContainer) toolCardContainer.style.transition = 'none'; 
    if (carouselViewport) carouselViewport.classList.add('grabbing');
}

function drag(e) {
    if (e.type === 'mousemove' && e.buttons === 0) {
        if (isCarouselDragging) dragEnd(); 
        return; 
    }
    if (!isCarouselDragging || actualCardsLength <= 1) return;

    if(e.type.includes('touch')) e.preventDefault(); 

    const currentPointerX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const diffX = currentPointerX - startX;
    currentTranslateX = lastTranslateX + diffX; 

    if (toolCardContainer) toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
}

function dragEnd() { 
    if (!isCarouselDragging) return; 
    isCarouselDragging = false; 
    if (actualCardsLength <= 1) return;
    
    if (toolCardContainer) toolCardContainer.style.transition = ''; 
    if (carouselViewport) carouselViewport.classList.remove('grabbing');
    
    snapToNearestCard();
}

function snapToNearestCard() {
    if (actualCardsLength <= 1 || !cardWidthAndMargin || cardWidthAndMargin === 0 || !isFinite(cardWidthAndMargin) || !carouselViewport ) return;
    if (carouselAnimationFrameId) cancelAnimationFrame(carouselAnimationFrameId);
    
    let closestOverallCardIndex = Math.round(-currentTranslateX / cardWidthAndMargin);
    currentToolIndex = (closestOverallCardIndex % actualCardsLength + actualCardsLength) % actualCardsLength;
    let targetTranslateX = -( (CLONE_COUNT_FACTOR * actualCardsLength) + currentToolIndex) * cardWidthAndMargin;
    
    animateSnapTo(targetTranslateX);
}

function animateSnapTo(targetTranslateX) {
    if (Math.abs(currentTranslateX - targetTranslateX) < 1) {
        currentTranslateX = targetTranslateX;
        if (toolCardContainer) toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
        checkAndResetPosition(); 
        updateCarouselVisuals(); 
        return;
    }
    
    if (toolCardContainer) {
        toolCardContainer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; 
        toolCardContainer.style.transform = `translateX(${targetTranslateX}px)`;
        
        const onTransitionEnd = () => {
            toolCardContainer.removeEventListener('transitionend', onTransitionEnd);
            // Ensure currentTranslateX is updated to the actual final position
            const finalTransform = window.getComputedStyle(toolCardContainer).transform;
            if (finalTransform && finalTransform !== 'none') {
                const matrix = new DOMMatrix(finalTransform);
                currentTranslateX = matrix.m41; // m41 is the translateX value
            } else {
                currentTranslateX = targetTranslateX; // Fallback
            }
            checkAndResetPosition(); 
            updateCarouselVisuals(); 
        };
        toolCardContainer.addEventListener('transitionend', onTransitionEnd);
    } else {
         updateCarouselVisuals(); 
    }
}

function checkAndResetPosition() {
    if (actualCardsLength <= 1 || !cardWidthAndMargin) return;

    const oneSetWidth = actualCardsLength * cardWidthAndMargin;
    // Boundaries for the "middle" block of original cards
    const middleBlockTargetStart = -(CLONE_COUNT_FACTOR * actualCardsLength * cardWidthAndMargin);
    const leftResetThreshold = middleBlockTargetStart + (oneSetWidth * 0.5);  // If we've scrolled more than half a set to the right from the target start
    const rightResetThreshold = middleBlockTargetStart - (oneSetWidth * 0.5); // If we've scrolled more than half a set to the left from the target start

    let jumped = false;
    if (currentTranslateX > leftResetThreshold) {
        currentTranslateX -= oneSetWidth;
        jumped = true;
    } else if (currentTranslateX < rightResetThreshold) {
        currentTranslateX += oneSetWidth;
        jumped = true;
    }

    if (jumped && toolCardContainer) {
        toolCardContainer.style.transition = 'none';
        toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
        void toolCardContainer.offsetHeight; // Force reflow
        toolCardContainer.style.transition = '';
    }
    lastTranslateX = currentTranslateX; 
}


// --- Hover/Tap-Hold Interaction Logic ---
function handleMouseEnter(event) {
    if (isCarouselDragging) return; 
    const card = event.currentTarget;
    clearTimeout(hoverActivateTimer); 
    if (card === activeCardElement && descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) return;
    hoverActivateTimer = setTimeout(() => activateCard(card), HOVER_ACTIVATE_DELAY);
}
function handleMouseLeave(event) {
    clearTimeout(hoverActivateTimer); 
    const cardLeft = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    // If the mouse is leaving the currently active card
    if (cardLeft === activeCardElement && descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) {
        // Check if the mouse is moving to the description panel or one of its children
        if (relatedTarget && (descriptionPanel.contains(relatedTarget) || relatedTarget === descriptionPanel)) {
            // Mouse is moving to the panel, do nothing, let panel's own mouseleave handle it if necessary
            return;
        }
        // If mouse is moving elsewhere, not the panel, then schedule deactivation
        // Using a new timer name to avoid confusion with the old leaveTimeout if it's still elsewhere
        if (window.panelCloseTimer) clearTimeout(window.panelCloseTimer);
        window.panelCloseTimer = setTimeout(() => {
            // Check again before closing, in case of rapid re-entry or other state changes
            if (activeCardElement === cardLeft && descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) {
                 deactivateDescriptionPanel();
            }
        }, MOUSE_LEAVE_DEBOUNCE_DELAY); // Use existing debounce delay, can be adjusted
    }
}

// Add mouseenter/mouseleave for the panel itself to control the timer
if (descriptionPanel) {
    descriptionPanel.addEventListener('mouseenter', () => {
        if (window.panelCloseTimer) {
            clearTimeout(window.panelCloseTimer);
            window.panelCloseTimer = null;
        }
    });
    descriptionPanel.addEventListener('mouseleave', (event) => {
        // If mouse leaves panel and doesn't go back to the active card, close it.
        const relatedTarget = event.relatedTarget;
        if (activeCardElement && relatedTarget && activeCardElement.contains(relatedTarget)) {
            // Moved back to the active card, do nothing
            return;
        }
        deactivateDescriptionPanel(); 
    });
}

function handleTouchStart(event) {
    if (isCarouselDragging) return; 
    const card = event.currentTarget;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    clearTimeout(hoverActivateTimer); 
    if (leaveTimeout) clearTimeout(leaveTimeout);
    if (holdTimer) clearTimeout(holdTimer); // Clear existing timer

    // Don't set a new timer if the card is already active (touch might be for closing)
    if (card === activeCardElement && descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) {
        return;
    }

    holdTimer = setTimeout(() => {
        holdTimer = null; 
        if (!isCarouselDragging) { // Only activate if not dragging
            // Check if a drag didn't start during the hold
            const touchEndX = event.changedTouches ? event.changedTouches[0].clientX : touchStartX;
            const touchEndY = event.changedTouches ? event.changedTouches[0].clientY : touchStartY;
            if (Math.abs(touchEndX - touchStartX) < 10 && Math.abs(touchEndY - touchStartY) < 10) { // Threshold for movement
                 activateCard(card);
            }
        }
    }, HOLD_DURATION);
}
function handleTouchMove(event) {
    if (holdTimer && touchStartX !== undefined && touchStartY !== undefined) { 
        const touchCurrentX = event.touches[0].clientX;
        const touchCurrentY = event.touches[0].clientY;
        if (Math.abs(touchCurrentX - touchStartX) > 10 || Math.abs(touchCurrentY - touchStartY) > 10) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
    }
}
function handleTouchEnd(event) { 
    clearTimeout(holdTimer); 
    holdTimer = null;
    
    const card = event.currentTarget;
    if (activeCardElement === card && !isCarouselDragging && descriptionPanel && !descriptionPanel.classList.contains('hidden-section')) {
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        if (Math.abs(touchEndX - touchStartX) < 10 && Math.abs(touchEndY - touchStartY) < 10) { // Was it a tap?
            deactivateDescriptionPanel();
        }
    }
    touchStartX = undefined; 
    touchStartY = undefined;
}
function activateCard(cardElement) {
    if (!cardElement || !descriptionPanel || !descriptionPanelTitle || !descriptionPanelText) return;
    if (activeCardElement && activeCardElement !== cardElement) {
        // If a different card is activated, immediately deactivate the old one
        // This ensures the blur and active-focus are correctly transferred
        const oldActiveCard = activeCardElement; // Store temporarily
        deactivateDescriptionPanel(); // This will clear blur and old active-focus
        activeCardElement = oldActiveCard; // Restore briefly if needed by logic below, though likely not
    }
    
    activeCardElement = cardElement;
    const toolName = cardElement.dataset.toolName || "Tool Details";
    const toolDescription = cardElement.dataset.toolDescription || "No additional details available.";
    
    descriptionPanelTitle.textContent = toolName;
    descriptionPanelText.textContent = toolDescription;
    descriptionPanel.classList.remove('hidden-section');
    document.body.classList.add('blur-active-page'); 
    
    allToolCards.forEach(card => { 
        card.classList.remove('active-focus'); 
    });
    cardElement.classList.add('active-focus'); 
}
function deactivateDescriptionPanel() {
    if (descriptionPanel) descriptionPanel.classList.add('hidden-section');
    document.body.classList.remove('blur-active-page'); 
    if (window.panelCloseTimer) { // Clear any pending close timer
        clearTimeout(window.panelCloseTimer);
        window.panelCloseTimer = null;
    }
    if (activeCardElement) {
        activeCardElement.classList.remove('active-focus');
        activeCardElement = null;
    }
}

// --- Indicators & Nav Buttons ---
function createCarouselIndicators() {
    if (!sliderIndicatorsContainer || actualCardsLength === 0) return;
    sliderIndicatorsContainer.innerHTML = '';
    for(let i = 0; i < actualCardsLength; i++) { 
        const dot = document.createElement('button');
        dot.classList.add('indicator-dot');
        dot.setAttribute('aria-label', `Go to tool ${i + 1}`);
        dot.addEventListener('click', () => {
            if (activeCardElement) deactivateDescriptionPanel(); // Close panel first
            currentToolIndex = i; 
            const targetTranslateX = -( (CLONE_COUNT_FACTOR * actualCardsLength) + currentToolIndex) * cardWidthAndMargin;
            animateSnapTo(targetTranslateX);
        });
        sliderIndicatorsContainer.appendChild(dot);
    }
    updateCarouselIndicators();
}

function updateCarouselIndicators() {
    if (!sliderIndicatorsContainer || actualCardsLength === 0) return;
    Array.from(sliderIndicatorsContainer.children).forEach((dot, index) => {
        dot.classList.toggle('active', index === currentToolIndex); 
    });
}

function updateNavButtonStates() {
    if (!prevButton || !nextButton || actualCardsLength === 0) return;
    const disableButtons = actualCardsLength <= 1; 
    prevButton.disabled = disableButtons;
    nextButton.disabled = disableButtons;
    prevButton.style.opacity = prevButton.disabled ? '0.5' : '1';
    prevButton.style.cursor = prevButton.disabled ? 'not-allowed' : 'pointer';
    nextButton.style.opacity = nextButton.disabled ? '0.5' : '1';
    nextButton.style.cursor = nextButton.disabled ? 'not-allowed' : 'pointer';
}

// --- Resize Handling ---
function handleCarouselResize() { // Not exported in original
    if (!carouselViewport || actualCardsLength === 0) return;
    
    const oldCardWidth = cardWidthAndMargin;
    calculateCardWidth();
    
    if (cardWidthAndMargin > 0 && isFinite(cardWidthAndMargin)) {
        if (oldCardWidth > 0 && oldCardWidth !== cardWidthAndMargin) {
            currentTranslateX = (currentTranslateX / oldCardWidth) * cardWidthAndMargin;
        }
        
        const targetTranslateX = -( (CLONE_COUNT_FACTOR * actualCardsLength) + currentToolIndex) * cardWidthAndMargin;
        
        if (toolCardContainer) {
            toolCardContainer.style.transition = 'none'; 
            currentTranslateX = targetTranslateX; 
            toolCardContainer.style.transform = `translateX(${currentTranslateX}px)`;
            void toolCardContainer.offsetHeight; 
            toolCardContainer.style.transition = ''; 
        }
        lastTranslateX = currentTranslateX; 
        checkAndResetPosition(); 
    } else {
      if(toolCardContainer) toolCardContainer.style.transform = 'translateX(0px)';
      currentTranslateX = 0;
      lastTranslateX = 0;
    }
    updateCarouselVisuals(); 
}
