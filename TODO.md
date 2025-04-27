Okay, here is a detailed requirements list for implementing Steps 3 through 8 of the "Add Card" feature, designed to be
understood by another AI or developer. The requirements focus on the necessary actions, data handling, UI components,
and API interactions for each step.

**Assumptions:**

* A shared state management system (like `this.state` in `addCard_beta.js`) exists to hold data across steps (e.g.,
  `selectedSet`, `selectedCard`).
* Frontend JavaScript classes exist for each step (e.g., `Step3`, `Step4`, etc.) with `activate` and potentially
  `deactivate` methods.
* Backend API endpoints are available or will be created to support data fetching and submission.
* UI elements corresponding to these requirements will be created in the respective HTML partials (`step3.html` through
  `step8.html`).

---

**Implementation Requirements: Add Card Steps 3-8**

**Step 3: Player / Team Confirmation**

1. **Data Requirement (Input):** Requires the `selectedCard` object (containing at least the Card ID) from the shared
   state, set in Step 2.
2. **Backend Interaction (Fetch):**
    * On activation of Step 3, make an API call to fetch the detailed player and team information associated with the
      `selectedCard.id`.
    * The API should return structured data including player names and team names relevant to that specific card.
3. **Frontend Logic (Display):**
    * Parse the API response.
    * Update designated read-only UI elements within Step 3 to display the fetched player name(s).
    * Update designated read-only UI elements within Step 3 to display the fetched team name(s).
4. **UI Elements:**
    * Dedicated, clearly labeled areas (e.g., `<p>`, `<span>`) to display player names.
    * Dedicated, clearly labeled areas to display team names.
5. **Data Persistence:** No new data is typically collected in this step. It primarily serves as confirmation. The
   `selectedCard` object containing player/team associations remains in the shared state.
6. **Error Handling:** Display a user-friendly message if the player/team data cannot be fetched from the API.

**Step 4: Condition & Grading**

1. **Backend Interaction (Fetch):**
    * On activation of Step 4, make API calls to fetch:
        * A list of available raw card conditions (e.g., {id: 1, name: 'Mint'}, {id: 2, name: 'Near Mint'}). These
          correspond to the `Condition` model.
        * A list of available grading companies (e.g., {id: 1, name: 'PSA'}, {id: 2, name: 'BGS'}). These correspond to
          the `GradingCompany` model.
2. **UI Elements:**
    * **Raw Condition:** A `select` dropdown or radio button group, populated with options fetched from the API. This
      field must be marked as required.
    * **Is Graded Toggle:** A checkbox or toggle switch (e.g., "Is this card professionally graded?").
    * **Grading Fields Container:** A container (e.g., `div`) holding the following grading-specific fields, initially
      hidden.
        * **Grading Company:** A `select` dropdown, populated with options fetched from the API. Required *if* "Is
          Graded" is active.
        * **Grade:** A text input field for the numerical grade (e.g., "10", "9.5", "8"). Required *if* "Is Graded" is
          active. Allow decimals.
        * **Certification ID:** A text input field for the slab's certification number. Optional.
        * *(Optional)* Input fields for Subgrades if the system supports them.
3. **Frontend Logic:**
    * Populate the "Raw Condition" and "Grading Company" dropdowns using the data fetched from the APIs.
    * Add an event listener to the "Is Graded" toggle:
        * When activated (checked/on), reveal the "Grading Fields Container" and make its required fields mandatory.
        * When deactivated (unchecked/off), hide the "Grading Fields Container", clear its values, and remove the
          mandatory requirement from its fields.
    * Store the selected "Raw Condition" ID in the shared state.
    * Store the state of the "Is Graded" toggle (boolean) in the shared state.
    * If graded, store the selected "Grading Company" ID, entered "Grade", and "Certification ID" in the shared state.
      Ensure grade is stored appropriately (e.g., as a number or string).
4. **Validation:** Implement frontend validation to ensure "Raw Condition" is selected. If "Is Graded" is active,
   ensure "Grading Company" and "Grade" are provided. Validate grade format if necessary (e.g., numeric, within a
   range).
5. **Data Persistence:** Update the shared state with `conditionId`, `isGraded` (boolean), `gradingCompanyId`,
   `gradeValue`, `certificationId`.

**Step 5: Storage Location**

1. **Backend Interaction (Fetch):**
    * On activation of Step 5, make an API call to fetch the list of `StorageLocation` entries *belonging to the
      currently authenticated user*. Expect data like `[{id: 10, name: 'Box A'}, {id: 15, name: 'Toploader Binder'}]`.
2. **UI Elements:**
    * A `select` dropdown to list the user's storage locations. Include a default "Select Location" option.
    * *(Optional)* An "Add New Location" button or link that could trigger a separate modal/workflow (implementation
      detail outside this immediate step).
3. **Frontend Logic:**
    * Populate the storage location dropdown with options fetched from the API (using `id` as value and `name` as
      display text).
    * Store the selected `StorageLocation` ID in the shared state upon user selection.
4. **Data Persistence:** Update the shared state with `storageLocationId`.

**Step 6: Photos**

1. **UI Elements:**
    * An `<input type="file" accept="image/*">` for the front image.
    * An `<input type="file" accept="image/*">` for the back image.
    * Preview areas (e.g., `<img>` tags) to display the selected front and back images. Initially empty or showing
      placeholders.
    * Buttons associated with each preview (or the uploader) to "Remove" or "Change" the selected image.
    * *(If using Cropper.js)*: A modal or dedicated area to display the selected image within the Cropper interface,
      along with "Crop" and "Cancel" buttons.
2. **Frontend Logic:**
    * Add event listeners to both file inputs.
    * On file selection:
        * Read the selected image file using `FileReader`.
        * Display the image preview in the corresponding `<img>` tag.
        * Store the `File` object (or its Data URL if using Cropper.js extensively before upload) for both front and
          back images in the shared state.
        * *(If using Cropper.js)*: Optionally, immediately trigger the Cropper interface upon file selection to allow
          cropping. Handle the result of the crop (saving the cropped blob/data URL).
    * Implement "Remove/Change" functionality: Clear the preview, reset the file input, and clear the corresponding
      image data from the shared state.
3. **Data Persistence:** Update the shared state with the front and back image data (e.g., `frontImageFile: File`,
   `backImageFile: File`). No backend upload occurs *in this step*.

**Step 7: Purchase Information**

1. **UI Elements:**
    * A text input for "Purchase Price". Specify input type `number` with appropriate `step` (e.g., "0.01") for
      currency. Mark as optional.
    * A date input (`<input type="date">`) for "Purchase Date". Mark as optional.
    * A text input for "Acquired From / Source". Mark as optional.
2. **Frontend Logic:**
    * Add event listeners to capture user input for price, date, and source.
    * Perform basic frontend validation (e.g., ensure price is a valid number if entered).
    * Store the entered values (purchase price, purchase date, acquired source) in the shared state. Handle empty/null
      values for optional fields.
3. **Data Persistence:** Update the shared state with `purchasePrice`, `purchaseDate`, `acquiredSource`.

**Step 8: Review & Submit**

1. **Data Requirement (Input):** Requires access to all data collected in the shared state from Steps 1 through 7 (
   `selectedSet`, `selectedCard`, `conditionId`, `isGraded`, grading details, `storageLocationId`, image files/data,
   purchase info).
2. **Backend Interaction (Fetch - For Display):**
    * Fetch display-friendly names/details based on IDs stored in state if not already available (e.g., fetch Condition
      name using `conditionId`, Storage Location name using `storageLocationId`, full Set/Card details if needed). This
      should be done when Step 8 activates.
3. **UI Elements:**
    * Read-only display areas summarizing all collected information:
        * Selected Set details (Name, Year, Sport).
        * Selected Card details (Card #, Player, Team, Type).
        * Condition/Grading details (Condition name, Graded status, Company, Grade, Cert ID).
        * Storage Location name.
        * Thumbnails/previews of the uploaded Front and Back images.
        * Purchase Information (Price, Date, Source).
    * "Edit" buttons or links adjacent to each summarized section (e.g., "Edit Condition", "Edit Photos").
    * A final "Submit" or "Add Card to Collection" button.
    * A loading indicator (e.g., spinner) to show during submission.
    * A message area to display success or error feedback after submission.
4. **Frontend Logic:**
    * **Activation:** Populate all display areas using data from the shared state and any additional details fetched for
      display.
    * **Edit Functionality:** Add event listeners to "Edit" buttons. When clicked, call the main stepper's
      `stepperChangeStep` method, passing the target step number corresponding to the section to be edited (e.g.,
      clicking "Edit Condition" navigates to Step 4).
    * **Submit Functionality:**
        * Add an event listener to the "Submit" button.
        * On click:
            * Display the loading indicator and disable the submit button.
            * Perform final frontend validation checks if needed.
            * Construct the payload for the backend API. Use `FormData` if image files are included. Append all relevant
              IDs and data from the shared state (e.g., `cardId`, `conditionId`, `storageLocationId`, `isGraded`,
              `gradeValue`, `purchasePrice`, image files, etc.).
            * Make the API call (e.g., POST request) to the backend endpoint responsible for creating the
              `UserCollectionItem`.
            * Handle the API response:
                * **On Success:** Hide loading indicator. Display a success message. Optionally, clear the form state
                  and redirect the user (e.g., to their collection page or back to Step 1 for adding another card).
                * **On Failure:** Hide loading indicator. Re-enable the submit button. Display a user-friendly error
                  message based on the API response. Log detailed error information.
5. **Backend Interaction (Submit):**
    * Requires a backend API endpoint that accepts the `FormData` (or JSON payload if not handling files directly)
      containing all necessary information.
    * This endpoint must:
        * Validate the incoming data.
        * Create a new `UserCollectionItem` record.
        * Associate it with the correct `User`, `Card`, `Condition`, `StorageLocation`, etc.
        * Handle image uploads (saving files and creating `UserCollectionItemImage` records linked to the
          `UserCollectionItem`).
        * Save grading and purchase information.
        * Return a success or error response.

---