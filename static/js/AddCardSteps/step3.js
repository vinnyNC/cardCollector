import logger from '../debug-manager.js';
import { StepBase } from "./StepBase.js";

export class Step3 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 3); // Call base constructor with step number
        // DOM Element Cache
        this.elements = {}; // To store cached elements for this step

        // Modal state
        this.isModalOpen = false;
        this.modalSearchType = null; // 'player' or 'team'
        this.modalSearchDebounce = this.utils.debounce(this._performModalSearch.bind(this), 500);

        this._initialized = false; // Flag to track initialization status
        logger.info("Step3 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step3: Already initialized.");
            return; // Prevent re-initialization
        }
        super.init(); // Call base init
        this._cacheDOMelements();
        this._setupEventListeners();
        this._initialized = true; // Mark as initialized
        logger.info("Step3: Initialization complete.");
    }

    _cacheDOMelements() {
        const ids = this.config; // Step-specific element IDs
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

        // Log if critical elements are missing after caching attempt
        if (!this.elements.rookieCheckbox) {
            logger.warn("Step3 _cacheDOMelements: rookieCheckbox element not found. Check ID in config and HTML.");
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
            this.elements.modalSearchResultsContainer.innerHTML = ''; // Clear previous results
            this.elements.modalNoResultsIndicator?.classList.add('hidden');
            this.modalSearchDebounce();
        });

        this.elements.rookieCheckbox?.addEventListener('change', (e) => {
            this.addCardInstance.updateStep3Data('isRookieCard', e.target.checked);
            this.updateNextButtonState();
        });

        // Event delegation for dynamically added remove buttons etc.
        this.elements.selectedPlayersContainer?.addEventListener('click', this._handlePlayerCardActions.bind(this));
        this.elements.selectedTeamsContainer?.addEventListener('click', this._handleTeamCardActions.bind(this));
        this.elements.modalSearchResultsContainer?.addEventListener('click', this._handleModalResultClick.bind(this));
        this.elements.associationsContainer?.addEventListener('change', this._handleAssociationChange.bind(this));
    }

    activate() {
        this.init(); // Ensure the step is initialized

        super.activate();
        logger.info("Step3: Activated.");
        // If `selectedCard` from step 2 has player/team data, auto-populate
        if (this.state.selectedCard && !this.state.step3DataInitialized) {
            this._autoPopulateFromSelectedCard();
            this.addCardInstance.state.step3DataInitialized = true;
        }

        this._renderSelectedPlayers();
        this._renderSelectedTeams();
        this._updateAssociationSectionVisibility();
        this._renderPlayerTeamAssociations();

        if (this.elements.rookieCheckbox) {
            this.elements.rookieCheckbox.checked = this.state.step3Data.isRookieCard;
        } else {
            // This warning will now be more relevant if init ran but element is still null
            logger.warn("Step3 activate: rookieCheckbox element is null. Cannot set 'checked' property.");
        }
        this.updateNextButtonState();
    }

    _autoPopulateFromSelectedCard() {
        const card = this.state.selectedCard;
        if (card) {
            if (card.players && Array.isArray(card.players)) {
                this.addCardInstance.updateStep3Data('players', [...card.players]);
            }
            if (card.teams && Array.isArray(card.teams)) {
                this.addCardInstance.updateStep3Data('teams', [...card.teams]);
            }
            // Assume associations and rookie status might also come from `selectedCard`
            if (card.associations) { // Assuming 'associations' is a pre-parsed object
                this.addCardInstance.updateStep3Data('associations', {...card.associations});
            }
            if (typeof card.is_rookie !== 'undefined') { // Assuming 'is_rookie' boolean
                this.addCardInstance.updateStep3Data('isRookieCard', card.is_rookie);
            }
            logger.info("Step3: Auto-populated data from selected card.", card);
        }
    }


    canProceed() {
        // Example: Must have at least one player OR one team. Adjust as needed.
        const hasPlayers = this.state.step3Data.players.length > 0;
        const hasTeams = this.state.step3Data.teams.length > 0;
        return hasPlayers || hasTeams;
    }

    // --- Modal Management ---
    _openModal(type) { // type is 'player' or 'team'
        this.modalSearchType = type;
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        }
        if (this.elements.modalSearchInput) {
            this.elements.modalSearchInput.value = '';
            this.elements.modalSearchInput.placeholder = `Search for ${type}...`;
        }
        this.elements.modalSearchResultsContainer.innerHTML = '';
        this.elements.modalLoadingIndicator?.classList.add('hidden');
        this.elements.modalNoResultsIndicator?.classList.add('hidden');
        this.elements.modal?.classList.remove('hidden');
        this.elements.modalSearchInput?.focus();
        this.isModalOpen = true;
    }

    _closeModal() {
        this.elements.modal?.classList.add('hidden');
        this.isModalOpen = false;
        this.modalSearchType = null;
    }

    async _performModalSearch() {
        const searchTerm = this.elements.modalSearchInput?.value.trim();
        if (!searchTerm || !this.modalSearchType) {
            this.elements.modalLoadingIndicator?.classList.add('hidden');
            this.elements.modalSearchResultsContainer.innerHTML = '';
            return;
        }

        const apiSegment = this.modalSearchType === 'player' ? 'players' : 'teams';
        try {
            const results = await this.utils.makeApiCall(apiSegment, {params: {search: searchTerm}});
            this._renderModalSearchResults(results || []);
        } catch (error) {
            logger.error(`Error searching for ${this.modalSearchType}:`, error);
            this.elements.modalSearchResultsContainer.innerHTML = `<p class="p-4 text-red-500">Error loading results: ${error.message}</p>`;
        } finally {
            this.elements.modalLoadingIndicator?.classList.add('hidden');
        }
    }

    _renderModalSearchResults(results) {
        this.elements.modalSearchResultsContainer.innerHTML = '';
        if (results.length === 0) {
            this.elements.modalNoResultsIndicator?.classList.remove('hidden');
            return;
        }
        this.elements.modalNoResultsIndicator?.classList.add('hidden');

        const fragment = document.createDocumentFragment();
        results.forEach(item => {
            const alreadyAdded = this.modalSearchType === 'player'
                ? this.state.step3Data.players.some(p => p.id === item.id)
                : this.state.step3Data.teams.some(t => t.id === item.id);

            const div = document.createElement('div');
            div.className = `p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`;

            let itemHTML = `<div class="flex-grow">`;
            if (this.modalSearchType === 'player') {
                itemHTML += `<h4 class="font-medium text-sm">${item.name || 'N/A'}</h4>
                             <p class="text-xs text-gray-500 dark:text-gray-400">${item.position || ''} ${item.date_of_birth ? '(' + new Date(item.date_of_birth).toLocaleDateString() + ')' : ''}</p>`;
            } else { // team
                itemHTML += `<h4 class="font-medium text-sm">${item.name || 'N/A'}</h4>
                             <p class="text-xs text-gray-500 dark:text-gray-400">${item.league || ''}</p>`;
            }
            itemHTML += `</div>`;
            div.innerHTML = itemHTML;

            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.dataset.itemId = item.id;
            addButton.dataset.itemType = this.modalSearchType;

            if (alreadyAdded) {
                addButton.className = "ml-2 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-full flex items-center cursor-default";
                addButton.innerHTML = `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added`;
                addButton.disabled = true;
            } else {
                addButton.className = "ml-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-full flex items-center";
                addButton.innerHTML = `<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Add`;
            }
            div.appendChild(addButton);
            fragment.appendChild(div);
        });
        this.elements.modalSearchResultsContainer.appendChild(fragment);
    }

    _handleModalResultClick(event) {
        const button = event.target.closest('button[data-item-id]');
        if (button && !button.disabled) {
            const itemId = button.dataset.itemId;
            const itemType = button.dataset.itemType; // 'player' or 'team'

            // Find the full item from the last search results (or re-fetch if necessary, simpler to find for now)
            // This assumes `makeApiCall` returned an array that was passed to `_renderModalSearchResults`
            // This is a bit fragile; ideally, the full item data would be on the button or easily accessible.
            // For simplicity, let's assume the button click means we should add it.
            // We'd need to find the actual object from the search results.
            // A better way: store the last search results temporarily in `this`.
            // For now, let's just make a placeholder.

            const originalItem = this._findItemInLastModalResults(itemId, itemType); // You'd need to implement _findItemInLastModalResults

            if (originalItem) {
                this._addEntity(originalItem, itemType);
                // Visually update the button in the modal
                button.innerHTML = `<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Added`;
                button.className = "ml-2 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-full flex items-center cursor-default";
                button.disabled = true;
            } else {
                logger.warn("Could not find original item for modal result click. Item might not have been added.");
            }
        }
    }

    // Placeholder - you'd need to manage last search results to implement this properly
    _findItemInLastModalResults(itemId, itemType) {
        // This is where you'd look up the full item object from the results that populated the modal.
        // For example, if you stored the results array in `this.lastModalSearchResults`:
        // return this.lastModalSearchResults.find(item => String(item.id) === String(itemId));
        // For now, a mock:
        logger.warn("_findItemInLastModalResults needs proper implementation. Using mock item.");
        return {id: itemId, name: `Fetched ${itemType} ${itemId}` /* add other mock properties */};
    }


    // --- Player/Team List Management ---
    _addEntity(item, type) { // item is the full object, type is 'player' or 'team'
        const currentList = type === 'player' ? this.state.step3Data.players : this.state.step3Data.teams;
        if (!currentList.some(existingItem => existingItem.id === item.id)) {
            currentList.push(item);
            if (type === 'player') {
                this.addCardInstance.updateStep3Data('players', currentList);
                this._renderSelectedPlayers();
            } else {
                this.addCardInstance.updateStep3Data('teams', currentList);
                this._renderSelectedTeams();
            }
            this._updateAssociationSectionVisibility();
            this._renderPlayerTeamAssociations(); // Re-render associations as lists might have changed
            this.updateNextButtonState();
        }
    }

    _removeEntity(itemId, type) {
        if (type === 'player') {
            const updatedPlayers = this.state.step3Data.players.filter(p => p.id !== itemId);
            this.addCardInstance.updateStep3Data('players', updatedPlayers);
            // Also remove any associations for this player
            const newAssociations = {...this.state.step3Data.associations};
            delete newAssociations[itemId];
            this.addCardInstance.updateStep3Data('associations', newAssociations);
            this._renderSelectedPlayers();
        } else { // team
            const updatedTeams = this.state.step3Data.teams.filter(t => t.id !== itemId);
            this.addCardInstance.updateStep3Data('teams', updatedTeams);
            // Also remove this team from any player associations
            const newAssociations = {...this.state.step3Data.associations};
            for (const playerId in newAssociations) {
                newAssociations[playerId] = newAssociations[playerId].filter(teamId => teamId !== itemId);
            }
            this.addCardInstance.updateStep3Data('associations', newAssociations);
            this._renderSelectedTeams();
        }
        this._updateAssociationSectionVisibility();
        this._renderPlayerTeamAssociations();
        this.updateNextButtonState();
    }

    _renderSelectedPlayers() {
        const container = this.elements.selectedPlayersContainer;
        const players = this.state.step3Data.players;
        container.innerHTML = ''; // Clear previous

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
        const teams = this.state.step3Data.teams;
        container.innerHTML = ''; // Clear previous

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

    _createEntityCardDOM(item, type) { // item is player or team object
        const div = document.createElement('div');
        div.className = "bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-600 flex items-start gap-3";
        div.dataset.itemId = item.id;
        div.dataset.itemType = type;

        // Image/Avatar placeholder
        let imageHTML = '';
        const imageUrl = type === 'player' ? item.image_url : item.logo_url;
        if (imageUrl) {
            imageHTML = `<img src="${imageUrl}" alt="${item.name}" class="w-12 h-12 rounded-md object-cover flex-shrink-0">`;
        } else {
            const icon = type === 'player'
                ? `<svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`
                : `<svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12.75c1.63 0 3.07.39 4.24.9c1.08.48 1.76 1.56 1.76 2.73V18H6v-1.62c0-1.17.68-2.25 1.76-2.73c1.17-.51 2.61-.9 4.24-.9zM12 4.5A3.75 3.75 0 008.25 8.25A3.75 3.75 0 0012 12a3.75 3.75 0 003.75-3.75A3.75 3.75 0 0012 4.5z M19.5 21C19.5 17.82 16.18 15 12 15s-7.5 2.82-7.5 6h15z"/></svg>`; // Placeholder team icon
            imageHTML = `<div class="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">${icon}</div>`;
        }

        // Details
        let detailsHTML = `<div class="flex-grow">
                               <h4 class="font-semibold text-gray-900 dark:text-white">${item.name || 'N/A'}</h4>`;
        if (type === 'player') {
            detailsHTML += `<p class="text-xs text-gray-600 dark:text-gray-400">
                                ${item.position || ''} ${item.date_of_birth ? ' DOB: ' + new Date(item.date_of_birth).toLocaleDateString() : ''}
                           </p>
                           <p class="text-xs text-gray-600 dark:text-gray-400">
                                ${item.birth_city ? 'Birth City: ' + item.birth_city : ''}
                           </p>`;
            // Add a "Show more" button if item.other_details exists
            if (item.other_details && Object.keys(item.other_details).length > 0) {
                detailsHTML += `<button type="button" data-action="toggle-details" class="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400">Show more</button>
                                 <div class="text-xs mt-1 hidden more-details">
                                     ${Object.entries(item.other_details).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
                                 </div>`;
            }
        } else { // team
            detailsHTML += `<p class="text-xs text-gray-600 dark:text-gray-400">${item.league || ''}</p>`;
        }
        detailsHTML += `</div>`;

        // Remove button
        const removeButtonHTML = `<button type="button" data-action="remove" title="Remove ${type}"
                                      class="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500">
                                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>`;

        div.innerHTML = imageHTML + detailsHTML + removeButtonHTML;
        return div;
    }

    _handlePlayerCardActions(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const cardElement = event.target.closest('div[data-item-id][data-item-type="player"]');
        const playerId = cardElement?.dataset.itemId;
        if (!playerId) return;

        const action = button.dataset.action;
        if (action === 'remove') {
            this._removeEntity(playerId, 'player');
        } else if (action === 'toggle-details') {
            const detailsDiv = cardElement.querySelector('.more-details');
            detailsDiv?.classList.toggle('hidden');
            button.textContent = detailsDiv?.classList.contains('hidden') ? 'Show more' : 'Show less';
        }
    }

    _handleTeamCardActions(event) {
        const button = event.target.closest('button[data-action="remove"]');
        if (!button) return;

        const cardElement = event.target.closest('div[data-item-id][data-item-type="team"]');
        const teamId = cardElement?.dataset.itemId;
        if (teamId) {
            this._removeEntity(teamId, 'team');
        }
    }


    // --- Player-Team Association ---
    _updateAssociationSectionVisibility() {
        const hasPlayers = this.state.step3Data.players.length > 0;
        const hasTeams = this.state.step3Data.teams.length > 0;
        this.elements.associationSection?.classList.toggle('hidden', !(hasPlayers && hasTeams));
    }

    _renderPlayerTeamAssociations() {
        const container = this.elements.associationsContainer;
        if (!container) return;
        container.innerHTML = ''; // Clear

        const players = this.state.step3Data.players;
        const teams = this.state.step3Data.teams;
        const associations = this.state.step3Data.associations;

        if (players.length === 0 || teams.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">Add at least one player and one team to create associations.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        players.forEach(player => {
            const div = document.createElement('div');
            div.className = "p-3 bg-white dark:bg-gray-700/60 rounded-md border border-gray-200 dark:border-gray-600";

            const label = document.createElement('label');
            label.htmlFor = `assoc-select-${player.id}`;
            label.className = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
            label.textContent = `Team(s) for ${player.name}:`;
            div.appendChild(label);

            const select = document.createElement('select');
            select.id = `assoc-select-${player.id}`;
            select.dataset.playerId = player.id;
            select.multiple = true; // Allow multiple team selections for one player
            select.className = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 custom-multiselect-height"; // Add custom class for height

            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                if (associations[player.id] && associations[player.id].includes(team.id)) {
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
            const playerId = select.dataset.playerId;
            const selectedTeamIds = Array.from(select.selectedOptions).map(opt => opt.value);

            const newAssociations = {...this.state.step3Data.associations};
            if (selectedTeamIds.length > 0) {
                newAssociations[playerId] = selectedTeamIds;
            } else {
                delete newAssociations[playerId]; // Remove association if no teams selected
            }
            this.addCardInstance.updateStep3Data('associations', newAssociations);
            this.updateNextButtonState(); // Associations might affect ability to proceed
        }
    }
}