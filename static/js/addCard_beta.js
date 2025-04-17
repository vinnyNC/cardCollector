/**
 * Add card page JS
 */

// Import debug manager (logger)
import logger from './debug-manager.js';

class AddCard {
    constructor() {
        // Log initialization of the AddCard class
        logger.info('Initializing AddCard component');

        this.stepperCurrentStep = 1;
        this.allSearchResults = [];
        this.isLoading = false;

        // Initialize each step
        this.step1 = new Step1();
        this.step2 = new Step2();
        this.step3 = new Step3();
        this.step4 = new Step4();
        this.step5 = new Step5();
        this.step6 = new Step6();
        this.step7 = new Step7();
        this.step8 = new Step8();

        // Initialize shared utilities
        this.utils = new CardUtils();

        this.init();
    }

    init() {
        // Set up step navigation
        const btnNext = document.getElementById('btnNext');
        const btnPrev = document.getElementById('btnPrev');

        // Disable prev button
        btnPrev.disabled = true;

        btnNext.addEventListener('click', () => {
            const nextStep = this.stepperCurrentStep + 1;
            if (nextStep <= 8) {
                this.stepperChangeStep(nextStep);
            }
        });

        btnPrev.addEventListener('click', () => {
            const prevStep = this.stepperCurrentStep - 1;
            if (prevStep >= 1) {
                this.stepperChangeStep(prevStep);
            }
        });

        // Initialize steps
        this.step1.init();
    }

    stepperChangeStep(step) {
        // Implementation of step change logic
        this.stepperCurrentStep = step;

        // Update UI for step change
        // ...

        // Disable/enable navigation buttons
        document.getElementById('btnPrev').disabled = step === 1;

        // Hide all step divs
        for (let i = 1; i <= 8; i++) {
            document.getElementById(`addCardStep${i}`).classList.add('hidden');
        }

        // Show current step
        document.getElementById(`addCardStep${step}`).classList.remove('hidden');

        // Initialize the newly active step if needed
        this[`step${step}`].activate();
    }
}

/**
 * Utility functions shared across steps
 */
class CardUtils {
    constructor() {
        // Shared state
    }

    async makeApiCall(searchTerm, endpoint) {
        // Implementation of API calls
        // ...
    }

    showLoadingState() {
        // Show loading indicators
        // ...
    }

    // Other shared utilities
    // ...
}

/**
 * Step 1: Set Selection
 */
class Step1 {
    constructor() {
        this.allSearchResults = [];
        this.isLoading = false;
    }

    init() {
        // Add filter and sort controls to the UI
        this.addFilterSortControls();

        // Load default set list
        this.loadDefaultSetList();

        // Set up search functionality
        this.setupSearchInput();

        // Set up Add Set Modal
        this.setupAddSetModal();
    }

    activate() {
        // Code to run when this step becomes active
    }

    loadDefaultSetList() {
        // Implementation of step1LoadDefaultSetList
        // ...
    }

    setupSearchInput() {
        const setSearchInput = document.getElementById('setName');
        if (setSearchInput) {
            // Add debounce logic
            let searchTimeout;
            setSearchInput.addEventListener('input', () => {
                // Implementation...
                // ...
            });
        }
    }

    setupAddSetModal() {
        // Getting elements
        const addSetNewModal = document.getElementById('addNewSetModal');
        const addNewSetButton = document.getElementById('btnAddNewSet');
        const cancelAddSetButton = document.getElementById('cancelAddSet');
        const submitAddSet = document.getElementById('submitAddSet');
        const yearSelect = document.getElementById('newSetYear');
        const sportSelect = document.getElementById('newSetSport');

        // Set up years dropdown
        this.setupYearDropdown(yearSelect);

        // Fetch sports
        this.fetchSportsForDropdown(sportSelect);

        // Close modal
        cancelAddSetButton.addEventListener('click', () => {
            addSetNewModal.classList.add('hidden');
        });

        // Handle form submission
        submitAddSet.addEventListener('click', async (event) => {
            // Implementation...
            // ...
        });
    }

    setupYearDropdown(yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1900; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    fetchSportsForDropdown(sportSelect) {
        // Implementation...
        // ...
    }

    addFilterSortControls() {
        // Implementation...
        // ...
    }

    applyFiltersAndSort() {
        // Implementation...
        // ...
    }

    updateSetResultsTable(results) {
        // Implementation...
        // ...
    }
}

/**
 * Step 2: Card Details
 */
class Step2 {
    constructor() {
        // Step-specific state
    }

    init() {
        // Initialize any listeners or default state for this step
    }

    activate() {
        // Code to run when this step becomes active
    }

    // Step-specific methods
    // ...
}

// Similar classes for Steps 3-8
class Step3 { /* ... */

}

class Step4 { /* ... */

}

class Step5 { /* ... */

}

class Step6 { /* ... */

}

class Step7 { /* ... */

}

class Step8 { /* ... */

}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.addCard = new AddCard();
});
