import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step8 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 8);

        // DOM Element Cache
        this.elements = {};
        this._initialized = false;

        logger.info("Step8 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step8: Already initialized.");
            return;
        }

        super.init();
        this._cacheDOMElements();
        this._setupEventListeners();
        this._initialized = true;

        logger.info("Step8: Initialization complete.");
    }

    _cacheDOMElements() {
        // Cache DOM elements for better performance and cleaner code

        // Review section elements
        this.elements.reviewFrontImage = document.getElementById('reviewFrontImage');
        this.elements.reviewBackImage = document.getElementById('reviewBackImage');
        this.elements.noFrontImageMsg = document.getElementById('noFrontImageMsg');
        this.elements.noBackImageMsg = document.getElementById('noBackImageMsg');

        // Card details elements
        this.elements.reviewSet = document.getElementById('reviewSet');
        this.elements.reviewCardNum = document.getElementById('reviewCardNum');
        this.elements.reviewPlayerName = document.getElementById('reviewPlayerName');
        this.elements.reviewTeamName = document.getElementById('reviewTeamName');
        this.elements.reviewCardAttributes = document.getElementById('reviewCardAttributes');

        // Condition elements
        this.elements.reviewGradedInfo = document.getElementById('reviewGradedInfo');
        this.elements.reviewGradingCompany = document.getElementById('reviewGradingCompany');
        this.elements.reviewGradedValue = document.getElementById('reviewGradedValue');
        this.elements.reviewSubGradesContainer = document.getElementById('reviewSubGradesContainer');
        this.elements.reviewSubGrades = document.getElementById('reviewSubGrades');
        this.elements.reviewRawConditionInfo = document.getElementById('reviewRawConditionInfo');
        this.elements.reviewRawCondition = document.getElementById('reviewRawCondition');

        // Storage elements
        this.elements.reviewStorageLocation = document.getElementById('reviewStorageLocation');
        this.elements.reviewHolderType = document.getElementById('reviewHolderType');

        // Purchase elements
        this.elements.reviewWhereBought = document.getElementById('reviewWhereBought');
        this.elements.reviewDatePurchased = document.getElementById('reviewDatePurchased');
        this.elements.reviewValuePaid = document.getElementById('reviewValuePaid');
        this.elements.reviewReceipt = document.getElementById('reviewReceipt');

        // Submit button
        this.elements.submitCardButton = document.getElementById('submitCardButton');

        // Log any missing elements
        if (!this.elements.reviewFrontImage) {
            logger.warn("Step8 _cacheDOMElements: Review front image element not found.");
        }
        if (!this.elements.reviewSet) {
            logger.warn("Step8 _cacheDOMElements: Review set element not found.");
        }
        if (!this.elements.submitCardButton) {
            logger.warn("Step8 _cacheDOMElements: Submit card button not found.");
        }
    }

    _setupEventListeners() {
        // Set up event listeners for form elements

        // Submit button
        if (this.elements.submitCardButton) {
            this.elements.submitCardButton.addEventListener('click', this._handleSubmit.bind(this));
        }

        logger.debug("Step8: Event listeners setup complete.");
    }

    activate() {
        this.init(); // Ensure initialization
        super.activate();

        // Populate review with data from all previous steps
        this._populateReviewFromState();

        logger.info("Step8: Activated and review populated.");
    }

    deactivate() {
        super.deactivate();
        logger.info("Step8: Deactivated.");
    }

    _populateReviewFromState() {
        // Populate review fields from state data
        const formData = this.state.formData || {};

        // Set information
        if (this.state.selectedSet) {
            if (this.elements.reviewSet) {
                this.elements.reviewSet.textContent = this.state.selectedSet.name || '-';
            }
        }

        // Card information
        if (this.state.selectedCard) {
            if (this.elements.reviewCardNum) {
                this.elements.reviewCardNum.textContent = this.state.selectedCard.cardNumber || this.state.selectedCard.card_number || '-';
            }

            if (this.elements.reviewPlayerName) {
                this.elements.reviewPlayerName.textContent = this.state.selectedCard.playerName || this.state.selectedCard.player_name || '-';
            }

            if (this.elements.reviewTeamName && this.state.selectedCard.team) {
                this.elements.reviewTeamName.textContent = this.state.selectedCard.team.name || '-';
            }
        }

        // Step 3 data (Players/Teams)
        if (this.state.step3Data) {
            // Player name from step3Data if available
            if (this.elements.reviewPlayerName && this.state.step3Data.players && this.state.step3Data.players.length > 0) {
                const playerNames = this.state.step3Data.players.map(player => player.name).join(', ');
                this.elements.reviewPlayerName.textContent = playerNames || '-';
            }

            // Team name from step3Data if available
            if (this.elements.reviewTeamName && this.state.step3Data.teams && this.state.step3Data.teams.length > 0) {
                const teamNames = this.state.step3Data.teams.map(team => team.name).join(', ');
                this.elements.reviewTeamName.textContent = teamNames || '-';
            }

            // Rookie card attribute
            if (this.state.step3Data.isRookieCard) {
                this._addAttributeBadge('Rookie Card', 'blue');
            }
        }

        // Card attributes
        this._populateCardAttributes(formData);

        // Condition information
        this._populateConditionInfo(formData);

        // Storage information
        this._populateStorageInfo(formData);

        // Purchase information
        this._populatePurchaseInfo(formData);

        // Images
        this._populateImages(formData);

        logger.debug("Step8: Review populated from state data.");
    }

    _populateCardAttributes(formData) {
        // Clear existing attributes
        if (this.elements.reviewCardAttributes) {
            this.elements.reviewCardAttributes.innerHTML = '';

            // Add attributes based on form data
            if (formData.attribute_autograph) {
                this._addAttributeBadge('Autograph', 'red');
            }

            if (formData.parallel) {
                const parallelDetail = formData.parallelDetail || '';
                this._addAttributeBadge(parallelDetail || 'Parallel', 'green');
            }

            if (formData.insert) {
                const insertDetail = formData.insertDetail || '';
                this._addAttributeBadge(insertDetail || 'Insert', 'purple');
            }

            if (formData.cardSerialNum) {
                const cardSerial = formData.cardSerial || '';
                const cardSerialMax = formData.cardSerialMax || '';
                if (cardSerial && cardSerialMax) {
                    this._addAttributeBadge(`Serial #${cardSerial}/${cardSerialMax}`, 'yellow');
                } else {
                    this._addAttributeBadge('Serial Numbered', 'yellow');
                }
            }
        }
    }

    _populateConditionInfo(formData) {
        // Condition information
        const isGraded = formData.graded;

        if (this.elements.reviewGradedInfo && this.elements.reviewRawConditionInfo) {
            // Show/hide appropriate sections
            this.elements.reviewGradedInfo.classList.toggle('hidden', !isGraded);
            this.elements.reviewRawConditionInfo.classList.toggle('hidden', isGraded);

            if (isGraded) {
                // Graded info
                if (this.elements.reviewGradingCompany) {
                    this.elements.reviewGradingCompany.textContent = formData.gradingCompany || '-';
                }

                if (this.elements.reviewGradedValue) {
                    this.elements.reviewGradedValue.textContent = formData.gradedValue || '-';
                }

                // Sub grades
                if (this.elements.reviewSubGradesContainer && this.elements.reviewSubGrades) {
                    const hasSubGrades = formData.cardSubGrades;
                    this.elements.reviewSubGradesContainer.classList.toggle('hidden', !hasSubGrades);

                    if (hasSubGrades) {
                        this.elements.reviewSubGrades.innerHTML = '';

                        const subGradeFields = [
                            { field: 'cardSubGradesCentering', label: 'Centering' },
                            { field: 'cardSubGradesCorners', label: 'Corners' },
                            { field: 'cardSubGradesEdges', label: 'Edges' },
                            { field: 'cardSubGradesSurface', label: 'Surface' }
                        ];

                        subGradeFields.forEach(sg => {
                            if (formData[sg.field]) {
                                const div = document.createElement('div');
                                div.className = 'text-center';
                                div.innerHTML = `
                                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400">${sg.label}</p>
                                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">${formData[sg.field]}</p>
                                `;
                                this.elements.reviewSubGrades.appendChild(div);
                            }
                        });
                    }
                }
            } else {
                // Raw condition
                if (this.elements.reviewRawCondition) {
                    this.elements.reviewRawCondition.textContent = formData.rawCondition || '-';
                }
            }
        }
    }

    _populateStorageInfo(formData) {
        // Storage information
        if (this.elements.reviewStorageLocation) {
            this.elements.reviewStorageLocation.textContent = formData.storageLocation || '-';
        }

        if (this.elements.reviewHolderType) {
            const holderTypes = [];

            if (formData.holderTypeRaw) holderTypes.push('Raw');
            if (formData.holderTypePennySleeve) holderTypes.push('Penny Sleeve');
            if (formData.holderTypeTopLoader) holderTypes.push('Top Loader');
            if (formData.holderTypeMagnetic) holderTypes.push('Magnetic');
            if (formData.holderTypeGraded) holderTypes.push('Graded Slab');
            if (formData.holderTypeOther) {
                if (formData.otherHolderTypeDetail) {
                    holderTypes.push(formData.otherHolderTypeDetail);
                } else {
                    holderTypes.push('Other');
                }
            }

            this.elements.reviewHolderType.textContent = holderTypes.length > 0 ? holderTypes.join(', ') : '-';
        }
    }

    _populatePurchaseInfo(formData) {
        // Purchase information
        if (this.elements.reviewWhereBought) {
            this.elements.reviewWhereBought.textContent = formData.whereBought || '-';
        }

        if (this.elements.reviewDatePurchased) {
            this.elements.reviewDatePurchased.textContent = formData.datePurchased || '-';
        }

        if (this.elements.reviewValuePaid) {
            this.elements.reviewValuePaid.textContent = formData.valuePaid ? `$${formData.valuePaid}` : '-';
        }

        if (this.elements.reviewReceipt) {
            this.elements.reviewReceipt.textContent = formData.receiptData ? 'Uploaded' : 'None';
        }
    }

    _populateImages(formData) {
        // Images
        if (this.elements.reviewFrontImage && this.elements.noFrontImageMsg) {
            if (formData.frontImageData) {
                this.elements.reviewFrontImage.src = formData.frontImageData;
                this.elements.reviewFrontImage.classList.remove('hidden');
                this.elements.noFrontImageMsg.classList.add('hidden');
            } else {
                this.elements.reviewFrontImage.classList.add('hidden');
                this.elements.noFrontImageMsg.classList.remove('hidden');
            }
        }

        if (this.elements.reviewBackImage && this.elements.noBackImageMsg) {
            if (formData.backImageData) {
                this.elements.reviewBackImage.src = formData.backImageData;
                this.elements.reviewBackImage.classList.remove('hidden');
                this.elements.noBackImageMsg.classList.add('hidden');
            } else {
                this.elements.reviewBackImage.classList.add('hidden');
                this.elements.noBackImageMsg.classList.remove('hidden');
            }
        }
    }

    _addAttributeBadge(text, color) {
        if (!this.elements.reviewCardAttributes) return;

        const badge = document.createElement('span');
        let colorClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

        switch (color) {
            case 'blue':
                colorClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                break;
            case 'red':
                colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                break;
            case 'green':
                colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                break;
            case 'yellow':
                colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                break;
            case 'purple':
                colorClasses = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
                break;
        }

        badge.className = `px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} mr-2 mb-2 inline-block`;
        badge.textContent = text;
        this.elements.reviewCardAttributes.appendChild(badge);
    }

    _handleSubmit(event) {
        event.preventDefault();

        logger.info("Step8: Submit button clicked. Preparing to submit card data.");

        // Collect all data from state
        const cardData = {
            set: this.state.selectedSet,
            card: this.state.selectedCard,
            step3Data: this.state.step3Data,
            formData: this.state.formData
        };

        // Log the data being submitted
        logger.debug("Step8: Card data being submitted:", cardData);

        // Here you would typically make an API call to submit the data
        // For now, we'll just show a success message
        alert("Card successfully added to your collection!");

        // Optionally, redirect to the collection page or reset the form
        // window.location.href = '/collection';

        logger.info("Step8: Card submission complete.");
    }

    updateNextButtonState() {
        // Override the base method - in the final step, we don't need to validate
        // since the submit button is separate from the next/prev navigation
        const btnNext = document.getElementById(this.globalConfig.ELEMENT_IDS.NEXT_BUTTON);
        if (!btnNext) return;

        // Always disable the next button on the final step
        btnNext.disabled = true;
        logger.debug("Step8: Next button disabled (final step).");
    }
}
