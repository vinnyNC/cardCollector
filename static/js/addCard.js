
    //Add EventListener for image preview functions
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('frontImage').addEventListener('change', (event) => {
            previewImage(event, 'frontImagePreview');
        });
        document.getElementById('backImage').addEventListener('change', (event) => {
            previewImage(event, 'backImagePreview');
        });
    });
    // Toggle detail fields for insert, rookie, parallel
    function toggleField(containerId, checkbox) {
        const container = document.getElementById(containerId);
        container.classList.toggle('hidden', !checkbox.checked);
    }

    // Toggle grading fields
    function toggleGradingFields(checkbox) {
        const gradingFields = document.getElementById('gradingFields');
        gradingFields.classList.toggle('hidden', !checkbox.checked);
    }

    // Preview uploaded images
    function previewImage(event, previewId) {
        const input = event.target;
        const preview = document.getElementById(previewId);
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                resizeImage(e.target.result, (blob, url) => {
                    preview.src = url;
                    preview.classList.remove('hidden');
                    input.dataset.originalFile = JSON.stringify({
                        name: input.files[0].name,
                        type: input.files[0].type,
                        data: url
                    });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(new File([blob], input.files[0].name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                    input.files = dataTransfer.files;
                });
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            delete input.dataset.originalFile;
        }
    }

    // Delete image
    function deleteImage(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        input.value = '';
        preview.src = '';
        preview.classList.add('hidden');
        delete input.dataset.originalFile;
        input.files = null;
    }

    // Delete receipt
    function deleteFile(inputId) {
        const input = document.getElementById(inputId);
        input.value = '';
    }

    //  SEARCH
    // Reusable dropdown handler
    // Reusable dropdown handler with improved styling and scrolling
    function setupDropdown(inputId, apiSegment, resultKey = 'name') {
        const input = document.getElementById(inputId);
        const dropdown = document.createElement('div');
        dropdown.id = `${inputId}-dropdown`;
        dropdown.className = `
        absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg shadow-lg
        bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        divide-y divide-gray-100 dark:divide-gray-600
        scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-500
        scrollbar-track-gray-100 dark:scrollbar-track-gray-900
        hidden
    `;
        dropdown.setAttribute('role', 'listbox');
        input.parentElement.appendChild(dropdown); // Append to parent for better positioning

        let selectedIndex = -1;
        let options = [];

        // Show dropdown with results
        function showDropdown(results) {
            dropdown.innerHTML = '';
            options = results;
            selectedIndex = -1;

            if (results.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic';
                noResults.textContent = 'No results found';
                dropdown.appendChild(noResults);
            } else {
                results.forEach((result, index) => {
                    const item = document.createElement('div');
                    item.className = `
                    px-4 py-2 text-sm text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    cursor-pointer transition-colors duration-150 ease-in-out
                `;
                    item.setAttribute('role', 'option');
                    item.setAttribute('data-index', index);
                    item.setAttribute('aria-selected', 'false');

                    // Set text content based on API segment
                    let displayText = '';
                    if (apiSegment === 'set_name') {
                        displayText = result[resultKey] || result.name;
                    } else if (apiSegment === 'card_num') {
                        displayText = `${result.card_num} - ${result.player.first_name} ${result.player.last_name}`;
                        item.dataset.playerFirstName = result.player.first_name;
                        item.dataset.playerLastName = result.player.last_name;
                    } else {
                        displayText = result[resultKey] || result.name;
                    }
                    item.textContent = displayText;

                    // Handle click/touch events
                    item.addEventListener('click', () => {
                        selectOption(result, displayText);
                        hideDropdown(); // Close dropdown immediately after selection
                    });
                    item.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        selectOption(result, displayText);
                        hideDropdown(); // Close dropdown immediately after selection
                    });

                    dropdown.appendChild(item);
                });
            }

            // Position dropdown below input
            const rect = input.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            dropdown.style.width = `${input.offsetWidth}px`;
            dropdown.classList.remove('hidden');
            document.addEventListener('click', handleClickOutside);
        }

        // Hide dropdown
        function hideDropdown() {
            dropdown.classList.add('hidden');
            selectedIndex = -1;
            document.removeEventListener('click', handleClickOutside);
        }

        // Handle click outside to close
        function handleClickOutside(event) {
            if (!dropdown.contains(event.target) && event.target !== input) {
                hideDropdown();
            }
        }

        // Select an option
        function selectOption(result, displayText) {
            if (apiSegment === 'card_num') {
                const firstNameInput = document.getElementById('playerFirstName');
                const lastNameInput = document.getElementById('playerLastName');
                firstNameInput.value = result.player.first_name;
                firstNameInput.disabled = true;
                lastNameInput.value = result.player.last_name;
                lastNameInput.disabled = true;
                input.value = result.card_num;
            } else if (apiSegment === 'set_name') {
                input.value = displayText;
                input.dataset.setId = result.id; // Store set ID for card_num lookup
            } else {
                input.value = displayText;
            }
            input.focus(); // Return focus to input
        }

        // Update visual selection for keyboard navigation
        function updateSelection() {
            const items = dropdown.querySelectorAll('[role="option"]');
            items.forEach((item, index) => {
                const isSelected = index === selectedIndex;
                item.classList.toggle('bg-gray-100', isSelected);
                item.classList.toggle('dark:bg-gray-700', isSelected);
                item.setAttribute('aria-selected', isSelected);
                if (isSelected) {
                    item.scrollIntoView({block: 'nearest', behavior: 'smooth'});
                }
            });
        }

        // Debounce API calls
        function debounce(func, delay) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        }

        // Fetch data from API
        function makeApiCall(searchText) {
            const encodedSearchText = encodeURIComponent(searchText);
            let url;
            switch (apiSegment) {
                case 'set_name':
                    url = `/api/set/search/${encodedSearchText}`;
                    break;
                case 'card_num':
                    const setId = document.getElementById('set').dataset.setId || '';
                    url = `/api/card_num/search/${encodedSearchText}/${encodeURIComponent(setId)}`;
                    break;
                case 'insert_name':
                    url = `/api/insert_name/${encodedSearchText}`;
                    break;
                case 'parallel_name':
                    url = `/api/parallel_name/${encodedSearchText}`;
                    break;
                case 'where_bought':
                    url = `/api/where_bought/${encodedSearchText}`;
                    break;
                default:
                    console.error('Unknown API segment:', apiSegment);
                    return;
            }

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        showDropdown(data.results);
                    } else {
                        showDropdown([]); // Show "No results" message
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    hideDropdown();
                });
        }

        const debouncedApiCall = debounce(makeApiCall, 300);

        // Input event listeners
        input.addEventListener('input', () => {
            const inputValue = input.value.trim();
            if (apiSegment === 'card_num') {
                const firstNameInput = document.getElementById('playerFirstName');
                const lastNameInput = document.getElementById('playerLastName');
                if (firstNameInput.disabled) {
                    firstNameInput.value = '';
                    lastNameInput.value = '';
                    firstNameInput.disabled = false;
                    lastNameInput.disabled = false;
                }
            }
            if (inputValue.length >= 1) {
                debouncedApiCall(inputValue);
            } else {
                hideDropdown();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (!dropdown.classList.contains('hidden')) {
                const items = dropdown.querySelectorAll('[role="option"]');
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
                        updateSelection();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        selectedIndex = Math.max(selectedIndex - 1, -1);
                        updateSelection();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (selectedIndex >= 0 && selectedIndex < options.length) {
                            selectOption(options[selectedIndex], items[selectedIndex].textContent);
                            hideDropdown(); // Close dropdown on Enter
                        }
                        break;
                    case 'Tab':
                    case 'Escape':
                        hideDropdown();
                        break;
                }
            }
        });

        // Close dropdown when input loses focus (e.g., clicking another field)
        input.addEventListener('blur', () => {
            // Delay to allow click event to register first
            setTimeout(() => {
                hideDropdown();
            }, 150);
        });

        input.addEventListener('focus', () => {
            const inputValue = input.value.trim();
            if (inputValue.length >= 1 && dropdown.classList.contains('hidden')) {
                debouncedApiCall(inputValue);
            }
        });
    }

    // Initialize dropdowns with appropriate API segments and result keys
    setupDropdown('set', 'set_name', 'set_name');
    setupDropdown('cardNum', 'card_num', 'card_num');
    setupDropdown('insertDetail', 'insert_name', 'insert_name');
    setupDropdown('parallelDetail', 'parallel_name', 'parallel_name');
    setupDropdown('whereBought', 'where_bought', 'where_bought');

    // Update image preview while preserving original file
    function resizeImage(imageSrc, callback) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let displayWidth = img.width;
            let displayHeight = img.height;

            // Calculate display dimensions while preserving aspect ratio
            if (displayWidth > displayHeight) {
                if (displayWidth > 250) {
                    displayHeight = Math.round((displayHeight * 250) / displayWidth);
                    displayWidth = 250;
                } else if (displayWidth < 200) {
                    displayHeight = Math.round((displayHeight * 200) / displayWidth);
                    displayWidth = 200;
                }
            } else {
                if (displayHeight > 250) {
                    displayWidth = Math.round((displayWidth * 250) / displayHeight);
                    displayHeight = 250;
                } else if (displayHeight < 200) {
                    displayWidth = Math.round((displayWidth * 200) / displayHeight);
                    displayHeight = 200;
                }
            }

            // Create scaled preview
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

            // Convert original image to blob
            fetch(imageSrc)
                .then(res => res.blob())
                .then(originalBlob => {
                    // Create preview URL for display
                    canvas.toBlob(previewBlob => {
                        callback(originalBlob, URL.createObjectURL(previewBlob));
                    }, 'image/jpeg', 0.95);
                });
        };
        img.src = imageSrc;
    }

    // Image cropping JS
    let cropper;
    let currentInputId;

    // Crop image
    function cropImage(inputId) {
        currentInputId = inputId;
        const input = document.getElementById(inputId);
        const imageToCrop = document.getElementById('imageToCrop');
        const modal = document.getElementById('cropModal');

        if (!input.files[0] && !input.dataset.originalFile) {
            alert('Please upload or capture an image first');
            return;
        }

        // Use the original file data instead of the preview
        if (input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imageToCrop.src = e.target.result;
                initializeCropper(modal);
            };
            reader.readAsDataURL(input.files[0]);
        } else if (input.dataset.originalFile) {
            const fileData = JSON.parse(input.dataset.originalFile);
            imageToCrop.src = fileData.data;
            initializeCropper(modal);
        }
    }

    function initializeCropper(modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        if (cropper) {
            cropper.destroy();
        }

        cropper = new Cropper(document.getElementById('imageToCrop'), {
            aspectRatio: NaN,
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
            restore: true,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: true,
            zoomable: true,
            scalable: true,
            movable: true,
            touchDragZoom: true,
            mouseWheelZoom: false,
            minContainerWidth: 300,
            minContainerHeight: 300
        });

        document.getElementById('imageToCrop').addEventListener('touchstart', preventZoom, {passive: false});
    }


    function closeCropModal() {
        const modal = document.getElementById('cropModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        const imageToCrop = document.getElementById('imageToCrop');
        imageToCrop.removeEventListener('touchstart', preventZoom);
    }

    function saveCroppedImage() {
        if (!cropper) return;

        // Get the cropped canvas at original size
        const croppedCanvas = cropper.getCroppedCanvas({
            maxWidth: 4000, // Higher limit for original
            maxHeight: 4000,
            fillColor: '#fff'
        });

        const previewId = currentInputId + 'Preview';
        const preview = document.getElementById(previewId);
        const input = document.getElementById(currentInputId);

        // First, store the original cropped image
        croppedCanvas.toBlob(originalBlob => {
            // Then create a preview version with size limits
            const previewCanvas = document.createElement('canvas');
            const img = new Image();
            img.onload = function () {
                let displayWidth = img.width;
                let displayHeight = img.height;

                // Calculate display dimensions while preserving aspect ratio
                if (displayWidth > displayHeight) {
                    if (displayWidth > 250) {
                        displayHeight = Math.round((displayHeight * 250) / displayWidth);
                        displayWidth = 250;
                    }
                } else {
                    if (displayHeight > 250) {
                        displayWidth = Math.round((displayWidth * 250) / displayHeight);
                        displayHeight = 250;
                    }
                }

                // Create preview
                previewCanvas.width = displayWidth;
                previewCanvas.height = displayHeight;
                const ctx = previewCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

                // Set preview image
                previewCanvas.toBlob(previewBlob => {
                    const previewUrl = URL.createObjectURL(previewBlob);
                    preview.src = previewUrl;
                    preview.classList.remove('hidden');

                    // Store original file for upload
                    const file = new File([originalBlob], input.files[0]?.name || 'cropped-image.jpg', {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });

                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;

                    // Store original data and preview URL
                    input.dataset.originalFile = JSON.stringify({
                        name: file.name,
                        type: file.type,
                        data: URL.createObjectURL(originalBlob)
                    });

                    closeCropModal();
                }, 'image/jpeg', 0.95);
            };
            img.src = croppedCanvas.toDataURL('image/jpeg', 1.0);
        }, 'image/jpeg', 1.0);
    }

    // Prevent default zoom on mobile
    function preventZoom(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }

    // Webcam input JS
    let webcamStream;
    let currentWebcamInputId;

    function openWebcamModal(inputId) {
        currentWebcamInputId = inputId;
        const modal = document.getElementById('webcamModal');
        const video = document.getElementById('webcamVideo');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Webcam access is not supported in this browser or environment. Please use a modern browser and ensure the site is served over HTTPS or localhost.');
            return;
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        navigator.mediaDevices.getUserMedia({video: true})
            .then(stream => {
                webcamStream = stream;
                video.srcObject = stream;
            })
            .catch(err => {
                console.error('Webcam access error:', err.message);
                let errorMessage = 'Could not access webcam: ';
                if (err.name === 'NotAllowedError') {
                    errorMessage += 'Permission denied. Please allow webcam access.';
                } else if (err.name === 'NotFoundError') {
                    errorMessage += 'No webcam found. Please connect a camera.';
                } else if (err.name === 'SecurityError') {
                    errorMessage += 'This feature requires a secure context (HTTPS or localhost).';
                } else {
                    errorMessage += err.message;
                }
                alert(errorMessage);
                closeWebcamModal();
            });
    }

    // Close webcam modal
    function closeWebcamModal() {
        const modal = document.getElementById('webcamModal');
        const video = document.getElementById('webcamVideo');

        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';

        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
            video.srcObject = null;
        }
    }

    // Capture image from webcam
    function captureWebcamImage() {
        const video = document.getElementById('webcamVideo');
        const canvas = document.getElementById('webcamCanvas');
        const input = document.getElementById(currentWebcamInputId);
        const previewId = currentWebcamInputId + 'Preview';
        const preview = document.getElementById(previewId);

        if (!video.srcObject) {
            alert('No webcam feed available to capture.');
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        resizeImage(canvas.toDataURL('image/jpeg', 0.95), (blob, url) => {
            preview.src = url;
            preview.classList.remove('hidden');

            const file = new File([blob], `${currentWebcamInputId}-webcam.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            input.dataset.originalFile = JSON.stringify({
                name: file.name,
                type: file.type,
                data: url
            });

            closeWebcamModal();
            cropImage(currentWebcamInputId);
        });
    }