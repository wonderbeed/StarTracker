// Database constants
const DB_NAME = 'ClashAccountsDB';
const STORE_NAME = 'accounts';
const DB_VERSION = 1;
let db; // To hold the database instance

// Initialize an empty array to store account objects (will be populated from DB)
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

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'index' });
                console.log(`Object store '${STORE_NAME}' created.`);
            }
        };

        request.onsuccess = (event) => {
            console.log('Database opened successfully.');
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Error opening database: ' + event.target.error);
        };
    });
}

function loadAccountsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error("Database not initialized at loadAccountsFromDB call.");
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = (event) => {
            console.log('Accounts loaded from DB:', event.target.result);
            resolve(event.target.result || []); // Resolve with empty array if result is undefined/null
        };

        getAllRequest.onerror = (event) => {
            console.error('Error loading accounts from DB:', event.target.error);
            reject('Error loading accounts: ' + event.target.error);
        };

        transaction.oncomplete = () => {
            console.log('Read transaction completed for loading accounts.');
        };
    });
}


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
        actionsCell.style.whiteSpace = 'nowrap'; // Prevent buttons from wrapping

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.dataset.accountId = account.index;
        editButton.onclick = function() {
            handleEditAccount(account.index);
        };
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn'; // For styling
        deleteButton.dataset.accountId = account.index;
        deleteButton.onclick = function() {
            handleDeleteAccount(account.index, account.accountName);
        };
        actionsCell.appendChild(deleteButton);
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

function handleDeleteAccount(accountIndex, accountName) {
    if (!confirm(`Are you sure you want to delete account: ${accountName} (Index: ${accountIndex})?`)) {
        return;
    }

    if (!db) {
        alert('Database not initialized. Cannot delete account.');
        console.error("Database not available for delete operation.");
        return;
    }

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const deleteRequest = store.delete(accountIndex);

    deleteRequest.onsuccess = () => {
        console.log(`Account with index ${accountIndex} deleted from DB successfully.`);
        accountsData = accountsData.filter(acc => acc.index !== accountIndex);
        renderAccounts();
        alert(`Account "${accountName}" (Index: ${accountIndex}) deleted successfully.`); // Optional feedback
    };

    deleteRequest.onerror = (event) => {
        console.error(`Error deleting account with index ${accountIndex} from DB:`, event.target.error);
        alert(`Failed to delete account "${accountName}" from database. Error: ${event.target.error.name}`);
    };

    transaction.onerror = (event) => {
        console.error('Transaction error while deleting account:', event.target.error);
        // This might catch broader transaction issues not caught by deleteRequest.onerror
        if (!deleteRequest.error) { // If deleteRequest itself didn't set a more specific error
             alert(`Database transaction failed while deleting account "${accountName}".`);
        }
    };

    transaction.oncomplete = () => {
        console.log('Delete account transaction completed for index:', accountIndex);
    };
}


function handleSaveAccount(event) {
    event.preventDefault();

    const localFormErrorMessage = document.getElementById('formErrorMessage');
    const localAccountIndexInput = document.getElementById('accountIndexInput');
    const localAccountNameInput = document.getElementById('accountNameInput');
    const localAccountStarBonusTimeInput = document.getElementById('accountStarBonusTimeInput');
    const localAccountMemoInput = document.getElementById('accountMemoInput');
    const localAccountNotesInput = document.getElementById('accountNotesInput');

    localFormErrorMessage.textContent = ''; // Clear previous errors

    if (!localAccountIndexInput || !localAccountNameInput || !localAccountStarBonusTimeInput || !localAccountMemoInput || !localAccountNotesInput) {
        console.error("Essential form elements not found!");
        localFormErrorMessage.textContent = "Critical error: Form elements missing.";
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

    const updatedAccountData = { 
        index: newNumericIndex,
        accountName: accountName,
        starBonusTime: starBonusTime,
        memo: memo,
        notes: notes
    };

    if (!db) {
        alert('Database not initialized. Cannot save account.');
        localFormErrorMessage.textContent = "Database not available. Account not saved.";
        return;
    }

    if (currentEditIndex !== null) { // Edit Mode
        if (updatedAccountData.index !== currentEditIndex) {
            const isDuplicateInMemory = accountsData.some(acc => acc.index === updatedAccountData.index && acc.index !== currentEditIndex);
            if (isDuplicateInMemory) {
                localFormErrorMessage.textContent = "Error: This new Index already exists in current data. Please use a unique index.";
                return;
            }
        }

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        let dbOperationPromise;

        if (updatedAccountData.index !== currentEditIndex) {
            dbOperationPromise = new Promise((resolve, reject) => {
                const deleteRequest = store.delete(currentEditIndex);
                deleteRequest.onsuccess = () => {
                    const addRequest = store.add(updatedAccountData);
                    addRequest.onsuccess = () => resolve({ type: 'add', event: addRequest.result }); 
                    addRequest.onerror = (event) => reject({from: 'add', error: event.target.error});
                };
                deleteRequest.onerror = (event) => reject({from: 'delete', error: event.target.error});
            });
        } else {
            dbOperationPromise = new Promise((resolve, reject) => {
                const putRequest = store.put(updatedAccountData);
                putRequest.onsuccess = () => resolve({ type: 'put', event: putRequest.result }); 
                putRequest.onerror = (event) => reject({from: 'put', error: event.target.error});
            });
        }

        dbOperationPromise.then((result) => {
            console.log('Account updated in DB successfully:', updatedAccountData, 'Operation type:', result.type);
            const originalIndexInArray = accountsData.findIndex(acc => acc.index === currentEditIndex);
            if (originalIndexInArray !== -1) {
                accountsData.splice(originalIndexInArray, 1); 
            }
            accountsData.push(updatedAccountData); 
            
            accountsData.sort((a, b) => a.index - b.index);
            renderAccounts();
            if (typeof clearAndHideForm === 'function') {
                clearAndHideForm(); 
            }
            localFormErrorMessage.textContent = '';
        }).catch(errorInfo => {
            console.error(`Error during DB operation (from ${errorInfo.from || 'unknown'}):`, errorInfo.error);
            localFormErrorMessage.textContent = `Failed to update account in database. Error: ${errorInfo.error ? errorInfo.error.name : 'Unknown'}`;
            if (errorInfo.error && errorInfo.error.name === 'ConstraintError') {
                localFormErrorMessage.textContent += ' (This index already exists in the database).';
            }
        });

        transaction.onerror = (event) => {
            console.error('Transaction error while updating account:', event.target.error);
            if (!localFormErrorMessage.textContent) { 
                localFormErrorMessage.textContent = 'Database transaction failed while updating.';
            }
        };
        transaction.oncomplete = () => {
            console.log('Update account transaction completed.');
        };

    } else { // Add Mode
        const isDuplicateInMemory = accountsData.some(acc => acc.index === updatedAccountData.index);
        if (isDuplicateInMemory) {
            localFormErrorMessage.textContent = "Error: Index already exists in current data. Please use a unique index.";
            return;
        }

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const addRequest = store.add(updatedAccountData);

        addRequest.onsuccess = () => {
            console.log('Account added to DB successfully:', updatedAccountData);
            accountsData.push(updatedAccountData);
            accountsData.sort((a, b) => a.index - b.index);
            renderAccounts();
            if (typeof clearAndHideForm === 'function') {
                clearAndHideForm(); 
            }
            localFormErrorMessage.textContent = '';
        };

        addRequest.onerror = (event) => {
            console.error('Error adding account to DB:', event.target.error);
            localFormErrorMessage.textContent = 'Failed to save account to database. Error: ' + event.target.error.name;
            if (event.target.error.name === 'ConstraintError') {
                localFormErrorMessage.textContent += ' (This index already exists in the database).';
            }
        };

        transaction.onerror = (event) => {
            console.error('Transaction error while adding account:', event.target.error);
            if (!addRequest.error) { 
                localFormErrorMessage.textContent = 'Database transaction failed while saving.';
            }
        };
        transaction.oncomplete = () => {
            console.log('Add account transaction completed.');
        };
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

    addDaysInput.value = '';
    addHoursInput.value = '';
    addMinutesInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    initDB().then(databaseInstance => {
        db = databaseInstance;
        console.log("Global 'db' variable set.");
        
        return loadAccountsFromDB(); 
    }).then(loadedAccounts => {
        accountsData = loadedAccounts;
        renderAccounts();
        console.log("Accounts loaded from DB and rendered.");
    }).catch(error => {
        console.error("Failed to initialize DB or load accounts:", error);
        accountsData = []; 
        renderAccounts(); 
        alert("Error: Could not initialize or load data from the database. Some features may not work correctly. Error: " + error);
    });

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
});
