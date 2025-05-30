// utils.js

const UTILS = {
    /**
     * Format Miller indices for display (no change)
     */
    formatMillerIndices: function(h, k, l) {
        return `(${h}, ${k}, ${l})`;
    },

    /**
     * Render mathematical expressions using KaTeX (no change)
     */
    renderMath: function(expression, element) {
        try {
            katex.render(expression, element, {
                throwOnError: false,
                displayMode: true
            });
        } catch (error) {
            CONFIG_UTILS.debug('Math rendering error: ' + error.message, 'error', error);
            element.textContent = expression;
        }
    },

    /**
     * Generate solution steps HTML (no change)
     */
    renderSolutionSteps: function(steps, container) {
        try {
            container.innerHTML = '';
            steps.forEach(step => {
                const stepElement = document.createElement('div');
                stepElement.className = 'step';

                const description = document.createElement('p');
                description.textContent = step.description;
                stepElement.appendChild(description);

                const mathElement = document.createElement('div');
                mathElement.className = 'math';
                this.renderMath(step.math, mathElement);
                stepElement.appendChild(mathElement);

                if (step.values) {
                    const valuesContainer = document.createElement('div');
                    valuesContainer.className = 'values-container'; // Use a container for better styling if needed
                    let valuesHTML = '<strong>Calculated Values:</strong><ul>';
                    for (const [key, value] of Object.entries(step.values)) {
                        valuesHTML += `<li>${key}: ${this.formatValue(value)}</li>`;
                    }
                    valuesHTML += '</ul>';
                    valuesContainer.innerHTML = valuesHTML;
                    stepElement.appendChild(valuesContainer);
                }
                container.appendChild(stepElement);
            });
        } catch (error) {
            CONFIG_UTILS.debug('Solution rendering error: ' + error.message, 'error', error);
            container.innerHTML = '<p class="error-message" style="display:block;">Error rendering solution steps</p>';
        }
    },

    /**
     * Format numeric values for display (no change)
     */
    formatValue: function(value) {
        if (value === Infinity || value === -Infinity || !Number.isFinite(value)) return '∞';
        if (Math.abs(value) < 1e-10) return '0'; // Handles very small numbers as 0
        // Intelligent formatting for numbers
        const absValue = Math.abs(value);
        if (absValue >= 10000 || (absValue > 0 && absValue < 0.001)) {
            return value.toExponential(2);
        }
        // Attempt to show integers as integers, otherwise to 3-4 decimal places
        if (Number.isInteger(value)) {
            return value.toString();
        }
        // For numbers like 0.33333333, toFixed(3) is 0.333. For 0.5, it's 0.500.
        // Let's try to be a bit smarter for common fractions or keep precision
        const s = value.toFixed(4);
        return parseFloat(s).toString(); // Removes trailing zeros from toFixed
    },

    /**
     * Show message in a specified element.
     * @param {string} message - Message text.
     * @param {string} type - Message type ('error', 'warning', 'info', 'success').
     * @param {HTMLElement} element - The DOM element to display the message in.
     */
    showMessage: function(message, type = 'error', element) {
        if (!element) {
            console.warn('showMessage: No element provided to display message:', message);
            return;
        }
        element.textContent = message;
        // Ensure element has base class if not already present (e.g. for general error div)
        if (!element.classList.contains('error-message') && !element.classList.contains('feedback-message')) {
             element.classList.add('feedback-message'); // A generic class for styling if needed
        }
        // Remove old type classes
        ['error', 'warning', 'info', 'success'].forEach(t => element.classList.remove(t));
        // Add new type class
        element.classList.add(type.toLowerCase());
        element.style.display = 'block';

        const durationConfig = CONFIG.FEEDBACK[type.toUpperCase()] || CONFIG.FEEDBACK.INFO;
        setTimeout(() => {
            // Only hide if the message hasn't been replaced by a new one
            if (element.textContent === message) {
                element.style.display = 'none';
                element.textContent = ''; // Clear text after hiding
            }
        }, durationConfig.duration);
    },

    /**
     * Clear message from a specified element.
     * @param {HTMLElement} element - The DOM element to clear.
     */
    clearMessage: function(element) {
        if (element) {
            element.style.display = 'none';
            element.textContent = '';
            ['error', 'warning', 'info', 'success'].forEach(t => element.classList.remove(t));
        }
    },

    /**
     * Clears validation styling and message for a given input.
     * @param {HTMLInputElement} inputElement - The input element.
     * @param {HTMLElement} [validationMessageElement] - Optional. The element displaying the validation message.
     */
    clearValidation: function(inputElement, validationMessageElement) {
        if (inputElement) {
            inputElement.classList.remove('valid', 'invalid');
        }
        const msgElement = validationMessageElement || document.getElementById(`${inputElement.id}-validation`);
        if (msgElement) {
            msgElement.textContent = '';
        }
    },

    /**
     * Validate Miller Index input field.
     * @param {HTMLInputElement} input - Input element.
     * @returns {boolean} Validation result.
     */
    validateMillerIndexInput: function(input) {
        const validationElement = document.getElementById(`${input.id}-validation`);
        this.clearValidation(input, validationElement); // Clear previous state

        try {
            const value = input.value; // Get current value
            if (value.trim() === '') { // Check for empty string first
                 // For Miller indices, empty might not be immediately invalid if not generating
                 // Let's consider it not valid for active validation.
                throw new Error('Field is required.');
            }
            // CONFIG_UTILS.validateMillerIndexInput expects a number or a string that can be parsed.
            CONFIG_UTILS.validateMillerIndexInput(value); // This throws on error

            input.classList.add('valid');
            return true;
        } catch (error) {
            input.classList.add('invalid');
            if (validationElement) {
                validationElement.textContent = error.message.split(': ')[1] || error.message;
            }
            return false;
        }
    },

    /**
     * Validate Axial Ratio input field.
     * @param {HTMLInputElement} input - Input element.
     * @returns {boolean} Validation result.
     */
    validateAxialRatioInput: function(input) {
        const validationElement = document.getElementById(`${input.id}-validation`);
        this.clearValidation(input, validationElement); // Clear previous state

        try {
            const value = input.value;
             if (value.trim() === '') {
                throw new Error('Ratio is required.');
            }
            CONFIG_UTILS.validateAxialRatioInput(value); // This throws on error

            input.classList.add('valid');
            return true;
        } catch (error) {
            input.classList.add('invalid');
            if (validationElement) {
                validationElement.textContent = error.message.split(': ')[1] || error.message;
            }
            return false;
        }
    },

    /**
     * Show loading state (no change)
     */
    setLoading: function(isLoading) {
        const loadingOverlay = document.getElementById('loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        }
    },

    /**
     * Reset all relevant input fields and their validation states.
     * This is now more of a helper for main.js's reset logic.
     */
    resetAllApplicationInputs: function() {
        // This function is largely superseded by main.js's handleReset,
        // but can be used as a generic input clearer if needed.
        // For this iteration, main.js handles specific reset logic.
        const millerInputs = ['h', 'k', 'l', 'i'];
        millerInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = '';
                this.clearValidation(input);
            }
        });

        const ratioInputs = ['a_b_ratio', 'c_b_ratio', 'c_a_ratio'];
        ratioInputs.forEach(id => {
             const input = document.getElementById(id);
             if (input) {
                 input.value = ''; // Defaults will be set by main.js updateUI
                 this.clearValidation(input);
             }
        });

        const errorElement = document.getElementById('error');
        if (errorElement) this.clearMessage(errorElement);

        const stepsContainer = document.getElementById('steps');
        if (stepsContainer) stepsContainer.innerHTML = '';
    },


    /**
     * Document ready handler (no change)
     */
    onReady: function(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    },

    /**
     * Simplified initEventListeners. Most specific listeners are in main.js.
     * This can be removed if main.js handles all event setup.
     */
    initEventListeners: function() {
        // Example: If there were global utility listeners, they'd go here.
        // For now, main.js is handling specific input listeners.
        // const resetButton = document.querySelector('.secondary-btn');
        // if (resetButton) {
        //    resetButton.addEventListener('click', this.resetAllApplicationInputs.bind(this));
        // }
        // This is a bit redundant now with main.js's handleReset.
    }
};

window.UTILS = UTILS;

// UTILS.onReady(() => {
//    UTILS.initEventListeners(); // main.js now handles most event listeners directly.
// });
