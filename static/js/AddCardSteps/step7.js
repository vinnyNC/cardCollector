import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step7 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 7);

        // DOM Element Cache
        this.elements = {};
        this._initialized = false;

        // Track receipt file data
        this.receiptData = null;

        logger.info("Step7 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step7: Already initialized.");
            return;
        }

        super.init();
        this._cacheDOMElements();
        this._setupEventListeners();
        this._initialized = true;

        logger.info("Step7: Initialization complete.");
    }

    _cacheDOMElements() {
        // Cache DOM elements for better performance and cleaner code
        this.elements.whereBought = document.getElementById('whereBought');
        this.elements.orderNumber = document.getElementById('orderNumber');
        this.elements.datePurchased = document.getElementById('datePurchased');
        this.elements.valuePaid = document.getElementById('valuePaid');
        this.elements.currentValueEstimate = document.getElementById('currentValueEstimate');
        this.elements.receipt = document.getElementById('receipt');
        this.elements.receiptPreview = document.getElementById('receiptPreview');
        this.elements.receiptFileName = document.getElementById('receiptFileName');
        this.elements.deleteReceiptBtn = document.getElementById('deleteReceiptBtn');
        this.elements.purchaseNotes = document.getElementById('purchaseNotes');

        // Log any missing elements
        if (!this.elements.whereBought) {
            logger.warn("Step7 _cacheDOMElements: Where bought input element not found.");
        }
        if (!this.elements.datePurchased) {
            logger.warn("Step7 _cacheDOMElements: Date purchased input element not found.");
        }
        if (!this.elements.receipt) {
            logger.warn("Step7 _cacheDOMElements: Receipt file input element not found.");
        }
    }

    _setupEventListeners() {
        // Set up event listeners for form elements

        // Input fields for validation
        const inputFields = [
            this.elements.whereBought,
            this.elements.orderNumber,
            this.elements.datePurchased,
            this.elements.valuePaid,
            this.elements.currentValueEstimate,
            this.elements.purchaseNotes
        ];

        inputFields.forEach(element => {
            if (element) {
                element.addEventListener('input', this._validateStep.bind(this));
            }
        });

        // Receipt file input
        if (this.elements.receipt) {
            this.elements.receipt.addEventListener('change', this._handleReceiptChange.bind(this));
        }

        // Delete receipt button
        if (this.elements.deleteReceiptBtn) {
            this.elements.deleteReceiptBtn.addEventListener('click', this._deleteReceipt.bind(this));
        }

        logger.debug("Step7: Event listeners setup complete.");
    }

    activate() {
        this.init(); // Ensure initialization
        super.activate();

        // Populate form with existing data if available
        this._populateFormFromState();

        // Validate the step to update next button state
        this._validateStep();

        logger.info("Step7: Activated and form populated.");
    }

    deactivate() {
        super.deactivate();

        // Save form data to state before leaving
        this._saveFormDataToState();

        logger.info("Step7: Deactivated and form data saved.");
    }

    _populateFormFromState() {
        // Populate form fields from state if data exists
        const formData = this.state.formData || {};

        // Text inputs
        const textInputMap = {
            'whereBought': 'whereBought',
            'orderNumber': 'orderNumber',
            'valuePaid': 'valuePaid',
            'currentValueEstimate': 'currentValueEstimate',
            'purchaseNotes': 'purchaseNotes'
        };

        Object.entries(textInputMap).forEach(([elementKey, dataKey]) => {
            const element = this.elements[elementKey];
            if (element && formData[dataKey] !== undefined) {
                element.value = formData[dataKey];
            }
        });

        // Date purchased
        if (this.elements.datePurchased && formData.datePurchased) {
            this.elements.datePurchased.value = formData.datePurchased;
        }

        // Receipt file
        if (formData.receiptData) {
            this.receiptData = formData.receiptData;
            this._updateReceiptPreview(formData.receiptData.name);
        }

        logger.debug("Step7: Form populated from state data.");
    }

    _saveFormDataToState() {
        // Save form data to state
        const formData = this.state.formData || {};

        // Text inputs
        const textInputMap = {
            'whereBought': 'whereBought',
            'orderNumber': 'orderNumber',
            'valuePaid': 'valuePaid',
            'currentValueEstimate': 'currentValueEstimate',
            'purchaseNotes': 'purchaseNotes'
        };

        Object.entries(textInputMap).forEach(([elementKey, dataKey]) => {
            const element = this.elements[elementKey];
            if (element) {
                formData[dataKey] = element.value;
            }
        });

        // Date purchased
        if (this.elements.datePurchased) {
            formData.datePurchased = this.elements.datePurchased.value;
        }

        // Receipt file
        formData.receiptData = this.receiptData;

        // Update state with form data
        this.addCardInstance.updateFormData(formData);

        logger.debug("Step7: Form data saved to state.");
    }

    _handleReceiptChange(event) {
        const file = event.target.files[0];

        if (file) {
            logger.debug("Step7: Receipt file selected:", {
                name: file.name,
                type: file.type,
                size: `${(file.size / 1024).toFixed(2)} KB`
            });

            // Validate file type
            if (file.type !== 'application/pdf') {
                logger.warn("Step7: Invalid file type for receipt:", file.type);
                alert('Please select a PDF file for the receipt.');
                event.target.value = ''; // Clear the input
                return;
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                logger.warn("Step7: File too large for receipt:", `${(file.size / 1024 / 1024).toFixed(2)} MB`);
                alert('Receipt file is too large. Please select a file smaller than 10MB.');
                event.target.value = ''; // Clear the input
                return;
            }

            // Read the file
            const reader = new FileReader();

            reader.onload = (e) => {
                this.receiptData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                };

                this._updateReceiptPreview(file.name);
                this._validateStep();

                logger.debug("Step7: Receipt file loaded.");
            };

            reader.onerror = (error) => {
                logger.error("Step7: Error reading receipt file:", error);
                alert('Error reading the receipt file. Please try again.');
            };

            reader.readAsDataURL(file);
        } else {
            // No file selected (or file selection canceled)
            this.receiptData = null;
            this._updateReceiptPreview(null);
            this._validateStep();

            logger.debug("Step7: No receipt file selected or selection canceled.");
        }
    }

    _updateReceiptPreview(fileName) {
        if (this.elements.receiptPreview && this.elements.receiptFileName && this.elements.deleteReceiptBtn) {
            if (fileName) {
                this.elements.receiptFileName.textContent = `Receipt uploaded: ${fileName}`;
                this.elements.receiptPreview.classList.remove('hidden');
                this.elements.deleteReceiptBtn.classList.remove('hidden');
            } else {
                this.elements.receiptPreview.classList.add('hidden');
                this.elements.deleteReceiptBtn.classList.add('hidden');
            }
        }
    }

    _deleteReceipt() {
        logger.debug("Step7: Deleting receipt file.");

        // Clear the file input
        if (this.elements.receipt) {
            this.elements.receipt.value = '';
        }

        // Clear the receipt data
        this.receiptData = null;

        // Update the UI
        this._updateReceiptPreview(null);

        // Validate step after receipt deletion
        this._validateStep();
    }

    _validateStep() {
        // Validate the form fields
        let isValid = true;

        // Required fields: whereBought, datePurchased, valuePaid
        if (this.elements.whereBought && !this.elements.whereBought.value.trim()) {
            isValid = false;
        }

        if (this.elements.datePurchased && !this.elements.datePurchased.value) {
            isValid = false;
        }

        if (this.elements.valuePaid && !this.elements.valuePaid.value) {
            isValid = false;
        }

        // Update next button state
        this.updateNextButtonState(isValid);

        return isValid;
    }

    updateNextButtonState(isValid) {
        // Override the base method to use our validation result
        const btnNext = document.getElementById(this.globalConfig.ELEMENT_IDS.NEXT_BUTTON);
        if (!btnNext) return;

        // If isValid is not provided, run validation
        const enableNext = isValid !== undefined ? isValid : this._validateStep();

        btnNext.disabled = !enableNext;
        logger.debug(`Step7: Next button ${enableNext ? 'enabled' : 'disabled'}.`);
    }
}
