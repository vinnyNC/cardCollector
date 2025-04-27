/**
 * Add card page JS
 */

// Import debug manager (logger)
import logger from './debug-manager.js';

class AddCard {
    constructor() {
        // Log initialization of the AddCard class
        logger.info('Initializing AddCard component');

        // Set logger to debug mode (consider making this configurable)
        logger.setLevel('debug');

        // Configuration
        this.config = {
            API_DEBOUNCE_DELAY: 300, MAX_STEPS: 8, YEAR_RANGE: {
                start: 1900, end: new Date().getFullYear()
            }, ELEMENT_IDS: {
                PREV_BUTTON: 'btnPrev', NEXT_BUTTON: 'btnNext', STEP_PREFIX: 'addCardStep', STEP_1: {
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
                }, STEP_2: {
                    SELECTED_SET_INFO: 'selectedSetInfo',
                    CARD_SEARCH_INPUT: 'cardNumber',
                    CARD_RESULTS_TABLE: 'cardResultsTable',
                    MANUAL_ENTRY_TOGGLE: 'manualEntryToggle',
                    CARD_SEARCH_CONTAINER: 'cardSearchContainer',
                    MANUAL_ENTRY_CONTAINER: 'manualEntryContainer',
                    CARD_NUMBER_MANUAL: 'cardNumberManual',
                    PLAYER_NAME_MANUAL: 'playerName' // Changed ID from 'playerName' to avoid potential conflicts
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
            cardSearchTerm: '' // Store current search term for Step 2
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
        logger.debug('Saving current state to localStorage.');
        try {
            // Only save serializable parts of the state
            const stateToSave = {
                currentStep: this.state.currentStep,
                selectedSet: this.state.selectedSet, // Add other relevant state parts here
            };
            localStorage.setItem('addCardState', JSON.stringify(stateToSave));
        } catch (error) {
            logger.error('Failed to save state:', error);
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
}

/**
 * Utility functions shared across steps
 */
class CardUtils {
    constructor(state) {
        // Store a reference to the shared state object
        this.state = state;
        logger.debug("CardUtils initialized with shared state reference.");
    }

    /**
     * Makes an API call based on the provided parameters.
     * Handles URL construction and basic error handling.
     *
     * @param {string} apiSegment - The specific API segment (e.g., 'set_name', 'card_num').
     * @param {object} [params={}] - Key-value pairs for query parameters.
     * @return {Promise<Array>} A promise that resolves to an array of results (empty if error or no results).
     */
    async makeApiCall(apiSegment, params = {}) {
        logger.info(`API Call Request: Segment='${apiSegment}', Params=`, params);

        let url;
        const queryParams = new URLSearchParams();

        // Append common parameters or parameters specific to the state
        if (['card_num', 'insert_name'].includes(apiSegment)) {
            if (!this.state.selectedSet || !this.state.selectedSet.id) {
                logger.error(`API Call Error: Cannot call '${apiSegment}' without a selectedSet.id in state.`);
                throw new Error(`Cannot perform '${apiSegment}' search without a selected set.`);
            }
            queryParams.append('setID', this.state.selectedSet.id);
        }

        // Append specific search parameters
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }

        // Construct base URL based on segment
        switch (apiSegment) {
            case 'set_name':
                url = '/api/sets';
                break;
            case 'card_num':
                url = '/api/cards';
                break;
            case 'insert_name':
                url = '/api/inserts'; // Assuming this endpoint exists
                break;
            // Assuming these endpoints expect the value directly in the path
            case 'parallel_name':
                url = `/api/parallel_name/${encodeURIComponent(params.parallelName || '')}`;
                queryParams.delete('parallelName'); // Remove from query if used in path
                break;
            case 'where_bought':
                url = `/api/where_bought/${encodeURIComponent(params.whereBought || '')}`;
                queryParams.delete('whereBought'); // Remove from query if used in path
                break;
            case 'get_sports':
                url = '/api/sports';
                break;
            case 'get_manufacturers':
                url = '/api/manufacturers';
                break;
            case 'add_set': // Example for a POST request (though tool is GET only)
                url = '/api/sets'; // Need to handle POST separately if required
                logger.warn("makeApiCall currently only supports GET. 'add_set' might need a different method.");
                break;
            default:
                logger.error(`API Call Error: Unknown API segment: ${apiSegment}`);
                throw new Error(`Unknown API segment: ${apiSegment}`);
        }

        const queryString = queryParams.toString();
        if (queryString && url.includes('/api/')) { // Only append query string if it exists and URL is relative API path
            url += `?${queryString}`;
        }

        logger.debug(`Constructed API URL: ${url}`);

        try {
            const response = await fetch(url); // Assuming GET requests for now
            if (!response.ok) {
                // Log detailed error response if possible
                let errorBody = 'Could not read error body.';
                try {
                    errorBody = await response.text();
                } catch (_) { /* ignore */
                }
                logger.error(`API Call Error: Status ${response.status} for ${url}. Body: ${errorBody}`);
                return []; // Return empty array on error
            }

            const data = await response.json();
            logger.info(`API Call Success: Segment='${apiSegment}'. Response Count: ${data.results?.length ?? 0}. Response Data:`, data);

            // Ensure we always return an array
            return data.results && Array.isArray(data.results) ? data.results : [];

        } catch (error) {
            logger.error(`API Call Fetch Error: Segment='${apiSegment}', URL='${url}'. Error:`, error);
            return []; // Return empty array on fetch error
        }
    }

    /**
     * Debounce utility function.
     *
     * @param {Function} func The function to debounce.
     * @param {number} delay The debounce delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
}


// ========================================================================== //
// ============================== STEP 1 CLASS ============================== //
// ========================================================================== //
class Step1 {
    constructor(addCardInstance, utils, config, state) {
        this.addCardInstance = addCardInstance;
        this.utils = utils;
        this.config = config.ELEMENT_IDS.STEP_1; // Use specific config for Step 1
        this.globalConfig = config; // Keep reference to global config if needed
        this.state = state; // Shared state reference

        // Step-specific state/properties
        this.isLoading = false;
        this.searchDebounce = this.utils.debounce(this.performSearch.bind(this), this.globalConfig.API_DEBOUNCE_DELAY);

        logger.info("Step1 initialized.");
    }

    init() {
        logger.info("Step1: Initializing.");
        this.addFilterSortControls(); // Add controls first
        this.setupSearchInput();
        this.setupAddSetModal();
        this.loadDefaultSetList(); // Load initial data
        this.updateFilterOptions(); // Populate filters initially
        logger.info("Step1: Initialization complete.");
    }

    activate() {
        logger.info("Step1: Activated.");
        // Re-apply filters/sort if needed, or refresh data if stale
        // For Step 1, usually just needs to be visible.
        // If state could change while inactive, refresh here:
        // this.applyFiltersAndSort();
    }

    deactivate() {
        logger.info("Step1: Deactivated.");
        // Optional: Clean up listeners or state specific to when the step is active
    }

    async loadDefaultSetList() {
        logger.info('Step1: Loading default set list...');
        this.isLoading = true;
        this.showLoadingState();

        try {
            const results = await this.utils.makeApiCall('set_name'); // No search term for default
            this.state.allSets = [...results]; // Update shared state
            logger.info(`Step1: Loaded ${results.length} default sets.`);
        } catch (error) {
            logger.error('Step1: Error fetching default sets:', error);
            this.state.allSets = []; // Clear sets on error
        } finally {
            this.isLoading = false;
            this.applyFiltersAndSort(); // Display results (or empty state)
            this.updateFilterOptions(); // Update filters based on loaded data
        }
    }

    setupSearchInput() {
        const setSearchInput = document.getElementById(this.config.SET_SEARCH_INPUT);
        if (setSearchInput) {
            setSearchInput.addEventListener('input', () => {
                this.isLoading = true;
                this.showLoadingState(); // Show loading immediately
                this.searchDebounce(); // Call the debounced search function
            });
            logger.debug("Step1: Search input listener attached.");
        } else {
            logger.error("Step1 Init Error: Set search input not found.");
        }
    }

    async performSearch() {
        const setSearchInput = document.getElementById(this.config.SET_SEARCH_INPUT);
        const searchTerm = setSearchInput ? setSearchInput.value.trim() : '';
        logger.info(`Step1: Performing search for term: "${searchTerm}"`);

        this.isLoading = true; // Ensure loading state is active during API call

        try {
            const results = await this.utils.makeApiCall('set_name', {setName: searchTerm});
            this.state.allSets = [...results]; // Update shared state with search results
            logger.info(`Step1: Search returned ${results.length} sets.`);
        } catch (error) {
            logger.error('Step1: Search failed:', error);
            this.state.allSets = []; // Clear sets on error
        } finally {
            this.isLoading = false;
            this.applyFiltersAndSort(); // Update table with new results
            this.updateFilterOptions(); // Update filters based on search results
        }
    }


    setupAddSetModal() {
        const addSetModal = document.getElementById(this.config.ADD_SET_MODAL);
        const cancelBtn = document.getElementById(this.config.CANCEL_ADD_SET_BUTTON);
        const submitBtn = document.getElementById(this.config.SUBMIT_ADD_SET_BUTTON);

        if (!addSetModal || !cancelBtn || !submitBtn) {
            logger.error("Step1 Init Error: Add Set Modal elements not found.");
            return;
        }

        // Populate dropdowns
        this.setupYearForNewSetModal();
        this.fetchOptionsForNewSetModal('get_sports', this.config.SPORT_SELECT, 'sport_id', 'sport_name');
        this.fetchOptionsForNewSetModal('get_manufacturers', this.config.MANUFACTURER_SELECT, 'id', 'name');

        cancelBtn.addEventListener('click', () => addSetModal.classList.add('hidden'));

        submitBtn.addEventListener('click', async () => {
            logger.info("Step1: Submit New Set clicked.");
            // --- Form Validation ---
            const newSetNameInput = document.getElementById('newSetName'); // Assuming ID
            const newSetYearSelect = document.getElementById(this.config.YEAR_SELECT);
            const newSetSportSelect = document.getElementById(this.config.SPORT_SELECT);
            const newSetManufacturerSelect = document.getElementById(this.config.MANUFACTURER_SELECT);

            const name = newSetNameInput ? newSetNameInput.value.trim() : '';
            const year = newSetYearSelect ? newSetYearSelect.value : '';
            const sportId = newSetSportSelect ? newSetSportSelect.value : '';
            const manufacturerId = newSetManufacturerSelect ? newSetManufacturerSelect.value : '';

            if (!name || !year || !sportId || !manufacturerId) {
                logger.warn("Step1: Add New Set validation failed. All fields required.");
                alert("Please fill in all fields for the new set."); // Simple user feedback
                return;
            }

            const setData = {
                setName: name,
                setYear: year,
                sportId: sportId,
                manufacturerId: manufacturerId, // Add any other required fields for the API
            };

            logger.debug("Step1: New Set Data for submission:", setData);

            // --- API Call (Requires POST capability) ---
            try {
                // ** NOTE: makeApiCall currently only supports GET.
                // You'll need a separate function or modify makeApiCall for POST requests.
                // Example placeholder:
                // const response = await this.utils.postApiCall('add_set', setData);

                alert("Set added successfully! (Placeholder - API call needed)"); // Placeholder feedback
                logger.info("Step1: New Set submitted (Placeholder). Data:", setData);

                addSetModal.classList.add('hidden'); // Close modal on success
                newSetNameInput.value = ''; // Clear form
                // Optionally: Refresh the set list to include the new set
                this.loadDefaultSetList();

            } catch (error) {
                logger.error("Step1: Error submitting new set:", error);
                alert("Failed to add the new set. Please try again."); // User feedback
            }
        });
        logger.debug("Step1: Add Set Modal listeners attached.");
    }

    setupYearForNewSetModal() {
        const yearSelect = document.getElementById(this.config.YEAR_SELECT);
        if (!yearSelect) {
            logger.error("Step1 Init Error: New Set Year select not found.");
            return;
        }
        const currentYear = this.globalConfig.YEAR_RANGE.end;
        const startYear = this.globalConfig.YEAR_RANGE.start;
        yearSelect.innerHTML = '<option value="">Select Year</option>'; // Add placeholder
        for (let year = currentYear; year >= startYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        logger.debug("Step1: New Set Year dropdown populated.");
    }

    async fetchOptionsForNewSetModal(apiSegment, selectId, valueKey, textKey) {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) {
            logger.error(`Step1 Init Error: Select element #${selectId} not found for ${apiSegment}.`);
            return;
        }
        selectElement.innerHTML = `<option value="">Loading...</option>`; // Indicate loading

        try {
            const results = await this.utils.makeApiCall(apiSegment);
            selectElement.innerHTML = `<option value="">Select ${textKey.split('_').join(' ')}</option>`; // Reset with placeholder

            if (results && results.length > 0) {
                // Sort alphabetically by the display text
                results.sort((a, b) => String(a[textKey]).localeCompare(String(b[textKey])));

                results.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item[valueKey];
                    option.textContent = item[textKey];
                    selectElement.appendChild(option);
                });
                logger.debug(`Step1: Populated ${selectId} with ${results.length} options from ${apiSegment}.`);
            } else {
                selectElement.innerHTML = `<option value="">No options found</option>`;
                logger.warn(`Step1: No options found for ${apiSegment}.`);
            }
        } catch (error) {
            selectElement.innerHTML = `<option value="">Error loading</option>`;
            logger.error(`Step1: Error fetching options for ${apiSegment}:`, error);
        }
    }

    addFilterSortControls() {
        const tableElement = document.getElementById(this.config.SET_SEARCH_RESULTS_TABLE_ELEMENT);
        if (!tableElement) {
            logger.error("Step1 Init Error: Set search result table element not found.");
            return;
        }
        const tableHeader = tableElement.querySelector('thead tr');
        if (!tableHeader) {
            logger.error("Step1 Init Error: Set search result table header row not found.");
            return;
        }

        // Check if controls already exist
        if (document.getElementById(this.config.FILTER_CONTAINER_ID)) {
            logger.debug("Step1: Filter/Sort controls already exist.");
            return; // Avoid adding multiple times
        }

        // Add sort functionality to the name column header
        const nameHeader = tableHeader.querySelector('th:nth-child(1)'); // Assuming first column is Name
        if (nameHeader) {
            nameHeader.classList.add('cursor-pointer', 'select-none');
            // Use innerHTML carefully, ensure no XSS risks if content is dynamic
            nameHeader.innerHTML = `Set Name <span id="${this.config.SORT_INDICATOR}" class="ml-1 text-xs">↑</span>`;
            nameHeader.addEventListener('click', () => this.toggleSortDirection());
            logger.debug("Step1: Sort listener added to name header.");
        } else {
            logger.warn("Step1: Name column header not found for sorting.");
        }

        // Create and insert filter dropdown container
        const filterContainer = document.createElement('div');
        filterContainer.id = this.config.FILTER_CONTAINER_ID; // Assign ID
        filterContainer.className = 'flex flex-wrap gap-4 mb-4 px-1'; // Added padding
        // Use textContent for labels for security
        filterContainer.innerHTML = `
            <div class="flex-grow sm:flex-grow-0 sm:w-1/3 min-w-[150px]">
                <label for="${this.config.YEAR_FILTER}" class="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Filter by Year</label>
                <select id="${this.config.YEAR_FILTER}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                    <option value="">All Years</option>
                </select>
            </div>
            <div class="flex-grow sm:flex-grow-0 sm:w-1/3 min-w-[150px]">
                <label for="${this.config.SPORT_FILTER}" class="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Filter by Sport</label>
                <select id="${this.config.SPORT_FILTER}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                    <option value="">All Sports</option>
                </select>
            </div>
        `;

        // Insert filter controls before the table
        tableElement.parentNode.insertBefore(filterContainer, tableElement);
        logger.debug("Step1: Filter controls container added.");

        // Set up event listeners for filters
        const yearFilterElement = document.getElementById(this.config.YEAR_FILTER);
        const sportFilterElement = document.getElementById(this.config.SPORT_FILTER);

        if (yearFilterElement) {
            yearFilterElement.addEventListener('change', (e) => {
                this.state.setFilters.year = e.target.value;
                this.applyFiltersAndSort();
            });
            logger.debug("Step1: Year filter listener attached.");
        } else {
            logger.error("Step1 Init Error: Year filter element not found.");
        }

        if (sportFilterElement) {
            sportFilterElement.addEventListener('change', (e) => {
                this.state.setFilters.sport = e.target.value;
                this.applyFiltersAndSort();
            });
            logger.debug("Step1: Sport filter listener attached.");
        } else {
            logger.error("Step1 Init Error: Sport filter element not found.");
        }
    }

    updateSetResultsTable(results) {
        const tableBody = document.getElementById(this.config.SET_RESULTS_TABLE);
        if (!tableBody) {
            logger.error("Step1 Error: Set results table body not found.");
            return;
        }
        tableBody.innerHTML = ''; // Clear existing rows

        if (this.isLoading) {
            this.showLoadingState();
            return;
        }

        // Add the "Add New Set" row first
        this.addSetTableNewItem(tableBody);

        if (!results || results.length === 0) {
            logger.info("Step1: No sets to display after filtering/sorting.");
            const row = tableBody.insertRow(1); // Insert after the "Add New" row
            row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700";
            const cell = row.insertCell(0);
            cell.colSpan = 4; // Adjust colspan based on actual number of columns
            cell.className = "px-6 py-8 text-center";
            cell.innerHTML = `
                <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <p class="text-lg font-medium">No matching sets found</p>
                    <p class="text-sm">Try a different search term, adjust filters, or add the set.</p>
                </div>`;
        } else {
            logger.info(`Step1: Displaying ${results.length} sets.`);
            // Add the filtered/sorted sets to the table
            results.forEach((set, index) => {
                // Pass index + 1 because the "Add New" row is at index 0
                this.addSetTableRow(tableBody, set, index + 1);
            });
        }
    }

    toggleSortDirection() {
        this.state.setSortDirection = this.state.setSortDirection === 'asc' ? 'desc' : 'asc';
        const sortIndicator = document.getElementById(this.config.SORT_INDICATOR);
        if (sortIndicator) {
            sortIndicator.textContent = this.state.setSortDirection === 'asc' ? '↑' : '↓';
        }
        logger.debug(`Step1: Toggled sort direction to ${this.state.setSortDirection}.`);
        this.applyFiltersAndSort();
    }

    applyFiltersAndSort() {
        logger.debug('Step1: Applying filters and sort:', this.state.setFilters, this.state.setSortDirection);
        const {year: yearFilter, sport: sportFilter} = this.state.setFilters;
        const sortDirection = this.state.setSortDirection;

        // Filter results based on current filter state
        const filteredResults = this.state.allSets.filter(set => {
            const yearMatch = !yearFilter || String(set.setYear) === String(yearFilter);
            const sportMatch = !sportFilter || String(set.setSport) === String(sportFilter); // Ensure consistent comparison
            return yearMatch && sportMatch;
        });

        // Sort results based on current sort direction state
        filteredResults.sort((a, b) => {
            // Ensure names are strings and handle potential null/undefined values
            const nameA = String(a.setName || '').toLowerCase();
            const nameB = String(b.setName || '').toLowerCase();

            const comparison = nameA.localeCompare(nameB);
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        logger.debug(`Step1: ${filteredResults.length} sets after filtering and sorting.`);
        // Update table with filtered and sorted results
        this.updateSetResultsTable(filteredResults);
    }

    updateFilterOptions() {
        logger.debug("Step1: Updating filter dropdown options.");
        // Get unique years and sports from the *unfiltered* list (allSets)
        // Convert years to strings for consistency
        const years = [...new Set(this.state.allSets.map(set => String(set.setYear)))].sort((a, b) => b.localeCompare(a)); // Sort descending
        const sports = [...new Set(this.state.allSets.map(set => String(set.setSport)))].sort(); // Sort ascending

        // Update year filter options
        const yearFilterSelect = document.getElementById(this.config.YEAR_FILTER);
        if (yearFilterSelect) {
            const currentYearValue = yearFilterSelect.value; // Preserve selection
            yearFilterSelect.innerHTML = '<option value="">All Years</option>'; // Reset
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilterSelect.appendChild(option);
            });
            // Restore selection if the value still exists
            if (years.includes(currentYearValue)) {
                yearFilterSelect.value = currentYearValue;
            }
            logger.debug(`Step1: Updated year filter with ${years.length} options.`);
        }

        // Update sport filter options
        const sportFilterSelect = document.getElementById(this.config.SPORT_FILTER);
        if (sportFilterSelect) {
            const currentSportValue = sportFilterSelect.value; // Preserve selection
            sportFilterSelect.innerHTML = '<option value="">All Sports</option>'; // Reset
            sports.forEach(sport => {
                const option = document.createElement('option');
                option.value = sport; // Assuming setSport is the value/text
                option.textContent = sport;
                sportFilterSelect.appendChild(option);
            });
            // Restore selection if the value still exists
            if (sports.includes(currentSportValue)) {
                sportFilterSelect.value = currentSportValue;
            }
            logger.debug(`Step1: Updated sport filter with ${sports.length} options.`);
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById(this.config.SET_RESULTS_TABLE);
        if (!tableBody) return;
        tableBody.innerHTML = ''; // Clear previous content

        // Add the "Add New Set" row first, even during loading, but maybe disable the button?
        this.addSetTableNewItem(tableBody, true); // Pass loading=true

        // Add placeholder rows
        for (let i = 0; i < 3; i++) { // Show 3 loading rows
            const row = tableBody.insertRow();
            row.className = "animate-pulse bg-white border-b dark:bg-gray-800 dark:border-gray-700";
            row.innerHTML = `
                <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4"></div></td>
                <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div></td>
                <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-24"></div></td>
                <td class="px-4 py-3 text-right"><div class="h-8 bg-gray-200 rounded-lg dark:bg-gray-700 w-20 ml-auto"></div></td>
            `;
        }
        logger.debug("Step1: Displaying loading state in table.");
    }

    // Row for adding a new set (always at the top)
    addSetTableNewItem(tableBody, isLoading = false) {
        const row = tableBody.insertRow(0); // Insert at the top
        row.className = "bg-green-50 border-b border-green-200 dark:bg-gray-700 dark:border-gray-600";

        const cell = row.insertCell(0);
        cell.colSpan = 4; // Match number of columns
        cell.className = "px-4 py-3";

        cell.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <span class="font-medium text-gray-900 dark:text-white">Can't find your set?</span>
                    <p class="text-sm text-gray-600 dark:text-gray-300">Add it to our database</p>
                </div>
                <button type="button" id="btnAddNewSetRow" ${isLoading ? 'disabled' : ''}
                        class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 transition-all duration-200 flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    <span>Add New Set</span>
                </button>
            </div>
        `;

        // Add event listener for the add button within this row
        const btnAddNewSet = cell.querySelector('#btnAddNewSetRow');
        if (btnAddNewSet && !isLoading) {
            btnAddNewSet.addEventListener('click', () => {
                const addSetModal = document.getElementById(this.config.ADD_SET_MODAL);
                if (addSetModal) {
                    addSetModal.classList.remove('hidden');
                    logger.debug("Step1: Add New Set modal opened from table row button.");
                } else {
                    logger.error("Step1: Could not find Add New Set modal to open.");
                }
            });
        }
    }


    // Row for an actual set result
    addSetTableRow(tableBody, set, rowIndex) {
        // Create a new row with alternating background colors
        const row = tableBody.insertRow(rowIndex); // Insert at the correct index
        const isEven = rowIndex % 2 !== 0; // Adjust logic based on "Add New" row at index 0
        row.className = isEven ? "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150" : "bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150";
        row.dataset.setId = set.setID; // Use camelCase consistently if possible, else match API

        // Create cells with proper styling
        const nameCell = row.insertCell(0);
        nameCell.className = "px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white";
        nameCell.textContent = set.setName || 'N/A'; // Handle missing data

        const yearCell = row.insertCell(1);
        yearCell.className = "px-4 py-3";
        yearCell.textContent = set.setYear || 'N/A';

        const sportCell = row.insertCell(2);
        sportCell.className = "px-4 py-3";
        if (set.setSport) {
            const sportBadge = document.createElement('span');
            sportBadge.className = "bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300";
            sportBadge.textContent = set.setSport;
            sportCell.appendChild(sportBadge);
        } else {
            sportCell.textContent = 'N/A';
        }

        // Add the Select button cell
        const selectCell = row.insertCell(3);
        selectCell.className = "px-4 py-3 text-right";

        // Create the Select button
        const selectButton = document.createElement('button');
        selectButton.type = "button";
        selectButton.className = "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 flex items-center gap-1";
        selectButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            <span>Select</span>`;

        // Add click event to select button
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent potential event bubbling if row itself becomes clickable

            // Replace groupCollapsed with a simple debug/info message
            logger.debug('--- Start: Set Selected ---');
            logger.info('Set selected:', set);

            // Add visual feedback (optional, can be subtle)
            // Remove highlight from previously selected row if any
            tableBody.querySelectorAll('tr[data-set-id]').forEach(tr => tr.classList.remove('ring-2', 'ring-blue-300', 'dark:ring-blue-700'));
            row.classList.add('ring-2', 'ring-blue-300', 'dark:ring-blue-700'); // Example highlight

            // Update the main shared state using the setter
            this.addCardInstance.setSelectedSet({
                id: set.setID, // Ensure keys match expected structure
                name: set.setName, year: set.setYear, sport: set.setSport
            });

            logger.debug('Shared state updated with selected set:', this.state.selectedSet);
            // Replace groupEnd with a simple debug/info message
            logger.debug('--- End: Set Selected ---');

            // Advance to step 2 using the main AddCard instance method
            // Use setTimeout for a brief visual feedback before transition
            setTimeout(() => {
                this.addCardInstance.stepperChangeStep(2);
            }, 150); // Short delay
        });


        selectCell.appendChild(selectButton);
    }
}


// ========================================================================== //
// ============================== STEP 2 CLASS ============================== //
// ========================================================================== //
class Step2 {
    constructor(addCardInstance, utils, config, state) {
        this.addCardInstance = addCardInstance;
        this.utils = utils;
        this.config = config.ELEMENT_IDS.STEP_2; // Use specific config for Step 2
        this.globalConfig = config;
        this.state = state; // Shared state reference

        // Step-specific state/properties
        this.isLoading = false;
        this.isManualEntry = false; // Track manual entry mode
        // Debounced search function specific to this step
        this.searchDebounce = this.utils.debounce(this.performCardSearch.bind(this), this.globalConfig.API_DEBOUNCE_DELAY);

        logger.info("Step2 initialized.");
    }

    // Called once during AddCard initialization (if called from there)
    // Sets up listeners that persist
    init() {
        logger.info("Step2: Initializing.");
        this.setupCardSearchInput();
        this.setupManualEntryToggle();
        this.setupManualEntryForm(); // Setup listeners for manual form if needed
        logger.info("Step2: Initialization complete.");
    }

    // Called every time Step 2 becomes the active step
    activate() {
        logger.info("Step2: Activated.");
        logger.debug("Step2 Activate: Current shared state:", JSON.parse(JSON.stringify(this.state))); // Log deep copy

        // --- Pre-checks ---
        if (!this.state.selectedSet) {
            logger.error("Step2 Activate Error: No set selected. Cannot proceed.");
            // Optionally, force user back to step 1 or show an error message
            alert("Error: No set selected. Please go back to Step 1 and select a set.");
            this.addCardInstance.stepperChangeStep(1); // Force back to step 1
            return;
        }

        // --- UI Updates ---
        // Display the selected set information prominently
        const setInfoElement = document.getElementById(this.config.SELECTED_SET_INFO);
        if (setInfoElement) {
            setInfoElement.textContent = `${this.state.selectedSet.name} (${this.state.selectedSet.year} ${this.state.selectedSet.sport})`;
        } else {
            logger.warn("Step2 Activate: Selected set info element not found.");
        }

        // Reset search input field
        const cardSearchInput = document.getElementById(this.config.CARD_SEARCH_INPUT);
        if (cardSearchInput) {
            cardSearchInput.value = ''; // Clear previous search term
            this.state.cardSearchTerm = ''; // Clear state as well
        }

        // Reset manual entry form fields (optional, depends on desired UX)
        // this.clearManualEntryForm();

        // Ensure correct visibility of search/manual containers based on toggle state
        this.updateEntryModeVisibility();

        // --- Data Loading ---
        // Load all cards for the selected set initially
        this.loadAllCardsForSet(); // This will handle loading state and table updates
    }

    // Called when navigating away from Step 2
    deactivate() {
        logger.info("Step2: Deactivated.");
        // Optional: Clear search results or perform other cleanup
        // this.state.allCardsForSet = [];
        // this.updateCardResultsTable([]); // Clear table visually
    }

    // --- Data Fetching ---
    async loadAllCardsForSet() {
        if (!this.state.selectedSet || !this.state.selectedSet.id) {
            logger.error("Step2: Cannot load cards, selectedSet.id is missing.");
            return;
        }

        logger.info(`Step2: Loading all cards for set ID: ${this.state.selectedSet.id}`);
        this.isLoading = true;
        this.showLoadingState(); // Show loading placeholders

        try {
            // Use makeApiCall - it already includes setID from state
            const results = await this.utils.makeApiCall('card_num'); // Empty search term should mean 'all' for this set
            this.state.allCardsForSet = [...results]; // Update shared state
            logger.info(`Step2: Loaded ${results.length} cards for the set.`);
        } catch (error) {
            logger.error('Step2: Failed to load cards for set:', error);
            this.state.allCardsForSet = []; // Clear on error
        } finally {
            this.isLoading = false;
            // Display the loaded cards (or empty state if none/error)
            // Filter by search term if there is one (e.g., if user searched then navigated away and back)
            this.applyCardFilter();
        }
    }

    // --- Event Handlers & Setup ---
    setupCardSearchInput() {
        const cardSearchInput = document.getElementById(this.config.CARD_SEARCH_INPUT);
        if (cardSearchInput) {
            cardSearchInput.addEventListener('input', () => {
                this.state.cardSearchTerm = cardSearchInput.value.trim();
                // Show loading immediately only if not in manual mode
                if (!this.isManualEntry) {
                    this.isLoading = true;
                    this.showLoadingState();
                    this.searchDebounce(); // Call debounced search/filter
                }
            });
            logger.debug("Step2: Card search input listener attached.");
        } else {
            logger.error("Step2 Init Error: Card search input not found.");
        }
    }

    // This function is called by the debouncer
    performCardSearch() {
        // If the search term is empty, we just show all loaded cards
        // If the API supports server-side filtering on empty term, loadAllCardsForSet handles it.
        // If the API requires a term for searching, and empty means 'all', loadAllCardsForSet handles it.
        // If we are filtering client-side:
        logger.info(`Step2: Debounced search triggered for term: "${this.state.cardSearchTerm}"`);
        this.isLoading = false; // Filtering is fast, no need for loading state usually
        this.applyCardFilter(); // Filter the existing this.state.allCardsForSet
    }

    setupManualEntryToggle() {
        const manualEntryToggle = document.getElementById(this.config.MANUAL_ENTRY_TOGGLE);
        if (manualEntryToggle) {
            manualEntryToggle.addEventListener('change', () => {
                this.isManualEntry = manualEntryToggle.checked;
                logger.info(`Step2: Manual entry mode toggled: ${this.isManualEntry}`);
                this.updateEntryModeVisibility();

                // If switching TO manual, clear search results table? (Optional UX decision)
                if (this.isManualEntry) {
                    // this.updateCardResultsTable([]); // Clear search results visually
                    this.clearCardSelectionHighlight(); // Remove selection highlight
                    this.addCardInstance.setSelectedCard(null); // Clear selected card state
                } else {
                    // If switching FROM manual TO search, reload/redisplay search results
                    this.applyCardFilter();
                }
            });
            logger.debug("Step2: Manual entry toggle listener attached.");
        } else {
            logger.error("Step2 Init Error: Manual entry toggle not found.");
        }
    }

    setupManualEntryForm() {
        // Add listeners to manual form inputs if needed for validation or state updates
        const cardNumberInput = document.getElementById(this.config.CARD_NUMBER_MANUAL);
        const playerNameInput = document.getElementById(this.config.PLAYER_NAME_MANUAL);

        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', () => {
                // Optionally update formData in real-time
                // this.addCardInstance.updateFormData('manualCardNumber', cardNumberInput.value);
            });
        }
        if (playerNameInput) {
            playerNameInput.addEventListener('input', () => {
                // this.addCardInstance.updateFormData('manualPlayerName', playerNameInput.value);
            });
        }
        // Add listener for a potential "Save Manual Card" button if needed before proceeding
        logger.debug("Step2: Manual entry form listeners setup (basic).");
    }

    // --- UI Update Functions ---

    updateEntryModeVisibility() {
        const cardSearchContainer = document.getElementById(this.config.CARD_SEARCH_CONTAINER);
        const manualEntryContainer = document.getElementById(this.config.MANUAL_ENTRY_CONTAINER);

        if (cardSearchContainer) cardSearchContainer.classList.toggle('hidden', this.isManualEntry);
        if (manualEntryContainer) manualEntryContainer.classList.toggle('hidden', !this.isManualEntry);

        logger.debug(`Step2: Visibility updated - Search hidden: ${this.isManualEntry}, Manual hidden: ${!this.isManualEntry}`);

        // Adjust Next button behavior based on mode?
        // Maybe disable Next if in manual mode and fields are empty?
        this.updateNextButtonState();
    }

    applyCardFilter() {
        logger.debug(`Step2: Applying client-side filter for term: "${this.state.cardSearchTerm}"`);
        const searchTermLower = this.state.cardSearchTerm.toLowerCase();
        let filteredResults = this.state.allCardsForSet;

        if (searchTermLower) {
            filteredResults = this.state.allCardsForSet.filter(card => {
                const numberMatch = String(card.cardNumber || '').toLowerCase().includes(searchTermLower);
                const nameMatch = String(card.playerName || '').toLowerCase().includes(searchTermLower);
                // Add other fields to search if needed (e.g., attributes)
                // const attributeMatch = card.attributes && card.attributes.some(attr => attr.toLowerCase().includes(searchTermLower));
                return numberMatch || nameMatch; // || attributeMatch;
            });
        }
        // If search term is empty, filteredResults remains allCardsForSet

        logger.debug(`Step2: ${filteredResults.length} cards after filtering.`);
        this.updateCardResultsTable(filteredResults);
    }


    updateCardResultsTable(results) {
        const tableBody = document.getElementById(this.config.CARD_RESULTS_TABLE);
        if (!tableBody) {
            logger.error("Step2 Error: Card results table body not found.");
            return;
        }
        tableBody.innerHTML = ''; // Clear existing rows

        if (this.isLoading) {
            this.showLoadingState();
            return;
        }

        if (!results || results.length === 0) {
            logger.info("Step2: No cards to display.");
            const row = tableBody.insertRow();
            row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700";
            const cell = row.insertCell(0);
            cell.colSpan = 3; // Adjust colspan (Number, Name, Action)
            cell.className = "px-6 py-8 text-center";

            // Message depends on whether there was a search term
            const message = this.state.cardSearchTerm ? `No cards found matching "${this.state.cardSearchTerm}".` : `No cards found for this set.`;

            cell.innerHTML = `
                 <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                     <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     <p class="text-lg font-medium">${message}</p>
                     <p class="text-sm mt-1">You can switch to manual entry to add this card.</p>
                     <button id="btnSwitchToManualFromEmpty" class="mt-4 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                         Enter Card Manually
                     </button>
                 </div>
             `;

            // Add event listener for the "Enter Card Manually" button
            const switchToManualBtn = cell.querySelector('#btnSwitchToManualFromEmpty');
            if (switchToManualBtn) {
                switchToManualBtn.addEventListener('click', () => {
                    const manualEntryToggle = document.getElementById(this.config.MANUAL_ENTRY_TOGGLE);
                    if (manualEntryToggle) {
                        manualEntryToggle.checked = true;
                        // Manually trigger the change event handler
                        manualEntryToggle.dispatchEvent(new Event('change'));
                        logger.debug("Step2: Switched to manual entry from empty results button.");
                    }
                });
            }
        } else {
            logger.info(`Step2: Displaying ${results.length} cards.`);
            results.forEach((card, index) => {
                this.addCardTableRow(tableBody, card, index);
            });
        }
        // Update next button state after table update
        this.updateNextButtonState();
    }

    showLoadingState() {
        const tableBody = document.getElementById(this.config.CARD_RESULTS_TABLE);
        if (!tableBody) return;
        tableBody.innerHTML = ''; // Clear previous content

        // Add placeholder rows
        for (let i = 0; i < 3; i++) { // Show 3 loading rows
            const row = tableBody.insertRow();
            row.className = "animate-pulse bg-white border-b dark:bg-gray-800 dark:border-gray-700";
            // Adjust colspan and placeholders for Card Number, Player Name, Action Button
            row.innerHTML = `
                <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-16"></div></td>
                <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4"></div></td>
                <td class="px-4 py-3 text-right"><div class="h-8 bg-gray-200 rounded-lg dark:bg-gray-700 w-20 ml-auto"></div></td>
            `;
        }
        logger.debug("Step2: Displaying loading state in card table.");
    }

    addCardTableRow(tableBody, card, index) {
        const row = tableBody.insertRow(index);
        const isEven = index % 2 === 0;
        row.className = isEven
            ? "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150"
            : "bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150";
        row.dataset.cardId = card.cardId || card.id; // Adjust based on response

        // Card number cell
        const numberCell = row.insertCell(0);
        numberCell.className = "px-6 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white";
        numberCell.textContent = card.card_number || 'N/A';

        // Thumbnail cell (new)
        const thumbnailCell = row.insertCell(1);
        thumbnailCell.className = "px-6 py-3";
        if (card.front_image) {
            const img = document.createElement('img');
            img.src = card.front_image;
            img.alt = "Card Thumbnail";
            img.className = "h-10 w-auto object-cover rounded"; // adjust sizing as needed
            thumbnailCell.appendChild(img);
        } else {
            thumbnailCell.textContent = 'No Image';
        }

        // Shift remaining cells accordingly:
        // Player name cell
        const nameCell = row.insertCell(2);
        nameCell.className = "px-6 py-3";
        nameCell.textContent = card.player_name || 'N/A';

        // Type cell
        const typeCell = row.insertCell(3);
        typeCell.className = "px-6 py-3";
        typeCell.textContent = card.type || 'Base';

        // Parallel/Insert cell
        const piCell = row.insertCell(4);
        piCell.className = "px-6 py-3";
        piCell.textContent = card.parallel_insert || '';

        // Select button cell
        const selectCell = row.insertCell(5);
        selectCell.className = "px-6 py-3 text-right";
        const selectButton = document.createElement('button');
        selectButton.type = "button";
        selectButton.className = "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 flex items-center gap-1";
        selectButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Select</span>`;
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            logger.groupCollapsed(`--- Step 2: Card Selected ---`);
            logger.info('Card selected:', card);

            // Update visual selection highlight
            this.clearCardSelectionHighlight();
            row.classList.add('ring-2', 'ring-blue-300', 'dark:ring-blue-700'); // Example highlight

            // Store the selected card in the main state
            this.addCardInstance.setSelectedCard(card);
            logger.debug('Shared state updated with selected card:', this.state.selectedCard);

            // Populate manual entry form fields (even though hidden, might be useful if user toggles back)
            this.populateManualFormWithCard(card);

            // Enable the next button as a card is selected
            this.updateNextButtonState();

            logger.groupEnd();

            // Advance to step 3 after a short delay
            setTimeout(() => {
                this.addCardInstance.stepperChangeStep(3);
            }, 150);
        });

        selectCell.appendChild(selectButton);
    }

    clearCardSelectionHighlight() {
        const tableBody = document.getElementById(this.config.CARD_RESULTS_TABLE);
        if (tableBody) {
            tableBody.querySelectorAll('tr[data-card-id]').forEach(tr => tr.classList.remove('ring-2', 'ring-blue-300', 'dark:ring-blue-700'));
        }
    }

    populateManualFormWithCard(card) {
        const cardNumberInput = document.getElementById(this.config.CARD_NUMBER_MANUAL);
        const playerNameInput = document.getElementById(this.config.PLAYER_NAME_MANUAL);

        if (cardNumberInput) cardNumberInput.value = card.cardNumber || '';
        if (playerNameInput) playerNameInput.value = card.playerName || '';
        // Populate other manual fields if they exist
        logger.debug("Step2: Populated manual form fields with selected card data.");
    }

    clearManualEntryForm() {
        const cardNumberInput = document.getElementById(this.config.CARD_NUMBER_MANUAL);
        const playerNameInput = document.getElementById(this.config.PLAYER_NAME_MANUAL);
        if (cardNumberInput) cardNumberInput.value = '';
        if (playerNameInput) playerNameInput.value = '';
        // Clear other fields
        logger.debug("Step2: Cleared manual entry form fields.");
    }

    // --- State/UI Logic ---
    updateNextButtonState() {
        const btnNext = document.getElementById(this.globalConfig.ELEMENT_IDS.NEXT_BUTTON);
        if (!btnNext) return;

        let enableNext = false;
        if (this.isManualEntry) {
            // Enable if in manual mode and required fields have values
            const cardNumberInput = document.getElementById(this.config.CARD_NUMBER_MANUAL);
            const playerNameInput = document.getElementById(this.config.PLAYER_NAME_MANUAL);
            const numValue = cardNumberInput ? cardNumberInput.value.trim() : '';
            const nameValue = playerNameInput ? playerNameInput.value.trim() : '';
            // Add checks for other required manual fields
            enableNext = numValue !== '' && nameValue !== '';
        } else {
            // Enable if in search mode and a card has been selected from the results
            enableNext = this.state.selectedCard !== null;
        }

        btnNext.disabled = !enableNext;
        logger.debug(`Step2: Next button ${enableNext ? 'enabled' : 'disabled'}. Manual Mode: ${this.isManualEntry}, Card Selected: ${!!this.state.selectedCard}`);
    }

    // Method to handle proceeding from manual entry (could be called by Next button)
    processManualEntry() {
        if (!this.isManualEntry) return null; // Only process if in manual mode

        const cardNumberInput = document.getElementById(this.config.CARD_NUMBER_MANUAL);
        const playerNameInput = document.getElementById(this.config.PLAYER_NAME_MANUAL);
        const numValue = cardNumberInput ? cardNumberInput.value.trim() : '';
        const nameValue = playerNameInput ? playerNameInput.value.trim() : '';

        if (numValue && nameValue) {
            // Create a card object from manual data
            const manualCardData = {
                cardId: null, // No ID for manually entered card yet
                cardNumber: numValue, playerName: nameValue, isManualEntry: true // Flag this card as manually entered
                // Add other manual fields here
            };
            // Update the shared state with this manually created card data
            this.addCardInstance.setSelectedCard(manualCardData);
            logger.info("Step2: Proceeding with manually entered card data:", manualCardData);
            return manualCardData;
        } else {
            logger.warn("Step2: Cannot process manual entry, required fields missing.");
            return null;
        }
    }
}


// ========================================================================== //
// ========================= STEP 3-8 PLACEHOLDERS ========================== //
// ========================================================================== //

// Basic structure for subsequent steps
class StepBase {
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

    // Example validation placeholder
    // validateStep3() { return true; }
}

class Step3 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 3);
    } /* Add Step 3 specific methods */
}

class Step4 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 4);
    } /* Add Step 4 specific methods */
}

class Step5 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 5);
    } /* Add Step 5 specific methods */
}

class Step6 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 6);
    } /* Add Step 6 specific methods */
}

class Step7 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 7);
    } /* Add Step 7 specific methods */
}

class Step8 extends StepBase {
    constructor(a, u, c, s) {
        super(a, u, c, s, 8);
    } /* Add Step 8 specific methods */
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
