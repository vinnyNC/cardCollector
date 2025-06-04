import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step5 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 5);

        // DOM Element Cache
        this.elements = {};
        this._initialized = false;

        logger.info("Step5 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step5: Already initialized.");
            return;
        }

        super.init();
        this._cacheDOMElements();
        this._setupEventListeners();
        this._initialized = true;

        logger.info("Step5: Initialization complete.");
    }

    _cacheDOMElements() {
        // Cache DOM elements for better performance and cleaner code
        this.elements.storageLocation = document.getElementById('storageLocation');
        this.elements.storageNotes = document.getElementById('storageNotes');

        // Holder type checkboxes
        this.elements.holderTypeRaw = document.getElementById('holderTypeRaw');
        this.elements.holderTypePennySleeve = document.getElementById('holderTypePennySleeve');
        this.elements.holderTypeTopLoader = document.getElementById('holderTypeTopLoader');
        this.elements.holderTypeMagnetic = document.getElementById('holderTypeMagnetic');
        this.elements.holderTypeGraded = document.getElementById('holderTypeGraded');
        this.elements.holderTypeOther = document.getElementById('holderTypeOther');
        this.elements.otherHolderTypeDetail = document.getElementById('otherHolderTypeDetail');
        this.elements.otherHolderTypeContainer = document.getElementById('otherHolderTypeContainer');

        // Log any missing elements
        if (!this.elements.storageLocation) {
            logger.warn("Step5 _cacheDOMElements: Storage location element not found.");
        }
        if (!this.elements.holderTypeRaw) {
            logger.warn("Step5 _cacheDOMElements: Holder type Raw checkbox not found.");
        }
    }

    _setupEventListeners() {
        // Set up event listeners for form elements

        // Storage location input
        if (this.elements.storageLocation) {
            this.elements.storageLocation.addEventListener('input', this._validateStep.bind(this));
        }

        // Storage notes textarea
        if (this.elements.storageNotes) {
            this.elements.storageNotes.addEventListener('input', this._validateStep.bind(this));
        }

        // Other holder type checkbox
        if (this.elements.holderTypeOther) {
            this.elements.holderTypeOther.addEventListener('change', this._handleOtherHolderTypeChange.bind(this));
        }

        // Other holder type detail input
        if (this.elements.otherHolderTypeDetail) {
            this.elements.otherHolderTypeDetail.addEventListener('input', this._validateStep.bind(this));
        }

        // Add change event listeners to all holder type checkboxes for validation
        const holderTypeCheckboxes = [
            this.elements.holderTypeRaw,
            this.elements.holderTypePennySleeve,
            this.elements.holderTypeTopLoader,
            this.elements.holderTypeMagnetic,
            this.elements.holderTypeGraded,
            this.elements.holderTypeOther
        ];

        holderTypeCheckboxes.forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', this._validateStep.bind(this));
            }
        });

        logger.debug("Step5: Event listeners setup complete.");
    }

    activate() {
        this.init(); // Ensure initialization
        super.activate();

        // Populate form with existing data if available
        this._populateFormFromState();

        // Update UI based on current state
        this._updateOtherHolderTypeVisibility();

        // Validate the step to update next button state
        this._validateStep();

        logger.info("Step5: Activated and form populated.");
    }

    deactivate() {
        super.deactivate();

        // Save form data to state before leaving
        this._saveFormDataToState();

        logger.info("Step5: Deactivated and form data saved.");
    }

    _populateFormFromState() {
        // Populate form fields from state if data exists
        const formData = this.state.formData || {};

        // Storage location
        if (this.elements.storageLocation && formData.storageLocation) {
            this.elements.storageLocation.value = formData.storageLocation;
        }

        // Storage notes
        if (this.elements.storageNotes && formData.storageNotes) {
            this.elements.storageNotes.value = formData.storageNotes;
        }

        // Holder types
        const holderTypeMap = {
            'holderTypeRaw': 'holderTypeRaw',
            'holderTypePennySleeve': 'holderTypePennySleeve',
            'holderTypeTopLoader': 'holderTypeTopLoader',
            'holderTypeMagnetic': 'holderTypeMagnetic',
            'holderTypeGraded': 'holderTypeGraded',
            'holderTypeOther': 'holderTypeOther'
        };

        Object.entries(holderTypeMap).forEach(([elementKey, dataKey]) => {
            const element = this.elements[elementKey];
            if (element && formData[dataKey] !== undefined) {
                element.checked = formData[dataKey];
            }
        });

        // Other holder type detail
        if (this.elements.otherHolderTypeDetail && formData.otherHolderTypeDetail) {
            this.elements.otherHolderTypeDetail.value = formData.otherHolderTypeDetail;
        }

        logger.debug("Step5: Form populated from state data.");
    }

    _saveFormDataToState() {
        // Save form data to state
        const formData = this.state.formData || {};

        // Storage location
        if (this.elements.storageLocation) {
            formData.storageLocation = this.elements.storageLocation.value;
        }

        // Storage notes
        if (this.elements.storageNotes) {
            formData.storageNotes = this.elements.storageNotes.value;
        }

        // Holder types
        const holderTypeMap = {
            'holderTypeRaw': 'holderTypeRaw',
            'holderTypePennySleeve': 'holderTypePennySleeve',
            'holderTypeTopLoader': 'holderTypeTopLoader',
            'holderTypeMagnetic': 'holderTypeMagnetic',
            'holderTypeGraded': 'holderTypeGraded',
            'holderTypeOther': 'holderTypeOther'
        };

        Object.entries(holderTypeMap).forEach(([elementKey, dataKey]) => {
            const element = this.elements[elementKey];
            if (element) {
                formData[dataKey] = element.checked;
            }
        });

        // Other holder type detail
        if (this.elements.otherHolderTypeDetail) {
            formData.otherHolderTypeDetail = this.elements.otherHolderTypeDetail.value;
        }

        // Update state with form data
        this.addCardInstance.updateFormData(formData);

        logger.debug("Step5: Form data saved to state.");
    }

    _handleOtherHolderTypeChange(event) {
        const showOtherDetail = event.target.checked;
        this._updateOtherHolderTypeVisibility(showOtherDetail);
        this._validateStep();

        logger.debug(`Step5: Other holder type visibility changed to ${showOtherDetail}`);
    }

    _updateOtherHolderTypeVisibility(showOtherDetail) {
        // If showOtherDetail is not provided, use the checkbox value
        const display = showOtherDetail !== undefined ? showOtherDetail : 
                       (this.elements.holderTypeOther ? this.elements.holderTypeOther.checked : false);

        if (this.elements.otherHolderTypeContainer) {
            this.elements.otherHolderTypeContainer.classList.toggle('hidden', !display);
        }
    }

    _validateStep() {
        // Validate the form fields
        let isValid = true;

        // Check if at least one holder type is selected
        const holderTypeCheckboxes = [
            this.elements.holderTypeRaw,
            this.elements.holderTypePennySleeve,
            this.elements.holderTypeTopLoader,
            this.elements.holderTypeMagnetic,
            this.elements.holderTypeGraded,
            this.elements.holderTypeOther
        ];

        const hasHolderType = holderTypeCheckboxes.some(checkbox => checkbox && checkbox.checked);

        if (!hasHolderType) {
            isValid = false;
        }

        // If "Other" holder type is selected, validate the detail field
        const hasOtherHolderType = this.elements.holderTypeOther && this.elements.holderTypeOther.checked;
        if (hasOtherHolderType && this.elements.otherHolderTypeDetail && !this.elements.otherHolderTypeDetail.value.trim()) {
            isValid = false;
        }

        // Storage location is required
        if (this.elements.storageLocation && !this.elements.storageLocation.value.trim()) {
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
        logger.debug(`Step5: Next button ${enableNext ? 'enabled' : 'disabled'}.`);
    }
}
