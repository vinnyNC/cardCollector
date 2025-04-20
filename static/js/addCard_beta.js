/**
 * Add card page JS
 */

// Import debug manager (logger)
import logger from './debug-manager.js';

class AddCard {
    constructor() {
        // Log initialization of the AddCard class
        logger.info('Initializing AddCard component');

        // Set logger to debug mode
        logger.setLevel('debug');

        // Configuration
        this.config = {
            // Add any configuration options here
            API_DEBOUNCE_DELAY: 300, MAX_STEPS: 8, YEAR_RANGE: {
                start: 1900, end: new Date().getFullYear()
            }, ELEMENT_IDS: {
                PREV_BUTTON: 'btnPrev', NEXT_BUTTON: 'btnNext', STEP_PREFIX: 'addCardStep', STEP_1: {
                    SPORT_SELECT: 'newSetSport', YEAR_SELECT: 'newSetYear', MANUFACTURER_SELECT: 'newSetManufacturer',
                }
            }
        }

        // State management
        this.state = {
            currentStep: 1, selectedSet: null, selectedCard: null, formData: {},
        }

        // Init utilities
        this.utils = new CardUtils(this.state);

        this.stepperCurrentStep = 1;

        // Initialize each step
        logger.info('AddCard constructor: State before creating Step1:', this.state);
        this.step1 = new Step1(this, this.utils, this.config, this.state);
        this.step2 = new Step2(this, this.utils, this.config, this.state);
        this.step3 = new Step3(this, this.utils, this.config, this.state);
        this.step4 = new Step4(this, this.utils, this.config, this.state);
        this.step5 = new Step5(this, this.utils, this.config, this.state);
        this.step6 = new Step6(this, this.utils, this.config, this.state);
        this.step7 = new Step7(this, this.utils, this.config, this.state);
        this.step8 = new Step8(this, this.utils, this.config, this.state);

        // Check for saved state and load
        this.loadSavedState();

        // Initialize the application
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

    /**

     * Updates the stepper to reflect the current step by toggling classes and visibility
     * for step indicators and content, as well as updating navigation buttons.
     *
     * @param {number} step The current step to set as active.
     * @param {number} [maxSteps=8] The total number of steps in the stepper. Defaults to 8 if not provided.
     * @return {void} This method does not return a value.
     */
    stepperChangeStep(step, maxSteps = 8) {
        // Implementation of step change logic
        this.stepperCurrentStep = step;

        // Process all steps in a single loop
        [...Array(maxSteps)].forEach((_, i) => {
            const idx = i + 1;
            const isActive = idx === step;

            // Update step indicator
            const item = document.getElementById(`stepperListItem${idx}`);
            if (item) {
                // Toggle text classes
                ['text-blue-600', 'dark:text-blue-500'].forEach(cls => item.classList.toggle(cls, isActive));

                // Toggle indicator border classes
                const dot = item.querySelector('span');
                if (dot) {
                    ['border-blue-600', 'dark:border-blue-500'].forEach(cls => dot.classList.toggle(cls, isActive));
                    ['border-gray-500', 'dark:border-gray-400'].forEach(cls => dot.classList.toggle(cls, !isActive));
                }
            }

            // Toggle content visibility
            document.getElementById(`addCardStep${idx}`)?.classList.toggle('hidden', !isActive);
        });

        // Update navigation buttons
        document.getElementById('btnPrev').disabled = step === 1;
        document.getElementById('btnNext').disabled = step === maxSteps;

        // Initialize the newly active step if needed
        this[`step${step}`].activate();
    }

    loadSavedState() {

    }
}

/**
 * Utility functions shared across steps
 */
class CardUtils {
    constructor(state) {
        // Shared states
        this.state = state;
    }

    /**
     * Makes an API call based on the provided search text and API segment.
     *
     * @param {string} searchText - The text to search for and include in the API request.
     * @param {string} apiSegment - The specific API segment to target for the request.
     *                              Valid values are 'set_name', 'card_num', 'insert_name',
     *                              'parallel_name', or 'where_bought'.
     * @return {Promise<Array|null>} A promise that resolves to an array of results or null if none found
     */
    async makeApiCall(searchText, apiSegment) {

        logger.info(`Making API call with searchText: ${searchText}, apiSegment: ${apiSegment}`);

        const encodedSearchText = encodeURIComponent(searchText);
        let url;
        switch (apiSegment) {
            case 'set_name':
                url = `/api/sets?setName=${encodedSearchText}`;
                break;
            case 'card_num':
                url = `/api/cards?cardNum=${encodedSearchText}&setID=${encodeURIComponent(this.state.selectedSet.id)}`;
                break;
            case 'insert_name':
                url = `/api/inserts?insertName=${encodedSearchText}&setID=${encodeURIComponent(this.state.selectedSet.id)}`;
                break;
            case 'parallel_name':
                url = `/api/parallel_name/${encodedSearchText}`;
                break;
            case 'where_bought':
                url = `/api/where_bought/${encodedSearchText}`;
                break;
            case 'get_sports':
                url = '/api/sports';
                break;
            case 'get_manufacturers':
                url = '/api/manufacturers';
                break;
            default:
                throw new Error(`Unknown API segment: ${apiSegment}`);
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            logger.info(`API response for searchText: ${searchText}, apiSegment: ${apiSegment}:`, data);

            if (data.results && data.results.length > 0) {
                return data.results;
            } else {
                console.log('No results found for:', searchText);
                return [];
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }
}

/**
 * Step 1: Set Selection
 */
class Step1 {
    constructor(addCardInstance, utils, config, state) {
        this.addCardInstance = addCardInstance;
        this.allSearchResults = [];
        this.isLoading = false;
        this.currentSortDirection = 'asc'; // Track current sort direction
        this.utils = utils;
        this.config = config;
        this.state = state;

        logger.info("Step1 initialized with state:", this.state);
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
        // Load default set list (user most recent, most used, and random up to 50)
        console.log('Loading default set list...');
        this.isLoading = true;
        this.showLoadingState();

        this.utils.makeApiCall('', 'set_name')
            .then(results => {
                this.allSearchResults = [...results];
                this.isLoading = false;
                this.applyFiltersAndSort();
            })
            .catch(error => {
                console.error('Error fetching default sets:', error);
                this.allSearchResults = [];
                this.isLoading = false;
                this.updateSetResultsTable([]);
            });
    }

    setupSearchInput() {
        const setSearchInput = document.getElementById('setName');
        if (setSearchInput) {
            // Add debounce to prevent excessive searches while typing
            let searchTimeout;
            // Use arrow function for the event listener to capture the correct 'this'
            setSearchInput.addEventListener('input', () => { // Changed to arrow function
                clearTimeout(searchTimeout);

                // Show loading state immediately
                // 'this' now correctly refers to the Step1 instance
                this.isLoading = true;
                this.showLoadingState();

                searchTimeout = setTimeout(async () => {
                    // Access input value directly from the element variable
                    const searchTerm = setSearchInput.value.trim().toLowerCase(); // Changed from this.value
                    try {
                        // 'this' is correctly inherited by the arrow function
                        const results = await this.utils.makeApiCall(searchTerm, 'set_name');

                        // Store original results for filtering
                        this.allSearchResults = [...results];

                        // Apply any active filters and sorting
                        this.isLoading = false;
                        this.applyFiltersAndSort(); // Should now work correctly
                    } catch (error) {
                        console.error('Search failed:', error);
                        // Ensure class properties are updated correctly using 'this'
                        this.allSearchResults = []; // Added 'this.'
                        this.isLoading = false;     // Added 'this.'
                        this.updateSetResultsTable([]); // Should now work correctly
                    }
                    // Use the configured debounce delay for consistency
                }, this.config.API_DEBOUNCE_DELAY || 300); // Use config or default to 300
            });
        }
    }

    setupAddSetModal() {
        // Getting elements
        const addSetNewModal = document.getElementById('addNewSetModal');
        const cancelAddSetButton = document.getElementById('cancelAddSet');
        const submitAddSet = document.getElementById('submitAddSet');


        // Set up years dropdown
        this.setupYearForNewSetModal();

        // Fetch sports
        this.fetchSportsForNewSetModal();

        // Fetch manufacturers
        this.fetchManufacturersForNewSetModal();

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

    setupYearForNewSetModal() {
        const yearSelect = document.getElementById(this.config.ELEMENT_IDS.STEP_1.YEAR_SELECT);
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1900; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    fetchSportsForNewSetModal() {
        const sportSelect = document.getElementById(this.config.ELEMENT_IDS.STEP_1.SPORT_SELECT);
        this.utils.makeApiCall('', 'get_sports')
            .then(results => {
                if (results && results.length > 0) {
                    // Sort sports alphabetically by name
                    results.sort((a, b) => a.sport_name.localeCompare(b.sport_name));

                    // Add each sport to the dropdown
                    results.forEach(sport => {
                        const option = document.createElement('option');
                        option.value = sport.sport_id;  // Use sport_id as the value
                        option.textContent = sport.sport_name;
                        sportSelect.appendChild(option);
                    });
                } else {
                    console.error('No sports found in API response');
                }
            })
            .catch(error => {
                console.error('Error fetching sports:', error);
            });
    }

    fetchManufacturersForNewSetModal() {
        const manufacturerSelect = document.getElementById(this.config.ELEMENT_IDS.STEP_1.MANUFACTURER_SELECT);
        this.utils.makeApiCall('', 'get_manufacturers')
            .then(results => {
                if (results && results.length > 0) {
                    // Sort sports alphabetically by name
                    results.sort((a, b) => a.name.localeCompare(b.name));

                    // Add each sport to the dropdown
                    results.forEach(manufacturer => {
                        const option = document.createElement('option');
                        option.value = manufacturer.id;  // Use sport_id as the value
                        option.textContent = manufacturer.name;
                        manufacturerSelect.appendChild(option);
                    });
                } else {
                    console.error('No sports found in API response');
                }
            })
            .catch(error => {
                console.error('Error fetching sports:', error);
            });
    }

    addFilterSortControls() {
        // Get the table header
        const tableHeader = document.querySelector('#setSearchResultTable thead tr');

        // Add sort functionality to the name column
        const nameHeader = tableHeader.querySelector('th:nth-child(1)');
        nameHeader.classList.add('cursor-pointer', 'select-none');
        nameHeader.innerHTML = `
        Set Name
        <span id="sortIndicator" class="ml-1 text-xs">↑</span>`;

        // Add filter dropdowns above the table
        const filterContainer = document.createElement('div');
        filterContainer.className = 'flex gap-4 mb-4';
        filterContainer.innerHTML = `
        <div class="w-1/3">
            <label for="yearFilter" class="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Filter by Year</label>
            <select id="yearFilter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">All Years</option>
            </select>
        </div>
        <div class="w-1/3">
            <label for="sportFilter" class="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Filter by Sport</label>
            <select id="sportFilter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">All Sports</option>
            </select>
        </div>`;

        // Insert filter controls before the table
        const table = document.getElementById('setSearchResultTable');
        table.parentNode.insertBefore(filterContainer, table);

        // Set up event listeners for filters and sorting
        document.getElementById('yearFilter').addEventListener('change', () => this.applyFiltersAndSort());
        document.getElementById('sportFilter').addEventListener('change', () => this.applyFiltersAndSort());
        nameHeader.addEventListener('click', () => this.toggleSortDirection());
    }

    updateSetResultsTable(results) {
        // Get the table body and clear existing rows
        const tableBody = document.getElementById('setResultsTable');
        tableBody.innerHTML = '';

        // If still loading, show loading state
        if (this.isLoading) {
            this.showLoadingState();
            return;
        }

        // If no results, show a styled empty message
        if (results.length === 0) {
            const row = tableBody.insertRow();
            row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700";
            const cell = row.insertCell(0);
            cell.colSpan = 4;
            cell.className = "px-6 py-8 text-center";

            cell.innerHTML = `
           <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
               <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
               </svg>
               <p class="text-lg font-medium">No matching sets found</p>
               <p class="text-sm">Try a different search term or adjust your filters</p>
           </div>
       `;
        } else {
            // Add the filtered sets to the table with alternating row colors
            results.forEach((set, index) => {
                this.addSetTableItem(set.setName, set.setYear, set.setSport, set.setID, index);
            });
        }
    }

    /**
     * Toggles the sort direction for the set name column
     */
    toggleSortDirection() {
        this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        const sortIndicator = document.getElementById('sortIndicator');
        sortIndicator.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';
        this.applyFiltersAndSort();
    }


    /**
     * Applies current filters and sorting to the results
     */
    applyFiltersAndSort() {
        // Get filter values
        const yearFilter = document.getElementById('yearFilter').value;
        const sportFilter = document.getElementById('sportFilter').value;

        // Filter results - with type coercion fix for the year comparison
        let filteredResults = this.allSearchResults.filter(set => {
            // Convert setYear to string to ensure consistent comparison
            const yearMatch = !yearFilter || String(set.setYear) === String(yearFilter);
            const sportMatch = !sportFilter || set.setSport === sportFilter;
            return yearMatch && sportMatch;
        });

        // Sort results
        filteredResults.sort((a, b) => {
            const setNameA = a.setName.toLowerCase();
            const setNameB = b.setName.toLowerCase();

            if (this.currentSortDirection === 'asc') {
                return setNameA.localeCompare(setNameB);
            } else {
                return setNameB.localeCompare(setNameA);
            }
        });

        // Update table with filtered and sorted results
        this.updateSetResultsTable(filteredResults);

        // Update filter options
        this.updateFilterOptions();
    }


    /**
     * Updates the filter options for year and sport based on the list of search results.
     * This method dynamically generates the dropdown options for filtering by year and sport,
     * ensuring they only include the unique values present in the search results. The existing
     * selected values for the filters are preserved if they still exist in the updated options.
     *
     * @return {void} This method does not return any value.
     */
    updateFilterOptions() {
        // Get unique years and sports - convert years to strings
        const years = [...new Set(this.allSearchResults.map(set => String(set.setYear)))].sort();
        const sports = [...new Set(this.allSearchResults.map(set => set.setSport))].sort();

        // Update year filter options
        const yearFilter = document.getElementById('yearFilter');
        const selectedYear = yearFilter.value;
        yearFilter.innerHTML = '<option value="">All Years</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
        yearFilter.value = selectedYear;

        // Update sport filter options
        const sportFilter = document.getElementById('sportFilter');
        const selectedSport = sportFilter.value;
        sportFilter.innerHTML = '<option value="">All Sports</option>';
        sports.forEach(sport => {
            const option = document.createElement('option');
            option.value = sport;
            option.textContent = sport;
            sportFilter.appendChild(option);
        });
        sportFilter.value = selectedSport;
    }

    // Add this function to create loading state indicators
    showLoadingState() {
        const tableBody = document.getElementById('setResultsTable');
        tableBody.innerHTML = '';

        // Create loading rows
        for (let i = 0; i < 3; i++) {
            const row = tableBody.insertRow();
            row.className = "animate-pulse bg-white border-b dark:bg-gray-800 dark:border-gray-700";

            // Set name with loading placeholder
            const nameCell = row.insertCell(0);
            nameCell.className = "px-3 py-4";
            const namePlaceholder = document.createElement('div');
            namePlaceholder.className = "h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4";
            nameCell.appendChild(namePlaceholder);

            // Year with loading placeholder
            const yearCell = row.insertCell(1);
            yearCell.className = "px-3 py-4";
            const yearPlaceholder = document.createElement('div');
            yearPlaceholder.className = "h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-16";
            yearCell.appendChild(yearPlaceholder);

            // Sport with loading placeholder
            const sportCell = row.insertCell(2);
            sportCell.className = "px-3 py-4";
            const sportPlaceholder = document.createElement('div');
            sportPlaceholder.className = "h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-24";
            sportCell.appendChild(sportPlaceholder);

            // Button placeholder
            const buttonCell = row.insertCell(3);
            buttonCell.className = "px-3 py-4";
            const buttonPlaceholder = document.createElement('div');
            buttonPlaceholder.className = "h-8 bg-gray-200 rounded-lg dark:bg-gray-700 w-20 ml-auto";
            buttonCell.appendChild(buttonPlaceholder);
        }
    }

    addSetTableItem(setName, setYear, setSport, setID, index) {
        // Get the table body
        const tableBody = document.getElementById('setResultsTable');

        // Insert new item row
        if (index === 0) {
            this.setTableNewItem(tableBody);
            index++;
        } else {
            index++;
        }
        // Create a new row with alternating background colors
        const row = tableBody.insertRow();
        const isEven = index % 2 === 0;
        row.className = isEven ? "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150" : "bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150";
        row.dataset.setID = setID;

        // Create cells with proper styling
        const nameCell = row.insertCell(0);
        nameCell.className = "px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white";
        nameCell.textContent = setName;

        const yearCell = row.insertCell(1);
        yearCell.className = "px-4 py-3";
        yearCell.textContent = setYear;

        const sportCell = row.insertCell(2);
        sportCell.className = "px-4 py-3";
        // Create badge for sport category
        const sportBadge = document.createElement('span');
        sportBadge.className = "bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300";
        sportBadge.textContent = setSport;
        sportCell.appendChild(sportBadge);

        // Add the Select button cell
        const selectCell = row.insertCell(3);
        selectCell.className = "px-4 py-3 text-right";

        // Create the Select button with improved styling
        const selectButton = document.createElement('button');
        selectButton.type = "button";
        selectButton.className = "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 flex items-center gap-1";

        // Add icon and text to button
        selectButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Select</span>
    `;

        // Add click event to select button
        selectButton.addEventListener('click', () => { // Arrow function
            logger.group('--- Select Button Clicked ---');
            logger.debug('Inside click handler, this:', this); // Log the 'this' context
            logger.debug('Inside click handler, this.state:', this.state); // Log this.state specifically
            logger.debug('Select button click handler: this.state:', this.state); // Log with your logger too

            // Add visual feedback when selected
            row.classList.add('bg-blue-100', 'dark:bg-blue-900');

            // Fill the set input with the selected set name
            document.querySelectorAll('input[name="set"]').forEach(input => {
                input.value = setName;
            });

            // --- The line causing the error (around 608) ---
            try {
                if (this.state) { // Add a check before accessing
                    this.state.selectedSet = {id: setID, name: setName, year: setYear, sport: setSport};
                    logger.info('Selected Set updated in state:', this.state.selectedSet);
                } else {
                    logger.error("CRITICAL: this.state is undefined just before assignment!");
                }
            } catch (error) {
                logger.error("Error assigning to this.state.selectedSet:", error, this); // Log error and 'this' context
            }
            // --- End error line ---


            // Advance to step 2 using the stored AddCard instance reference
            setTimeout(() => {
                if (this.addCardInstance && typeof this.addCardInstance.stepperChangeStep === 'function') {
                    this.addCardInstance.stepperChangeStep(2);
                } else {
                    logger.error("Cannot call stepperChangeStep. addCardInstance:", this.addCardInstance);
                }
            }, 200);
            logger.groupEnd();
        });

        selectCell.appendChild(selectButton);
    }

    setTableNewItem(tableBody) {
        // Create the "Add New" row with distinct styling
        const row = tableBody.insertRow(0);
        row.className = "bg-green-50 border-b border-green-200 dark:bg-gray-700 dark:border-gray-600";

        // Create the content cell that spans all columns
        const cell = row.insertCell(0);
        cell.colSpan = 4;
        cell.className = "px-4 py-3";

        // Add the content with add button
        cell.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <span class="font-medium text-gray-900 dark:text-white">Can't find your set?</span>
                <p class="text-sm text-gray-600 dark:text-gray-300">Add it to our database</p>
            </div>
            <button type="button" id="btnAddNewSet" 
                    class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 transition-all duration-200 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add New Set</span>
            </button>
        </div>
    `;

        // Add event listener for the add button
        document.getElementById('btnAddNewSet').addEventListener('click', function () {
            // Open Modal
            document.getElementById('addNewSetModal').classList.remove('hidden');
        });
    }
}

/**
 * Step 2: Card Details
 */
class Step2 {
    constructor(addCardInstance, utils, config, state) {
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
    constructor(addCardInstance, utils, config, state) {
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

class Step4 { /* ... */
    constructor(addCardInstance, utils, config, state) {
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

class Step5 { /* ... */
    constructor(addCardInstance, utils, config, state) {
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

class Step6 { /* ... */
    constructor(addCardInstance, utils, config, state) {
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

class Step7 { /* ... */
    constructor(addCardInstance, utils, config, state) {
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

class Step8 { /* ... */
    constructor(addCardInstance, utils, config, state) {
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.addCard = new AddCard();
});
