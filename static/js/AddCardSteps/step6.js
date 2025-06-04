import logger from '../debug-manager.js';
import {StepBase} from "./StepBase.js";

export class Step6 extends StepBase {
    constructor(addCardInstance, utils, config, state) {
        super(addCardInstance, utils, config, state, 6);

        // DOM Element Cache
        this.elements = {};
        this._initialized = false;

        // Track image data
        this.imageData = {
            frontImage: null,
            backImage: null,
            additionalImages: []
        };

        logger.info("Step6 constructed.");
    }

    init() {
        if (this._initialized) {
            logger.debug("Step6: Already initialized.");
            return;
        }

        super.init();
        this._cacheDOMElements();
        this._setupEventListeners();
        this._initialized = true;

        logger.info("Step6: Initialization complete.");
    }

    _cacheDOMElements() {
        // Cache DOM elements for better performance and cleaner code
        this.elements.frontImage = document.getElementById('frontImage');
        this.elements.frontImagePreview = document.getElementById('frontImagePreview');
        this.elements.backImage = document.getElementById('backImage');
        this.elements.backImagePreview = document.getElementById('backImagePreview');
        this.elements.additionalImages = document.getElementById('additionalImages');
        this.elements.additionalImagesPreview = document.getElementById('additionalImagesPreview');

        // Log any missing elements
        if (!this.elements.frontImage) {
            logger.warn("Step6 _cacheDOMElements: Front image input element not found.");
        }
        if (!this.elements.backImage) {
            logger.warn("Step6 _cacheDOMElements: Back image input element not found.");
        }
    }

    _setupEventListeners() {
        // Set up event listeners for form elements

        // Front image input
        if (this.elements.frontImage) {
            this.elements.frontImage.addEventListener('change', (event) => {
                this._handleImageChange(event, 'frontImage', this.elements.frontImagePreview);
            });
        }

        // Back image input
        if (this.elements.backImage) {
            this.elements.backImage.addEventListener('change', (event) => {
                this._handleImageChange(event, 'backImage', this.elements.backImagePreview);
            });
        }

        // Additional images input
        if (this.elements.additionalImages) {
            this.elements.additionalImages.addEventListener('change', this._handleAdditionalImagesChange.bind(this));
        }

        // Add event listeners for delete buttons
        document.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('button[onclick*="deleteImage"]');
            if (deleteButton) {
                event.preventDefault(); // Prevent default button behavior

                // Extract the input ID and preview ID from the onclick attribute
                const onclickAttr = deleteButton.getAttribute('onclick');
                const match = onclickAttr.match(/deleteImage\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);

                if (match && match.length === 3) {
                    const inputId = match[1];
                    const previewId = match[2];
                    this._deleteImage(inputId, previewId);
                }
            }
        });

        logger.debug("Step6: Event listeners setup complete.");
    }

    activate() {
        this.init(); // Ensure initialization
        super.activate();

        // Populate form with existing data if available
        this._populateFormFromState();

        // Validate the step to update next button state
        this._validateStep();

        logger.info("Step6: Activated and form populated.");
    }

    deactivate() {
        super.deactivate();

        // Save form data to state before leaving
        this._saveFormDataToState();

        logger.info("Step6: Deactivated and form data saved.");
    }

    _populateFormFromState() {
        // Populate form fields from state if data exists
        const formData = this.state.formData || {};

        // Restore image previews if we have image data in state
        if (formData.frontImageData) {
            this._displayImagePreview(this.elements.frontImagePreview, formData.frontImageData);
            this.imageData.frontImage = formData.frontImageData;
        }

        if (formData.backImageData) {
            this._displayImagePreview(this.elements.backImagePreview, formData.backImageData);
            this.imageData.backImage = formData.backImageData;
        }

        if (formData.additionalImagesData && Array.isArray(formData.additionalImagesData)) {
            this.imageData.additionalImages = formData.additionalImagesData;
            this._renderAdditionalImagePreviews();
        }

        logger.debug("Step6: Form populated from state data.");
    }

    _saveFormDataToState() {
        // Save form data to state
        const formData = this.state.formData || {};

        // Save image data
        formData.frontImageData = this.imageData.frontImage;
        formData.backImageData = this.imageData.backImage;
        formData.additionalImagesData = this.imageData.additionalImages;

        // Update state with form data
        this.addCardInstance.updateFormData(formData);

        logger.debug("Step6: Form data saved to state.");
    }

    _handleImageChange(event, imageType, previewElement) {
        const file = event.target.files[0];

        if (file) {
            logger.debug(`Step6: ${imageType} file selected:`, {
                name: file.name,
                type: file.type,
                size: `${(file.size / 1024).toFixed(2)} KB`
            });

            // Validate file type
            if (!file.type.match('image.*')) {
                logger.warn(`Step6: Invalid file type for ${imageType}:`, file.type);
                alert('Please select an image file (JPEG, PNG, etc.)');
                event.target.value = ''; // Clear the input
                return;
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                logger.warn(`Step6: File too large for ${imageType}:`, `${(file.size / 1024 / 1024).toFixed(2)} MB`);
                alert('Image file is too large. Please select a file smaller than 5MB.');
                event.target.value = ''; // Clear the input
                return;
            }

            // Read and display the image
            const reader = new FileReader();

            reader.onload = (e) => {
                const imageData = e.target.result;
                this._displayImagePreview(previewElement, imageData);

                // Store the image data
                this.imageData[imageType] = imageData;

                // Validate step after image change
                this._validateStep();

                logger.debug(`Step6: ${imageType} loaded and displayed.`);
            };

            reader.onerror = (error) => {
                logger.error(`Step6: Error reading ${imageType} file:`, error);
                alert('Error reading the image file. Please try again.');
            };

            reader.readAsDataURL(file);
        } else {
            // No file selected (or file selection canceled)
            if (previewElement) {
                previewElement.classList.add('hidden');
            }
            this.imageData[imageType] = null;
            this._validateStep();

            logger.debug(`Step6: No file selected for ${imageType} or selection canceled.`);
        }
    }

    _handleAdditionalImagesChange(event) {
        const files = event.target.files;

        if (files && files.length > 0) {
            logger.debug(`Step6: ${files.length} additional image(s) selected.`);

            // Convert FileList to Array for easier processing
            const filesArray = Array.from(files);

            // Validate all files
            const validFiles = filesArray.filter(file => {
                // Check file type
                if (!file.type.match('image.*')) {
                    logger.warn(`Step6: Invalid file type for additional image:`, file.type);
                    return false;
                }

                // Check file size
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    logger.warn(`Step6: File too large for additional image:`, `${(file.size / 1024 / 1024).toFixed(2)} MB`);
                    return false;
                }

                return true;
            });

            if (validFiles.length !== filesArray.length) {
                logger.warn(`Step6: ${filesArray.length - validFiles.length} invalid files were filtered out.`);
                alert(`${filesArray.length - validFiles.length} files were skipped because they were either not images or too large.`);
            }

            if (validFiles.length === 0) {
                event.target.value = ''; // Clear the input
                return;
            }

            // Process valid files
            Promise.all(validFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        resolve({
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: e.target.result
                        });
                    };

                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }))
            .then(imagesData => {
                // Add new images to the existing ones
                this.imageData.additionalImages = [
                    ...this.imageData.additionalImages,
                    ...imagesData
                ];

                // Render all additional image previews
                this._renderAdditionalImagePreviews();

                // Validate step after images change
                this._validateStep();

                logger.debug(`Step6: ${imagesData.length} additional images loaded and displayed.`);
            })
            .catch(error => {
                logger.error('Step6: Error reading additional image files:', error);
                alert('Error reading one or more image files. Please try again.');
            });
        }
    }

    _displayImagePreview(previewElement, imageData) {
        if (previewElement && imageData) {
            previewElement.src = imageData;
            previewElement.classList.remove('hidden');
        }
    }

    _renderAdditionalImagePreviews() {
        const container = this.elements.additionalImagesPreview;
        if (!container) return;

        // Clear existing previews
        container.innerHTML = '';

        // Create and append preview elements for each additional image
        this.imageData.additionalImages.forEach((image, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'relative';
            previewDiv.dataset.index = index;

            const img = document.createElement('img');
            img.src = image.data;
            img.alt = `Additional Image ${index + 1}`;
            img.className = 'h-24 w-auto object-cover rounded border border-gray-300 dark:border-gray-600';

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500';
            deleteButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            deleteButton.addEventListener('click', () => this._deleteAdditionalImage(index));

            previewDiv.appendChild(img);
            previewDiv.appendChild(deleteButton);
            container.appendChild(previewDiv);
        });
    }

    _deleteImage(inputId, previewId) {
        logger.debug(`Step6: Deleting image: ${inputId}`);

        // Clear the file input
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }

        // Hide the preview
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.classList.add('hidden');
            preview.src = '';
        }

        // Clear the stored image data
        if (inputId === 'frontImage') {
            this.imageData.frontImage = null;
        } else if (inputId === 'backImage') {
            this.imageData.backImage = null;
        }

        // Validate step after image deletion
        this._validateStep();
    }

    _deleteAdditionalImage(index) {
        logger.debug(`Step6: Deleting additional image at index ${index}`);

        // Remove the image from the array
        if (index >= 0 && index < this.imageData.additionalImages.length) {
            this.imageData.additionalImages.splice(index, 1);

            // Re-render the previews
            this._renderAdditionalImagePreviews();

            // Validate step after image deletion
            this._validateStep();
        }
    }

    _validateStep() {
        // Validate the form fields
        let isValid = true;

        // At least one image (front or back) is required
        if (!this.imageData.frontImage && !this.imageData.backImage) {
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
        logger.debug(`Step6: Next button ${enableNext ? 'enabled' : 'disabled'}.`);
    }
}
