import logger from '../debug-manager.js';

export class StepBase {
    constructor(addCardInstance, utils, config, state, stepNumber) {
        this.addCardInstance = addCardInstance;
        this.utils = utils;
        // Attempt to get step-specific config, fallback to global if needed
        this.config = config.ELEMENT_IDS[`STEP_${stepNumber}`] || {};
        this.globalConfig = config;
        this.state = state;
        this.stepNumber = stepNumber;
        logger.info(`Step${stepNumber} initialized.`);
    }

    init() {
        logger.info(`Step${this.stepNumber}: Initializing.`);
        // Common init logic or specific listeners for this step
    }

    activate() {
        logger.info(`Step${this.stepNumber}: Activated.`);
        logger.debug(`Step${this.stepNumber} Activate: State=`, JSON.parse(JSON.stringify(this.state)));
        // Logic when step becomes active (e.g., populate based on state.selectedCard)
        this.updateNextButtonState(); // Ensure button state is correct on activation
    }

    deactivate() {
        logger.info(`Step${this.stepNumber}: Deactivated.`);
        // Cleanup when step becomes inactive
    }

    updateNextButtonState() {
        const btnNext = document.getElementById(this.globalConfig.ELEMENT_IDS.NEXT_BUTTON);
        if (!btnNext) return;
        // Default: enable next unless it's the last step
        let enableNext = this.stepNumber < this.globalConfig.MAX_STEPS;
        // Add step-specific logic to disable if needed (e.g., required fields not filled)
        // Example: if (this.stepNumber === 3 && !this.validateStep3()) enableNext = false;
        btnNext.disabled = !enableNext;
        logger.debug(`Step${this.stepNumber}: Next button ${enableNext ? 'enabled' : 'disabled'}.`);
    }
}

    // Example validation placeholder
    // validateStep3() { return true; }