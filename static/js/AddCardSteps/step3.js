import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step3 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 3); // Call base constructor with step number
        // DOM Element Cache
        this.elements = {}; // To store cached elements for this step

        // Modal state
        this.isModalOpen = false;
        this.modalSearchType = null; // 'player' or 'team'
        this.modalSearchDebounce = this.utils.debounce(this._performModalSearch.bind(this), 500);
        this.modalLastSearchResults = []; // Cache for full items from modal search

        this._initialized = false; // Flag to track initialization status
        // step3DataInitialized is managed in the global state, checked in activate()
        logger.info("Step3 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step3: Already initialized.");
            return;
        }
        super.init(); // Call base init
        this._cacheDOMelements();
        this._setupEventListeners();
        this._initialized = true; // Mark as initialized
        logger.info("Step3: Initialization complete.");
    }

    _cacheDOMelements() {
        const ids = this.config.ELEMENT_IDS.STEP_3;
        this.elements.openAddPlayerBtn = document.getElementById(ids.OPEN_ADD_PLAYER_MODAL_BTN);
        this.elements.openAddTeamBtn = document.getElementById(ids.OPEN_ADD_TEAM_MODAL_BTN);
        this.elements.selectedPlayersContainer = document.getElementById(ids.SELECTED_PLAYERS_CONTAINER);
        this.elements.selectedTeamsContainer = document.getElementById(ids.SELECTED_TEAMS_CONTAINER);
        this.elements.noPlayersMessage = document.getElementById(ids.NO_PLAYERS_MESSAGE);
        this.elements.noTeamsMessage = document.getElementById(ids.NO_TEAMS_MESSAGE);

        this.elements.modal = document.getElementById(ids.ADD_ENTITY_MODAL);
        this.elements.modalOverlay = document.getElementById(ids.ADD_ENTITY_MODAL_OVERLAY);
        this.elements.modalTitle = document.getElementById(ids.MODAL_TITLE);
        this.elements.modalSearchInput = document.getElementById(ids.MODAL_SEARCH_INPUT);
        this.elements.modalSearchResultsContainer = document.getElementById(ids.MODAL_SEARCH_RESULTS_CONTAINER);
        this.elements.modalLoadingIndicator = document.getElementById(ids.MODAL_LOADING_INDICATOR);
        this.elements.modalNoResultsIndicator = document.getElementById(ids.MODAL_NO_RESULTS_INDICATOR);
        this.elements.closeModalBtnStandard = document.getElementById(ids.CLOSE_ADD_ENTITY_MODAL_BTN_STANDARD);
        this.elements.closeModalBtnFooter = document.getElementById(ids.CLOSE_ADD_ENTITY_MODAL_BTN_FOOTER);

        this.elements.associationSection = document.getElementById(ids.PLAYER_TEAM_ASSOCIATION_SECTION);
        this.elements.associationsContainer = document.getElementById(ids.PLAYER_TEAM_ASSOCIATIONS_CONTAINER);
        this.elements.rookieCheckbox = document.getElementById(ids.ROOKIE_CARD_CHECKBOX);

        if (!this.elements.rookieCheckbox) {
            logger.warn("Step3 _cacheDOMelements: Rookie checkbox element not found.");
        }
        if (!this.elements.modalSearchResultsContainer) {
            logger.warn("Step3 _cacheDOMelements: Modal search results container element not found.");
        }
        if (!this.elements.selectedPlayersContainer || !this.elements.selectedTeamsContainer) {
            logger.warn("Step3 _cacheDOMelements: Selected players/teams container not found.");
        }
        if (!this.elements.associationsContainer) {
            logger.warn("Step3 _cacheDOMelements: Associations container not found.");
        }
    }

    _setupEventListeners() {
        this.elements.openAddPlayerBtn?.addEventListener('click', () => this._openModal('player'));
        this.elements.openAddTeamBtn?.addEventListener('click', () => this._openModal('team'));

        this.elements.modalOverlay?.addEventListener('click', () => this._closeModal());
        this.elements.closeModalBtnStandard?.addEventListener('click', () => this._closeModal());
        this.elements.closeModalBtnFooter?.addEventListener('click', () => this._closeModal());

        this.elements.modalSearchInput?.addEventListener('input', () => {
            this.elements.modalLoadingIndicator?.classList.remove('hidden');
            this.elements.modalNoResultsIndicator?.classList.add('hidden');
            if (this.modalSearchType === 'player') {
                 this.elements.modalSearchResultsContainer.querySelectorAll('.player-modal-content--table, .player-modal-content--message').forEach(el => el.remove());
            }
            this.modalSearchDebounce();
        });

        this.elements.rookieCheckbox?.addEventListener('change', (e) => {
            this.addCardInstance.updateStep3Data('isRookieCard', e.target.checked);
            logger.debug("Step3 Rookie card checkbox changed:", e.target.checked);
        });

        this.elements.selectedPlayersContainer?.addEventListener('click', this._handlePlayerCardActions.bind(this));
        this.elements.selectedTeamsContainer?.addEventListener('click', this._handleTeamCardActions.bind(this));
        this.elements.modalSearchResultsContainer?.addEventListener('click', this._handleModalResultClick.bind(this));
        this.elements.associationsContainer?.addEventListener('change', this._handleAssociationChange.bind(this));
    }

    activate() {
        this.init(); // Ensures DOM elements are cached and listeners are set up
        super.activate();
        logger.info("Step3: Activated.");

        // Check if data needs to be auto-populated from a previously selected card
        // and if step3Data has not been initialized yet for this card.
        // Note: step3DataInitialized should be part of the global state in AddCard.js
        if (this.state.selectedCard && !this.state.step3DataInitialized) {
            this._autoPopulateFromSelectedCard();
            // It's better to manage this flag in the main AddCard class or pass it around
            // For now, assuming it's on global state:
            if (this.addCardInstance) { // Check if addCardInstance exists
                 this.addCardInstance.state.step3DataInitialized = true; // Mark as initialized for this card
            } else {
                logger.warn("Step3: addCardInstance not available to set step3DataInitialized");
            }
        }

        this._renderSelectedPlayers();
        this._renderSelectedTeams();
        this._updateAssociationSectionVisibility();
        this._renderPlayerTeamAssociations();

        if (this.elements.rookieCheckbox) {
            this.elements.rookieCheckbox.checked = this.state.step3Data.isRookieCard;
        }
        this.updateNextButtonState();
    }

    _autoPopulateFromSelectedCard() {
        const card = this.state.selectedCard;
        if (card) {
            logger.debug("Step3: Attempting to auto-populate from selected card:", card);

            // Clear existing Step 3 data before populating
            this.addCardInstance.updateStep3Data('players', []);
            this.addCardInstance.updateStep3Data('teams', []);
            // Typo corrected below: updateStep3Datal -> updateStep3Data
            this.addCardInstance.updateStep3Data('associations', {});

            if (card.player && typeof card.player === 'object' && card.player.id && card.player.name) {
                const playerToAdd = { ...card.player };
                this._addEntity(playerToAdd, 'player');
                logger.info(`Step3: Auto-populated player ${playerToAdd.name} from selected card.`);
            }

            if (card.team && typeof card.team === 'object' && card.team.id && card.team.name) {
                const teamToAdd = { ...card.team };
                this._addEntity(teamToAdd, 'team');
                logger.info(`Step3: Auto-populated team ${teamToAdd.name} from selected card.`);
            }

            if (card.player && typeof card.player === 'object' && card.player.id &&
                card.team && typeof card.team === 'object' && card.team.id) {
                const currentAssociations = { ...this.state.step3Data.associations };
                currentAssociations[String(card.player.id)] = [String(card.team.id)];
                this.addCardInstance.updateStep3Data('associations', currentAssociations);
                logger.info(`Step3: Auto-associated player ${card.player.name} with team ${card.team.name}.`);
            }

            if (typeof card.is_rookie === 'boolean') {
                this.addCardInstance.updateStep3Data('isRookieCard', card.is_rookie);
                if (this.elements.rookieCheckbox) {
                    this.elements.rookieCheckbox.checked = card.is_rookie;
                }
                logger.info(`Step3: Set rookie status to ${card.is_rookie} from selected card.`);
            }
        }
    }

    canProceed() {
        const hasPlayers = this.state.step3Data.players.length > 0;
        const hasTeams = this.state.step3Data.teams.length > 0;
        return hasPlayers || hasTeams;
    }

    _openModal(type) {
        this.modalSearchType = type;
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = type === 'player' ? 'Add Player' : 'Add Team';
        }
        if (this.elements.modalSearchInput) {
            this.elements.modalSearchInput.value = '';
            this.elements.modalSearchInput.placeholder = type === 'player' ? 'Search players by name...' : 'Search teams by name...';
        }

        if(this.elements.modalSearchResultsContainer) {
            this.elements.modalSearchResultsContainer.innerHTML = ''; // Clear previous results or messages
        }
        this.elements.modalLoadingIndicator?.classList.add('hidden');
        this.elements.modalNoResultsIndicator?.classList.add('hidden');
        this.modalLastSearchResults = [];

        if (type === 'player' && this.elements.modalSearchResultsContainer) {
            this._setupPlayerModalFilter(); // Setup filter, which might add its own structure
             // Show initial prompt for players if no search term yet
            const initialMessage = this._createPlayerModalMessage('Start typing to search for players, or select a team to filter.');
            this.elements.modalSearchResultsContainer.appendChild(initialMessage);
        } else if (type === 'team' && this.elements.modalSearchResultsContainer) {
            // For teams, show a simpler prompt or leave blank until search
            this.elements.modalSearchResultsContainer.innerHTML = `<p class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Start typing to search for teams.</p>`;
        }


        this.elements.modal?.classList.remove('hidden');
        this.elements.modalSearchInput?.focus();
        this.isModalOpen = true;
    }

    _setupPlayerModalFilter() {
        if (!this.elements.modalSearchResultsContainer) return;

        const existingFilterContainer = this.elements.modalSearchResultsContainer.querySelector('#playerFilterContainer');
        if (existingFilterContainer) {
            existingFilterContainer.remove();
        }
        if (this.elements.modalPlayerTeamFilter && this.elements.modalPlayerTeamFilter._listenerAttached && this._onPlayerFilterChange) {
            this.elements.modalPlayerTeamFilter.removeEventListener('change', this._onPlayerFilterChange);
            delete this.elements.modalPlayerTeamFilter._listenerAttached;
        }


        const filterContainer = document.createElement('div');
        filterContainer.id = 'playerFilterContainer';
        filterContainer.className = 'mb-3 px-0.5';

        const label = document.createElement('label');
        label.htmlFor = 'modalPlayerTeamFilter';
        label.className = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
        label.textContent = 'Filter by Team:';
        filterContainer.appendChild(label);

        this.elements.modalPlayerTeamFilter = document.createElement('select');
        this.elements.modalPlayerTeamFilter.id = 'modalPlayerTeamFilter';
        this.elements.modalPlayerTeamFilter.className = 'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white';

        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Teams';
        this.elements.modalPlayerTeamFilter.appendChild(allOption);

        this.state.step3Data.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            this.elements.modalPlayerTeamFilter.appendChild(option);
        });

        this._onPlayerFilterChange = () => {
            logger.debug("Player filter changed. Performing search.");
            this.elements.modalLoadingIndicator?.classList.remove('hidden');
            this.elements.modalNoResultsIndicator?.classList.add('hidden');
            this.elements.modalSearchResultsContainer.querySelectorAll('.player-modal-content--table, .player-modal-content--message').forEach(el => el.remove());
            this.modalSearchDebounce(); // Use debounce to allow quick changes without immediate re-search
        };
        this.elements.modalPlayerTeamFilter.addEventListener('change', this._onPlayerFilterChange);
        this.elements.modalPlayerTeamFilter._listenerAttached = true;

        filterContainer.appendChild(this.elements.modalPlayerTeamFilter);
        this.elements.modalSearchResultsContainer.prepend(filterContainer);
    }

    _closeModal() {
        this.elements.modal?.classList.add('hidden');
        this.isModalOpen = false;
        this.modalSearchType = null;
        this.modalLastSearchResults = [];
        if (this.elements.modalPlayerTeamFilter && this.elements.modalPlayerTeamFilter._listenerAttached && this._onPlayerFilterChange) {
            this.elements.modalPlayerTeamFilter.removeEventListener('change', this._onPlayerFilterChange);
            delete this.elements.modalPlayerTeamFilter._listenerAttached;
            this.elements.modalPlayerTeamFilter = null; // Clear reference
        }
         // Clear search input
        if (this.elements.modalSearchInput) {
            this.elements.modalSearchInput.value = '';
        }
        // Clear results container
        if (this.elements.modalSearchResultsContainer) {
            this.elements.modalSearchResultsContainer.innerHTML = '';
        }
    }

    async _performModalSearch() {
        const searchTerm = this.elements.modalSearchInput?.value.trim() || "";
        let selectedTeamId = '';

        if (this.modalSearchType === 'player' && this.elements.modalPlayerTeamFilter) {
            selectedTeamId = this.elements.modalPlayerTeamFilter.value;
        }

        if (this.modalSearchType === 'player' && !searchTerm && !selectedTeamId) {
            this._renderModalSearchResults([]); // Will show initial prompt
            this.elements.modalLoadingIndicator?.classList.add('hidden');
            return;
        }
        if (this.modalSearchType === 'team' && !searchTerm) {
            this.elements.modalSearchResultsContainer.innerHTML = `<p class="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Start typing to search for teams.</p>`;
            this.elements.modalLoadingIndicator?.classList.add('hidden');
            this.modalLastSearchResults = [];
            return;
        }

        const apiSegment = this.modalSearchType === 'player' ? 'players' : 'teams';
        const params = { search: searchTerm };
        if (this.modalSearchType === 'player' && selectedTeamId) {
            params.team_id = selectedTeamId;
        }

        if (this.modalSearchType === 'player') {
            this.elements.modalSearchResultsContainer.querySelectorAll('.player-modal-content--table, .player-modal-content--message').forEach(el => el.remove());
        } else {
            this.elements.modalSearchResultsContainer.innerHTML = ''; // Clear for teams
        }
        this.elements.modalNoResultsIndicator?.classList.add('hidden');

        try {
            const results = await this.utils.apiCall(`/api/${apiSegment}/`, params);
            this.modalLastSearchResults = results || []; // Store full results
            this._renderModalSearchResults(this.modalLastSearchResults);
        } catch (error) {
            logger.error(`Step3: Error during modal search for ${this.modalSearchType}:`, error);
            if (this.modalSearchType === 'player') {
                const errorMsg = this._createPlayerModalMessage(`Error fetching ${this.modalSearchType}. Please try again.`, 'error');
                this.elements.modalSearchResultsContainer.appendChild(errorMsg);
            } else {
                this.elements.modalSearchResultsContainer.innerHTML = `<p class="p-4 text-sm text-red-500 dark:text-red-400 text-center">Error fetching ${this.modalSearchType}. Please try again.</p>`;
            }
            this.modalLastSearchResults = [];
        } finally {
            this.elements.modalLoadingIndicator?.classList.add('hidden');
        }
    }

    _createPlayerModalMessage(messageText, type = 'info') {
        const messageDiv = document.createElement('div');
        // Added specific class for player messages to distinguish from filter
        messageDiv.className = 'player-modal-content player-modal-content--message p-4 text-center rounded-md';
        if (type === 'error') {
            messageDiv.classList.add('bg-red-50', 'dark:bg-red-800/30', 'text-red-700', 'dark:text-red-300');
        } else { // info or prompt
            messageDiv.classList.add('bg-blue-50', 'dark:bg-blue-800/30', 'text-blue-700', 'dark:text-blue-300');
        }
        messageDiv.innerHTML = `<p class="text-sm">${messageText}</p>`;
        return messageDiv;
    }


    _renderModalSearchResults(results) {
        if (!this.elements.modalSearchResultsContainer) return;

        // Clear previous player-specific content (table or messages), not the filter
        this.elements.modalSearchResultsContainer.querySelectorAll('.player-modal-content').forEach(el => el.remove());


        if (this.modalSearchType === 'player') {
            if (results.length === 0) {
                const searchTerm = this.elements.modalSearchInput?.value.trim() || "";
                const selectedTeamId = this.elements.modalPlayerTeamFilter?.value || "";
                let message = "No players found matching your criteria.";
                if (!searchTerm && !selectedTeamId) {
                    message = "Start typing to search for players, or select a team to filter.";
                }
                const noResultsMsg = this._createPlayerModalMessage(message);
                this.elements.modalSearchResultsContainer.appendChild(noResultsMsg);
            } else {
                const table = document.createElement('table');
                // Added specific class for player table
                table.className = 'player-modal-content player-modal-content--table w-full text-sm text-left text-gray-500 dark:text-gray-400';
                const thead = document.createElement('thead');
                thead.className = 'text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
                thead.innerHTML = `
                    <tr>
                        <th scope="col" class="px-4 py-3">Player</th>
                        <th scope="col" class="px-4 py-3">Details</th>
                        <th scope="col" class="px-4 py-3 text-right">Action</th>
                    </tr>
                `;
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                results.forEach(item => {
                    const alreadyAdded = this.state.step3Data.players.some(p => p.id === item.id);
                    tbody.appendChild(this._createPlayerModalTableRow(item, alreadyAdded));
                });
                table.appendChild(tbody);
                this.elements.modalSearchResultsContainer.appendChild(table);
            }
        } else if (this.modalSearchType === 'team') {
            // Simplified rendering for teams (original list style)
            if (results.length === 0) {
                 this.elements.modalNoResultsIndicator?.classList.remove('hidden'); // Show generic no-results for teams
            } else {
                this.elements.modalNoResultsIndicator?.classList.add('hidden');
                const ul = document.createElement('ul');
                ul.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                results.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors duration-150 flex justify-between items-center';

                    const teamNameSpan = document.createElement('span');
                    teamNameSpan.textContent = item.name || 'Unnamed Team';
                    teamNameSpan.className = 'text-sm font-medium text-gray-900 dark:text-white';
                    li.appendChild(teamNameSpan);

                    const addButton = document.createElement('button');
                    addButton.type = 'button';
                    addButton.dataset.itemId = item.id;
                    addButton.dataset.itemType = 'team';

                    const alreadyAdded = this.state.step3Data.teams.some(t => t.id === item.id);
                    if (alreadyAdded) {
                        addButton.className = "px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-md cursor-default";
                        addButton.innerHTML = `<svg class="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added`;
                        addButton.disabled = true;
                    } else {
                        addButton.className = "px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors duration-150";
                        addButton.innerHTML = `<svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Add`;
                    }
                    li.appendChild(addButton);
                    ul.appendChild(li);
                });
                this.elements.modalSearchResultsContainer.appendChild(ul);
            }
        }
    }

   _createPlayerModalTableRow(item, alreadyAdded) {
        const tr = document.createElement('tr');
        tr.className = alreadyAdded ? 'opacity-60 bg-gray-50 dark:bg-gray-700/50' : 'hover:bg-blue-50 dark:hover:bg-gray-700/40 transition-colors duration-150';

        const playerCell = document.createElement('td');
        playerCell.className = 'px-4 py-3 whitespace-nowrap';
        let avatarHTML;
        if (item.image_url) {
            avatarHTML = `<img src="${item.image_url}" alt="${item.name || 'Player'}" class="w-10 h-10 rounded-full object-cover inline-block mr-3 border border-gray-200 dark:border-gray-600 shadow-sm">`;
        } else {
            const initials = this._getInitials(item.name);
            avatarHTML = `<div class="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-sm font-bold flex items-center justify-center inline-block mr-3 border border-blue-600 dark:border-blue-700 shadow-sm">${initials}</div>`;
        }
        playerCell.innerHTML = `
            <div class="flex items-center">
                ${avatarHTML}
                <div class="text-sm font-medium text-gray-900 dark:text-white">${item.name || 'N/A'}</div>
            </div>
        `;
        tr.appendChild(playerCell);

        const detailsCell = document.createElement('td');
        detailsCell.className = 'px-4 py-3 whitespace-nowrap';
        const position = item.position || 'N/A';
        const dob = item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        detailsCell.innerHTML = `
            <div>
                <div class="text-sm text-gray-700 dark:text-gray-300">${position}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${dob}</div>
            </div>
        `;
        tr.appendChild(detailsCell);

        const actionCell = document.createElement('td');
        actionCell.className = 'px-4 py-3 whitespace-nowrap text-right text-sm font-medium';
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.dataset.itemId = item.id;
        addButton.dataset.itemType = 'player';

        if (alreadyAdded) {
            addButton.className = "px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-md flex items-center cursor-default";
            addButton.innerHTML = `<svg class="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added`;
            addButton.disabled = true;
        } else {
            addButton.className = "px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md flex items-center transition-colors duration-150";
            addButton.innerHTML = `<svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Add`;
        }
        actionCell.appendChild(addButton);
        tr.appendChild(actionCell);

        return tr;
    }


    _handleModalResultClick(event) {
        const button = event.target.closest('button[data-item-id]');
        if (button && !button.disabled) {
            const itemId = button.dataset.itemId;
            const itemType = button.dataset.itemType;

            const originalItem = this._findItemInLastModalResults(itemId);

            if (originalItem) {
                this._addEntity(originalItem, itemType);
                // Re-render modal results to update button state (e.g., to "Added")
                this._renderModalSearchResults(this.modalLastSearchResults);
            } else {
                logger.warn(`Step3 _handleModalResultClick: Could not find item with ID ${itemId} in last search results.`);
            }
        }
    }

    _findItemInLastModalResults(itemId) {
        return this.modalLastSearchResults.find(item => String(item.id) === String(itemId));
    }

    _addEntity(item, type) {
        const currentList = type === 'player' ? this.state.step3Data.players : this.state.step3Data.teams;
        if (!currentList.some(existingItem => existingItem.id === item.id)) {
            currentList.push(item); // Add the full item object
            if (type === 'player') {
                this.addCardInstance.updateStep3Data('players', [...currentList]); // Update state with new array
                this._renderSelectedPlayers();
                 // If a player is added, and teams exist, refresh team filter in player modal if open
                if (this.isModalOpen && this.modalSearchType === 'player' && this.elements.modalPlayerTeamFilter) {
                    // This might be too aggressive, consider if needed or if filter updates only on open
                }
            } else { // team
                this.addCardInstance.updateStep3Data('teams', [...currentList]); // Update state with new array
                this._renderSelectedTeams();
                // If a team is added, and player modal is open, refresh its team filter
                if (this.isModalOpen && this.modalSearchType === 'player') {
                    this._setupPlayerModalFilter(); // Rebuild filter to include new team
                }
            }
            this._updateAssociationSectionVisibility();
            this._renderPlayerTeamAssociations(); // Associations might need re-render
            this.updateNextButtonState();
        }
    }

    _removeEntity(itemId, type) {
        let currentList, keyName;
        if (type === 'player') {
            currentList = this.state.step3Data.players;
            keyName = 'players';
        } else { // team
            currentList = this.state.step3Data.teams;
            keyName = 'teams';
        }

        const updatedList = currentList.filter(item => String(item.id) !== String(itemId));
        this.addCardInstance.updateStep3Data(keyName, updatedList);

        if (type === 'player') {
            this._renderSelectedPlayers();
            // Also remove associations for this player
            const newAssociations = { ...this.state.step3Data.associations };
            delete newAssociations[String(itemId)];
            this.addCardInstance.updateStep3Data('associations', newAssociations);
        } else { // team
            this._renderSelectedTeams();
            // Also remove this team from any player's associations
            const newAssociations = { ...this.state.step3Data.associations };
            Object.keys(newAssociations).forEach(playerId => {
                newAssociations[playerId] = newAssociations[playerId].filter(teamId => String(teamId) !== String(itemId));
                if (newAssociations[playerId].length === 0) {
                    delete newAssociations[playerId];
                }
            });
            this.addCardInstance.updateStep3Data('associations', newAssociations);
             // If a team is removed, and player modal is open, refresh its team filter
            if (this.isModalOpen && this.modalSearchType === 'player') {
                this._setupPlayerModalFilter(); // Rebuild filter
            }
        }

        this._updateAssociationSectionVisibility();
        this._renderPlayerTeamAssociations();
        this.updateNextButtonState();
    }

    _renderSelectedPlayers() {
        const container = this.elements.selectedPlayersContainer;
        if (!container) return;
        const players = this.state.step3Data.players;
        container.innerHTML = '';

        if (players.length === 0) {
            this.elements.noPlayersMessage?.classList.remove('hidden');
            return;
        }
        this.elements.noPlayersMessage?.classList.add('hidden');

        const fragment = document.createDocumentFragment();
        players.forEach(player => {
            const card = this._createEntityCardDOM(player, 'player');
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    _renderSelectedTeams() {
        const container = this.elements.selectedTeamsContainer;
        if (!container) return;
        const teams = this.state.step3Data.teams;
        container.innerHTML = '';

        if (teams.length === 0) {
            this.elements.noTeamsMessage?.classList.remove('hidden');
            return;
        }
        this.elements.noTeamsMessage?.classList.add('hidden');

        const fragment = document.createDocumentFragment();
        teams.forEach(team => {
            const card = this._createEntityCardDOM(team, 'team');
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    _getInitials(name) {
        if (!name || typeof name !== 'string') return '?';
        const parts = name.trim().split(' ').filter(p => p);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
    }

    _createMetadataItemHTML(label, value, itemContainerClasses = 'mt-0.5') {
        const displayValue = (value && String(value).trim() !== "") ? value : '<span class="text-gray-400 dark:text-gray-500">N/A</span>';
        return `
        <div class="${itemContainerClasses}">
            <span class="block text-xs font-medium text-gray-500 dark:text-gray-400">${label}:</span>
            <span class="block text-sm text-gray-800 dark:text-gray-300">${displayValue}</span>
        </div>
    `;
    }

    _createEntityCardDOM(item, type) {
        const div = document.createElement('div');
        div.dataset.itemId = item.id;
        div.dataset.itemType = type;
        div.className = "p-3 bg-gray-50 dark:bg-gray-700/70 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 flex items-center justify-between space-x-3";

        let avatarHTML;
        const name = item.name || (type === 'player' ? 'Unnamed Player' : 'Unnamed Team');
        const initials = this._getInitials(name);

        if (item.image_url) {
            avatarHTML = `<img src="${item.image_url}" alt="${name}" class="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-500 shadow">`;
        } else if (type === 'team' && item.logo_url) { // Specific for team logo if image_url is generic
             avatarHTML = `<img src="${item.logo_url}" alt="${name}" class="w-12 h-12 rounded-full object-contain border-2 border-white dark:border-gray-500 shadow">`;
        }
        else {
            avatarHTML = `<div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold border-2 border-white dark:border-gray-500 shadow">${initials}</div>`;
        }

        let infoHTML = `<div class="flex-grow"><p class="text-base font-semibold text-gray-800 dark:text-gray-100">${name}</p>`;
        if (type === 'player') {
            const position = item.position || null;
            const dob = item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
            infoHTML += `<div class="flex flex-wrap space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">`;
            if (position) infoHTML += `<span>Pos: ${position}</span>`;
            if (dob) infoHTML += `<span>DOB: ${dob}</span>`;
            infoHTML += `</div>`;
        } else if (type === 'team') {
            const league = item.league || null;
            const sportName = item.sport_name || item.sport?.name || null; // Assuming sport might be nested
            infoHTML += `<div class="flex flex-wrap space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">`;
            if (sportName) infoHTML += `<span>Sport: ${sportName}</span>`;
            if (league) infoHTML += `<span>League: ${league}</span>`;
            infoHTML += `</div>`;
        }
        infoHTML += `</div>`;

        const removeButtonHTML = `
            <button type="button" data-action="remove" title="Remove ${type}"
                    class="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-colors duration-150">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </button>
        `;

        div.innerHTML = avatarHTML + infoHTML + removeButtonHTML;
        return div;
    }

    _handlePlayerCardActions(event) {
        const button = event.target.closest('button[data-action="remove"]');
        if (!button) return;
        const cardElement = event.target.closest('div[data-item-id][data-item-type="player"]');
        const playerId = cardElement?.dataset.itemId;
        if (!playerId) {
            logger.warn("Step3 _handlePlayerCardActions: Player ID not found on card element for remove action.");
            return;
        }
        this._removeEntity(playerId, 'player');
    }

    _handleTeamCardActions(event) {
        const button = event.target.closest('button[data-action="remove"]');
        if (!button) return;
        const cardElement = event.target.closest('div[data-item-id][data-item-type="team"]');
        const teamId = cardElement?.dataset.itemId;
        if (teamId) {
            this._removeEntity(teamId, 'team');
        } else {
            logger.warn("Step3 _handleTeamCardActions: Team ID not found on card element for remove action.");
        }
    }

    _updateAssociationSectionVisibility() {
        const hasPlayers = this.state.step3Data.players.length > 0;
        const hasTeams = this.state.step3Data.teams.length > 0;
        this.elements.associationSection?.classList.toggle('hidden', !(hasPlayers && hasTeams));
    }

    _renderPlayerTeamAssociations() {
        const container = this.elements.associationsContainer;
        if (!container) return;
        container.innerHTML = '';

        const players = this.state.step3Data.players;
        const teams = this.state.step3Data.teams;
        const associations = this.state.step3Data.associations || {}; // Ensure associations is an object

        if (players.length === 0 || teams.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 p-3 text-center">Add at least one player and one team to create associations.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        players.forEach(player => {
            if (!player || typeof player.id === 'undefined') { // Guard against malformed player objects
                logger.warn("Step3 _renderPlayerTeamAssociations: Skipping player with missing ID.", player);
                return;
            }
            const div = document.createElement('div');
            div.className = "p-3 bg-white dark:bg-gray-700/70 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm";
            const label = document.createElement('label');
            label.htmlFor = `assoc-select-${player.id}`;
            label.className = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";
            label.textContent = `Team(s) for ${player.name || 'Unnamed Player'}:`;
            div.appendChild(label);

            const select = document.createElement('select');
            select.id = `assoc-select-${player.id}`;
            select.dataset.playerId = player.id;
            select.multiple = true;
            select.className = "block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 custom-multiselect-height";

            const playerAssociatedTeamIds = associations[String(player.id)] || [];

            teams.forEach(team => {
                 if (!team || typeof team.id === 'undefined') { // Guard against malformed team objects
                    logger.warn("Step3 _renderPlayerTeamAssociations: Skipping team with missing ID for player association.", team);
                    return;
                }
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name || 'Unnamed Team';
                if (playerAssociatedTeamIds.includes(String(team.id))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            div.appendChild(select);
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    }

    _handleAssociationChange(event) {
        const select = event.target;
        if (select && select.tagName === 'SELECT' && select.dataset.playerId) {
            const playerId = String(select.dataset.playerId); // Ensure playerId is a string for key consistency
            const selectedTeamIds = Array.from(select.selectedOptions).map(opt => String(opt.value)); // Ensure team IDs are strings

            // Create a new object for associations to ensure reactivity if state management relies on object identity change
            const newAssociations = {...(this.state.step3Data.associations || {}) };

            if (selectedTeamIds.length > 0) {
                newAssociations[playerId] = selectedTeamIds;
            } else {
                delete newAssociations[playerId];
            }
            this.addCardInstance.updateStep3Data('associations', newAssociations);
            logger.debug("Step3 Associations updated:", newAssociations);
        }
    }
}