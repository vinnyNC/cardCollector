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
        this.isCardFlipped = false; // Track card flip state in modal
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
        this.setupCardImageModal(); // Setup modal event listeners
        this.setupTableSorting(); // Setup table column sorting
        logger.info("Step2: Initialization complete.");
    }

    // Setup the card image modal and its event listeners
    setupCardImageModal() {
        // Get modal elements
        const modal = document.getElementById('cardImageModal');
        const flipButton = document.getElementById('flipCardButton');
        const closeModalBtn = document.getElementById('closeCardModalBtn');
        const closeModalX = document.getElementById('closeCardModal');

        if (!modal || !flipButton) {
            logger.error("Step2: Card image modal elements not found");
            return;
        }

        // Setup flip button
        flipButton.addEventListener('click', () => {
            this.flipCardInModal();
        });

        // Setup close buttons
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeCardImageModal();
            });
        }

        if (closeModalX) {
            closeModalX.addEventListener('click', () => {
                this.closeCardImageModal();
            });
        }

        // Close modal when clicking outside content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCardImageModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeCardImageModal();
            }
        });

        logger.debug("Step2: Card image modal event listeners setup complete");
    }

    // Setup table column sorting
    setupTableSorting() {
        const table = document.getElementById('cardSearchResultTable');
        if (!table) {
            logger.error("Step2: Card search result table not found");
            return;
        }

        // Get all sortable column headers
        const sortableHeaders = table.querySelectorAll('th[data-sort]');

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.getAttribute('data-sort');
                this.sortCardResults(sortKey);
            });
        });

        logger.debug("Step2: Table sorting event listeners setup complete");
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
        const cardFilterSelect = document.getElementById('cardFilterSelect');
        const cardFeaturesSelect = document.getElementById('cardFeaturesSelect');
        const cardSortSelect = document.getElementById('cardSortSelect');

        // Setup search input
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

        // Setup filter dropdowns
        if (cardFilterSelect) {
            cardFilterSelect.addEventListener('change', () => {
                if (!this.isManualEntry) {
                    this.applyCardFilter();
                }
            });
            logger.debug("Step2: Card filter select listener attached.");
        }

        if (cardFeaturesSelect) {
            cardFeaturesSelect.addEventListener('change', () => {
                if (!this.isManualEntry) {
                    this.applyCardFilter();
                }
            });
            logger.debug("Step2: Card features select listener attached.");
        }

        // Setup sort dropdown
        if (cardSortSelect) {
            cardSortSelect.addEventListener('change', () => {
                if (!this.isManualEntry && this.state.allCardsForSet.length > 0) {
                    this.applyCardFilter();
                }
            });
            logger.debug("Step2: Card sort select listener attached.");
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

        // Apply search term filter if present
        if (searchTermLower) {
            filteredResults = filteredResults.filter(card => {
                const numberMatch = String(card.card_number || '').toLowerCase().includes(searchTermLower);
                const nameMatch = String(card.player_name || '').toLowerCase().includes(searchTermLower);
                const typeMatch = String(card.type || '').toLowerCase().includes(searchTermLower);
                const parallelMatch = String(card.parallel_insert || '').toLowerCase().includes(searchTermLower);

                // Search in features/attributes if available
                let attributeMatch = false;
                if (card.attributes && Array.isArray(card.attributes)) {
                    attributeMatch = card.attributes.some(attr => 
                        String(attr).toLowerCase().includes(searchTermLower)
                    );
                }

                return numberMatch || nameMatch || typeMatch || parallelMatch || attributeMatch;
            });
        }

        // Apply card type filter
        const cardTypeFilter = document.getElementById('cardFilterSelect');
        if (cardTypeFilter && cardTypeFilter.value) {
            const filterValue = cardTypeFilter.value.toLowerCase();

            filteredResults = filteredResults.filter(card => {
                const cardType = String(card.type || '').toLowerCase();

                switch (filterValue) {
                    case 'base':
                        return cardType === 'base' || cardType === '';
                    case 'parallel':
                        return cardType.includes('parallel');
                    case 'insert':
                        return cardType.includes('insert');
                    case 'rookie':
                        return card.is_rookie === true || cardType.includes('rookie');
                    case 'autograph':
                        return card.is_autographed === true || cardType.includes('auto');
                    case 'memorabilia':
                        return card.is_memorabilia === true || cardType.includes('mem') || cardType.includes('relic');
                    case 'serial':
                        return card.is_numbered === true || cardType.includes('serial') || cardType.includes('numbered');
                    default:
                        return true;
                }
            });
        }

        // Apply card features filter
        const cardFeaturesFilter = document.getElementById('cardFeaturesSelect');
        if (cardFeaturesFilter && cardFeaturesFilter.value) {
            const featureValue = cardFeaturesFilter.value.toLowerCase();

            filteredResults = filteredResults.filter(card => {
                switch (featureValue) {
                    case 'multi_player':
                        return card.is_multi_player === true || 
                               (card.player_name && card.player_name.includes('&'));
                    case 'team_card':
                        return card.is_team_card === true || 
                               (card.card_type && card.card_type.toLowerCase().includes('team'));
                    case 'variation':
                        return card.is_variation === true;
                    case 'refractor':
                        return (card.parallel_insert && 
                                card.parallel_insert.toLowerCase().includes('refractor'));
                    case 'short_print':
                        return card.is_short_print === true || 
                               (card.parallel_insert && 
                                card.parallel_insert.toLowerCase().includes('sp'));
                    case 'numbered':
                        return card.is_numbered === true || 
                               (card.parallel_insert && 
                                /\/\d+/.test(card.parallel_insert)); // matches patterns like /99, /250, etc.
                    default:
                        return true;
                }
            });
        }

        // Apply sort if available
        const sortSelect = document.getElementById('cardSortSelect');
        if (sortSelect && sortSelect.value) {
            const [sortKey, direction] = sortSelect.value.split('_');

            // Sort the filtered results
            filteredResults.sort((a, b) => {
                let valueA, valueB;

                switch (sortKey) {
                    case 'number':
                        valueA = a.card_number || '';
                        valueB = b.card_number || '';
                        // Handle numeric sorting for card numbers
                        const numA = parseInt(valueA.replace(/\D/g, '')) || 0;
                        const numB = parseInt(valueB.replace(/\D/g, '')) || 0;
                        return direction === 'asc' ? numA - numB : numB - numA;

                    case 'name':
                        valueA = a.player_name || '';
                        valueB = b.player_name || '';
                        break;

                    case 'type':
                        valueA = a.type || '';
                        valueB = b.type || '';
                        break;

                    case 'rarity':
                        // Higher rarity for numbered, auto, mem cards
                        valueA = (a.is_numbered ? 3 : 0) + (a.is_autographed ? 2 : 0) + (a.is_memorabilia ? 1 : 0);
                        valueB = (b.is_numbered ? 3 : 0) + (b.is_autographed ? 2 : 0) + (b.is_memorabilia ? 1 : 0);
                        return direction === 'desc' ? valueB - valueA : valueA - valueB;

                    case 'recent':
                        // If there's a date_added field, use it
                        valueA = a.date_added ? new Date(a.date_added).getTime() : 0;
                        valueB = b.date_added ? new Date(b.date_added).getTime() : 0;
                        return valueB - valueA; // Always newest first

                    default:
                        return 0;
                }

                // String comparison for non-numeric fields
                if (direction === 'asc') {
                    return valueA.localeCompare(valueB);
                } else {
                    return valueB.localeCompare(valueA);
                }
            });
        }

        logger.debug(`Step2: ${filteredResults.length} cards after filtering and sorting.`);
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
        numberCell.className = "px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white";
        numberCell.textContent = card.card_number || 'N/A';

        // Thumbnail cell
        const thumbnailCell = row.insertCell(1);
        thumbnailCell.className = "px-4 py-3";
        if (card.front_image) {
            const img = document.createElement('img');
            img.src = card.front_image;
            img.alt = "Card Thumbnail";
            img.className = "h-12 w-auto object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"; 
            img.dataset.cardId = card.cardId || card.id;

            // Add click event to open modal
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCardImageModal(card);
            });

            thumbnailCell.appendChild(img);
        } else {
            thumbnailCell.textContent = 'No Image';
        }

        // Player name cell
        const nameCell = row.insertCell(2);
        nameCell.className = "px-4 py-3";
        nameCell.textContent = card.player_name || 'N/A';

        // Type cell - hidden on mobile
        const typeCell = row.insertCell(3);
        typeCell.className = "px-4 py-3 hidden md:table-cell";
        typeCell.textContent = card.type || 'Base';

        // Parallel/Insert cell - hidden on mobile
        const piCell = row.insertCell(4);
        piCell.className = "px-4 py-3 hidden md:table-cell";
        piCell.textContent = card.parallel_insert || '';

        // Features cell - hidden on mobile and tablet
        const featuresCell = row.insertCell(5);
        featuresCell.className = "px-4 py-3 hidden lg:table-cell";

        // Combine features into badges
        const features = [];
        if (card.is_rookie) features.push('Rookie');
        if (card.is_autographed) features.push('Auto');
        if (card.is_memorabilia) features.push('Mem');
        if (card.is_numbered) features.push(`#'d ${card.numbered_to}`);
        if (card.is_variation) features.push('Var');

        if (features.length > 0) {
            const featureContainer = document.createElement('div');
            featureContainer.className = "flex flex-wrap gap-1";

            features.forEach(feature => {
                const badge = document.createElement('span');
                badge.className = "px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
                badge.textContent = feature;
                featureContainer.appendChild(badge);
            });

            featuresCell.appendChild(featureContainer);
        }

        // Actions cell with view and select buttons
        const actionsCell = row.insertCell(6);
        actionsCell.className = "px-4 py-3 flex items-center justify-end gap-2";

        // View button
        const viewButton = document.createElement('button');
        viewButton.type = "button";
        viewButton.className = "p-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-all duration-200";
        viewButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>`;
        viewButton.title = "View Card";

        viewButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openCardImageModal(card);
        });

        // Select button
        const selectButton = document.createElement('button');
        selectButton.type = "button";
        selectButton.className = "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 flex items-center gap-1";
        selectButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="hidden sm:inline">Select</span>`;

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

        actionsCell.appendChild(viewButton);
        actionsCell.appendChild(selectButton);
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

    // Open the card image modal with the selected card
    openCardImageModal(card) {
        logger.info("Step2: Opening card image modal for card:", card);

        // Get modal elements
        const modal = document.getElementById('cardImageModal');
        const cardNumber = document.getElementById('modalCardNumber');
        const playerName = document.getElementById('modalPlayerName');
        const detailCardNumber = document.getElementById('modalDetailCardNumber');
        const detailPlayerName = document.getElementById('modalDetailPlayerName');
        const cardType = document.getElementById('modalCardType');
        const cardParallelInsert = document.getElementById('modalCardParallelInsert');
        const cardFeatures = document.getElementById('modalCardFeatures');
        const attributesList = document.getElementById('modalAttributesList');
        const frontImage = document.getElementById('cardFrontImage');
        const backImage = document.getElementById('cardBackImage');
        const flipBox = document.getElementById('cardImageFlipBox');

        if (!modal || !frontImage || !backImage || !flipBox) {
            logger.error("Step2: Modal elements not found");
            return;
        }

        // Reset flip state
        this.isCardFlipped = false;
        flipBox.classList.remove('flipped');

        // Populate modal header with card data
        if (cardNumber) cardNumber.textContent = card.card_number || 'N/A';
        if (playerName) playerName.textContent = card.player_name || 'N/A';

        // Populate detailed card information
        if (detailCardNumber) detailCardNumber.textContent = card.card_number || 'N/A';
        if (detailPlayerName) detailPlayerName.textContent = card.player_name || 'N/A';
        if (cardType) cardType.textContent = card.type || 'Base Card';

        // Handle parallel/insert info
        if (cardParallelInsert) {
            cardParallelInsert.textContent = card.parallel_insert || 'None';
        }

        // Create and display feature badges
        if (cardFeatures) {
            // Clear existing features
            cardFeatures.innerHTML = '';

            // Create badges for each feature
            const addFeatureBadge = (text, color = 'blue') => {
                const badge = document.createElement('span');
                badge.className = `px-2.5 py-1.5 text-sm font-medium rounded-full bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-300`;
                badge.textContent = text;
                cardFeatures.appendChild(badge);
            };

            // Add badges for different features with appropriate colors
            if (card.is_rookie) addFeatureBadge('Rookie Card', 'green');
            if (card.is_autographed) addFeatureBadge('Autographed', 'purple');
            if (card.is_memorabilia) addFeatureBadge('Memorabilia', 'indigo');
            if (card.is_numbered && card.numbered_to) addFeatureBadge(`Numbered to ${card.numbered_to}`, 'red');
            if (card.is_variation) addFeatureBadge('Variation', 'yellow');
            if (card.is_short_print) addFeatureBadge('Short Print', 'orange');
            if (card.is_multi_player) addFeatureBadge('Multi-Player', 'blue');
            if (card.is_team_card) addFeatureBadge('Team Card', 'blue');

            // If no features, show a message
            if (cardFeatures.children.length === 0) {
                const noFeatures = document.createElement('p');
                noFeatures.className = 'text-sm text-gray-500 dark:text-gray-400';
                noFeatures.textContent = 'No special features';
                cardFeatures.appendChild(noFeatures);
            }
        }

        // Display card attributes if available
        if (attributesList) {
            // Clear existing attributes
            attributesList.innerHTML = '';

            if (card.attributes && Array.isArray(card.attributes) && card.attributes.length > 0) {
                // Create a badge for each attribute
                card.attributes.forEach(attr => {
                    const badge = document.createElement('span');
                    badge.className = 'px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                    badge.textContent = attr;
                    attributesList.appendChild(badge);
                });
            } else {
                // If no attributes, hide the attributes section
                const attributesSection = document.getElementById('modalCardAttributes');
                if (attributesSection) {
                    attributesSection.classList.add('hidden');
                }
            }
        }

        // Set images
        if (frontImage) {
            frontImage.src = card.front_image || '';
            frontImage.alt = `${card.player_name || 'Card'} Front`;
        }

        if (backImage) {
            backImage.src = card.back_image || '';
            backImage.alt = `${card.player_name || 'Card'} Back`;

            // If no back image, disable flip button
            const flipButton = document.getElementById('flipCardButton');
            if (flipButton) {
                if (!card.back_image) {
                    flipButton.disabled = true;
                    flipButton.classList.add('opacity-50', 'cursor-not-allowed');
                    flipButton.title = "No back image available";
                } else {
                    flipButton.disabled = false;
                    flipButton.classList.remove('opacity-50', 'cursor-not-allowed');
                    flipButton.title = "Flip card to see back";
                }
            }
        }

        // Show modal
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        logger.debug("Step2: Card image modal opened");
    }

    // Close the card image modal
    closeCardImageModal() {
        const modal = document.getElementById('cardImageModal');
        if (!modal) return;

        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        logger.debug("Step2: Card image modal closed");
    }

    // Flip the card in the modal
    flipCardInModal() {
        const flipBox = document.getElementById('cardImageFlipBox');
        if (!flipBox) return;

        this.isCardFlipped = !this.isCardFlipped;

        if (this.isCardFlipped) {
            flipBox.classList.add('flipped');
        } else {
            flipBox.classList.remove('flipped');
        }

        // Update flip button text
        const flipButton = document.getElementById('flipCardButton');
        if (flipButton) {
            flipButton.textContent = this.isCardFlipped ? 'Show Front' : 'Flip Card';
        }

        logger.debug(`Step2: Card flipped to ${this.isCardFlipped ? 'back' : 'front'}`);
    }

    // Sort card results based on the selected column
    sortCardResults(sortKey) {
        logger.info(`Step2: Sorting card results by ${sortKey}`);

        if (!this.state.allCardsForSet || this.state.allCardsForSet.length === 0) {
            logger.debug("Step2: No cards to sort");
            return;
        }

        // Clone the array to avoid modifying the original
        const sortedCards = [...this.state.allCardsForSet];

        // Determine sort direction (toggle if clicking the same column)
        const currentSort = this.state.currentSort || { key: null, direction: 'asc' };
        let direction = 'asc';

        if (currentSort.key === sortKey) {
            // Toggle direction if same column
            direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        }

        // Update current sort state
        this.state.currentSort = { key: sortKey, direction };

        // Sort based on key and direction
        sortedCards.sort((a, b) => {
            let valueA, valueB;

            // Extract values based on sort key
            switch (sortKey) {
                case 'card_number':
                    valueA = a.card_number || '';
                    valueB = b.card_number || '';
                    // Handle numeric sorting for card numbers
                    const numA = parseInt(valueA.replace(/\D/g, '')) || 0;
                    const numB = parseInt(valueB.replace(/\D/g, '')) || 0;
                    return direction === 'asc' ? numA - numB : numB - numA;

                case 'player_name':
                    valueA = a.player_name || '';
                    valueB = b.player_name || '';
                    break;

                case 'type':
                    valueA = a.type || '';
                    valueB = b.type || '';
                    break;

                default:
                    return 0;
            }

            // String comparison for non-numeric fields
            if (direction === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        });

        // Update the table with sorted results
        this.updateCardResultsTable(sortedCards);

        // Update sort indicators in the table headers
        this.updateSortIndicators(sortKey, direction);

        logger.debug(`Step2: Cards sorted by ${sortKey} in ${direction} order`);
    }

    // Update sort indicators in table headers
    updateSortIndicators(sortKey, direction) {
        const table = document.getElementById('cardSearchResultTable');
        if (!table) return;

        // Get all sortable headers
        const headers = table.querySelectorAll('th[data-sort]');

        headers.forEach(header => {
            const headerKey = header.getAttribute('data-sort');
            const iconContainer = header.querySelector('div');

            if (!iconContainer) return;

            // Remove existing sort icons
            const existingIcon = iconContainer.querySelector('svg');
            if (existingIcon) {
                existingIcon.remove();
            }

            // Add appropriate icon based on sort state
            if (headerKey === sortKey) {
                const icon = document.createElement('svg');
                icon.className = 'w-3 h-3 ml-1';
                icon.setAttribute('aria-hidden', 'true');
                icon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                icon.setAttribute('fill', 'currentColor');
                icon.setAttribute('viewBox', '0 0 24 24');

                if (direction === 'asc') {
                    icon.innerHTML = '<path d="M11.47 7.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L12 9.31 8.78 12.53a.75.75 0 01-1.06-1.06l3.75-3.75z"/>';
                } else {
                    icon.innerHTML = '<path d="M12.53 16.28a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06L12 14.69l3.22-3.22a.75.75 0 111.06 1.06l-3.75 3.75z"/>';
                }

                iconContainer.appendChild(icon);
            } else {
                // Add default icon for unsorted columns
                const defaultIcon = document.createElement('svg');
                defaultIcon.className = 'w-3 h-3 ml-1';
                defaultIcon.setAttribute('aria-hidden', 'true');
                defaultIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                defaultIcon.setAttribute('fill', 'currentColor');
                defaultIcon.setAttribute('viewBox', '0 0 24 24');
                defaultIcon.innerHTML = '<path d="M8 9a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 018 9zm0 5.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z"/>';

                iconContainer.appendChild(defaultIcon);
            }
        });
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
