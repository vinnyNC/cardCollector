import logger from '../debug-manager.js';

export class Step2 {
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
            logger.group(`--- Step 2: Card Selected ---`);
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