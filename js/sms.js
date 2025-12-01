import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==============================
// Firebase Configuration
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:4f3599203cc4ef380ef083"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const elements = {
  patientBody: document.getElementById("patientBody"),
  purokFilter: document.getElementById("purokFilter"),
  smsModal: document.getElementById("smsModal"),
  messageInput: document.getElementById("messageInput"),
  confirmSendBtn: document.getElementById("confirmSendBtn"),
  smsStatus: document.getElementById("smsStatus"),
  singleSmsModal: document.getElementById("singleSmsModal"),
  singlePatientName: document.getElementById("singlePatientName"),
  singleMessageInput: document.getElementById("singleMessageInput"),
  singleSendBtn: document.getElementById("singleSendBtn"),
  singleSmsStatus: document.getElementById("singleSmsStatus")
};

// State
let state = {
  patientsData: {},
  currentPurok: 'all',
  logs: []
};

// Debug: Check if elements exist
console.log("🔍 Checking DOM elements:", elements);

// Initialize App
init();

function init() {
  console.log("🚀 Initializing SMS page...");
  loadPatients();
  setupEventListeners();
}

// Load patients/users from Firebase
function loadPatients(purok = 'all') {
  state.currentPurok = purok;
  const usersRef = ref(db, 'users');

  console.log("🔄 Loading patients from Firebase...");

  onValue(usersRef, snapshot => {
    state.patientsData = {};
    
    if (!snapshot.exists()) {
      console.log("❌ No users found in database");
      renderPatientTable();
      return;
    }

    console.log(`✅ Found ${snapshot.size} users in database`);

    snapshot.forEach(childSnapshot => {
      const userId = childSnapshot.key;
      const userData = childSnapshot.val();
      
      // Debug: Log user data structure
      console.log(`👤 User ${userId}:`, userData);

      // Get pregnancyInfo or use main user data
      const user = userData.pregnancyInfo || userData || {};
      
      if (user.firstName || user.lastName) {
        state.patientsData[userId] = {
          firstName: user.firstName || "N/A",
          middleName: user.middleName || "",
          lastName: user.lastName || "N/A",
          purok: user.purok || "N/A",
          contactNo: user.contactNo || user.phone || "N/A",
          status: user.status || "Active"
        };
      }
    });

    console.log(`📊 Processed ${Object.keys(state.patientsData).length} patients`);
    renderPatientTable();
  }, (error) => {
    console.error("❌ Error loading patients:", error);
    elements.patientBody.innerHTML = '<tr><td colspan="4" style="color: red;">Error loading patients</td></tr>';
  });
}

// Format name (First + Middle Initial + Last)
function formatName(p) {
  const mi = p.middleName ? p.middleName.charAt(0) + '.' : '';
  return `${p.firstName || ''} ${mi} ${p.lastName || ''}`.trim().replace(/\s+/g, ' ');
}

// Format Purok
function formatPurok(purok) {
  if (!purok || purok === "N/A") return "N/A";
  const purokStr = purok.toString().toUpperCase();
  return purokStr.replace("PUROK", "PRK").replace(/\s+/g, ' ').trim();
}

// Render patient table - UPDATED WITH MAIL ICON
function renderPatientTable() {
  console.log("🔄 Rendering patient table...");
  
  const patients = Object.values(state.patientsData);
  let html = '';

  if (patients.length === 0) {
    html = '<tr><td colspan="4" style="text-align: center;">No patients found</td></tr>';
  } else {
    patients.forEach(patient => {
      const patientPurok = formatPurok(patient.purok);
      
      // Apply purok filter
      if (state.currentPurok === 'all' || patientPurok === state.currentPurok) {
        html += `
          <tr>
            <td>${formatName(patient)}</td>
            <td>${patientPurok}</td>
            <td>${patient.contactNo || 'N/A'}</td>
            <td>
              <button class='sms-icon-btn' 
                      data-phone='${patient.contactNo}' 
                      data-name='${formatName(patient)}'
                      title="Send SMS">
                <i class="fas fa-envelope"></i>
              </button>
            </td>
          </tr>`;
      }
    });

    if (html === '') {
      html = '<tr><td colspan="4" style="text-align: center;">No patients match the current filter</td></tr>';
    }
  }

  elements.patientBody.innerHTML = html;
  console.log(`📋 Rendered ${(html.match(/<tr>/g) || []).length} patient rows`);
  attachPatientButtons();
}

// Attach single SMS buttons - UPDATED
function attachPatientButtons() {
  const buttons = document.querySelectorAll('#patientBody .sms-icon-btn');
  console.log(`🔘 Found ${buttons.length} SMS buttons to attach`);
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log(`📱 SMS button clicked for: ${btn.dataset.name}`);
      openSingleSmsModal(btn.dataset.name, btn.dataset.phone);
    });
  });
}

// Open single SMS modal
function openSingleSmsModal(name, phone) {
  if (!elements.singleSmsModal) {
    console.error("❌ Single SMS modal not found");
    return;
  }

  elements.singlePatientName.textContent = name;
  elements.singleMessageInput.value = `Your checkup is tomorrow.`;
  elements.singleSmsStatus.textContent = '';
  elements.singleSmsModal.style.display = 'flex';

  elements.singleSendBtn.onclick = async () => {
    const msg = elements.singleMessageInput.value.trim();
    if(!msg) return alert('Enter a message');

    elements.singleSmsStatus.textContent = 'Sending...';

    const formattedNumber = formatPhoneNumber(phone);
    console.log(`📤 Sending SMS to ${name} (${formattedNumber})`);
    
    const result = await sendSms(formattedNumber, msg);

    elements.singleSmsStatus.textContent = result.success ? '✅ Sent' : `❌ Failed (${result.error || 'Unknown'})`;
    state.logs.push({ name, phone: formattedNumber, message: msg, success: result.success });
  };
}

// Send SMS to multiple patients
if (elements.confirmSendBtn) {
  elements.confirmSendBtn.onclick = async () => {
    const message = elements.messageInput.value.trim();
    if (!message) return alert("Please enter a message.");

    elements.smsStatus.innerHTML = 'Sending messages...<br>';

    const allPatients = Object.values(state.patientsData);

    const recipients = allPatients
      .filter(p => state.currentPurok === 'all' || formatPurok(p.purok) === state.currentPurok)
      .filter(p => p.contactNo && p.contactNo !== 'N/A')
      .map(p => ({
        name: formatName(p),
        phone: formatPhoneNumber(p.contactNo)
      }));

    console.log(`📨 Preparing to send to ${recipients.length} recipients`);

    if (!recipients.length) {
      elements.smsStatus.innerHTML = 'No patients with valid phone numbers.';
      return;
    }

    for (const r of recipients) {
      const response = await sendSms(r.phone, message);
      const statusText = response.success ? '✅ Sent' : `❌ Failed (${response.error || 'Unknown'})`;
      elements.smsStatus.innerHTML += `${r.name} (${r.phone}): ${statusText}<br>`;
      state.logs.push({ name: r.name, phone: r.phone, message, success: response.success });
    }

    setTimeout(() => { 
      if (elements.smsModal) elements.smsModal.style.display = 'none'; 
    }, 2000);
  };
}

// Format phone number to international
function formatPhoneNumber(number) {
  if (!number || number === 'N/A') return '';
  number = number.toString().trim();
  if (number.startsWith("0")) return "+63" + number.slice(1);
  if (!number.startsWith("+")) return "+" + number;
  return number;
}

// Send SMS via backend
async function sendSms(number, message) {
  try {
    console.log(`📡 Sending SMS to ${number}`);
    
    const response = await fetch('http://localhost:3001/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: number, text: message })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ SMS failed: ${errText}`);
      return { success: false, error: errText };
    }

    const data = await response.json();
    console.log(`✅ SMS sent successfully:`, data);
    return { success: data.success, response: data.response, error: data.error };
  } catch (err) {
    console.error('❌ SMS network error:', err);
    return { success: false, error: 'Cannot reach backend' };
  }
}

// Event listeners for modals & filter
function setupEventListeners() {
  // Purok Filter
  if (elements.purokFilter) {
    elements.purokFilter.addEventListener('change', e => {
      console.log(`🎯 Purok filter changed to: ${e.target.value}`);
      loadPatients(e.target.value);
    });
  } else {
    console.error("❌ Purok filter element not found");
  }

  // Modal close buttons
  document.querySelectorAll('.modal .close').forEach(span => {
    span.addEventListener('click', e => {
      e.target.closest('.modal').style.display = 'none';
    });
  });

  // Modal backdrop clicks
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}