import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:4f3599203cc4ef380ef083",
  measurementId: "G-GMSC9PZX8Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let allUsersData = {};
let currentFilter = "all";
const searchInput = document.getElementById("searchInput");

// ======================================================
// AUTHENTICATION CHECK
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    console.log("✅ User authenticated:", user.email);
    setupUserTable(); // Load users only after auth check
  }
});

// ======================================================
// LOGOUT FUNCTIONALITY
// ======================================================
document.getElementById('logoutLink').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// ======================================================
// PUROK DROPDOWN FUNCTIONALITY
// ======================================================
function setupPurokDropdown() {
  const purokDropdown = document.getElementById('purokDropdown');
  const purokDropdownMenu = document.getElementById('purokDropdownMenu');

  // Define purok choices
  const purokChoices = [
    'All Purok',
    'Purok 1A',
    'Purok 1B', 
    'Purok 1C',
    'Purok 2',
    'Purok 3',
    'Purok 4',
    'Purok 5'
  ];

  // Populate dropdown menu with purok choices
  purokChoices.forEach(purok => {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.textContent = purok;
    option.addEventListener('click', () => {
      purokDropdown.textContent = purok;
      const selectedPurok = purok === 'All Purok' ? 'all' : purok;
      applyPurokFilter(selectedPurok);
    });
    purokDropdownMenu.appendChild(option);
  });

  // Toggle dropdown visibility
  purokDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    purokDropdownMenu.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    purokDropdownMenu.classList.remove('show');
  });
}

// ======================================================
// LOAD TABLE USERS
// ======================================================
function setupUserTable() {
  const userTableBody = document.getElementById("userTableBody");
  const usersRef = ref(db, "users");

  console.log("🔄 Loading users from Firebase...");
  
  onValue(usersRef, (snapshot) => {
    userTableBody.innerHTML = "";
    allUsersData = {};

    if (!snapshot.exists()) {
      console.log("ℹ️ No users found in database");
      userTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center">No Users found</td></tr>`;
      return;
    }

    console.log(`✅ Found ${snapshot.size} users`);
    
    snapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key;
      const user = childSnapshot.val();
      const info = user.pregnancyInfo || {};

      allUsersData[userId] = info;

      const row = document.createElement("tr");
      row.dataset.userId = userId;
      row.dataset.purok = formatPurok(info.purok);

      row.innerHTML = `
        <td>${info.firstName || "N/A"}</td>
        <td>${info.middleName || "N/A"}</td>
        <td>${info.lastName || "N/A"}</td>
        <td>${formatPurok(info.purok)}</td>
        <td>${info.status || "N/A"}</td>
        <td>
          <button class="action-btn view-btn" data-userid="${userId}">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      `;

      userTableBody.appendChild(row);
    });

    setupPurokDropdown(); // Initialize dropdown after loading users
    applyPurokFilter(currentFilter);
    setupViewButtons();
    
    console.log("✅ Users table loaded successfully");
  }, (error) => {
    console.error("❌ Error loading users:", error);
    userTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red">Error loading users: ${error.message}</td></tr>`;
  });
}

// ======================================================
// VIEW USER MODAL
// ======================================================
function viewUser(userId) {
  const modal = document.getElementById("userModal");
  const modalContent = document.getElementById("modalUserInfo");

  if (!allUsersData[userId]) {
    console.log("❌ User not found:", userId);
    return;
  }

  const user = allUsersData[userId];

  modal.classList.remove("hidden");

  modalContent.innerHTML = `
    <div class="user-details">
      <div class="user-detail-item"><strong>First Name:</strong><span>${user.firstName || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Middle Name:</strong><span>${user.middleName || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Last Name:</strong><span>${user.lastName || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Purok:</strong><span>${formatPurok(user.purok)}</span></div>
      <div class="user-detail-item"><strong>Status:</strong><span>${user.status || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Contact:</strong><span>${user.contactNo || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Email:</strong><span>${user.email || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Address:</strong><span>${user.address || 'N/A'}</span></div>
      <div class="user-detail-item"><strong>Age:</strong><span>${user.age || 'N/A'}</span></div>
    </div>
  `;
}

// ======================================================
// VIEW BUTTON CLICK
// ======================================================
function setupViewButtons() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.userid;
      viewUser(userId);
    });
  });
}

// ======================================================
// FILTER & SEARCH
// ======================================================
function applyPurokFilter(selectedPurok) {
  currentFilter = selectedPurok;
  const rows = document.querySelectorAll("#userTableBody tr");

  rows.forEach(row => {
    const name = (allUsersData[row.dataset.userId]?.firstName || "").toLowerCase();
    const rowPurok = row.dataset.purok;

    if (
      (selectedPurok === "all" || rowPurok === selectedPurok) &&
      (searchInput.value === "" || name.includes(searchInput.value.toLowerCase()))
    ) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function formatPurok(purok) {
  if (!purok) return "N/A";
  return purok.toUpperCase().replace("PUROK", "PRK").trim();
}

searchInput.addEventListener("input", () => applyPurokFilter(currentFilter));

// ======================================================
// INIT
// ======================================================
window.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 DOM loaded, initializing...");
  
  // Modal Close
  const modal = document.getElementById("userModal");
  const closeBtn = document.getElementById("modalClose");

  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { 
    if (e.target === modal) modal.classList.add("hidden"); 
  });

  // Floating Add User Button
  document.getElementById("addUserBtn").addEventListener("click", () => {
    window.location.href = "add_user.html";
  });
  
  console.log("✅ User page initialized");
});