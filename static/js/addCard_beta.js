document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    document.getElementById('btnPrev').disabled = true;


    // Set up step navigation
    const btnNext = document.getElementById('btnNext');
    const btnPrev = document.getElementById('btnPrev');


    btnNext.addEventListener('click', () => {
        const nextStep = stepperCurrentStep + 1;
        if (nextStep <= 8) {
            stepperChangeStep(nextStep);
        }
    });


    btnPrev.addEventListener('click', () => {
        const prevStep = stepperCurrentStep - 1;
        if (prevStep >= 1) {
            stepperChangeStep(prevStep);
        }
    });


    // Add filter and sort controls to the UI
    addFilterSortControls();

    // Set up search functionality
    const setSearchInput = document.getElementById('setName');
    if (setSearchInput) {
        // Add debounce to prevent excessive searches while typing
        let searchTimeout;
        setSearchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const searchTerm = this.value.trim().toLowerCase();
                try {
                    const results = await makeApiCall(searchTerm, 'set_name');

                    // Store original results for filtering
                    allSearchResults = [...results];

                    // Apply any active filters and sorting
                    applyFiltersAndSort();
                } catch (error) {
                    console.error('Search failed:', error);
                    allSearchResults = [];
                    updateSetResultsTable([]);
                }
            }, 300);
        });
    }

});


// Global variables

// Current step in the stepper
let stepperCurrentStep = 1;
// Store original search results for filtering
let allSearchResults = [];
let currentSortDirection = 'asc'; // Track current sort direction


/**
 * Updates the stepper to reflect the current step by toggling classes and visibility
 * for step indicators and content, as well as updating navigation buttons.
 *
 * @param {number} step The current step to set as active.
 * @param {number} [maxSteps=8] The total number of steps in the stepper. Defaults to 8 if not provided.
 * @return {void} This method does not return a value.
 */
function stepperChangeStep(step, maxSteps = 8) {
    // Update current step
    stepperCurrentStep = step;

    // Process all steps in a single loop
    [...Array(maxSteps)].forEach((_, i) => {
        const idx = i + 1;
        const isActive = idx === step;

        // Update step indicator
        const item = document.getElementById(`stepperListItem${idx}`);
        if (item) {
            // Toggle text classes
            ['text-blue-600', 'dark:text-blue-500'].forEach(cls =>
                item.classList.toggle(cls, isActive));

            // Toggle indicator border classes
            const dot = item.querySelector('span');
            if (dot) {
                ['border-blue-600', 'dark:border-blue-500'].forEach(cls =>
                    dot.classList.toggle(cls, isActive));
                ['border-gray-500', 'dark:border-gray-400'].forEach(cls =>
                    dot.classList.toggle(cls, !isActive));
            }
        }

        // Toggle content visibility
        document.getElementById(`addCardStep${idx}`)?.classList.toggle('hidden', !isActive);
    });

    // Update navigation buttons
    document.getElementById('btnPrev').disabled = step === 1;
    document.getElementById('btnNext').disabled = step === maxSteps;
}


/**
 * Add a single row to the set results table
 * @param {string} setName - Name of the set
 * @param {string} setYear - Year of the set
 * @param {string} setSport - Sport category
 * @param {string} setID - Unique identifier for the set
 */
function addSetTableItem(setName, setYear, setSport, setID) {
    // Get the table body
    const tableBody = document.getElementById('setResultsTable');

    // Create a new row
    const row = tableBody.insertRow();
    row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600";
    row.dataset.setID = setID;

    // Create cells with proper styling
    const nameCell = row.insertCell(0);
    nameCell.className = "px-3 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white";
    nameCell.textContent = setName;

    const yearCell = row.insertCell(1);
    yearCell.className = "px-3 py-2";
    yearCell.textContent = setYear;

    const sportCell = row.insertCell(2);
    sportCell.className = "px-3 py-2";
    sportCell.textContent = setSport;

    // Add the Select button cell
    const selectCell = row.insertCell(3);
    selectCell.className = "px-3 py-2 text-right";

    // Create the Select button
    const selectButton = document.createElement('button');
    selectButton.type = "button";
    selectButton.className = "px-3 py-2 w-auto bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800";
    selectButton.textContent = "Select";

    // Add click event to select button
    selectButton.addEventListener('click', function () {
        // Fill the set input with the selected set name
        document.querySelectorAll('input[name="set"]').forEach(input => {
            input.value = setName;
        });

        // Advance to step 2
        stepperChangeStep(2);
    });

    selectCell.appendChild(selectButton);
}


/**
 * Updates the set results table with the provided data
 * @param {Array} sets - Array of set objects to display
 */
function updateSetResultsTable(sets) {
    // Get the table body and clear existing rows
    const tableBody = document.getElementById('setResultsTable');
    tableBody.innerHTML = '';

    // If no results, show a message
    if (sets.length === 0) {
        const row = tableBody.insertRow();
        row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700";
        const cell = row.insertCell(0);
        cell.colSpan = 4;
        cell.className = "px-3 py-4 text-center text-gray-500 dark:text-gray-400";
        cell.textContent = "No matching sets found. Try a different search term or filter.";
    } else {
        // Add the filtered sets to the table
        sets.forEach(set => {
            addSetTableItem(set.setName, set.setYear, set.setSport, set.setID);
        });
    }
}


/**
 * Adds filter and sort controls to the table header
 */
function addFilterSortControls() {
    // Get the table header
    const tableHeader = document.querySelector('#setSearchResultTable thead tr');

    // Add sort functionality to the name column
    const nameHeader = tableHeader.querySelector('th:nth-child(1)');
    nameHeader.classList.add('cursor-pointer', 'select-none');
    nameHeader.innerHTML = `
        Set Name
        <span id="sortIndicator" class="ml-1 text-xs">↑</span>
    `;

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
        </div>
    `;

    // Insert filter controls before the table
    const table = document.getElementById('setSearchResultTable');
    table.parentNode.insertBefore(filterContainer, table);

    // Set up event listeners for filters and sorting
    document.getElementById('yearFilter').addEventListener('change', applyFiltersAndSort);
    document.getElementById('sportFilter').addEventListener('change', applyFiltersAndSort);
    nameHeader.addEventListener('click', toggleSortDirection);
}


/**
 * Toggles the sort direction for the set name column
 */
function toggleSortDirection() {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    const sortIndicator = document.getElementById('sortIndicator');
    sortIndicator.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
    applyFiltersAndSort();
}


/**
 * Applies current filters and sorting to the results
 */
function applyFiltersAndSort() {
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

        if (currentSortDirection === 'asc') {
            return setNameA.localeCompare(setNameB);
        } else {
            return setNameB.localeCompare(setNameA);
        }
    });

    // Update table with filtered and sorted results
    updateSetResultsTable(filteredResults);

    // Update filter options if this is new data
    updateFilterOptions();
}


/**
 * Updates the filter dropdown options based on available data
 */
function updateFilterOptions() {
    // Get unique years and sports - convert years to strings
    const years = [...new Set(allSearchResults.map(set => String(set.setYear)))].sort();
    const sports = [...new Set(allSearchResults.map(set => set.setSport))].sort();

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


/**
 * Makes an API call based on the provided search text and API segment.
 *
 * @param {string} searchText - The text to search for and include in the API request.
 * @param {string} apiSegment - The specific API segment to target for the request.
 *                              Valid values are 'set_name', 'card_num', 'insert_name',
 *                              'parallel_name', or 'where_bought'.
 * @return {Promise<Array|null>} A promise that resolves to an array of results or null if none found
 */
async function makeApiCall(searchText, apiSegment) {
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
