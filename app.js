// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo9-yj8I_1zZaR37hBERwPQcU5bEFOftg",
  authDomain: "star-bonus-tracker.firebaseapp.com",
  projectId: "star-bonus-tracker",
  storageBucket: "star-bonus-tracker.firebasestorage.app",
  messagingSenderId: "367118210066",
  appId: "1:367118210066:web:a0a9e51597fffb351cf4cb",
  measurementId: "G-Q6MTX3EQ81"
};

// Firestore instance
let db;

// Initialize an empty array to store account objects
let accountsData = [];
let currentEditIndex = null; // Used to track if we are editing an existing account (Firestore doc ID)

/**
 * Structure of an account object (in-memory representation):
 * {
 *   id: String,           // Firestore document ID (which is String(index))
 *   index: Number,        // User-defined numeric index, should be unique
 *   accountName: String,
 *   starBonusTime: String, 
 *   memo: String,
 *   notes: String
 * }
 */

// Expose a function to reset currentEditIndex from index.html
window.resetCurrentEditIndex = () => {
    currentEditIndex = null;
};

function loadAccountsFromFirestore() {
    if (!db) {
        console.error("Firestore instance (db) not available. Cannot load accounts.");
        alert("Error: Database connection not available. Please try refreshing.");
        accountsData = []; 
        renderAccounts();
        return; 
    }

    db.collection('accounts').get()
        .then(querySnapshot => {
            const loadedAccounts = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const account = {
                    id: doc.id, 
                    index: parseInt(data.index, 10), 
                    accountName: data.accountName,
                    starBonusTime: data.starBonusTime,
                    memo: data.memo,
                    notes: data.notes
                };
                loadedAccounts.push(account);
            });
            accountsData = loadedAccounts;
            accountsData.sort((a, b) => a.index - b.index); 
            renderAccounts();
            console.log(`Successfully loaded ${accountsData.length} accounts from Firestore.`);
        })
        .catch(error => {
            console.error("Error loading accounts from Firestore: ", error);
            alert("Error loading accounts from the database. Displaying an empty list. Details: " + error.message);
            accountsData = [];
            renderAccounts();
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
        actionsCell.style.whiteSpace = 'nowrap'; 

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.dataset.accountId = account.id; 
        editButton.onclick = function() {
            handleEditAccount(account.id); 
        };
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', () => {
            handleDeleteAccount(account.index); // Pass numeric index as per this task's requirement
        });
        actionsCell.appendChild(deleteButton);
    });
}

function handleEditAccount(docId) { 
    const accountToEdit = accountsData.find(acc => acc.id === docId );
    if (accountToEdit) {
        currentEditIndex = docId; 
        if (typeof showForm === 'function') {
            showForm(true, accountToEdit); 
        } else {
            console.error("showForm function not found.");
        }
    } else {
        console.error("Account not found for editing with docId:", docId);
    }
}

function handleDeleteAccount(accountIndex) { // Parameter is numeric index
    // Find account name for confirmation message (optional but good UX)
    const accountToDelete = accountsData.find(acc => acc.index === accountIndex);
    const accountName = accountToDelete ? accountToDelete.accountName : `Index ${accountIndex}`;

    if (!confirm(`Are you sure you want to delete account: ${accountName} (Index: ${accountIndex})?`)) {
        return;
    }

    if (!db) {
        alert('Database not initialized. Cannot delete account.');
        console.error("Database not available for delete operation.");
        return;
    }

    const documentId = String(accountIndex); // Convert numeric index to string for Firestore document ID

    db.collection('accounts').doc(documentId).delete()
        .then(() => {
            console.log(`Account with ID ${documentId} deleted from Firestore successfully.`);
            accountsData = accountsData.filter(acc => acc.index !== accountIndex); // Filter by numeric index
            renderAccounts();
            alert(`Account "${accountName}" (Index: ${accountIndex}) deleted successfully.`);
        })
        .catch(error => {
            console.error(`Error deleting account with ID ${documentId} from Firestore: `, error);
            alert(`Failed to delete account "${accountName}". Error: ${error.message}`);
        });
}


function handleSaveAccount(event) {
    event.preventDefault();

    const localFormErrorMessage = document.getElementById('formErrorMessage');
    const localAccountIndexInput = document.getElementById('accountIndexInput'); 
    const localAccountNameInput = document.getElementById('accountNameInput');
    const localAccountStarBonusTimeInput = document.getElementById('accountStarBonusTimeInput');
    const localAccountMemoInput = document.getElementById('accountMemoInput');
    const localAccountNotesInput = document.getElementById('accountNotesInput');

    localFormErrorMessage.textContent = ''; 

    if (!localAccountIndexInput || !localAccountNameInput || !localAccountStarBonusTimeInput || !localAccountMemoInput || !localAccountNotesInput) {
        console.error("Essential form elements not found!");
        localFormErrorMessage.textContent = "Critical error: Form elements missing.";
        return;
    }

    const numericIndex = parseInt(localAccountIndexInput.value, 10); 
    const accountName = localAccountNameInput.value.trim();
    const starBonusTime = localAccountStarBonusTimeInput.value;
    const memo = localAccountMemoInput.value.trim();
    const notes = localAccountNotesInput.value.trim();

    if (isNaN(numericIndex)) {
        localFormErrorMessage.textContent = "Error: Index (numeric) is required.";
        return;
    }
    if (!accountName) {
        localFormErrorMessage.textContent = "Error: Account Name is required.";
        return;
    }

    const accountDataObject = { 
        index: numericIndex,
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

    if (currentEditIndex !== null) { // Edit Mode (currentEditIndex is Firestore doc ID, string)
        const newDocumentId = String(accountDataObject.index);
        const oldDocumentId = currentEditIndex; 

        // Check if the numeric index value itself has changed for the document ID
        // And if it has, check for in-memory duplicates for the new numeric index
        if (numericIndex !== parseInt(oldDocumentId, 10)) { 
             const isDuplicateInMemory = accountsData.some(acc => acc.index === numericIndex && acc.id !== oldDocumentId);
             if (isDuplicateInMemory) {
                localFormErrorMessage.textContent = "Error: This new user-defined Index already exists in current data. Please use a unique index.";
                return;
            }
        }
        
        let firestorePromise;

        if (newDocumentId === oldDocumentId) {
            firestorePromise = db.collection('accounts').doc(newDocumentId).set(accountDataObject, { merge: true });
        } else {
            const batch = db.batch();
            const oldDocRef = db.collection('accounts').doc(oldDocumentId);
            const newDocRef = db.collection('accounts').doc(newDocumentId);
            
            batch.delete(oldDocRef);
            batch.set(newDocRef, accountDataObject);
            firestorePromise = batch.commit();
        }

        firestorePromise.then(() => {
            console.log(`Account updated in Firestore. Old ID: ${oldDocumentId}, New ID: ${newDocumentId}`);
            const accountIndexInLocalData = accountsData.findIndex(acc => acc.id === oldDocumentId);
            if (accountIndexInLocalData !== -1) {
                accountsData.splice(accountIndexInLocalData, 1);
            }
            accountsData.push({ ...accountDataObject, id: newDocumentId }); 
            
            accountsData.sort((a, b) => a.index - b.index);
            renderAccounts();
            if (typeof clearAndHideForm === 'function') {
                clearAndHideForm(); 
            }
            localFormErrorMessage.textContent = '';
        }).catch(error => {
            console.error("Error updating account in Firestore: ", error);
            localFormErrorMessage.textContent = "Failed to update account in database. Error: " + error.message;
            if (error.code === 'already-exists' || (error.name && error.name === 'FirebaseError' && error.message.includes('ALREADY_EXISTS'))) { 
                localFormErrorMessage.textContent += " (The new index might already be in use by another account).";
            }
        });

    } else { // Add Mode
        const isDuplicateInMemory = accountsData.some(acc => acc.index === accountDataObject.index);
        if (isDuplicateInMemory) {
            localFormErrorMessage.textContent = "Error: User-defined Index already exists in current data. Please use a unique index.";
            return;
        }

        const documentId = String(accountDataObject.index); 

        db.collection('accounts').doc(documentId).set(accountDataObject)
            .then(() => {
                console.log("Account added to Firestore successfully with ID:", documentId);
                const accountForMemory = { ...accountDataObject, id: documentId };
                accountsData.push(accountForMemory);
                accountsData.sort((a, b) => a.index - b.index);
                renderAccounts();
                if (typeof clearAndHideForm === 'function') {
                    clearAndHideForm(); 
                }
                localFormErrorMessage.textContent = '';
            })
            .catch(error => {
                console.error("Error adding account to Firestore: ", error);
                localFormErrorMessage.textContent = "Failed to save account to database. Error: " + error.message;
                if (error.code === 'already-exists' || (error.name && error.name === 'FirebaseError' && error.message.includes('ALREADY_EXISTS'))) {
                     localFormErrorMessage.textContent += " (This index already exists in the database).";
                }
            });
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

    const existingStarBonusTimeString = accountStarBonusTimeInput.value;
    let baseDate;

    if (existingStarBonusTimeString) {
        const parsedDate = new Date(existingStarBonusTimeString);
        if (!isNaN(parsedDate.getTime())) {
            baseDate = parsedDate;
        } else {
            baseDate = new Date(); 
        }
    } else {
        baseDate = new Date(); 
    }

    const days = parseInt(addDaysInput.value, 10) || 0;
    const hours = parseInt(addHoursInput.value, 10) || 0;
    const minutes = parseInt(addMinutesInput.value, 10) || 0;

    baseDate.setDate(baseDate.getDate() + days);
    baseDate.setHours(baseDate.getHours() + hours);
    baseDate.setMinutes(baseDate.getMinutes() + minutes);

    const year = baseDate.getFullYear();
    const month = (baseDate.getMonth() + 1).toString().padStart(2, '0'); 
    const day = baseDate.getDate().toString().padStart(2, '0');
    const h = baseDate.getHours().toString().padStart(2, '0');
    const m = baseDate.getMinutes().toString().padStart(2, '0');

    accountStarBonusTimeInput.value = `${year}-${month}-${day}T${h}:${m}`;

    addDaysInput.value = '';
    addHoursInput.value = '';
    addMinutesInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize Firebase
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            throw new Error("Firebase SDK not loaded. Ensure firebase-app-compat.js is included.");
        }
        if (!firebase.apps.length) { 
            firebase.initializeApp(firebaseConfig);
        } else {
            firebase.app(); 
        }
        
        if (typeof firebase.firestore === 'undefined') {
             throw new Error("Firestore SDK not loaded. Ensure firebase-firestore-compat.js is included.");
        }
        db = firebase.firestore();
        console.log("Firebase and Firestore initialized successfully.");

        loadAccountsFromFirestore();

    } catch (error) {
        console.error("Error initializing Firebase/Firestore:", error);
        alert("FATAL ERROR: Could not initialize Firebase or Firestore. App functionality will be severely limited. Check console for details.\nError: " + error.message);
        accountsData = [];
        renderAccounts();
    }

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
