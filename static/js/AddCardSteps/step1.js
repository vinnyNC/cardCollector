import logger from '../debug-manager.js';


export class Step1 {
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
            logger.info(`Step1: Loaded ${results.length} default sets.`, results);
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

    // Enhanced logging with performance tracking and contextual data
    logger.group('Step1: Set Search Operation');
    logger.info('Initiating search operation', {
        searchTerm,
        searchTermLength: searchTerm.length,
        hasSearchInput: !!setSearchInput,
        currentSetCount: this.state.allSets.length,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

    // Start performance measurement
    logger.startPerformanceMark('setSearch', {
        operation: 'api_call',
        endpoint: 'set_name',
        searchTerm: searchTerm.substring(0, 20) + (searchTerm.length > 20 ? '...' : ''),
        module: 'Step1'
    });

    this.isLoading = true;

    try {
        logger.debug('Making API call to set_name endpoint', {
            payload: { setName: searchTerm },
            loadingState: this.isLoading,
            timestamp: new Date().toISOString()
        });

        const results = await this.utils.makeApiCall('set_name', {setName: searchTerm});

        // End performance measurement with success data
        const duration = logger.endPerformanceMark('setSearch', {
            success: true,
            resultCount: results.length,
            resultsSize: JSON.stringify(results).length,
            cacheHit: false // You could implement cache detection here
        });

        // Update shared state with search results
        this.state.allSets = [...results];

        logger.info('Search completed successfully', {
            searchTerm,
            resultCount: results.length,
            duration: duration ? `${duration.toFixed(2)}ms` : 'unknown',
            averageResultSize: results.length > 0 ? (JSON.stringify(results).length / results.length).toFixed(0) + ' chars' : 'N/A',
            stateUpdated: true,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            } : 'unavailable'
        });

        // Log detailed results in debug mode only
        if (results.length > 0) {
            logger.debug('Search results sample', {
                firstResult: results[0],
                lastResult: results[results.length - 1],
                uniqueYears: [...new Set(results.map(r => r.year))].sort(),
                uniqueSports: [...new Set(results.map(r => r.sport))].filter(Boolean),
                hasImages: results.filter(r => r.image_url).length
            });
        }

        // Log if search returned empty results
        if (results.length === 0) {
            logger.warn('Search returned no results', {
                searchTerm,
                searchTermLength: searchTerm.length,
                possibleIssues: [
                    searchTerm.length < 3 ? 'Search term too short' : null,
                    /[^a-zA-Z0-9\s]/.test(searchTerm) ? 'Special characters in search' : null,
                    searchTerm.length > 50 ? 'Search term too long' : null
                ].filter(Boolean),
                suggestions: 'Try a different search term or check spelling'
            });
        }

    } catch (error) {
        // End performance measurement with error data
        logger.endPerformanceMark('setSearch', {
            success: false,
            errorType: error.constructor.name,
            errorMessage: error.message,
            statusCode: error.status || 'unknown'
        });

        // Enhanced error logging with context
        logger.exception(error, {
            operation: 'setSearch',
            searchTerm: searchTerm.substring(0, 20) + (searchTerm.length > 20 ? '...' : ''),
            apiEndpoint: 'set_name',
            retryAttempt: 0, // You could implement retry logic
            networkStatus: navigator.onLine ? 'online' : 'offline',
            currentState: {
                previousSetCount: this.state.allSets.length,
                isLoading: this.isLoading
            }
        }, true); // Report to Sentry

        // Clear sets on error
        this.state.allSets = [];

        logger.warn('Search state cleared due to error', {
            clearedSetCount: 0,
            errorRecovery: 'automatic'
        });

    } finally {
        // Performance tracking for cleanup operations
        logger.startPerformanceMark('searchCleanup', {
            operation: 'ui_update',
            module: 'Step1'
        });

        this.isLoading = false;

        logger.debug('Starting post-search operations', {
            loadingState: this.isLoading,
            operations: ['applyFiltersAndSort', 'updateFilterOptions']
        });

        // Apply filters and update UI
        this.applyFiltersAndSort();
        this.updateFilterOptions();

        logger.endPerformanceMark('searchCleanup', {
            uiUpdated: true,
            filtersApplied: true
        });

        logger.info('Search operation completed', {
            finalState: {
                setCount: this.state.allSets.length,
                isLoading: this.isLoading,
                hasResults: this.state.allSets.length > 0
            }
        });
    }

    logger.groupEnd();
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