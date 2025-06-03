import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step3 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 3); // Call base constructor with step number
        // DOM Element Cache
        this.elements = {}; // To store cached elements for this step

        this._initialized = false; // Flag to track initialization status
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

        this.elements.associationSection = document.getElementById(ids.PLAYER_TEAM_ASSOCIATION_SECTION);
        this.elements.associationsContainer = document.getElementById(ids.PLAYER_TEAM_ASSOCIATIONS_CONTAINER);
        this.elements.rookieCheckbox = document.getElementById(ids.ROOKIE_CARD_CHECKBOX);

        if (!this.elements.rookieCheckbox) {
            logger.warn("Step3 _cacheDOMelements: Rookie checkbox element not found.");
        }
        if (!this.elements.selectedPlayersContainer || !this.elements.selectedTeamsContainer) {
            logger.warn("Step3 _cacheDOMelements: Selected players/teams container not found.");
        }
        if (!this.elements.associationsContainer) {
            logger.warn("Step3 _cacheDOMelements: Associations container not found.");
        }
    }

    _setupEventListeners() {
        // These buttons will now likely trigger an action in AddCard.js to open external modals
        this.elements.openAddPlayerBtn?.addEventListener('click', () => {
            logger.debug("Step3: Open Add Player modal requested.");
            // Example: this.addCardInstance.requestModalOpen('player');
            // Actual implementation depends on how AddCard.js handles modal triggers
        });
        this.elements.openAddTeamBtn?.addEventListener('click', () => {
            logger.debug("Step3: Open Add Team modal requested.");
            // Example: this.addCardInstance.requestModalOpen('team');
        });

        this.elements.rookieCheckbox?.addEventListener('change', (e) => {
            this.addCardInstance.updateStep3Data('isRookieCard', e.target.checked);
            logger.debug("Step3 Rookie card checkbox changed:", e.target.checked);
        });

        this.elements.selectedPlayersContainer?.addEventListener('click', this._handlePlayerCardActions.bind(this));
        this.elements.selectedTeamsContainer?.addEventListener('click', this._handleTeamCardActions.bind(this));
        this.elements.associationsContainer?.addEventListener('change', this._handleAssociationChange.bind(this));
    }

    activate() {
        this.init(); // Ensures DOM elements are cached and listeners are set up
        super.activate();
        logger.info("Step3: Activated.");

        if (this.state.selectedCard && !this.state.step3DataInitialized) {
            this._autoPopulateFromSelectedCard();
            if (this.addCardInstance) {
                this.addCardInstance.state.step3DataInitialized = true;
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

            this.addCardInstance.updateStep3Data('players', []);
            this.addCardInstance.updateStep3Data('teams', []);
            this.addCardInstance.updateStep3Data('associations', {});

            if (card.player && typeof card.player === 'object' && card.player.id && card.player.name) {
                const playerToAdd = {...card.player};
                this.addEntity(playerToAdd, 'player'); // Changed to public method
                logger.info(`Step3: Auto-populated player ${playerToAdd.name} from selected card.`);
            }

            if (card.team && typeof card.team === 'object' && card.team.id && card.team.name) {
                const teamToAdd = {...card.team};
                this.addEntity(teamToAdd, 'team'); // Changed to public method
                logger.info(`Step3: Auto-populated team ${teamToAdd.name} from selected card.`);
            }

            if (card.player && typeof card.player === 'object' && card.player.id &&
                card.team && typeof card.team === 'object' && card.team.id) {
                const currentAssociations = {...this.state.step3Data.associations};
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

    // Public method to be called when an entity is selected from an external modal
    addEntity(item, type) {
        if (!item || typeof item.id === 'undefined') {
            logger.warn(`Step3 addEntity: Invalid item provided for type ${type}.`, item);
            return;
        }
        const currentList = type === 'player' ? this.state.step3Data.players : this.state.step3Data.teams;
        if (!currentList.some(existingItem => existingItem.id === item.id)) {
            currentList.push(item);
            if (type === 'player') {
                this.addCardInstance.updateStep3Data('players', [...currentList]);
                this._renderSelectedPlayers();
            } else { // team
                this.addCardInstance.updateStep3Data('teams', [...currentList]);
                this._renderSelectedTeams();
            }
            this._updateAssociationSectionVisibility();
            this._renderPlayerTeamAssociations();
            this.updateNextButtonState();
            logger.info(`Step3: Added ${type} ${item.name || item.id}`);
        } else {
            logger.debug(`Step3 addEntity: ${type} ${item.name || item.id} already exists.`);
        }
    }

    // Renamed from _removeEntity for consistency if it needs to be called externally,
    // but primarily used by internal event handlers. Kept as _removeEntity for now.
    _removeEntity(itemId, type) {
        let currentList, keyName;
        if (type === 'player') {
            currentList = this.state.step3Data.players;
            keyName = 'players';
        } else { // team
            currentList = this.state.step3Data.teams;
            keyName = 'teams';
        }

        const itemToRemove = currentList.find(item => String(item.id) === String(itemId));
        const updatedList = currentList.filter(item => String(item.id) !== String(itemId));
        this.addCardInstance.updateStep3Data(keyName, updatedList);

        if (type === 'player') {
            this._renderSelectedPlayers();
            const newAssociations = {...this.state.step3Data.associations};
            delete newAssociations[String(itemId)];
            this.addCardInstance.updateStep3Data('associations', newAssociations);
        } else { // team
            this._renderSelectedTeams();
            const newAssociations = {...this.state.step3Data.associations};
            Object.keys(newAssociations).forEach(playerId => {
                newAssociations[playerId] = newAssociations[playerId].filter(teamId => String(teamId) !== String(itemId));
                if (newAssociations[playerId].length === 0) {
                    delete newAssociations[playerId];
                }
            });
            this.addCardInstance.updateStep3Data('associations', newAssociations);
        }

        this._updateAssociationSectionVisibility();
        this._renderPlayerTeamAssociations();
        this.updateNextButtonState();
        logger.info(`Step3: Removed ${type} ID ${itemId}${itemToRemove ? ` (${itemToRemove.name})` : ''}`);
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
        } else if (type === 'team' && item.logo_url) {
            avatarHTML = `<img src="${item.logo_url}" alt="${name}" class="w-12 h-12 rounded-full object-contain border-2 border-white dark:border-gray-500 shadow">`;
        } else {
            avatarHTML = `<div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold border-2 border-white dark:border-gray-500 shadow">${initials}</div>`;
        }

        let infoHTML = `<div class="flex-grow min-w-0"><p class="text-base font-semibold text-gray-800 dark:text-gray-100 truncate" title="${name}">${name}</p>`;
        if (type === 'player') {
            const position = item.position || null;
            const dob = item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : null;
            infoHTML += `<div class="flex flex-wrap space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">`;
            if (position) infoHTML += `<span>Pos: ${position}</span>`;
            if (dob) infoHTML += `<span>DOB: ${dob}</span>`;
            infoHTML += `</div>`;
        } else if (type === 'team') {
            const league = item.league || null;
            const sportName = item.sport_name || item.sport?.name || null;
            infoHTML += `<div class="flex flex-wrap space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">`;
            if (sportName) infoHTML += `<span>Sport: ${sportName}</span>`;
            if (league) infoHTML += `<span>League: ${league}</span>`;
            infoHTML += `</div>`;
        }
        infoHTML += `</div>`;

        const removeButtonHTML = `
            <button type="button" data-action="remove" title="Remove ${type}"
                    class="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-colors duration-150">
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
        const associations = this.state.step3Data.associations || {};

        if (players.length === 0 || teams.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 p-3 text-center">Add at least one player and one team to create associations.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        players.forEach(player => {
            if (!player || typeof player.id === 'undefined') {
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
            // Added custom-multiselect-height for better default height with TomSelect/Choices.js or similar
            select.className = "block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 custom-multiselect-height";

            const playerAssociatedTeamIds = associations[String(player.id)] || [];

            teams.forEach(team => {
                if (!team || typeof team.id === 'undefined') {
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
        // It's often good practice to initialize any JS-based select enhancement libraries here
        // e.g., if using TomSelect:
        // players.forEach(player => {
        //     const selectEl = container.querySelector(`#assoc-select-${player.id}`);
        //     if (selectEl) new TomSelect(selectEl, { plugins: ['remove_button'] });
        // });
    }

    _handleAssociationChange(event) {
        const select = event.target;
        if (select && select.tagName === 'SELECT' && select.dataset.playerId) {
            const playerId = String(select.dataset.playerId);
            const selectedTeamIds = Array.from(select.selectedOptions).map(opt => String(opt.value));

            const newAssociations = {...(this.state.step3Data.associations || {})};

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