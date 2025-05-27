// --- Main Orchestrator for GeoRealm ---

// Navigation Logic & Section Switching 
const navHome = document.getElementById('navHome');
const navNorsu = document.getElementById('navNorsu');
const navTools = document.getElementById('navTools');
const navAboutUs = document.getElementById('navAboutUs');
const mainNavLinks = document.querySelectorAll('#mainNav a.nav-link');
const sections = { 
    home: document.getElementById('home'), 
    norsu: document.getElementById('norsu'), 
    tools: document.getElementById('tools'),
    aboutUs: document.getElementById('aboutUs')
};
const exploreNorsuBtn = document.getElementById('exploreNorsuBtn');
const tryToolsBtn = document.getElementById('tryToolsBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const backToNorsuBtn = document.getElementById('backToNorsuBtn');
const backToHomeFromAboutBtn = document.getElementById('backToHomeFromAboutBtn');
const homeTextPanel = document.getElementById('homeTextPanel');
const mainGeoRealmTitle = document.getElementById('mainGeoRealmTitle');
let currentSection = 'home';

// --- Terra-Trivia Data and Logic ---
const terraTriviaData = [
    {
        type: 'fact',
        title: 'Did You Know?',
        text: 'The Earth is not perfectly round; it is an oblate spheroid, meaning it bulges at the equator and is flatter at the poles due to its rotation.'
    },
    {
        type: 'fact',
        title: 'Geological Marvel!',
        text: 'The oldest known rocks on Earth are about 4.03 billion years old, found in the Acasta Gneiss Complex in Canada.'
    },
    {
        type: 'quiz',
        title: 'Quick Quiz!',
        question: 'What is the most common mineral in Earth\'s crust?',
        options: ['Quartz', 'Feldspar', 'Mica', 'Calcite'],
        answer: 'Feldspar',
        feedbackCorrect: 'Correct! Feldspar makes up over 50% of Earth\'s crust.',
        feedbackIncorrect: 'Not quite! The most common mineral is Feldspar.'
    },
    {
        type: 'fact',
        title: 'Deep Dive!',
        text: 'The deepest point in Earth\'s oceans, the Challenger Deep in the Mariana Trench, is deeper than Mount Everest is tall.'
    },
    {
        type: 'quiz',
        title: 'Test Your Knowledge!',
        question: 'Which layer of the Earth is primarily composed of iron and nickel?',
        options: ['Crust', 'Mantle', 'Outer Core', 'Inner Core'],
        answer: 'Inner Core',
        feedbackCorrect: 'Spot on! The Inner Core is a solid ball of mostly iron and nickel.',
        feedbackIncorrect: 'Close! While the Outer Core also has iron and nickel, the Inner Core is the primary solid mass.'
    },
    {
        type: 'fact',
        title: 'Dynamic Planet!',
        text: 'Plate tectonics is the theory that Earth\'s outer shell is divided into several plates that glide over the mantle, the rocky inner layer above the core.'
    }
];

let currentTriviaIndex = -1;
let displayedTriviaIndices = [];

function displayTerraTrivia() {
    const triviaContainer = document.getElementById('terraTriviaContent');
    if (!triviaContainer) return;

    if (displayedTriviaIndices.length >= terraTriviaData.length) {
        displayedTriviaIndices = []; // Reset if all have been shown
    }

    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * terraTriviaData.length);
    } while (displayedTriviaIndices.includes(nextIndex));

    currentTriviaIndex = nextIndex;
    displayedTriviaIndices.push(currentTriviaIndex);
    
    const item = terraTriviaData[currentTriviaIndex];
    let contentHTML = `<h4>${item.title}</h4>`;

    if (item.type === 'fact') {
        contentHTML += `<p>${item.text}</p>`;
    } else if (item.type === 'quiz') {
        contentHTML += `<p>${item.question}</p>`;
        contentHTML += '<div class="quiz-options">';
        item.options.forEach(option => {
            contentHTML += `<button class="quiz-option-btn" data-option="${option}">${option}</button>`;
        });
        contentHTML += '</div>';
        contentHTML += '<div class="quiz-feedback"></div>'; // For feedback messages
    }
    triviaContainer.innerHTML = contentHTML;

    if (item.type === 'quiz') {
        addQuizListeners(item);
    }
}

function addQuizListeners(quizItem) {
    const optionButtons = document.querySelectorAll('#terraTriviaContent .quiz-option-btn');
    const feedbackDiv = document.querySelector('#terraTriviaContent .quiz-feedback');

    optionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const selectedOption = event.target.dataset.option;
            optionButtons.forEach(btn => btn.disabled = true); // Disable all options after one is clicked

            if (selectedOption === quizItem.answer) {
                event.target.classList.add('correct');
                feedbackDiv.textContent = quizItem.feedbackCorrect;
                feedbackDiv.className = 'quiz-feedback correct';
            } else {
                event.target.classList.add('incorrect');
                feedbackDiv.textContent = quizItem.feedbackIncorrect;
                feedbackDiv.className = 'quiz-feedback incorrect';
                // Optionally highlight the correct answer
                optionButtons.forEach(btn => {
                    if (btn.dataset.option === quizItem.answer) {
                        btn.classList.add('correct');
                    }
                });
            }
        }, { once: true }); // Ensure listener fires only once per button load
    });
}

// --- END Terra-Trivia --- 

function setActiveNavLink(activeSectionId) {
    mainNavLinks.forEach(link => {
        link.classList.remove('active-nav-link');
        const linkSectionId = link.id.substring(3).toLowerCase();
        if (linkSectionId === activeSectionId) {
            link.classList.add('active-nav-link');
        }
    });
}

if (navHome) navHome.addEventListener('click', (e) => { e.preventDefault(); switchSection('home'); });
if (navNorsu) {
    navNorsu.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Nav NORSU link clicked."); // Log for navNorsu
        if (window.geoRealmThreeD && typeof window.geoRealmThreeD.isAnimating === 'function') {
            console.log("geoRealmThreeD API found for navNorsu. Is animating?", window.geoRealmThreeD.isAnimating());
            if (!window.geoRealmThreeD.isAnimating()) {
                const norsuLat = 9.3;
                const norsuLon = 123.3;
                const zoomDist = 1.0;

                if (homeTextPanel && mainGeoRealmTitle && currentSection === 'home') {
                    homeTextPanel.style.transition = 'opacity 0.5s ease-out';
                    homeTextPanel.style.opacity = '0';
                    mainGeoRealmTitle.style.transition = 'opacity 0.5s ease-out';
                    mainGeoRealmTitle.style.opacity = '0';
                    const triviaContainer = document.getElementById('terraTriviaContainer');
                    if (triviaContainer) {
                        triviaContainer.style.transition = 'opacity 0.5s ease-out';
                        triviaContainer.style.opacity = '0';
                    }
                }
                console.log("Calling zoomToLocation from navNorsu...");
                window.geoRealmThreeD.zoomToLocation(norsuLat, norsuLon, zoomDist, () => {
                    console.log("zoomToLocation callback from navNorsu: switching section to norsu.");
                    switchSection('norsu');
                });
            } else {
                console.log("Camera is already animating. Zoom skipped for navNorsu.");
            }
        } else if (!window.geoRealmThreeD) {
            console.error("geoRealmThreeD API not found for navNorsu! Cannot zoom. Switching section directly.");
            switchSection('norsu');
        } else {
            console.error("geoRealmThreeD.isAnimating is not a function for navNorsu!", window.geoRealmThreeD);
            switchSection('norsu');
        }
    });
}
if (navTools) navTools.addEventListener('click', (e) => { e.preventDefault(); switchSection('tools'); });
if (navAboutUs) navAboutUs.addEventListener('click', (e) => { e.preventDefault(); switchSection('aboutUs'); });

if (exploreNorsuBtn) {
    exploreNorsuBtn.addEventListener('click', () => {
        console.log("Explore NORSU button clicked."); // Log 1
        if (window.geoRealmThreeD && typeof window.geoRealmThreeD.isAnimating === 'function') {
            console.log("geoRealmThreeD API found. Is animating?", window.geoRealmThreeD.isAnimating()); // Log 2
            if (!window.geoRealmThreeD.isAnimating()) {
                const norsuLat = 9.3;
                const norsuLon = 123.3;
                const zoomDist = 1.0;

        if (homeTextPanel && mainGeoRealmTitle && currentSection === 'home') {
                    homeTextPanel.style.transition = 'opacity 0.5s ease-out';
            homeTextPanel.style.opacity = '0';
                    mainGeoRealmTitle.style.transition = 'opacity 0.5s ease-out';
            mainGeoRealmTitle.style.opacity = '0';
                    const triviaContainer = document.getElementById('terraTriviaContainer');
                    if (triviaContainer) {
                        triviaContainer.style.transition = 'opacity 0.5s ease-out';
                        triviaContainer.style.opacity = '0';
                    }
                }
                console.log("Calling zoomToLocation..."); // Log 3
                window.geoRealmThreeD.zoomToLocation(norsuLat, norsuLon, zoomDist, () => {
                    console.log("zoomToLocation callback: switching section to norsu."); // Log 4
                    switchSection('norsu');
                });
            } else {
                console.log("Camera is already animating. Zoom skipped."); // Log 5
            }
        } else if (!window.geoRealmThreeD) {
            console.error("geoRealmThreeD API not found! Cannot zoom. Switching section directly."); // Log 6
            switchSection('norsu');
        } else {
            console.error("geoRealmThreeD.isAnimating is not a function!", window.geoRealmThreeD); // Log 7
            switchSection('norsu');
        }
    });
}
if (tryToolsBtn) tryToolsBtn.addEventListener('click', () => switchSection('tools'));
if (backToHomeBtn) backToHomeBtn.addEventListener('click', () => switchSection('home'));
if (backToNorsuBtn) backToNorsuBtn.addEventListener('click', () => switchSection('norsu'));
if (backToHomeFromAboutBtn) backToHomeFromAboutBtn.addEventListener('click', () => switchSection('home'));

function switchSection(targetSectionId) {
    if (!sections[targetSectionId] || (targetSectionId === currentSection && targetSectionId !== 'home') ) return;
    if (window.geoRealmThreeD && window.geoRealmThreeD.isAnimating()) return; // Don't switch if camera is animating

    const currentActiveSection = sections[currentSection];
    const nextSection = sections[targetSectionId];

    // Handle zoom reset if leaving norsu or if navigating to home from anywhere (and not already home)
    const needsZoomReset = (currentSection === 'norsu' && targetSectionId !== 'norsu') || 
                             (targetSectionId === 'home' && currentSection !== 'home');

    function performSectionSwitch() {
        if (currentActiveSection) {
            currentActiveSection.classList.remove('active');
            setTimeout(() => {
            currentActiveSection.classList.add('hidden-section');
            if (currentSection === 'home') {
                if (homeTextPanel) { homeTextPanel.style.opacity = '1'; homeTextPanel.style.transition = ''; }
                if (mainGeoRealmTitle) { mainGeoRealmTitle.style.opacity = '1'; mainGeoRealmTitle.style.transition = ''; }
                    const triviaContainer = document.getElementById('terraTriviaContainer');
                    if (triviaContainer) { triviaContainer.style.opacity = '1'; triviaContainer.style.transition = '';}
                }
            }, 600);
            }
            
        setTimeout(() => {
            if (nextSection) {
                nextSection.classList.remove('hidden-section');
                void nextSection.offsetWidth;
                nextSection.classList.add('active');

                if (targetSectionId === 'tools' && typeof updateCarouselVisuals === 'function') {
                    if (typeof handleCarouselResize === 'function') handleCarouselResize();
                     updateCarouselVisuals(); 
                     if (typeof updateCarouselIndicators === 'function') updateCarouselIndicators(); 
                } else if (targetSectionId === 'home') {
                    if (typeof handleThreeSceneResize === 'function') handleThreeSceneResize();
                    // Opacity for home elements is reset when leaving a section, or handled by zoom if coming to home
                }
        }
        currentSection = targetSectionId;
        setActiveNavLink(currentSection);
        window.scrollTo(0, 0);
        }, currentActiveSection ? 100 : 0);
    }

    if (needsZoomReset && window.geoRealmThreeD) {
        window.geoRealmThreeD.resetZoom(() => {
            // Ensure home text elements are visible after zoom reset if target is home
            if (targetSectionId === 'home') {
                 if (homeTextPanel) { homeTextPanel.style.opacity = '1'; homeTextPanel.style.transition = ''; }
                 if (mainGeoRealmTitle) { mainGeoRealmTitle.style.opacity = '1'; mainGeoRealmTitle.style.transition = ''; }
                 const triviaContainer = document.getElementById('terraTriviaContainer');
                 if (triviaContainer) { triviaContainer.style.opacity = '1'; triviaContainer.style.transition = '';}
            }
            performSectionSwitch();
        });
    } else {
        performSectionSwitch();
    }
}

// Modal Logic
const toolModal = document.getElementById('toolModal');
const toolModalTitle = document.getElementById('toolModalTitle');
const closeToolModalBtn = document.getElementById('closeToolModalBtn');

function showToolModal(toolName) { 
    if (toolModalTitle && toolModal) {
        toolModalTitle.textContent = toolName;
        toolModal.classList.remove('hidden-section');
        toolModal.classList.add('active');
    }
}
if (closeToolModalBtn) {
    closeToolModalBtn.addEventListener('click', () => {
        if (toolModal) {
            toolModal.classList.add('hidden-section');
            toolModal.classList.remove('active');
        }
    });
}
if (toolModal) { 
    toolModal.addEventListener('click', (event) => {
        if (event.target === toolModal) { // Click on backdrop
            toolModal.classList.add('hidden-section');
            toolModal.classList.remove('active');
        }
    });
}

// Back to Top Button 
const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            backToTopBtn.style.display = "block";
        } else {
            backToTopBtn.style.display = "none";
        }
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

// Main Window Resize Handler
function onWindowResize() {
    // These functions are expected to be globally available from three-scene.js and tool-carousel.js
    if (typeof handleThreeSceneResize === 'function') {
        handleThreeSceneResize();
    }
    if (typeof handleCarouselResize === 'function') {
        handleCarouselResize();
    }
    // Add other resize handlers if necessary
}
window.addEventListener('resize', onWindowResize, false);


// Initial Setup on Window Load
window.addEventListener('load', () => {
    // Initialize sections visibility
    if (sections.home) { sections.home.classList.add('active'); sections.home.classList.remove('hidden-section'); }
    if (sections.norsu) { sections.norsu.classList.add('hidden-section'); sections.norsu.classList.remove('active'); }
    if (sections.tools) { sections.tools.classList.add('hidden-section'); sections.tools.classList.remove('active'); }
    if (sections.aboutUs) { sections.aboutUs.classList.add('hidden-section'); sections.aboutUs.classList.remove('active'); }
    if (toolModal) { toolModal.classList.add('hidden-section'); toolModal.classList.remove('active'); } // Ensure modal is hidden

    // Initialize main modules (expecting functions to be global)
    if (typeof initThreeJS === 'function') {
        initThreeJS(); 
    }
    if (typeof setupToolCarousel === 'function') {
        setupToolCarousel(); 
    }
    if (typeof populateCreditsRoll === 'function') {
        populateCreditsRoll();
    }
    
    setActiveNavLink(currentSection); // Set initial active nav link

    // Set current year in footer (if #currentYear element exists)
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    
    onWindowResize(); // Call once on load to set initial sizes correctly
    
    // Start the Three.js animation loop (expecting function to be global)
    if (typeof animateThreeJS === 'function') {
        animateThreeJS();
    }

    console.log('Main script initialized.'); // Simplified log message

    // Terra-Trivia Initialization
    const nextTriviaBtn = document.getElementById('nextTerraTriviaBtn');
    if (nextTriviaBtn) {
        nextTriviaBtn.addEventListener('click', displayTerraTrivia);
    }
    if (typeof displayTerraTrivia === 'function') {
        displayTerraTrivia(); // Initial load of Terra-Trivia
    }
});

// --- Function to Populate About Us Credits ---
async function populateCreditsRoll() {
    const creditsRollContainer = document.getElementById('creditsRoll');
    if (!creditsRollContainer) {
        console.warn('Credits roll container not found.');
        return;
    }

    // This is a placeholder for how you might get the list of image files.
    // In a real scenario, this might come from a server, a build script, or a pre-defined array.
    // For now, manually creating a list based on observed file names.
    // IMPORTANT: This requires the 'Pangalan' folder to be accessible relative to the HTML file.
    const teamMembers = [
        { name: "ALMIRA", image: "Pangalan/ALMIRA.jpg" },
        { name: "MELANI", image: "Pangalan/MELANI.jpg" },
        { name: "Hanzel", image: "Pangalan/Hanzel.jpg" },
        { name: "CHEREMIE", image: "Pangalan/CHEREMIE.jpg" },
        { name: "Fritz jonlord", image: "Pangalan/Fritz jonlord.jpg" }, // Corrected potential casing
        { name: "Daveriel", image: "Pangalan/Daveriel.jpg" }, // Corrected potential casing
        { name: "Jeffrey", image: "Pangalan/Jeffrey.jpg" },
        { name: "Zyrell", image: "Pangalan/zyrell.jpg" }, // Corrected potential casing
        { name: "Yuna", image: "Pangalan/yuna.jpg" }, // Corrected potential casing
        { name: "Sylvia", image: "Pangalan/sylvia.jpg" }, // Corrected potential casing
        { name: "Rheadeal Capili", image: "Pangalan/rheadealcapili.jpg" }, // Corrected potential casing
        { name: "Mark Aaron Sabueto", image: "Pangalan/markaaron sabueto.jpg" }, // Corrected filename to include space
        { name: "Gordon", image: "Pangalan/Gordon.jpg" },
        { name: "Kisha Pesrl", image: "Pangalan/kishapesrl.jpg" }, // Assuming this is intended, or kishapearlsojor.jpg
        { name: "Kisha Pearl Sojor", image: "Pangalan/kishapearlsojor.jpg" },
        { name: "Jude Nino Rapacho", image: "Pangalan/Judeninorapacho.jpg" }, // Corrected potential casing
        { name: "Jendy Quisel", image: "Pangalan/Jendy Quisel.jpg" }
    ];

    creditsRollContainer.innerHTML = ''; // Clear any existing content

    teamMembers.forEach((member, index) => {
        const item = document.createElement('div');
        item.classList.add('credit-item');
        // For staggered animation (CSS handles the animation, JS just sets delay)
        item.style.animationDelay = `${index * 0.1}s`;

        const img = document.createElement('img');
        img.src = member.image;
        img.alt = member.name;
        // Add error handling for images if needed
        img.onerror = () => { 
            img.alt = `${member.name} (Image not found)`; 
            // Optionally replace with a placeholder image or style
            img.style.border = '2px dashed var(--text-secondary)';
            img.style.backgroundColor = 'var(--bg-secondary)';
        };

        const nameElement = document.createElement('div');
        nameElement.classList.add('credit-name');
        nameElement.textContent = member.name;

        item.appendChild(img);
        item.appendChild(nameElement);
        creditsRollContainer.appendChild(item);
    });
}

