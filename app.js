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

// User State
let currentUserUID = null;
let currentUserEmail = null;

// Initialize an empty array to store account objects
let accountsData = [];
let currentEditIndex = null; // Used to track if we are editing an existing account (Firestore doc ID)

// DOM elements for Auth and main content
let loginButton;
let logoutButton;
let userInfoDiv;
let accountFormContainer; // The form container
let mainTableContainer; // The div wrapping the table
let addNewAccountButtonElem; // Reference to the "Add New Account" button

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

function signInWithGoogle() {
    if (!firebase || !firebase.auth) {
        console.error("Firebase Auth SDK not loaded or initialized properly.");
        alert("Authentication service is not available. Please try again later.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log('User logged in via signInWithPopup:', user.displayName, user.email);
            // onAuthStateChanged will handle UI updates and data loading
        })
        .catch((error) => {
            console.error('Google Sign-In Error:', error);
            alert('Login failed: ' + error.message + ' (Code: ' + error.code + ')');
        });
}

function signOutUser() {
    if (!firebase || !firebase.auth) {
        console.error("Firebase Auth SDK not loaded or initialized properly.");
        alert("Authentication service is not available. Please try again later.");
        return;
    }
    firebase.auth().signOut()
        .then(() => {
            console.log('User signed out successfully via signOutUser.');
            // onAuthStateChanged will handle UI updates and data clearing
        })
        .catch((error) => {
            console.error('Sign-Out Error:', error);
            alert('Logout failed: ' + error.message);
        });
}


function loadAccountsFromFirestore() {
    if (!db) {
        console.error("Firestore instance (db) not available. Cannot load accounts.");
        accountsData = []; 
        renderAccounts();
        return; 
    }
    if (!currentUserUID) {
        console.log("No user logged in. Not loading accounts.");
        accountsData = [];
        renderAccounts();
        return;
    }

    db.collection('users').doc(currentUserUID).collection('accounts').get()
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
            console.log(`Successfully loaded ${accountsData.length} accounts from Firestore for user ${currentUserUID}.`);
        })
        .catch(error => {
            console.error(`Error loading accounts from Firestore for user ${currentUserUID}: `, error);
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
    const cardDisplayArea = document.getElementById('cardDisplayArea');

    if (!tableBody) {
        console.error("Table body 'accountsTableBody' not found!");
        // If table body isn't found, card area might also be problematic or not relevant
        // but we'll check for cardDisplayArea separately.
    }
    if (!cardDisplayArea) {
        console.error("Card display area 'cardDisplayArea' not found!");
    }

    // Clear existing content
    if (tableBody) tableBody.innerHTML = ''; 
    if (cardDisplayArea) cardDisplayArea.innerHTML = '';

    accountsData.sort((a, b) => a.index - b.index); 

    accountsData.forEach(account => {
        // --- Existing Table Row Rendering ---
        if (tableBody) {
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

            const notesCell = row.insertCell(); // Still created, but hidden by CSS
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
                handleDeleteAccount(account.id, account.accountName); 
            });
            actionsCell.appendChild(deleteButton);
        }

        // --- New Card Rendering ---
        if (cardDisplayArea) {
            const card = document.createElement('div');
            card.className = 'account-card';
            card.dataset.accountId = account.id;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'card-field';
            nameDiv.innerHTML = `<strong>Account Name:</strong> ${account.accountName}`;
            card.appendChild(nameDiv);
            
            // User-defined Index (optional to show in card, but good for reference)
            const indexDiv = document.createElement('div');
            indexDiv.className = 'card-field';
            indexDiv.innerHTML = `<strong>Index:</strong> ${account.index}`;
            card.appendChild(indexDiv);

            const starBonusDiv = document.createElement('div');
            starBonusDiv.className = 'card-field';
            starBonusDiv.innerHTML = `<strong>Star Bonus:</strong> ${account.starBonusTime ? new Date(account.starBonusTime).toLocaleString() : 'N/A'}`;
            card.appendChild(starBonusDiv);

            const memoDiv = document.createElement('div');
            memoDiv.className = 'card-field';
            memoDiv.innerHTML = `<strong>Memo:</strong> ${account.memo || ''}`;
            card.appendChild(memoDiv);

            const remainingTimeDiv = document.createElement('div');
            remainingTimeDiv.className = 'card-field';
            if (account.starBonusTime) {
                const remaining = calculateRemainingTime(account.starBonusTime);
                remainingTimeDiv.innerHTML = `<strong>Remaining:</strong> <span class="${remaining.class}">${remaining.text}</span>`;
            } else {
                remainingTimeDiv.innerHTML = '<strong>Remaining:</strong> N/A';
            }
            card.appendChild(remainingTimeDiv);
            
            // Notes (optional to show in card)
            const notesDiv = document.createElement('div');
            notesDiv.className = 'card-field';
            notesDiv.innerHTML = `<strong>Notes:</strong> ${account.notes || ''}`;
            card.appendChild(notesDiv);


            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            const editButtonCard = document.createElement('button');
            editButtonCard.textContent = 'Edit';
            editButtonCard.onclick = function() { handleEditAccount(account.id); };
            actionsDiv.appendChild(editButtonCard);

            const deleteButtonCard = document.createElement('button');
            deleteButtonCard.textContent = 'Delete';
            deleteButtonCard.className = 'delete-btn'; // Reuse existing class for styling
            deleteButtonCard.addEventListener('click', () => { handleDeleteAccount(account.id, account.accountName); });
            actionsDiv.appendChild(deleteButtonCard);

            card.appendChild(actionsDiv);
            cardDisplayArea.appendChild(card);
        }
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

function handleDeleteAccount(docId, accountName) {
    if (!confirm(`Are you sure you want to delete account: ${accountName} (ID: ${docId})?`)) {
        return;
    }

    if (!db || !currentUserUID) {
        alert('Database not available or user not logged in. Cannot delete account.');
        console.error("Database or user not available for delete operation.");
        return;
    }

    db.collection('users').doc(currentUserUID).collection('accounts').doc(docId).delete()
        .then(() => {
            console.log(`Account ${docId} (${accountName}) deleted from Firestore successfully for user ${currentUserUID}.`);
            accountsData = accountsData.filter(acc => acc.id !== docId);
            renderAccounts();
            alert(`Account "${accountName}" (ID: ${docId}) deleted successfully.`);
        })
        .catch(error => {
            console.error(`Error deleting account ${docId} from Firestore for user ${currentUserUID}: `, error);
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

    if (!db || !currentUserUID) {
        alert('Database not available or user not logged in. Cannot save account.');
        localFormErrorMessage.textContent = "Database/User not available. Account not saved.";
        return;
    }

    if (currentEditIndex !== null) { // Edit Mode
        const newDocumentId = String(accountDataObject.index);
        const oldDocumentId = currentEditIndex; 

        if (numericIndex !== parseInt(oldDocumentId, 10)) { 
             const isDuplicateInMemory = accountsData.some(acc => acc.index === numericIndex && acc.id !== oldDocumentId);
             if (isDuplicateInMemory) {
                localFormErrorMessage.textContent = "Error: This new user-defined Index already exists in current data. Please use a unique index.";
                return;
            }
        }
        
        let firestorePromise;
        const accountsCollectionRef = db.collection('users').doc(currentUserUID).collection('accounts');

        if (newDocumentId === oldDocumentId) {
            firestorePromise = accountsCollectionRef.doc(newDocumentId).set(accountDataObject, { merge: true });
        } else {
            const batch = db.batch();
            const oldDocRef = accountsCollectionRef.doc(oldDocumentId);
            const newDocRef = accountsCollectionRef.doc(newDocumentId);
            
            batch.delete(oldDocRef);
            batch.set(newDocRef, accountDataObject);
            firestorePromise = batch.commit();
        }

        firestorePromise.then(() => {
            console.log(`Account updated in Firestore for user ${currentUserUID}. Old ID: ${oldDocumentId}, New ID: ${newDocumentId}`);
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
            console.error(`Error updating account in Firestore for user ${currentUserUID}: `, error);
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

        db.collection('users').doc(currentUserUID).collection('accounts').doc(documentId).set(accountDataObject)
            .then(() => {
                console.log("Account added to Firestore successfully with ID:", documentId, "for user:", currentUserUID);
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
                console.error(`Error adding account to Firestore for user ${currentUserUID}: `, error);
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
    // Get Auth and Content DOM elements
    loginButton = document.getElementById('loginButton');
    logoutButton = document.getElementById('logoutButton');
    userInfoDiv = document.getElementById('userInfo');
    accountFormContainer = document.getElementById('accountFormContainer'); 
    mainTableContainer = document.querySelector('.table-container'); 
    addNewAccountButtonElem = document.getElementById('addNewAccountButton');


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
         if (typeof firebase.auth === 'undefined') {
            throw new Error("Firebase Auth SDK not loaded. Ensure firebase-auth-compat.js is included.");
        }
        db = firebase.firestore();
        console.log("Firebase and Firestore initialized successfully.");

        // Auth state listener
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                currentUserUID = user.uid;
                currentUserEmail = user.email; 
                console.log("User signed in:", currentUserEmail);

                if(userInfoDiv) userInfoDiv.textContent = `Logged in as: ${currentUserEmail}`;
                if(userInfoDiv) userInfoDiv.style.display = 'inline-block'; 
                if(loginButton) loginButton.style.display = 'none';
                if(logoutButton) logoutButton.style.display = 'inline-block'; 

                if(addNewAccountButtonElem) addNewAccountButtonElem.style.display = 'inline-block'; 
                // Table/Card visibility is handled by CSS media queries, but container should be block
                if(mainTableContainer) mainTableContainer.style.display = 'block'; 
                
                loadAccountsFromFirestore();
            } else {
                currentUserUID = null;
                currentUserEmail = null;
                console.log("User signed out.");

                if(userInfoDiv) userInfoDiv.textContent = '';
                if(userInfoDiv) userInfoDiv.style.display = 'none';
                if(loginButton) loginButton.style.display = 'inline-block'; 
                if(logoutButton) logoutButton.style.display = 'none';

                if(addNewAccountButtonElem) addNewAccountButtonElem.style.display = 'none';
                if(mainTableContainer) mainTableContainer.style.display = 'none';
                if(accountFormContainer) accountFormContainer.classList.add('hidden-form'); 

                accountsData = [];
                renderAccounts(); 
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase/Firestore:", error);
        alert("FATAL ERROR: Could not initialize Firebase or Firestore. App functionality will be severely limited. Check console for details.\nError: " + error.message);
        accountsData = [];
        renderAccounts();
        if(addNewAccountButtonElem) addNewAccountButtonElem.style.display = 'none';
        if(mainTableContainer) mainTableContainer.style.display = 'none';
        if(accountFormContainer) accountFormContainer.classList.add('hidden-form');
        if(loginButton) loginButton.style.display = 'inline-block'; 
        if(logoutButton) logoutButton.style.display = 'none';
        if(userInfoDiv) userInfoDiv.style.display = 'none';
    }

    // Attach Auth event listeners
    if (loginButton) {
        loginButton.addEventListener('click', signInWithGoogle);
    } else {
        console.error("Login button not found.");
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', signOutUser);
    } else {
        console.error("Logout button not found.");
    }


    // Event listeners for other app buttons
    const saveAccountButton = document.getElementById('saveAccountButton');
    if (saveAccountButton) {
        saveAccountButton.addEventListener('click', handleSaveAccount);
    } else {
        console.error("Save Account Button not found!");
    }

    const addNewAccountButtonElemListener = document.getElementById('addNewAccountButton'); 
    if (addNewAccountButtonElemListener) {
        addNewAccountButtonElemListener.addEventListener('click', () => {
            currentEditIndex = null; 
            if (typeof showForm === 'function') {
                showForm(false); 
            } else {
                console.error("showForm function not found for Add New Account button.");
            }
        });
    } else {
        console.error("Add New Account Button (for listener) not found!");
    }

    const calculateButton = document.getElementById('calculateStarBonusTimeButton');
    if (calculateButton) {
        calculateButton.addEventListener('click', handleCalculateStarBonusTime);
    } else {
        console.error("Calculate Star Bonus Time Button not found!");
    }
});
