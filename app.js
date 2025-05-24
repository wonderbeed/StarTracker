// Initialize an empty array to store account objects
let accountsData = [];
let currentEditIndex = null; // Used to track if we are editing an existing account

/**
 * Structure of an account object:
 * {
 *   index: Number,        // Unique identifier for the account
 *   accountName: String,  // Name of the account
 *   starBonusTime: String, // Date and time of the star bonus (e.g., "YYYY-MM-DDTHH:MM")
 *   memo: String,         // Optional memo for the account
 *   notes: String         // Optional additional notes
 * }
 */

// Expose a function to reset currentEditIndex from index.html
window.resetCurrentEditIndex = () => {
    currentEditIndex = null;
};

function calculateRemainingTime(targetTime) {
    const now = new Date();
    const target = new Date(targetTime);
    const diffMs = target - now;

    if (diffMs <= 0) {
        return { text: "Bonus available", class: "urgent" };
    }

    let diffSecs = Math.floor(diffMs / 1000);
    let diffMins = Math.floor(diffSecs / 60);
    let diffHours = Math.floor(diffMins / 60);
    const days = Math.floor(diffHours / 24);

    diffSecs %= 60;
    diffMins %= 60;
    diffHours %= 24;

    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    if (days > 0 || diffHours > 0) timeString += `${diffHours}h `;
    if (days > 0 || diffHours > 0 || diffMins > 0) timeString += `${diffMins}m`;
    if (timeString === "") timeString = `${diffSecs}s`;

    let urgencyClass = "normal";
    if (diffMs < 1 * 60 * 60 * 1000) { // Less than 1 hour
        urgencyClass = "urgent";
    } else if (diffMs < 6 * 60 * 60 * 1000) { // Less than 6 hours
        urgencyClass = "soon";
    }

    return { text: timeString.trim(), class: urgencyClass };
}

function renderAccounts() {
    const tableBody = document.getElementById('accountsTableBody');
    if (!tableBody) {
        console.error("Table body 'accountsTableBody' not found!");
        return;
    }
    tableBody.innerHTML = ''; 
    accountsData.sort((a, b) => a.index - b.index);

    accountsData.forEach(account => {
        const row = tableBody.insertRow();
        // ... (cells for index, name, starBonusTime, memo, remainingTime, notes as before) ...
        const indexCell = row.insertCell();
        indexCell.textContent = account.index;
        indexCell.className = 'columnIndex';

        const nameCell = row.insertCell();
        nameCell.textContent = account.accountName;

        const starBonusCell = row.insertCell();
        starBonusCell.textContent = account.starBonusTime ? new Date(account.starBonusTime).toLocaleString() : 'N/A';

        const memoCell = row.insertCell();
        memoCell.textContent = account.memo || '';

        const remainingTimeCell = row.insertCell();
        if (account.starBonusTime) {
            const remaining = calculateRemainingTime(account.starBonusTime);
            remainingTimeCell.textContent = remaining.text;
            remainingTimeCell.className = remaining.class;
        } else {
            remainingTimeCell.textContent = 'N/A';
            remainingTimeCell.className = 'normal';
        }

        const notesCell = row.insertCell();
        notesCell.textContent = account.notes || '';
        notesCell.className = 'columnNotes';

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.dataset.accountId = account.index;
        editButton.onclick = function() {
            handleEditAccount(account.index);
        };
        actionsCell.appendChild(editButton);
    });
}

function handleEditAccount(accountIndex) {
    const accountToEdit = accountsData.find(acc => acc.index === accountIndex);
    if (accountToEdit) {
        currentEditIndex = accountIndex; 
        if (typeof showForm === 'function') {
            showForm(true, accountToEdit);
        } else {
            console.error("showForm function not found.");
        }
    } else {
        console.error("Account not found for editing:", accountIndex);
    }
}

function handleSaveAccount(event) {
    event.preventDefault();

    const localFormErrorMessage = document.getElementById('formErrorMessage');
    const localAccountIndexInput = document.getElementById('accountIndexInput');
    const localAccountNameInput = document.getElementById('accountNameInput');
    const localAccountStarBonusTimeInput = document.getElementById('accountStarBonusTimeInput');
    const localAccountMemoInput = document.getElementById('accountMemoInput');
    const localAccountNotesInput = document.getElementById('accountNotesInput');

    if (!localAccountIndexInput || !localAccountNameInput || !localFormErrorMessage || !localAccountStarBonusTimeInput || !localAccountMemoInput || !localAccountNotesInput) {
        console.error("Essential form elements not found!");
        if (localFormErrorMessage) localFormErrorMessage.textContent = "Critical error: Form elements missing.";
        return;
    }

    const newNumericIndex = parseInt(localAccountIndexInput.value, 10);
    const accountName = localAccountNameInput.value.trim();
    const starBonusTime = localAccountStarBonusTimeInput.value;
    const memo = localAccountMemoInput.value.trim();
    const notes = localAccountNotesInput.value.trim();

    if (isNaN(newNumericIndex)) {
        localFormErrorMessage.textContent = "Error: Index must be a number.";
        return;
    }
    if (!accountName) {
        localFormErrorMessage.textContent = "Error: Account Name is required.";
        return;
    }

    if (currentEditIndex !== null) { // Edit Mode
        if (newNumericIndex !== currentEditIndex) { 
            const isDuplicateIndex = accountsData.some(acc => acc.index === newNumericIndex);
            if (isDuplicateIndex) {
                localFormErrorMessage.textContent = "Error: This new Index already exists. Please use a unique index.";
                return;
            }
        }
        const accountToUpdate = accountsData.find(acc => acc.index === currentEditIndex);
        if (accountToUpdate) {
            accountToUpdate.index = newNumericIndex;
            accountToUpdate.accountName = accountName;
            accountToUpdate.starBonusTime = starBonusTime;
            accountToUpdate.memo = memo;
            accountToUpdate.notes = notes;
        } else {
            localFormErrorMessage.textContent = "Error: Could not find original account to update.";
            return; 
        }
    } else { // Add Mode
        const isDuplicateIndex = accountsData.some(acc => acc.index === newNumericIndex);
        if (isDuplicateIndex) {
            localFormErrorMessage.textContent = "Error: Index already exists. Please use a unique index.";
            return;
        }
        const newAccount = {
            index: newNumericIndex,
            accountName: accountName,
            starBonusTime: starBonusTime,
            memo: memo,
            notes: notes
        };
        accountsData.push(newAccount);
    }

    localFormErrorMessage.textContent = ''; 
    renderAccounts();

    if (typeof clearAndHideForm === 'function') {
        clearAndHideForm(); 
    } else {
        console.error("clearAndHideForm function not found.");
        if (document.getElementById('accountForm')) document.getElementById('accountForm').reset();
        if(localFormErrorMessage) localFormErrorMessage.textContent = '';
        if (document.getElementById('accountFormContainer')) document.getElementById('accountFormContainer').classList.add('hidden-form');
        window.resetCurrentEditIndex(); 
    }
}

function handleCalculateStarBonusTime() {
    const addDaysInput = document.getElementById('addDays');
    const addHoursInput = document.getElementById('addHours');
    const addMinutesInput = document.getElementById('addMinutes');
    const accountStarBonusTimeInput = document.getElementById('accountStarBonusTimeInput');

    if (!addDaysInput || !addHoursInput || !addMinutesInput || !accountStarBonusTimeInput) {
        console.error("Duration input fields or star bonus time input not found!");
        return;
    }

    const days = parseInt(addDaysInput.value, 10) || 0;
    const hours = parseInt(addHoursInput.value, 10) || 0;
    const minutes = parseInt(addMinutesInput.value, 10) || 0;

    const now = new Date();
    now.setDate(now.getDate() + days);
    now.setHours(now.getHours() + hours);
    now.setMinutes(now.getMinutes() + minutes);

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');

    accountStarBonusTimeInput.value = `${year}-${month}-${day}T${h}:${m}`;

    // Clear the duration input fields
    addDaysInput.value = '';
    addHoursInput.value = '';
    addMinutesInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const saveAccountButton = document.getElementById('saveAccountButton');
    if (saveAccountButton) {
        saveAccountButton.addEventListener('click', handleSaveAccount);
    } else {
        console.error("Save Account Button not found!");
    }

    const addNewAccountButton = document.getElementById('addNewAccountButton');
    if (addNewAccountButton) {
        addNewAccountButton.addEventListener('click', () => {
            currentEditIndex = null; 
            if (typeof showForm === 'function') {
                showForm(false); 
            } else {
                console.error("showForm function not found for Add New Account button.");
            }
        });
    } else {
        console.error("Add New Account Button not found!");
    }

    const calculateButton = document.getElementById('calculateStarBonusTimeButton');
    if (calculateButton) {
        calculateButton.addEventListener('click', handleCalculateStarBonusTime);
    } else {
        console.error("Calculate Star Bonus Time Button not found!");
    }
    
    // Initial data for testing
    accountsData.push(
        { index: 1, accountName: "Main Acc", starBonusTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0,16), memo: "Primary", notes: "Check daily tasks and events." },
        { index: 2, accountName: "Alt Acc 1", starBonusTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString().slice(0,16), memo: "Secondary, for fun", notes: "Less critical." },
        { index: 3, accountName: "Test Bonus", starBonusTime: new Date(Date.now() - 10000).toISOString().slice(0,16), memo: "Expired bonus", notes: "Should be red." }
    );
    renderAccounts();
});
