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

            // Show loading state immediately
            isLoading = true;
            showLoadingState();

            searchTimeout = setTimeout(async () => {
                const searchTerm = this.value.trim().toLowerCase();
                try {
                    const results = await makeApiCall(searchTerm, 'set_name');

                    // Store original results for filtering
                    allSearchResults = [...results];

                    // Apply any active filters and sorting
                    isLoading = false;
                    applyFiltersAndSort();
                } catch (error) {
                    console.error('Search failed:', error);
                    allSearchResults = [];
                    isLoading = false;
                    updateSetResultsTable([]);
                }
            }, 300);
        });
    }

    // Add this function to create loading state indicators
    function showLoadingState() {
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

    // STEP 1 - Add Set Modal

    // Getting elements
    const addSetNewModal = document.getElementById('addNewSetModal');
    const addNewSetButton = document.getElementById('btnAddNewSet');
    const cancelAddSetButton = document.getElementById('cancelAddSet');
    const addNewSetForm = document.getElementById('addNewSetForm');
    const submitAddSet = document.getElementById('submitAddSet');
    const yearSelect = document.getElementById('newSetYear');
    const sportSelect = document.getElementById('newSetSport');

    // Variables
    const currentYear = new Date().getFullYear();

    // Generate years for the year select dropdown
    for (let year = currentYear; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Fetch sports from the API
    makeApiCall('', 'get_sports')
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


    // Close modal
    cancelAddSetButton.addEventListener('click', () => {
        addSetNewModal.classList.add('hidden');
    });

    // Handle form submission
    submitAddSet.addEventListener('click', async (event) => {
        event.preventDefault();

        const newSetData = {
            setName: document.getElementById('newSetName').value,
            setYear: document.getElementById('newSetYear').value,
            setSport: document.getElementById('newSetSport').value,
        };

        try {
            const response = await fetch('/api/sets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newSetData),
            });

            if (response.ok) {
                alert('Set added successfully!');
                modal.classList.add('hidden');
                addNewSetForm.reset();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'Failed to add set'}`);
            }
        } catch (error) {
            console.error('Error adding set:', error);
            alert('An error occurred while adding the set.');
        }
    });
});


// Global variables

// Current step in the stepper
let stepperCurrentStep = 1;
// Store original search results for filtering
let allSearchResults = [];
let currentSortDirection = 'asc'; // Track current sort direction
// Misc Variables
let isLoading = false;


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
 * @param {number} index - Index used for alternating row styles
 */

function addSetTableItem(setName, setYear, setSport, setID, index) {
    // Get the table body
    const tableBody = document.getElementById('setResultsTable');

    // Insert new item row
    if (index === 0) {
        setTableNewItem(tableBody);
        index++;
    } else {
        index++;
    }
    // Create a new row with alternating background colors
    const row = tableBody.insertRow();
    const isEven = index % 2 === 0;
    row.className = isEven
        ? "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150"
        : "bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors duration-150";
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
    selectButton.addEventListener('click', function () {
        // Add visual feedback when selected
        row.classList.add('bg-blue-100', 'dark:bg-blue-900');

        // Fill the set input with the selected set name
        document.querySelectorAll('input[name="set"]').forEach(input => {
            input.value = setName;
        });

        // Advance to step 2
        setTimeout(() => {
            stepperChangeStep(2);
        }, 200); // Small delay for visual feedback
    });

    selectCell.appendChild(selectButton);
}

function setTableNewItem(tableBody) {
    // Create the "Add New" row with distinct styling
    const row = tableBody.insertRow(0);
    row.className = "bg-green-50 border-b border-green-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-green-100 dark:hover:bg-gray-600 transition-colors duration-150";

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


/**
 * Updates the set results table with the provided data
 * @param {Array} sets - Array of set objects to display
 */
function updateSetResultsTable(sets) {
    // Get the table body and clear existing rows
    const tableBody = document.getElementById('setResultsTable');
    tableBody.innerHTML = '';

    // If still loading, show loading state
    if (isLoading) {
        showLoadingState();
        return;
    }

    // If no results, show a styled empty message
    if (sets.length === 0) {
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
        sets.forEach((set, index) => {
            addSetTableItem(set.setName, set.setYear, set.setSport, set.setID, index);
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
