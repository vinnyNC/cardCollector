// Store original card search results for filtering
let allCardSearchResults = [];
let cardCurrentSortField = 'number';
let cardCurrentSortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...

    // Card/Player search functionality
    const cardPlayerSearchInput = document.getElementById('cardPlayerSearch');
    if (cardPlayerSearchInput) {
        // Add debounce to prevent excessive searches while typing
        let cardSearchTimeout;
        cardPlayerSearchInput.addEventListener('input', function () {
            clearTimeout(cardSearchTimeout);
            cardSearchTimeout = setTimeout(async () => {
                const searchTerm = this.value.trim();
                if (searchTerm.length < 2) return; // Require at least 2 characters

                try {
                    // Search endpoints would vary based on your API structure
                    const results = await searchCardOrPlayer(searchTerm);

                    // Store original results for filtering
                    allCardSearchResults = [...results];

                    // Apply any active filters and sorting
                    applyCardFiltersAndSort();
                } catch (error) {
                    console.error('Card/Player search failed:', error);
                    allCardSearchResults = [];
                    updateCardResultsTable([]);
                }
            }, 300);
        });
    }

    // Set up filter and sort handlers for card search
    const cardFilterSelect = document.getElementById('cardFilterSelect');
    const cardSortSelect = document.getElementById('cardSortSelect');

    if (cardFilterSelect) {
        cardFilterSelect.addEventListener('change', () => {
            applyCardFiltersAndSort();
        });
    }

    if (cardSortSelect) {
        cardSortSelect.addEventListener('change', () => {
            const [field, direction] = cardSortSelect.value.split('_');
            cardCurrentSortField = field;
            cardCurrentSortDirection = direction;
            applyCardFiltersAndSort();
        });
    }
});

/**
 * Search for cards by card number or player name
 * @param {string} searchTerm - The search term entered by the user
 * @returns {Promise<Array>} - Promise resolving to array of matching cards
 */
async function searchCardOrPlayer(searchTerm) {
    try {
        // This function would call your API endpoint(s)
        // Here we'll determine if the search is likely a card number or player name
        let searchType = 'player_name';

        // Check if search term might be a card number (contains digits)
        if (/\d/.test(searchTerm)) {
            searchType = 'card_number';
        }

        // Make API call with appropriate parameters
        const results = await makeApiCall(searchTerm, searchType);
        return results;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

/**
 * Apply current filters and sorting to card search results
 */
function applyCardFiltersAndSort() {
    if (!allCardSearchResults || allCardSearchResults.length === 0) {
        updateCardResultsTable([]);
        return;
    }

    // Get filter value
    const filterValue = document.getElementById('cardFilterSelect')?.value || '';

    // Filter results
    let filteredResults = [...allCardSearchResults];
    if (filterValue) {
        filteredResults = filteredResults.filter(card => {
            if (filterValue === 'base') {
                return !card.isParallel && !card.isInsert;
            } else if (filterValue === 'parallel') {
                return card.isParallel;
            } else if (filterValue === 'insert') {
                return card.isInsert;
            }
            return true;
        });
    }

    // Sort results
    filteredResults.sort((a, b) => {
        let comparison = 0;

        if (cardCurrentSortField === 'number') {
            // For card numbers, extract numeric portions for proper numeric sorting
            const numA = parseInt(a.cardNumber.replace(/\D/g, '') || '0');
            const numB = parseInt(b.cardNumber.replace(/\D/g, '') || '0');
            comparison = numA - numB;
        } else if (cardCurrentSortField === 'name') {
            comparison = a.playerName.localeCompare(b.playerName);
        }

        // Reverse for descending order
        return cardCurrentSortDirection === 'desc' ? -comparison : comparison;
    });

    // Update table with filtered and sorted results
    updateCardResultsTable(filteredResults);
}

/**
 * Update the card search results table with the provided data
 * @param {Array} results - The filtered and sorted search results
 */
function updateCardResultsTable(results) {
    const tableBody = document.getElementById('cardResultsTable');
    if (!tableBody) return;

    // Clear existing results
    tableBody.innerHTML = '';

    if (results.length === 0) {
        // Display "no results" message
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="5" class="px-6 py-4 text-center">No matching cards found</td>
        `;
        tableBody.appendChild(noResultsRow);
        return;
    }

    // Add each result to the table
    results.forEach(card => {
        addCardTableItem(
            card.cardNumber,
            card.playerName,
            card.isParallel ? 'Parallel' : card.isInsert ? 'Insert' : 'Base',
            card.parallelName || card.insertName || '-',
            card.id
        );
    });
}

/**
 * Add a single row to the card results table
 * @param {string} cardNumber - Card number
 * @param {string} playerName - Player name
 * @param {string} cardType - Type of card (Base, Parallel, Insert)
 * @param {string} variantName - Name of parallel or insert variant
 * @param {string} cardID - Unique identifier for the card
 */
function addCardTableItem(cardNumber, playerName, cardType, variantName, cardID) {
    // Get the table body
    const tableBody = document.getElementById('cardResultsTable');
    if (!tableBody) return;

    // Create a new row
    const row = document.createElement('tr');
    row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';

    // Set the row content
    row.innerHTML = `
        <td class="px-6 py-4">${cardNumber}</td>
        <td class="px-6 py-4">${playerName}</td>
        <td class="px-6 py-4">${cardType}</td>
        <td class="px-6 py-4">${variantName}</td>
        <td class="px-6 py-4 text-right">
            <button type="button" data-card-id="${cardID}" 
                class="selectCardBtn font-medium text-blue-600 dark:text-blue-500 hover:underline">
                Select
            </button>
        </td>
    `;

    // Add click handler for the select button
    const selectBtn = row.querySelector('.selectCardBtn');
    selectBtn.addEventListener('click', () => {
        // Add your selection logic here
        console.log(`Selected card: ${cardID}`);
        // Example: store selected card info and advance to next step
        selectCardAndContinue(cardID);
    });

    // Add the row to the table
    tableBody.appendChild(row);
}

/**
 * Handle card selection and move to next step
 * @param {string} cardID - The ID of the selected card
 */
function selectCardAndContinue(cardID) {
    // Find the selected card from results
    const selectedCard = allCardSearchResults.find(card => card.id === cardID);

    if (selectedCard) {
        // Store selected card data for later use
        // This could be in a form or in a global variable depending on your app structure
        console.log('Selected card:', selectedCard);

        // Optionally move to the next step automatically
        const nextStep = stepperCurrentStep + 1;
        if (nextStep <= 8) {
            stepperChangeStep(nextStep);
        }
    }
}