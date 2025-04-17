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
        const encodedSearchText = encodeURIComponent(searchText);
        let url;
        switch (apiSegment) {
            case 'set_name':
                url = `/api/sets?setName=${encodedSearchText}`;
                break;
            case 'card_num':
                url = `/api/cards?cardNum=${encodedSearchText}&setID=${encodeURIComponent(setId)}`;
                break;
            case 'insert_name':
                url = `/api/inserts?insertName=${encodedSearchText}&setID=${encodeURIComponent(setId)}`;
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
            default:
                throw new Error(`Unknown API segment: ${apiSegment}`);
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

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
    constructor() {
        this.allSearchResults = [];
        this.isLoading = false;
        this.currentSortDirection = 'asc'; // Track current sort direction
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
        // Load default set list (user most recent, most used, and random up to 50)
        console.log('Loading default set list...');
        this.isLoading = true;
        this.showLoadingState();
        this.makeApiCall('', 'set_name')
            .then(results => {
                this.allSearchResults = [...results];
                this.isLoading = false;
                applyFiltersAndSort();
            })
            .catch(error => {
                console.error('Error fetching default sets:', error);
                this.allSearchResults = [];
                this.isLoading = false;
                updateSetResultsTable([]);
            });
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
        document.getElementById('yearFilter').addEventListener('change', this.applyFiltersAndSort);
        document.getElementById('sportFilter').addEventListener('change', this.applyFiltersAndSort);
        nameHeader.addEventListener('click', this.toggleSortDirection);
    }

    updateSetResultsTable(results) {
        // Implementation...
        // ...
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
        let filteredResults = allSearchResults.filter(set => {
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

        // Update filter options if this is new data
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
