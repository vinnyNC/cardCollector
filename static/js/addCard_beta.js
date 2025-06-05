/**
 * Add card page JS
 */

// Import debug manager (logger)
import logger from './debug-manager.js';

// Import step classes
import { StepBase } from './AddCardSteps/StepBase.js';
import { CardUtils } from './AddCardSteps/CardUtils.js';
import { Step1 } from './AddCardSteps/step1.js';
import { Step2 } from './AddCardSteps/step2.js';
import { Step3 } from './AddCardSteps/step3.js';
import { Step4 } from './AddCardSteps/step4.js';
import { Step5 } from './AddCardSteps/step5.js';
import { Step6 } from './AddCardSteps/step6.js';
import { Step7 } from './AddCardSteps/step7.js';
import { Step8 } from './AddCardSteps/step8.js';

class AddCard {
    constructor() {
        // Log initialization of the AddCard class
        logger.info('Initializing AddCard component');

        // Configuration
        this.config = {
            SKIP_STATE_SAVE: true, // Flag to skip state saving for debugging
            API_DEBOUNCE_DELAY: 300,
            MAX_STEPS: 8,
            YEAR_RANGE: {
                start: 1900,
                end: new Date().getFullYear()
            }, ELEMENT_IDS: {
                PREV_BUTTON: 'btnPrev',
                NEXT_BUTTON: 'btnNext',
                STEP_PREFIX: 'addCardStep',
                STEP_1: {
                    SPORT_SELECT: 'newSetSport',
                    YEAR_SELECT: 'newSetYear',
                    MANUFACTURER_SELECT: 'newSetManufacturer',
                    SET_SEARCH_INPUT: 'setName',
                    SET_RESULTS_TABLE: 'setResultsTable',
                    ADD_SET_MODAL: 'addNewSetModal',
                    CANCEL_ADD_SET_BUTTON: 'cancelAddSet',
                    SUBMIT_ADD_SET_BUTTON: 'submitAddSet',
                    FILTER_CONTAINER_ID: 'setFilterContainer', // Added ID for filter container
                    YEAR_FILTER: 'yearFilter',
                    SPORT_FILTER: 'sportFilter',
                    SORT_INDICATOR: 'sortIndicator',
                    SET_SEARCH_RESULTS_TABLE_ELEMENT: 'setSearchResultTable' // Added ID for the table element itself
                },
                STEP_2: {
                    SELECTED_SET_INFO: 'selectedSetInfo',
                    CARD_SEARCH_INPUT: 'cardNumber',
                    CARD_RESULTS_TABLE: 'cardResultsTable',
                    MANUAL_ENTRY_TOGGLE: 'manualEntryToggle',
                    CARD_SEARCH_CONTAINER: 'cardSearchContainer',
                    MANUAL_ENTRY_CONTAINER: 'manualEntryContainer',
                    CARD_NUMBER_MANUAL: 'cardNumberManual',
                    PLAYER_NAME_MANUAL: 'playerName' // Changed ID from 'playerName' to avoid potential conflicts
                },
                STEP_3: {
                    // Main Section Buttons & Containers
                    OPEN_ADD_PLAYER_MODAL_BTN: 'openAddPlayerModalBtn',
                    OPEN_ADD_TEAM_MODAL_BTN: 'openAddTeamModalBtn',
                    SELECTED_PLAYERS_CONTAINER: 'selectedPlayersContainer',
                    SELECTED_TEAMS_CONTAINER: 'selectedTeamsContainer',
                    NO_PLAYERS_MESSAGE: 'noPlayersMessage',
                    NO_TEAMS_MESSAGE: 'noTeamsMessage',

                    // Modal Elements
                    ADD_ENTITY_MODAL: 'addEntityModal',
                    ADD_ENTITY_MODAL_OVERLAY: 'addEntityModalOverlay',
                    MODAL_TITLE: 'modalTitle',
                    MODAL_SEARCH_INPUT: 'modalSearchInput',
                    MODAL_SEARCH_RESULTS_CONTAINER: 'modalSearchResultsContainer',
                    MODAL_LOADING_INDICATOR: 'modalLoadingIndicator',
                    MODAL_NO_RESULTS_INDICATOR: 'modalNoResultsIndicator',
                    CLOSE_ADD_ENTITY_MODAL_BTN_STANDARD: 'closeAddEntityModalBtnStandard', // In header
                    CLOSE_ADD_ENTITY_MODAL_BTN_FOOTER: 'closeAddEntityModalBtn', // In footer (ID was 'closeAddEntityModalBtn')

                    // Player-Team Association
                    PLAYER_TEAM_ASSOCIATION_SECTION: 'playerTeamAssociationSection',
                    PLAYER_TEAM_ASSOCIATIONS_CONTAINER: 'playerTeamAssociationsContainer',

                    // Rookie Card
                    ROOKIE_CARD_CHECKBOX: 'rookieCardCheckbox'
                }
                // Add IDs for other steps as needed
            }
        };

        // State management - Centralized state for the entire process
        this.state = {
            currentStep: 1, selectedSet: null, // { id, name, year, sport }
            selectedCard: null, // { cardId, cardNumber, playerName, ...other card details }
            formData: {}, // Could potentially hold form data across steps if needed
            allSets: [], // Store all sets fetched initially or via search in Step 1
            setFilters: { // Store filter values for Step 1
                year: '', sport: ''
            }, setSortDirection: 'asc', // Store sort direction for Step 1
            allCardsForSet: [], // Store all cards fetched for the selected set in Step 2
            cardSearchTerm: '', // Store current search term for Step 2
            step3Data: {
                players: [], // Array of full player objects
                teams: [],   // Array of full team objects
                associations: {}, // e.g., { playerId1: ['teamId1', 'teamId2'], playerId2: ['teamId1'] }
                isRookieCard: false
            }
        };

        // Init utilities
        this.utils = new CardUtils(this.state); // Pass the shared state

        // Initialize step classes, passing necessary references
        // Each step class gets a reference to the main AddCard instance, utils, config, and the shared state
        this.steps = {
            1: new Step1(this, this.utils, this.config, this.state),
            2: new Step2(this, this.utils, this.config, this.state),
            3: new Step3(this, this.utils, this.config, this.state),
            4: new Step4(this, this.utils, this.config, this.state),
            5: new Step5(this, this.utils, this.config, this.state),
            6: new Step6(this, this.utils, this.config, this.state),
            7: new Step7(this, this.utils, this.config, this.state),
            8: new Step8(this, this.utils, this.config, this.state),
        };

        // Check for saved state and load (Implementation needed)
        this.loadSavedState();

        // Initialize the application
        this.init();
    }

    init() {
        logger.info('AddCard: Initializing core components and listeners.');
        // Set up step navigation
        const btnNext = document.getElementById(this.config.ELEMENT_IDS.NEXT_BUTTON);
        const btnPrev = document.getElementById(this.config.ELEMENT_IDS.PREV_BUTTON);

        if (!btnNext || !btnPrev) {
            logger.error('AddCard Init Error: Navigation buttons not found!');
            return; // Stop initialization if essential elements are missing
        }

        // Disable prev button initially
        btnPrev.disabled = true;

        btnNext.addEventListener('click', () => {
            const nextStep = this.state.currentStep + 1;
            if (nextStep <= this.config.MAX_STEPS) {
                this.stepperChangeStep(nextStep);
            }
        });

        btnPrev.addEventListener('click', () => {
            const prevStep = this.state.currentStep - 1;
            if (prevStep >= 1) {
                this.stepperChangeStep(prevStep);
            }
        });

        // Initialize the first step (and potentially others if needed)
        try {
            this.steps[1].init();
            // You could initialize other steps here if they require setup before activation
            // e.g., this.steps[2].init();
        } catch (error) {
            logger.error('Error during step initialization:', error);
        }

        // Set initial step visibility
        this.stepperChangeStep(this.state.currentStep, true); // Force initial UI update

        logger.info('AddCard: Initialization complete.');
    }

    /**
     * Updates the stepper UI and activates the target step's logic.
     *
     * @param {number} targetStep The step number to navigate to.
     * @param {boolean} [isInitial=false] Flag indicating if this is the initial setup call.
     */
    stepperChangeStep(targetStep, isInitial = false) {
        if (targetStep < 1 || targetStep > this.config.MAX_STEPS) {
            logger.warn(`Attempted to navigate to invalid step: ${targetStep}`);
            return;
        }

        const previousStep = this.state.currentStep;
        logger.info(`Changing step from ${previousStep} to ${targetStep}`);
        this.state.currentStep = targetStep;

        // --- UI Updates ---
        // Process all steps in a single loop for UI updates
        for (let i = 1; i <= this.config.MAX_STEPS; i++) {
            const isActive = i === targetStep;

            // Update step indicator (Stepper List Item)
            const item = document.getElementById(`stepperListItem${i}`);
            if (item) {
                // Toggle text classes
                ['text-blue-600', 'dark:text-blue-500'].forEach(cls => item.classList.toggle(cls, isActive));

                // Toggle indicator dot border classes
                const dot = item.querySelector('span'); // Assuming the dot is the first span
                if (dot) {
                    ['border-blue-600', 'dark:border-blue-500'].forEach(cls => dot.classList.toggle(cls, isActive));
                    ['border-gray-500', 'dark:border-gray-400'].forEach(cls => dot.classList.toggle(cls, !isActive));
                }
            } else {
                logger.warn(`Stepper list item for step ${i} not found.`);
            }

            // Toggle content visibility
            const stepContent = document.getElementById(`${this.config.ELEMENT_IDS.STEP_PREFIX}${i}`);
            if (stepContent) {
                stepContent.classList.toggle('hidden', !isActive);
            } else {
                logger.warn(`Step content container for step ${i} not found.`);
            }
        }

        // Update navigation buttons state
        const btnPrev = document.getElementById(this.config.ELEMENT_IDS.PREV_BUTTON);
        const btnNext = document.getElementById(this.config.ELEMENT_IDS.NEXT_BUTTON);
        if (btnPrev) btnPrev.disabled = targetStep === 1;
        if (btnNext) btnNext.disabled = targetStep === this.config.MAX_STEPS;

        // --- Activate Step Logic ---
        // Call the 'activate' method of the target step (if it exists and hasn't run yet for this instance)
        const currentStepInstance = this.steps[targetStep];
        if (currentStepInstance && typeof currentStepInstance.activate === 'function') {
            try {
                logger.debug(`Activating logic for Step ${targetStep}`);
                currentStepInstance.activate(); // Run activation logic (e.g., fetch data)
            } catch (error) {
                logger.error(`Error activating Step ${targetStep}:`, error);
            }
        }

        // Optionally call a 'deactivate' method on the previous step
        if (!isInitial) {
            const previousStepInstance = this.steps[previousStep];
            if (previousStepInstance && typeof previousStepInstance.deactivate === 'function') {
                try {
                    logger.debug(`Deactivating logic for Step ${previousStep}`);
                    previousStepInstance.deactivate();
                } catch (error) {
                    logger.error(`Error deactivating Step ${previousStep}:`, error);
                }
            }
        }

        // Persist state (optional)
        this.saveState();
        logger.info(`Step changed successfully to ${targetStep}`);
    }

    // --- State Management ---

    loadSavedState() {
        logger.info('Attempting to load saved state from localStorage.');
        const savedState = localStorage.getItem('addCardState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Carefully merge saved state, avoid overwriting essential defaults or causing issues
                // For now, just restoring the current step as an example
                this.state.currentStep = parsedState.currentStep || 1;
                this.state.selectedSet = parsedState.selectedSet || null;
                // Potentially restore formData, etc.
                logger.info('Successfully loaded and applied saved state:', {
                    currentStep: this.state.currentStep, selectedSet: this.state.selectedSet
                });
            } catch (error) {
                logger.error('Failed to parse saved state:', error);
                localStorage.removeItem('addCardState'); // Clear invalid state
            }
        } else {
            logger.info('No saved state found.');
        }
    }

    saveState() {
        if (!this.config.SKIP_STATE_SAVE) {
            logger.debug('Saving current state to localStorage.');
            try {
                // Only save serializable parts of the state
                const stateToSave = {
                    currentStep: this.state.currentStep,
                    selectedSet: this.state.selectedSet, // Add other relevant state parts here
                    state: this.state
                };
                logger.debug('State to save:', stateToSave);
                localStorage.setItem('addCardState', JSON.stringify(stateToSave));
            } catch (error) {
                logger.error('Failed to save state:', error);
            }
        } else {
            logger.debug('State saving is skipped due to configuration.');
        }
    }

    clearSavedState() {
        logger.info('Clearing saved state from localStorage.');
        localStorage.removeItem('addCardState');
        // Optionally reset the current state object as well
        // this.state = { ...initialState }; // Define initialState somewhere
    }

    // --- Getters/Setters for State (optional, but can be useful) ---
    setSelectedSet(set) {
        logger.info('Setting selected set:', set);
        this.state.selectedSet = set;
        this.saveState(); // Persist change
    }

    setSelectedCard(card) {
        logger.info('Setting selected card:', card);
        this.state.selectedCard = card;
        // Don't save selected card typically, as it's transient to the step
        // this.saveState();
    }

    updateFormData(key, value) {
        this.state.formData[key] = value;
        // Decide if formData needs saving
        // this.saveState();
    }

    /**
     * Updates a specific part of the step3Data.
     * @param {keyof AddCard['state']['step3Data']} key
     * @param {any} value
     */
    updateStep3Data(key, value) {
        if (this.state.step3Data.hasOwnProperty(key)) {
            this.state.step3Data[key] = value;
            logger.debug(`Step3 Data updated - ${key}:`, value);
            // Optionally, call saveState() if this data needs to be persisted across sessions
            // this.saveState();
        } else {
            logger.warn(`Attempted to update invalid Step3Data key: ${key}`);
        }
    }
}

// ========================================================================== //
// ============================ INITIALIZATION ============================ //
// ========================================================================== //

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.info("DOM Loaded. Initializing AddCard application.");
    // Make the instance globally accessible for debugging if needed, otherwise keep it scoped
    window.addCardApp = new AddCard();
});
