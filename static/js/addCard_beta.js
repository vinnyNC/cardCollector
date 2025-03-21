document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnPrev').disabled = true;

    addSetTableItem('2024 Topps Chrome', '2024', 'Baseball', '1');
    addSetTableItem('2025 Topps Chrome', '2025', 'Baseball', '2');
    addSetTableItem('2025 Topps Series 1', '2025', 'Baseball', '3');
    });

/*
Stepper functions
 */


let stepperCurrentStep = 1;


function stepperChangeStep(step) {
    let listItemActiveClasses = ['text-blue-600', 'dark:text-blue-500'];
    let listItemChildActiveClasses = ['border-blue-600', 'dark:border-blue-500'];
    let listItemChildInactiveClasses = ['border-gray-500', 'dark:border-gray-400'];


}

function addSetTableItem(setName, setYear, setSport, setID) {
    // Get the table body
    const tableBody = document.getElementById('setResultsTable');

    // Create a new row
    const row = tableBody.insertRow();
    row.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600";
    row.dataset.setID = setID;

    // Create cells with proper styling
    const nameCell = row.insertCell(0);
    nameCell.className = "px-3 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white";
    nameCell.textContent = setName;

    const yearCell = row.insertCell(1);
    yearCell.className = "px-3 py-2";
    yearCell.textContent = setYear;

    const sportCell = row.insertCell(2);
    sportCell.className = "px-3 py-2";
    sportCell.textContent = setSport;

    // Add the Select button cell
    const selectCell = row.insertCell(3);
    selectCell.className = "px-3 py-2 text-right";

    // Create the Select button
    const selectButton = document.createElement('button');
    selectButton.type = "button";
    selectButton.className = "px-3 py-2 w-auto bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800";
    selectButton.textContent = "Select";

    // Add click event to select button
    selectButton.addEventListener('click', function() {
        // Fill the set input with the selected set name
        document.getElementById('set').value = setName;

        // Advance to step 2 if you have implemented step navigation
        if (typeof stepperChangeStep === 'function') {
            stepperChangeStep(2);
        }
    });

    selectCell.appendChild(selectButton);
}