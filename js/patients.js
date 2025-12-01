import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:4f3599203cc4ef380ef083"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let allPatientsData = {};
let currentPurokFilter = "all";
let appointmentsData = [];
let pendingAppointmentsCount = 0;

const searchInput = document.getElementById("searchInput");
const patientTableBody = document.getElementById("patientTableBody");
const mobilePatientList = document.getElementById("mobilePatientList");
const purokDropdownMenu = document.querySelector('.dropdown-menu');
const appointmentButton = document.querySelector('.btn-appointment');

// Debounce
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Loading & No Results
function showLoading() {
  patientTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;">Loading patients...</td></tr>`;
  mobilePatientList.innerHTML = "";
}

function showNoResults() {
  const msg = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:#666;">No patients found.</td></tr>`;
  patientTableBody.innerHTML = msg;
  mobilePatientList.innerHTML = `<div style="text-align:center;padding:3rem;color:#666;">No patients found.</div>`;
}

// Determine Risk Level from BP
function determineRiskLevel(p) {
  if (!p.bloodPressure) return 'low';
  const systolic = parseInt(p.bloodPressure.split('/')[0]);
  if (systolic >= 140) return 'high';
  if (systolic >= 130) return 'medium';
  return 'low';
}

// Format Purok
function formatPurok(purok) {
  if (!purok) return "N/A";
  return purok.toString().toUpperCase().replace("PUROK", "PRK").trim();
}

// Format Date and Time
function formatDateTime(d) {
  if (!d) return "N/A";
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ' ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (e) {
    return "Invalid date";
  }
}

// Get MOST RECENT appointment status and action date/time based on ACTION TIMESTAMP
function getMostRecentAppointmentInfo(userId) {
  const userAppointments = appointmentsData.filter(apt => apt.userId === userId);
  
  if (userAppointments.length === 0) {
    return {
      badge: '<span class="status-badge status-none">No Appointment</span>',
      actionDateTime: 'N/A',
      status: 'none',
      appointmentDate: 'N/A'
    };
  }
  
  // Filter out appointments without action timestamps and find the most recent one
  const appointmentsWithActions = userAppointments.filter(apt => 
    apt.confirmedAt || apt.declinedAt
  );
  
  let mostRecentAppointment = null;
  
  if (appointmentsWithActions.length > 0) {
    // Find the appointment with the most recent action timestamp
    mostRecentAppointment = appointmentsWithActions.reduce((latest, current) => {
      const latestTimestamp = latest.confirmedAt || latest.declinedAt;
      const currentTimestamp = current.confirmedAt || current.declinedAt;
      
      return new Date(currentTimestamp) > new Date(latestTimestamp) ? current : latest;
    });
  } else {
    // If no actions yet, show the most recent pending appointment
    mostRecentAppointment = userAppointments.reduce((latest, current) => {
      const latestDate = new Date(latest.date || 0);
      const currentDate = new Date(current.date || 0);
      return currentDate > latestDate ? current : latest;
    });
  }
  
  const status = mostRecentAppointment.status || 'pending';
  
  // Get action date and time from the MOST RECENT appointment
  let actionDateTime = "N/A";
  if (status === 'confirmed' && mostRecentAppointment.confirmedAt) {
    actionDateTime = formatDateTime(mostRecentAppointment.confirmedAt);
  } else if (status === 'declined' && mostRecentAppointment.declinedAt) {
    actionDateTime = formatDateTime(mostRecentAppointment.declinedAt);
  }
  
  return {
    badge: `<span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`,
    actionDateTime: actionDateTime,
    status: status,
    appointmentDate: mostRecentAppointment.date ? formatDateTime(mostRecentAppointment.date) : 'N/A'
  };
}

// Count pending appointments and update notification badge
function updateAppointmentNotification() {
  // Count pending appointments
  pendingAppointmentsCount = appointmentsData.filter(apt => apt.status === 'pending').length;
  
  console.log(`Pending appointments: ${pendingAppointmentsCount}`);
  
  // Update notification badge on appointment button
  const notificationBadge = document.querySelector('.notification-badge');
  
  if (pendingAppointmentsCount > 0) {
    // Create badge if it doesn't exist
    if (!notificationBadge) {
      const badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.textContent = pendingAppointmentsCount > 99 ? '99+' : pendingAppointmentsCount.toString();
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #dc3545;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      `;
      
      // Find the appointment button and add badge
      const appointmentBtn = document.querySelector('.btn-appointment');
      if (appointmentBtn) {
        appointmentBtn.style.position = 'relative';
        appointmentBtn.appendChild(badge);
      }
    } else {
      // Update existing badge
      notificationBadge.textContent = pendingAppointmentsCount > 99 ? '99+' : pendingAppointmentsCount.toString();
      notificationBadge.style.display = 'flex';
    }
  } else {
    // Hide badge if no pending appointments
    if (notificationBadge) {
      notificationBadge.style.display = 'none';
    }
  }
}

// Add CSS for pulse animation
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  .btn-appointment {
    position: relative;
  }
  
  .notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #dc3545;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 2s infinite;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 10;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 12px;
    text-align: center;
    min-width: 80px;
    color: white;
  }
  
  .status-confirmed {
    background-color: #28a745;
  }
  
  .status-declined {
    background-color: #dc3545;
  }
  
  .status-pending {
    background-color: #ffc107;
    color: #212529;
  }
  
  .status-none {
    background-color: #6c757d;
  }

  .action-time {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  .latest-indicator {
    background-color: #007bff;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    margin-left: 5px;
  }
`;
document.head.appendChild(notificationStyle);

// Fetch appointments data
function fetchAppointments() {
  const appointmentsRef = ref(db, 'appointments');
  onValue(appointmentsRef, (snapshot) => {
    const data = snapshot.val();
    appointmentsData = [];
    
    if (data) {
      for (let userId in data) {
        for (let appointmentId in data[userId]) {
          const appointment = data[userId][appointmentId];
          appointmentsData.push({
            id: appointmentId,
            userId: userId,
            ...appointment
          });
        }
      }
    }
    
    console.log('Appointments loaded:', appointmentsData);
    
    // Update notification badge
    updateAppointmentNotification();
    
    // Re-render when appointments update
    if (patientTableBody.innerHTML !== '') {
      setupPatientTable();
    }
  });
}

// Main Table & Cards Renderer
function setupPatientTable() {
  const patientsRef = ref(db, "users");
  showLoading();

  onValue(patientsRef, (snapshot) => {
    patientTableBody.innerHTML = "";
    mobilePatientList.innerHTML = "";
    allPatientsData = {};

    if (!snapshot.exists()) {
      showNoResults();
      return;
    }

    let patientsArray = [];

    snapshot.forEach((child) => {
      const userId = child.key;
      const userData = child.val();
      const p = userData.pregnancyInfo || {};
      
      if (Object.keys(p).length === 0) return;

      const fullName = `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''}`.trim() || "No Name";
      const weeks = p.weeksPregnant ? `${p.weeksPregnant} weeks` : "N/A";
      const risk = determineRiskLevel(p);

      patientsArray.push({ 
        userId, 
        fullName, 
        p, 
        weeks, 
        risk
      });
      allPatientsData[userId] = p;
    });

    if (patientsArray.length === 0) {
      showNoResults();
      return;
    }

    patientsArray.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Desktop Table
    patientsArray.forEach(data => {
      const row = document.createElement("tr");
      row.dataset.userId = data.userId;
      row.dataset.purok = formatPurok(data.p.purok);

      const appointmentInfo = getMostRecentAppointmentInfo(data.userId);

      row.innerHTML = `
        <td>
          <div class="patient-name">${data.fullName}</div>
        </td>
        <td>${data.p.age || "N/A"}</td>
        <td>${formatPurok(data.p.purok)}</td>
        <td>${data.p.contactNo || "N/A"}</td>
        <td>
          ${appointmentInfo.badge}
        </td>
        <td style="text-align:center;">
          <div class="action-time">
            ${appointmentInfo.actionDateTime}
          </div>
        </td>
        <td class="action-cell">
        <div class="card-actions">
          <div class="patient-actions">
            <button class="view-btn-icon" data-userid="${data.userId}" title="View Patient Record">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
        </td>
      `;
      patientTableBody.appendChild(row);
    });

    // Mobile Cards
    mobilePatientList.innerHTML = patientsArray.map(data => {
      const appointmentInfo = getMostRecentAppointmentInfo(data.userId);
      
      return `
      <div class="patient-card">
        <div class="card-header">
          <h4>${data.fullName}</h4>
          <span class="risk-badge risk-${data.risk}">${data.risk.toUpperCase()} RISK</span>
        </div>
        <div class="card-body">
          <p><strong>Age:</strong> ${data.p.age || "N/A"}</p>
          <p><strong>Purok:</strong> ${formatPurok(data.p.purok)}</p>
          <p><strong>Contact:</strong> ${data.p.contactNo || "N/A"}</p>
          <p><strong>Current Appointment Status:</strong> ${appointmentInfo.badge.replace(/<[^>]*>/g, '')}</p>
          <p><strong>Last Action Date & Time:</strong> ${appointmentInfo.actionDateTime}</p>
          ${appointmentInfo.status !== 'none' ? `<p><strong>Appointment Date:</strong> ${appointmentInfo.appointmentDate}</p>` : ''}
        </div>
        <div class="card-actions">
          <div class="patient-actions">
            <button class="btn-view-record" data-userid="${data.userId}">
              <i class="fas fa-eye"></i> View Patient Record
            </button>
          </div>
        </div>
      </div>
    `}).join('');

    applyPurokFilter(currentPurokFilter);
    setupActionButtons();
    setupPatientRecordButtons();
  });
}

// Setup patient record buttons
// Setup patient record buttons - SIMPLE VERSION
function setupPatientRecordButtons() {
  console.log("🔄 Setting up patient record buttons...");
  
  // Remove any existing event listeners first
  document.querySelectorAll('.view-btn-icon').forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });

  // Add new event listeners
  document.querySelectorAll('.view-btn-icon').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const userId = this.getAttribute('data-userid');
      console.log(`👁️ View button clicked for user: ${userId}`);
      
      if (userId && userId !== "null" && userId !== "undefined") {
        console.log(`🚀 Redirecting to patient_history.html?patientId=${userId}`);
        window.location.href = `patient_history.html?patientId=${userId}`;
      } else {
        console.error("❌ No valid user ID found");
        alert("Error: Cannot find patient information");
      }
    });
  });

  console.log(`✅ Setup ${document.querySelectorAll('.view-btn-icon').length} patient record buttons`);
}

// Delete Patient
window.deletePatient = function(userId) {
  if (confirm("Are you sure you want to delete this patient?")) {
    remove(ref(db, `users/${userId}/pregnancyInfo`))
      .then(() => alert("Patient deleted successfully"))
      .catch(err => alert("Error: " + err.message));
  }
};

// Edit function
function editPatient(id) { 
  window.location.href = `edit-patient.html?id=${id}`; 
}

function setupActionButtons() {
  document.querySelectorAll('.action-edit').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); editPatient(btn.dataset.userid); };
  });
}

// Filter & Search
function applyPurokFilter(filter) {
  currentPurokFilter = filter;
  const term = searchInput.value.trim().toLowerCase();
  const rows = document.querySelectorAll('#patientTableBody tr');
  const cards = document.querySelectorAll('.patient-card');

  let visible = 0;

  rows.forEach(row => {
    const matchesPurok = filter === "all" || row.dataset.purok === filter;
    const name = row.querySelector('.patient-name')?.textContent.toLowerCase() || "";
    const matchesSearch = term === "" || name.includes(term);
    row.style.display = (matchesPurok && matchesSearch) ? "" : "none";
    if (matchesPurok && matchesSearch) visible++;
  });

  cards.forEach(card => {
    const name = card.querySelector('h4').textContent.toLowerCase();
    const purok = card.querySelector('.card-body p:nth-child(2)')?.textContent.replace('Purok:', '').trim() || "";
    const matches = (filter === "all" || purok.includes(filter)) && (term === "" || name.includes(term));
    card.style.display = matches ? "block" : "none";
    if (matches) visible++;
  });

  if (visible === 0 && (rows.length > 0 || cards.length > 0)) showNoResults();
}

// Initialize everything
window.addEventListener("DOMContentLoaded", () => {
  // Fetch appointments data first
  fetchAppointments();
  setupPatientTable();

  // Dropdown
  document.getElementById("purokDropdown").addEventListener("click", e => {
    e.stopPropagation();
    purokDropdownMenu.classList.toggle("show");
  });

  purokDropdownMenu.addEventListener("click", e => {
    if (e.target.classList.contains("dropdown-item")) {
      const val = e.target.dataset.purok;
      document.getElementById("selectedPurokText").textContent = e.target.textContent;
      applyPurokFilter(val);
      purokDropdownMenu.classList.remove("show");
    }
  });

  document.addEventListener("click", () => purokDropdownMenu.classList.remove("show"));

  searchInput.addEventListener("input", debounce(() => applyPurokFilter(currentPurokFilter), 300));

  // Add reset filters button if needed
  const resetBtn = document.getElementById("resetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      searchInput.value = "";
      document.getElementById("selectedPurokText").textContent = "All Purok";
      applyPurokFilter("all");
    });
  }
});