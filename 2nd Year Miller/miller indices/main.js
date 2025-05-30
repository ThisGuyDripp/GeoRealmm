// main.js

class MillerIndicesApp {
    constructor() {
        this.visualizer = null;
        // UI elements for crystal system and Miller indices
        this.crystalSystemSelect = document.getElementById('crystal-system');
        this.hInput = document.getElementById('h');
        this.kInput = document.getElementById('k');
        this.iInput = document.getElementById('i');
        this.lInput = document.getElementById('l');
        this.iInputField = this.iInput ? this.iInput.closest('.input-field') : null;

        // UI element for Axial Ratios Toggle
        this.useCustomAxialRatiosCheckbox = document.getElementById('use-custom-axial-ratios');

        // UI elements for Axial Ratios
        this.axialRatiosGroup = document.getElementById('axial-ratios-group');
        this.cubicAxialRatiosInputs = document.getElementById('cubic-axial-ratios-inputs');
        this.a_b_ratioInput = document.getElementById('a_b_ratio');
        this.c_b_ratioInput = document.getElementById('c_b_ratio');
        this.hexagonalAxialRatiosInputs = document.getElementById('hexagonal-axial-ratios-inputs');
        this.c_a_ratioInput = document.getElementById('c_a_ratio');
        this.allAxialRatioInputs = [this.a_b_ratioInput, this.c_b_ratioInput, this.c_a_ratioInput];


        // Buttons and feedback
        this.generateButton = document.querySelector('.primary-btn');
        this.resetButton = document.querySelector('.secondary-btn');
        this.stepsContainer = document.getElementById('steps');
        this.errorElement = document.getElementById('error');

        if (!this.crystalSystemSelect || !this.hInput || !this.kInput || !this.iInput || !this.lInput || !this.iInputField ||
            !this.useCustomAxialRatiosCheckbox || // Check for toggle
            !this.axialRatiosGroup || !this.cubicAxialRatiosInputs || !this.a_b_ratioInput || !this.c_b_ratioInput ||
            !this.hexagonalAxialRatiosInputs || !this.c_a_ratioInput ||
            !this.generateButton || !this.resetButton || !this.stepsContainer || !this.errorElement) {
            console.error("MillerIndicesApp Error: One or more required UI elements not found in the DOM.");
            throw new Error("Missing required UI elements. Check HTML IDs and structure.");
        }

        this.init();
    }

    init() {
        try {
            this.visualizer = new MillerVisualizer('scene-container');
            this.bindEvents();
            this.useCustomAxialRatiosCheckbox.checked = false;
            this.updateUIForCrystalSystem();
            // Optionally, trigger an initial generation with defaults if h,k,l have placeholder values
            // For now, user needs to input indices and click generate.
            window.UTILS.setLoading(false);
        } catch (error) {
            console.error("App Initialization Error:", error);
            CONFIG_UTILS.debug('App initialization error: ' + error.message, 'error', error);
            UTILS.showMessage(`Failed to initialize application: ${error.message}`, 'error', this.errorElement);
            window.UTILS.setLoading(false);
        }
    }

    bindEvents() {
        this.generateButton.addEventListener('click', this.handleGenerate.bind(this));
        this.resetButton.addEventListener('click', this.handleReset.bind(this));
        this.crystalSystemSelect.addEventListener('change', () => {
            this.updateUIForCrystalSystem();
            // If Miller indices are present, regenerate to reflect potential system change with current indices
            if (this.hInput.value || this.kInput.value || this.lInput.value) {
                this.handleGenerate();
            }
        });

        this.useCustomAxialRatiosCheckbox.addEventListener('change', () => {
            this.updateUIForCrystalSystem();
            // IMPORTANT FIX: Regenerate visualization when toggle changes
            // This ensures the AxisSystem and plane reflect the new state (custom or default ratios)
            // Only generate if there are some Miller indices entered, to avoid errors on empty inputs.
            if (this.hInput.value || this.kInput.value || this.lInput.value) {
                 this.handleGenerate();
            } else if (this.visualizer && this.visualizer.axisSystem) {
                // If no Miller indices, at least update the AxisSystem (unit cell)
                const currentSystem = this.crystalSystemSelect.value;
                const ratiosToUse = this.getAxialRatiosFromInputs(); // Gets defaults if toggle is off
                this.visualizer.axisSystem.setSystem(currentSystem, ratiosToUse);
                this.visualizer.clearVisualizationElements(); // Clear any existing plane
            }
        });


        const millerInputs = [this.hInput, this.kInput, this.lInput];
        millerInputs.forEach(input => {
            input.addEventListener('input', () => {
                UTILS.validateMillerIndexInput(input);
                if (input === this.hInput || input === this.kInput) {
                    this.updateIIndex();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (!CONFIG_UTILS.validateKeyForMillerIndex(e)) e.preventDefault();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleGenerate();
                }
            });
        });

        this.allAxialRatioInputs.forEach(input => {
            input.addEventListener('input', () => UTILS.validateAxialRatioInput(input));
            input.addEventListener('keydown', (e) => {
                if (!CONFIG_UTILS.validateKeyForAxialRatio(e)) e.preventDefault();
                 if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleGenerate();
                }
            });
        });

        this.boundResizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
    }

    updateUIForCrystalSystem() {
        const selectedSystem = this.crystalSystemSelect.value;
        const useCustomRatios = this.useCustomAxialRatiosCheckbox.checked;
        const iValidationElement = document.getElementById('i-validation');

        if (selectedSystem === 'hexagonal') {
            this.iInputField.style.display = 'flex';
            this.updateIIndex();
        } else {
            this.iInputField.style.display = 'none';
            this.iInput.value = '';
            UTILS.clearValidation(this.iInput, iValidationElement);
        }

        this.cubicAxialRatiosInputs.style.display = 'none';
        this.hexagonalAxialRatiosInputs.style.display = 'none';
        this.allAxialRatioInputs.forEach(input => input.disabled = true);


        if (useCustomRatios) {
            this.axialRatiosGroup.style.display = 'block';
            let activeRatioInputs = [];
            let systemDefaults = {};

            if (selectedSystem === 'cubic') {
                this.cubicAxialRatiosInputs.style.display = 'grid';
                activeRatioInputs = [this.a_b_ratioInput, this.c_b_ratioInput];
                systemDefaults = CONFIG.AXIS.CUBIC.DEFAULT_AXIAL_RATIOS;
                this.a_b_ratioInput.value = this.a_b_ratioInput.value || systemDefaults.a_b.toFixed(4);
                this.c_b_ratioInput.value = this.c_b_ratioInput.value || systemDefaults.c_b.toFixed(4);
            } else if (selectedSystem === 'hexagonal') {
                this.hexagonalAxialRatiosInputs.style.display = 'grid';
                activeRatioInputs = [this.c_a_ratioInput];
                systemDefaults = CONFIG.AXIS.HEXAGONAL.DEFAULT_AXIAL_RATIOS;
                this.c_a_ratioInput.value = this.c_a_ratioInput.value || systemDefaults.c_a.toFixed(4);
            }

            activeRatioInputs.forEach(input => {
                input.disabled = false;
                UTILS.validateAxialRatioInput(input);
            });

        } else {
            this.axialRatiosGroup.style.display = 'none';
            this.allAxialRatioInputs.forEach(input => UTILS.clearValidation(input));
        }
    }

    updateIIndex() {
        if (this.crystalSystemSelect.value !== 'hexagonal') {
            return;
        }
        const hVal = parseInt(this.hInput.value);
        const kVal = parseInt(this.kInput.value);
        const iValidationElement = document.getElementById('i-validation');

        if (Number.isInteger(hVal) && Number.isInteger(kVal)) {
            const iVal = -(hVal + kVal);
            this.iInput.value = iVal;
            try {
                CONFIG_UTILS.validateMillerIndexInput(iVal.toString());
                UTILS.clearValidation(this.iInput, iValidationElement);
                this.iInput.classList.add('valid');
            } catch (error) {
                if (iValidationElement) iValidationElement.textContent = `Calc. 'i' (${iVal}): ${error.message.split(': ')[1] || error.message}`;
                this.iInput.classList.add('invalid');
                this.iInput.classList.remove('valid');
            }
        } else {
            this.iInput.value = '';
            UTILS.clearValidation(this.iInput, iValidationElement);
        }
    }
// In main.js
    getAxialRatiosFromInputs() {
        const systemKey = this.crystalSystemSelect.value.toUpperCase();
        const useCustom = this.useCustomAxialRatiosCheckbox.checked;

        // Get a fresh copy of defaults for the current system
        let defaultRatiosForSystem = {};
        if (CONFIG.AXIS[systemKey] && CONFIG.AXIS[systemKey].DEFAULT_AXIAL_RATIOS) {
            defaultRatiosForSystem = { ...CONFIG.AXIS[systemKey].DEFAULT_AXIAL_RATIOS };
        } else {
            CONFIG_UTILS.debug(`getAxialRatiosFromInputs: No CONFIG defaults for ${systemKey}, using absolute fallback.`, 'warn');
            defaultRatiosForSystem = (systemKey === 'HEXAGONAL') ? { c_a: 1.0 } : { a_b: 1.0, c_b: 1.0 };
        }
        CONFIG_UTILS.debug(`getAxialRatiosFromInputs: useCustom=${useCustom}. Default ratios for ${systemKey}:`, 'info', JSON.parse(JSON.stringify(defaultRatiosForSystem)));


        if (!useCustom) {
            CONFIG_UTILS.debug(`getAxialRatiosFromInputs: Toggle OFF. Returning default ratios:`, 'info', JSON.parse(JSON.stringify(defaultRatiosForSystem)));
            return defaultRatiosForSystem; // Return the fetched defaults
        }

        // Custom ratios are ON
        CONFIG_UTILS.debug(`getAxialRatiosFromInputs: Toggle ON. Reading custom inputs.`, 'info');
        let ratios = {};
        let isValid = true;

        if (this.crystalSystemSelect.value === 'cubic') {
            if (!UTILS.validateAxialRatioInput(this.a_b_ratioInput)) isValid = false;
            if (!UTILS.validateAxialRatioInput(this.c_b_ratioInput)) isValid = false;
            if (isValid) {
                ratios = {
                    a_b: parseFloat(this.a_b_ratioInput.value),
                    c_b: parseFloat(this.c_b_ratioInput.value)
                };
            } else { throw new Error('Invalid custom axial ratios for Cubic system.'); }
        } else if (this.crystalSystemSelect.value === 'hexagonal') {
            if (!UTILS.validateAxialRatioInput(this.c_a_ratioInput)) isValid = false;
            if (isValid) {
                ratios = {
                    c_a: parseFloat(this.c_a_ratioInput.value)
                };
            } else { throw new Error('Invalid custom axial ratio for Hexagonal system.'); }
        }
        // Add other systems here

        for (const key in ratios) {
            if (isNaN(ratios[key])) {
                 throw new Error(`Invalid number format for custom axial ratio: ${key}.`);
            }
        }
        CONFIG_UTILS.debug(`getAxialRatiosFromInputs: Toggle ON. Returning custom ratios:`, 'info', JSON.parse(JSON.stringify(ratios)));
        return ratios;
    }


    handleGenerate() {
        try {
            window.UTILS.setLoading(true);
            UTILS.clearMessage(this.errorElement);

            // Validate Miller indices first
            let millerInputsValid = true;
            [this.hInput, this.kInput, this.lInput].forEach(input => {
                if (!UTILS.validateMillerIndexInput(input)) millerInputsValid = false;
            });
            // For hexagonal, i is auto-calculated and validated in updateIIndex
            if (this.crystalSystemSelect.value === 'hexagonal' && this.iInput.classList.contains('invalid')) {
                millerInputsValid = false; // If calculated 'i' had a validation error (e.g. out of range)
            }

            if (!millerInputsValid) {
                throw new Error('Please correct the errors in the Miller index fields.');
            }
            
            const h = parseInt(this.hInput.value); // Re-parse after validation
            const k = parseInt(this.kInput.value);
            const l = parseInt(this.lInput.value);
            const crystalSystem = this.crystalSystemSelect.value;


            // Get axial ratios (custom or default based on toggle)
            // getAxialRatiosFromInputs will throw if custom inputs are active and invalid
            const axialRatios = this.getAxialRatiosFromInputs();

            let i = null;
            let calculationParams = { system: crystalSystem, axialRatios };

            if (crystalSystem === 'hexagonal') {
                i = parseInt(this.iInput.value);
                if (!Number.isInteger(h) || !Number.isInteger(k) || !Number.isInteger(i) || (Math.abs(h + k + i) > 1e-9) ) {
                    throw new Error(`Hexagonal indices error: h+k+i must sum to 0. Current: ${h}+${k}+${i} = ${h + k + i}.`);
                }
                calculationParams = { ...calculationParams, h, k, i, l };
            } else {
                calculationParams = { ...calculationParams, h, k, l };
            }

            if (h === 0 && k === 0 && l === 0 && (crystalSystem === 'cubic' || (crystalSystem === 'hexagonal' && i === 0))) {
                 throw new Error('All Miller indices cannot simultaneously be zero.');
            }

            const calculator = new InterceptCalculator();
            const success = this.visualizer.visualize(calculationParams);
            if (!success) {
                // Error message should be more specific if possible, from visualize or calculator
                throw new Error('Failed to visualize plane. Check console for details or input errors.');
            }

            const steps = calculator.getSolutionSteps(calculationParams);
            UTILS.renderSolutionSteps(steps, this.stepsContainer);
            UTILS.showMessage('Visualization generated successfully!', 'success', this.errorElement);

        } catch (error) {
            console.error("Generation Error:", error);
            CONFIG_UTILS.debug('Generation error: ' + error.message, 'error', error);
            UTILS.showMessage(error.message, 'error', this.errorElement);
        } finally {
            window.UTILS.setLoading(false);
        }
    }

    handleReset() {
        try {
            [this.hInput, this.kInput, this.lInput, this.iInput].forEach(input => {
                input.value = '';
                UTILS.clearValidation(input);
            });

            this.crystalSystemSelect.value = 'cubic';
            this.useCustomAxialRatiosCheckbox.checked = false;
            this.updateUIForCrystalSystem(); // This will hide custom ratios and set internal state for defaults

            this.allAxialRatioInputs.forEach(input => { // Explicitly clear values just in case
                input.value = '';
                UTILS.clearValidation(input);
            });

            if (this.visualizer) {
                this.visualizer.clearVisualizationElements(); // Clear plane first
                const defaultCubicRatios = CONFIG.AXIS.CUBIC.DEFAULT_AXIAL_RATIOS;
                // Ensure AxisSystem is re-initialized with the default system and its default ratios
                if (this.visualizer.axisSystem) {
                    this.visualizer.axisSystem.setSystem('cubic', { ...defaultCubicRatios });
                } else { // Should not happen if visualizer initialized correctly
                    this.visualizer.axisSystem = new window.AxisSystem(this.visualizer.scene, 'cubic', { ...defaultCubicRatios });
                }
                this.visualizer.resetCameraPosition();
            }

            if (this.stepsContainer) this.stepsContainer.innerHTML = '';
            UTILS.clearMessage(this.errorElement);
            UTILS.showMessage('Inputs and visualization reset.', 'info', this.errorElement);

        } catch (error) {
            console.error("Reset Error:", error);
            CONFIG_UTILS.debug('Reset error: ' + error.message, 'error', error);
            UTILS.showMessage('Failed to reset application state.', 'error', this.errorElement);
        }
    }

    handleResize() {
        if (this.visualizer) {
            this.visualizer.handleResize();
        }
    }

    dispose() {
        window.removeEventListener('resize', this.boundResizeHandler);
        if (this.visualizer) {
            this.visualizer.dispose();
            this.visualizer = null;
        }
        CONFIG_UTILS.debug('MillerIndicesApp disposed.', 'info');
    }
}

window.UTILS.onReady(() => {
    try {
        if (!window.THREE || !window.OrbitControls || !window.InterceptCalculator || !window.AxisSystem || !window.MillerVisualizer || !window.CONFIG || !window.UTILS) {
             console.error("Initialization Error: Core components missing.");
             throw new Error("One or more core components failed to load.");
        }
        window.app = new MillerIndicesApp();
        CONFIG_UTILS.debug('Application successfully initialized by main.js.', 'info');
    } catch (error) {
        console.error('App Creation Error:', error);
        CONFIG_UTILS.debug('App creation error: ' + error.message, 'error', error);
        const errorElement = document.getElementById('error');
        const loadingElement = document.getElementById('script-loading');
        if (errorElement) {
             errorElement.textContent = `Failed to start application: ${error.message}. Check console.`;
             errorElement.style.display = 'block';
        }
        if (loadingElement) loadingElement.style.display = 'none';
    }
});
