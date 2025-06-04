import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step4 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 4);

        // DOM Element Cache
        this.elements = {};
        this._initialized = false;

        logger.info("Step4 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step4: Already initialized.");
            return;
        }

        super.init();
        this._cacheDOMElements();
        this._setupEventListeners();
        this._initialized = true;

        logger.info("Step4: Initialization complete.");
    }

    _cacheDOMElements() {
        // Cache DOM elements for better performance and cleaner code
        this.elements.gradedCheckbox = document.getElementById('graded');
        this.elements.gradingFields = document.getElementById('gradingFields');
        this.elements.rawConditionFields = document.getElementById('rawConditionFields');
        this.elements.gradingCompany = document.getElementById('gradingCompany');
        this.elements.gradedValue = document.getElementById('gradedValue');
        this.elements.cardSubGrades = document.getElementById('cardSubGrades');
        this.elements.cardSubGradesDetailContainer = document.getElementById('cardSubGradesDetailContainer');
        this.elements.gradingCert = document.getElementById('gradingCert');
        this.elements.rawCondition = document.getElementById('rawCondition');
        this.elements.conditionNotes = document.getElementById('conditionNotes');

        // Card attributes
        this.elements.attributeAutograph = document.getElementById('attribute_autograph');
        this.elements.parallel = document.getElementById('parallel');
        this.elements.parallelDetail = document.getElementById('parallelDetail');
        this.elements.parallelDetailContainer = document.getElementById('parallelDetailContainer');
        this.elements.insert = document.getElementById('insert');
        this.elements.insertDetail = document.getElementById('insertDetail');
        this.elements.insertDetailContainer = document.getElementById('insertDetailContainer');
        this.elements.cardSerialNum = document.getElementById('cardSerialNum');
        this.elements.cardSerial = document.getElementById('cardSerial');
        this.elements.cardSerialMax = document.getElementById('cardSerialMax');
        this.elements.cardSerialNumDetailContainer = document.getElementById('cardSerialNumDetailContainer');

        // Log any missing elements
        if (!this.elements.gradedCheckbox) {
            logger.warn("Step4 _cacheDOMElements: Graded checkbox element not found.");
        }
        if (!this.elements.gradingFields) {
            logger.warn("Step4 _cacheDOMElements: Grading fields container not found.");
        }
        if (!this.elements.rawConditionFields) {
            logger.warn("Step4 _cacheDOMElements: Raw condition fields container not found.");
        }
    }

    _setupEventListeners() {
        // Set up event listeners for form elements

        // Graded checkbox
        if (this.elements.gradedCheckbox) {
            this.elements.gradedCheckbox.addEventListener('change', this._handleGradedChange.bind(this));
        }

        // Sub grades checkbox
        if (this.elements.cardSubGrades) {
            this.elements.cardSubGrades.addEventListener('change', this._handleSubGradesChange.bind(this));
        }

        // Parallel checkbox
        if (this.elements.parallel) {
            this.elements.parallel.addEventListener('change', this._handleParallelChange.bind(this));
        }

        // Insert checkbox
        if (this.elements.insert) {
            this.elements.insert.addEventListener('change', this._handleInsertChange.bind(this));
        }

        // Serial number checkbox
        if (this.elements.cardSerialNum) {
            this.elements.cardSerialNum.addEventListener('change', this._handleSerialNumChange.bind(this));
        }

        // Add input event listeners for validation
        const inputElements = [
            this.elements.gradingCompany,
            this.elements.gradedValue,
            this.elements.gradingCert,
            this.elements.rawCondition,
            this.elements.conditionNotes,
            this.elements.parallelDetail,
            this.elements.insertDetail,
            this.elements.cardSerial,
            this.elements.cardSerialMax
        ];

        inputElements.forEach(element => {
            if (element) {
                element.addEventListener('input', this._validateStep.bind(this));
            }
        });

        logger.debug("Step4: Event listeners setup complete.");
    }

    activate() {
        this.init(); // Ensure initialization
        super.activate();

        // Populate form with existing data if available
        if (!this.config.SKIP_STATE_SAVE) {
            this._populateFormFromState();
        }

        // Update UI based on current state
        this._updateGradingFieldsVisibility();
        this._updateSubGradesVisibility();
        this._updateParallelDetailVisibility();
        this._updateInsertDetailVisibility();
        this._updateSerialNumDetailVisibility();

        // Validate the step to update next button state
        this._validateStep();

        logger.info("Step4: Activated and form populated.");
    }

    deactivate() {
        super.deactivate();

        // Save form data to state before leaving
        this._saveFormDataToState();

        logger.info("Step4: Deactivated and form data saved.");
    }

    _populateFormFromState() {
        // Populate form fields from state if data exists
        const formData = this.state.formData || {};

        // Graded status
        if (this.elements.gradedCheckbox && formData.graded !== undefined) {
            this.elements.gradedCheckbox.checked = formData.graded;
        }

        // Grading company
        if (this.elements.gradingCompany && formData.gradingCompany) {
            this.elements.gradingCompany.value = formData.gradingCompany;
        }

        // Graded value
        if (this.elements.gradedValue && formData.gradedValue) {
            this.elements.gradedValue.value = formData.gradedValue;
        }

        // Sub grades
        if (this.elements.cardSubGrades && formData.cardSubGrades !== undefined) {
            this.elements.cardSubGrades.checked = formData.cardSubGrades;
        }

        // Sub grade values
        const subGradeFields = [
            'cardSubGradesCentering',
            'cardSubGradesCorners',
            'cardSubGradesEdges',
            'cardSubGradesSurface'
        ];

        subGradeFields.forEach(field => {
            const element = document.getElementById(field);
            if (element && formData[field]) {
                element.value = formData[field];
            }
        });

        // Grading certificate
        if (this.elements.gradingCert && formData.gradingCert) {
            this.elements.gradingCert.value = formData.gradingCert;
        }

        // Raw condition
        if (this.elements.rawCondition && formData.rawCondition) {
            this.elements.rawCondition.value = formData.rawCondition;
        }

        // Condition notes
        if (this.elements.conditionNotes && formData.conditionNotes) {
            this.elements.conditionNotes.value = formData.conditionNotes;
        }

        // Card attributes
        if (this.elements.attributeAutograph && formData.attribute_autograph !== undefined) {
            this.elements.attributeAutograph.checked = formData.attribute_autograph;
        }

        // Parallel
        if (this.elements.parallel && formData.parallel !== undefined) {
            this.elements.parallel.checked = formData.parallel;
        }

        if (this.elements.parallelDetail && formData.parallelDetail) {
            this.elements.parallelDetail.value = formData.parallelDetail;
        }

        // Insert
        if (this.elements.insert && formData.insert !== undefined) {
            this.elements.insert.checked = formData.insert;
        }

        if (this.elements.insertDetail && formData.insertDetail) {
            this.elements.insertDetail.value = formData.insertDetail;
        }

        // Serial number
        if (this.elements.cardSerialNum && formData.cardSerialNum !== undefined) {
            this.elements.cardSerialNum.checked = formData.cardSerialNum;
        }

        if (this.elements.cardSerial && formData.cardSerial) {
            this.elements.cardSerial.value = formData.cardSerial;
        }

        if (this.elements.cardSerialMax && formData.cardSerialMax) {
            this.elements.cardSerialMax.value = formData.cardSerialMax;
        }

        logger.debug("Step4: Form populated from state data.");
    }

    _saveFormDataToState() {
        // Save form data to state
        const formData = this.state.formData || {};

        // Graded status
        if (this.elements.gradedCheckbox) {
            formData.graded = this.elements.gradedCheckbox.checked;
        }

        // Grading company
        if (this.elements.gradingCompany) {
            formData.gradingCompany = this.elements.gradingCompany.value;
        }

        // Graded value
        if (this.elements.gradedValue) {
            formData.gradedValue = this.elements.gradedValue.value;
        }

        // Sub grades
        if (this.elements.cardSubGrades) {
            formData.cardSubGrades = this.elements.cardSubGrades.checked;
        }

        // Sub grade values
        const subGradeFields = [
            'cardSubGradesCentering',
            'cardSubGradesCorners',
            'cardSubGradesEdges',
            'cardSubGradesSurface'
        ];

        subGradeFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                formData[field] = element.value;
            }
        });

        // Grading certificate
        if (this.elements.gradingCert) {
            formData.gradingCert = this.elements.gradingCert.value;
        }

        // Raw condition
        if (this.elements.rawCondition) {
            formData.rawCondition = this.elements.rawCondition.value;
        }

        // Condition notes
        if (this.elements.conditionNotes) {
            formData.conditionNotes = this.elements.conditionNotes.value;
        }

        // Card attributes
        if (this.elements.attributeAutograph) {
            formData.attribute_autograph = this.elements.attributeAutograph.checked;
        }

        // Parallel
        if (this.elements.parallel) {
            formData.parallel = this.elements.parallel.checked;
        }

        if (this.elements.parallelDetail) {
            formData.parallelDetail = this.elements.parallelDetail.value;
        }

        // Insert
        if (this.elements.insert) {
            formData.insert = this.elements.insert.checked;
        }

        if (this.elements.insertDetail) {
            formData.insertDetail = this.elements.insertDetail.value;
        }

        // Serial number
        if (this.elements.cardSerialNum) {
            formData.cardSerialNum = this.elements.cardSerialNum.checked;
        }

        if (this.elements.cardSerial) {
            formData.cardSerial = this.elements.cardSerial.value;
        }

        if (this.elements.cardSerialMax) {
            formData.cardSerialMax = this.elements.cardSerialMax.value;
        }

        // Update state with form data
        this.addCardInstance.updateFormData(formData);

        logger.debug("Step4: Form data saved to state.");
    }

    _handleGradedChange(event) {
        const isGraded = event.target.checked;
        this._updateGradingFieldsVisibility(isGraded);
        this._validateStep();

        logger.debug(`Step4: Graded status changed to ${isGraded}`);
    }

    _updateGradingFieldsVisibility(isGraded) {
        // If isGraded is not provided, use the checkbox value
        const graded = isGraded !== undefined ? isGraded : 
                      (this.elements.gradedCheckbox ? this.elements.gradedCheckbox.checked : false);

        if (this.elements.gradingFields) {
            this.elements.gradingFields.classList.toggle('hidden', !graded);
        }

        if (this.elements.rawConditionFields) {
            this.elements.rawConditionFields.classList.toggle('hidden', graded);
        }
    }

    _handleSubGradesChange(event) {
        const showSubGrades = event.target.checked;
        this._updateSubGradesVisibility(showSubGrades);
        this._validateStep();

        logger.debug(`Step4: Sub grades visibility changed to ${showSubGrades}`);
    }

    _updateSubGradesVisibility(showSubGrades) {
        // If showSubGrades is not provided, use the checkbox value
        const display = showSubGrades !== undefined ? showSubGrades : 
                       (this.elements.cardSubGrades ? this.elements.cardSubGrades.checked : false);

        if (this.elements.cardSubGradesDetailContainer) {
            this.elements.cardSubGradesDetailContainer.classList.toggle('hidden', !display);
        }
    }

    _handleParallelChange(event) {
        const showParallelDetail = event.target.checked;
        this._updateParallelDetailVisibility(showParallelDetail);
        this._validateStep();

        logger.debug(`Step4: Parallel detail visibility changed to ${showParallelDetail}`);
    }

    _updateParallelDetailVisibility(showParallelDetail) {
        // If showParallelDetail is not provided, use the checkbox value
        const display = showParallelDetail !== undefined ? showParallelDetail : 
                       (this.elements.parallel ? this.elements.parallel.checked : false);

        if (this.elements.parallelDetailContainer) {
            this.elements.parallelDetailContainer.classList.toggle('hidden', !display);
        }
    }

    _handleInsertChange(event) {
        const showInsertDetail = event.target.checked;
        this._updateInsertDetailVisibility(showInsertDetail);
        this._validateStep();

        logger.debug(`Step4: Insert detail visibility changed to ${showInsertDetail}`);
    }

    _updateInsertDetailVisibility(showInsertDetail) {
        // If showInsertDetail is not provided, use the checkbox value
        const display = showInsertDetail !== undefined ? showInsertDetail : 
                       (this.elements.insert ? this.elements.insert.checked : false);

        if (this.elements.insertDetailContainer) {
            this.elements.insertDetailContainer.classList.toggle('hidden', !display);
        }
    }

    _handleSerialNumChange(event) {
        const showSerialNumDetail = event.target.checked;
        this._updateSerialNumDetailVisibility(showSerialNumDetail);
        this._validateStep();

        logger.debug(`Step4: Serial number detail visibility changed to ${showSerialNumDetail}`);
    }

    _updateSerialNumDetailVisibility(showSerialNumDetail) {
        // If showSerialNumDetail is not provided, use the checkbox value
        const display = showSerialNumDetail !== undefined ? showSerialNumDetail : 
                       (this.elements.cardSerialNum ? this.elements.cardSerialNum.checked : false);

        if (this.elements.cardSerialNumDetailContainer) {
            this.elements.cardSerialNumDetailContainer.classList.toggle('hidden', !display);
        }
    }

    _validateStep() {
        // Validate the form fields
        let isValid = true;

        // Check if graded is checked
        const isGraded = this.elements.gradedCheckbox && this.elements.gradedCheckbox.checked;

        if (isGraded) {
            // Validate grading fields
            if (this.elements.gradingCompany && !this.elements.gradingCompany.value) {
                isValid = false;
            }

            if (this.elements.gradedValue && !this.elements.gradedValue.value) {
                isValid = false;
            }

            // Check sub grades if enabled
            const hasSubGrades = this.elements.cardSubGrades && this.elements.cardSubGrades.checked;
            if (hasSubGrades) {
                const subGradeFields = [
                    'cardSubGradesCentering',
                    'cardSubGradesCorners',
                    'cardSubGradesEdges',
                    'cardSubGradesSurface'
                ];

                subGradeFields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && !element.value) {
                        isValid = false;
                    }
                });
            }
        } else {
            // Validate raw condition fields
            if (this.elements.rawCondition && !this.elements.rawCondition.value) {
                isValid = false;
            }
        }

        // Validate parallel detail if parallel is checked
        const hasParallel = this.elements.parallel && this.elements.parallel.checked;
        if (hasParallel && this.elements.parallelDetail && !this.elements.parallelDetail.value) {
            isValid = false;
        }

        // Validate insert detail if insert is checked
        const hasInsert = this.elements.insert && this.elements.insert.checked;
        if (hasInsert && this.elements.insertDetail && !this.elements.insertDetail.value) {
            isValid = false;
        }

        // Validate serial number fields if serial number is checked
        const hasSerialNum = this.elements.cardSerialNum && this.elements.cardSerialNum.checked;
        if (hasSerialNum) {
            if (this.elements.cardSerial && !this.elements.cardSerial.value) {
                isValid = false;
            }

            if (this.elements.cardSerialMax && !this.elements.cardSerialMax.value) {
                isValid = false;
            }
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
        logger.debug(`Step4: Next button ${enableNext ? 'enabled' : 'disabled'}.`);
    }
}
