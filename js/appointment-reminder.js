import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

let currentPurokFilter = "all";
const searchInput = document.getElementById("searchInput");
const tableBody = document.getElementById("appointmentTableBody");
const mobileList = document.getElementById("mobileAppointmentList");

function formatPurok(p) { 
  return p ? p.toString().toUpperCase().replace("PUROk", "PRK").trim() : "N/A"; 
}

function formatDate(d) { 
  if (!d) return "No date";
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return "Invalid date";
  }
}

function showLoading() {
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;">Loading appointments...</td></tr>`;
  mobileList.innerHTML = "";
}

function showNoResults() {
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#666;">No appointments found.</td></tr>`;
  mobileList.innerHTML = `<div style="text-align:center;padding:3rem;color:#666;">No appointments found.</div>`;
}

// UPDATED: Improved setupAppointments function
function setupAppointments() {
  console.log("=== STARTING APPOINTMENTS SETUP ===");
  
  const appointmentsRef = ref(db, "appointments");
  showLoading();

  onValue(appointmentsRef, (snapshot) => {
    console.log("=== APPOINTMENTS SNAPSHOT ===");
    tableBody.innerHTML = "";
    mobileList.innerHTML = "";
    let list = [];

    const appointmentsData = snapshot.val();
    console.log("Raw appointments data:", appointmentsData);

    if (!appointmentsData) {
      console.log("No appointments data found");
      showNoResults();
      return;
    }

    const usersRef = ref(db, "users");
    onValue(usersRef, (usersSnapshot) => {
      const usersData = usersSnapshot.val();
      console.log("Raw users data:", usersData);

      Object.keys(appointmentsData).forEach(userId => {
        const userAppointments = appointmentsData[userId];
        console.log(`User ${userId} appointments:`, userAppointments);

        const userData = usersData ? usersData[userId] : null;
        
        // **IMPORTANT FIX: Get user information properly**
        let fullName = "No Name";
        let purok = "N/A";
        let contactNo = "N/A";
        let age = "N/A";
        let weeks = "N/A";

        if (userData) {
          // Try different possible locations for user info
          fullName = userData.fullName || 
                    userData.name || 
                    (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : "No Name");
          
          if (userData.pregnancyInfo) {
            purok = userData.pregnancyInfo.purok || "N/A";
            contactNo = userData.pregnancyInfo.contactNo || "N/A";
            weeks = userData.pregnancyInfo.weeksPregnant ? `${userData.pregnancyInfo.weeksPregnant} weeks` : "N/A";
          }
          
          // Get age from user data if available
          age = userData.age || userData.pregnancyInfo?.age || "N/A";
        }

        Object.keys(userAppointments).forEach(appointmentId => {
          const appointment = userAppointments[appointmentId];
          console.log(`Appointment ${appointmentId}:`, appointment);

          // **FIX: Use appointment fullName as fallback**
          const appointmentName = appointment.fullName || fullName;
          const appointmentAge = appointment.age || age;
          const status = appointment.status || "pending";
          
          console.log(`>>> Adding appointment for ${appointmentName} with status: ${status}`);
          
          list.push({
            userId,
            appointmentId,
            fullName: appointmentName, // Use appointment name first
            purok,
            contactNo,
            weeks,
            appointment: {
              ...appointment,
              age: appointmentAge
            },
            dateStr: formatDate(appointment.date),
            timeStr: appointment.time || "N/A",
            status: status
          });
        });
      });

      console.log(`Total appointments found: ${list.length}`, list);

      if (list.length === 0) {
        showNoResults();
        return;
      }

      // Sort by date and name
      list.sort((a, b) => {
        const dateA = new Date(a.appointment.date || 0);
        const dateB = new Date(b.appointment.date || 0);
        if (dateA - dateB !== 0) return dateA - dateB;
        return a.fullName.localeCompare(b.fullName);
      });

      renderAppointments(list);
      setupButtonEventListeners();
      applyFilters();
      
    }, { onlyOnce: true });
  });
}

// NEW: Separate rendering function for better organization
function renderAppointments(list) {
  // Desktop Table
  tableBody.innerHTML = list.map(item => {
    let statusDisplay = '';
    if (item.status === 'pending') {
      statusDisplay = `
        <div class="action-buttons">
          <button class="btn-accept" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
            <i class="fas fa-check"></i> Accept
          </button>
          <button class="btn-decline" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
            <i class="fas fa-times"></i> Decline
          </button>
        </div>
      `;
    } else {
      statusDisplay = `
        <div class="status-display">
          <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
        </div>
      `;
    }

    return `
      <tr data-purok="${formatPurok(item.purok)}" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
        <td><strong>${item.fullName}</strong></td>
        <td>${item.appointment.age || "N/A"}</td>
        <td>${formatPurok(item.purok)}</td>
        <td>${item.contactNo}</td>
        <td style="text-align:center;">
          <div class="appointment-time">
            ${item.dateStr}<br>
            <small>${item.timeStr}</small>
          </div>
        </td>
        <td style="text-align:center;">
          ${statusDisplay}
        </td>
      </tr>
    `;
  }).join('');

  // Mobile Cards
  mobileList.innerHTML = list.map(item => {
    let actionButtons = '';
    if (item.status === 'pending') {
      actionButtons = `
        <div class="card-actions">
          <button class="btn-accept" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
            <i class="fas fa-check"></i> Accept
          </button>
          <button class="btn-decline" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
            <i class="fas fa-times"></i> Decline
          </button>
        </div>
      `;
    } else {
      actionButtons = `
        <div class="status-display">
          <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
        </div>
      `;
    }

    return `
      <div class="patient-card" data-userid="${item.userId}" data-appointmentid="${item.appointmentId}">
        <div class="card-header">
          <h4>${item.fullName}</h4>
          <span class="appointment-date">${item.dateStr} @ ${item.timeStr}</span>
        </div>
        <div class="card-body">
          <p><strong>Age:</strong> ${item.appointment.age || "N/A"}</p>
          <p><strong>Purok:</strong> ${formatPurok(item.purok)}</p>
          <p><strong>Contact:</strong> ${item.contactNo}</p>
          <p><strong>Weeks:</strong> ${item.weeks}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></p>
        </div>
        ${actionButtons}
      </div>
    `;
  }).join('');
}

// KEEP ALL THE REMAINING FUNCTIONS THE SAME (setupButtonEventListeners, acceptAppointment, etc.)
// Setup event listeners for buttons
function setupButtonEventListeners() {
  console.log("Setting up button event listeners...");
  
  // Remove any existing event listeners first
  document.querySelectorAll('.btn-accept').forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });
  
  document.querySelectorAll('.btn-decline').forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });

  // Accept buttons
  document.querySelectorAll('.btn-accept').forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("Accept button clicked!");
      
      const userId = this.getAttribute('data-userid');
      const appointmentId = this.getAttribute('data-appointmentid');
      const patientName = this.closest('tr')?.querySelector('strong')?.textContent || 
                         this.closest('.patient-card')?.querySelector('h4')?.textContent;
      
      console.log(`Accepting appointment: ${patientName}, User: ${userId}, Appointment: ${appointmentId}`);
      
      acceptAppointment(userId, appointmentId, patientName, this);
    });
  });

  // Decline buttons
  document.querySelectorAll('.btn-decline').forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("Decline button clicked!");
      
      const userId = this.getAttribute('data-userid');
      const appointmentId = this.getAttribute('data-appointmentid');
      const patientName = this.closest('tr')?.querySelector('strong')?.textContent || 
                         this.closest('.patient-card')?.querySelector('h4')?.textContent;
      
      console.log(`Declining appointment: ${patientName}, User: ${userId}, Appointment: ${appointmentId}`);
      
      showDeclineDialog(userId, appointmentId, patientName, this);
    });
  });
}

// Accept appointment with visual feedback
function acceptAppointment(userId, appointmentId, patientName, buttonElement) {
  console.log(`Starting accept process for ${patientName}`);
  
  if (confirm(`Are you sure you want to accept ${patientName}'s appointment?`)) {
    // Visual feedback - turn button green immediately
    if (buttonElement) {
      buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
      buttonElement.style.backgroundColor = '#28a745';
      buttonElement.style.opacity = '0.7';
      buttonElement.disabled = true;
      
      // Also disable the decline button in the same row/card
      const declineButton = buttonElement.closest('.action-buttons')?.querySelector('.btn-decline') || 
                           buttonElement.closest('.card-actions')?.querySelector('.btn-decline');
      if (declineButton) {
        declineButton.disabled = true;
        declineButton.style.opacity = '0.5';
      }
    }

    const updatePath = `appointments/${userId}/${appointmentId}`;
    const updateData = {
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    };
    
    console.log(`Updating Firebase at: ${updatePath}`, updateData);

    update(ref(db, updatePath), updateData)
      .then(() => {
        console.log("Appointment successfully accepted!");
        
        // Success - update UI
        if (buttonElement) {
          buttonElement.innerHTML = '<i class="fas fa-check"></i> Accepted';
          buttonElement.style.backgroundColor = '#1e7e34';
        }
        
        // Show success message
        showStatusMessage('Appointment accepted successfully!', 'success');
        
        // Update status display after a short delay
        setTimeout(() => {
          updateAppointmentDisplay(userId, appointmentId, 'confirmed');
        }, 1500);
      })
      .catch(err => {
        console.error("Update error:", err);
        // Reset button on error
        if (buttonElement) {
          buttonElement.innerHTML = '<i class="fas fa-check"></i> Accept';
          buttonElement.style.backgroundColor = '#28a745';
          buttonElement.style.opacity = '1';
          buttonElement.disabled = false;
        }
        showStatusMessage('Error: ' + err.message, 'error');
      });
  } else {
    console.log("Accept action cancelled by user");
  }
}

// Show decline reason dialog
function showDeclineDialog(userId, appointmentId, patientName, buttonElement) {
  // Store the button element for visual feedback
  window.currentDeclineButton = buttonElement;

  // Create modal for decline reason
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 25px; border-radius: 10px; width: 450px; max-width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
      <h3 style="margin-top: 0; color: #e74a3b; display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-times-circle"></i> Decline Appointment
      </h3>
      <p><strong>Patient:</strong> ${patientName}</p>
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">
          <i class="fas fa-comment-alt"></i> Reason for declining:
        </label>
        <textarea 
          id="declineReason" 
          placeholder="Please provide a reason for declining this appointment..."
          style="width: 100%; height: 120px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; resize: vertical; font-family: inherit;"
        ></textarea>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="cancelDecline" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button type="button" id="confirmDecline" style="padding: 10px 20px; background: #e74a3b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          <i class="fas fa-check"></i> Confirm Decline
        </button>
      </div>
    </div>
  `;
  
  modal.classList.add('decline-modal');
  document.body.appendChild(modal);

  // Event listeners for modal buttons
  modal.querySelector('#cancelDecline').addEventListener('click', function() {
    modal.remove();
    window.currentDeclineButton = null;
  });

  modal.querySelector('#confirmDecline').addEventListener('click', function() {
    const reasonInput = modal.querySelector('#declineReason');
    const reason = reasonInput ? reasonInput.value.trim() : 'No reason provided';

    if (!reason) {
      alert("Please provide a reason for declining the appointment.");
      return;
    }

    declineAppointment(userId, appointmentId, reason, modal);
  });

  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
      window.currentDeclineButton = null;
    }
  });

  // Focus on textarea
  setTimeout(() => {
    const textarea = modal.querySelector('#declineReason');
    if (textarea) textarea.focus();
  }, 100);
}

// Decline appointment with visual feedback
function declineAppointment(userId, appointmentId, reason, modal) {
  const buttonElement = window.currentDeclineButton;

  // Visual feedback - turn button red immediately
  if (buttonElement) {
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
    buttonElement.style.backgroundColor = '#dc3545';
    buttonElement.style.opacity = '0.7';
    buttonElement.disabled = true;
    
    // Also disable the accept button in the same row/card
    const acceptButton = buttonElement.closest('.action-buttons')?.querySelector('.btn-accept') || 
                        buttonElement.closest('.card-actions')?.querySelector('.btn-accept');
    if (acceptButton) {
      acceptButton.disabled = true;
      acceptButton.style.opacity = '0.5';
    }
  }

  const updatePath = `appointments/${userId}/${appointmentId}`;
  
  const updateData = {
    status: 'declined',
    declineReason: reason,
    declinedAt: new Date().toISOString()
  };

  update(ref(db, updatePath), updateData)
    .then(() => {
      // Success - update UI
      if (buttonElement) {
        buttonElement.innerHTML = '<i class="fas fa-times"></i> Declined';
        buttonElement.style.backgroundColor = '#c82333';
      }
      
      // Remove modal
      if (modal) modal.remove();
      window.currentDeclineButton = null;
      
      // Show success message
      showStatusMessage('Appointment declined successfully!', 'error');
      
      // Update status display after a short delay
      setTimeout(() => {
        updateAppointmentDisplay(userId, appointmentId, 'declined');
      }, 1500);
    })
    .catch(err => {
      console.error("Update error:", err);
      // Reset button on error
      if (buttonElement) {
        buttonElement.innerHTML = '<i class="fas fa-times"></i> Decline';
        buttonElement.style.backgroundColor = '#dc3545';
        buttonElement.style.opacity = '1';
        buttonElement.disabled = false;
      }
      showStatusMessage('Error: ' + err.message, 'error');
    });
}

// Update the appointment display after status change
function updateAppointmentDisplay(userId, appointmentId, status) {
  console.log(`Updating display for appointment: ${appointmentId} to status: ${status}`);
  
  // Update desktop table
  const row = document.querySelector(`tr[data-userid="${userId}"][data-appointmentid="${appointmentId}"]`);
  if (row) {
    const actionCell = row.querySelector('td:last-child');
    if (actionCell) {
      actionCell.innerHTML = `<div class="status-display"><span class="status-badge status-${status}">${status.toUpperCase()}</span></div>`;
      console.log("Desktop table updated");
    }
  }

  // Update mobile cards
  const card = document.querySelector(`.patient-card[data-userid="${userId}"][data-appointmentid="${appointmentId}"]`);
  if (card) {
    // Update status in card body
    const statusElement = card.querySelector('.card-body p:nth-child(5) span');
    if (statusElement) {
      statusElement.textContent = status.toUpperCase();
      statusElement.className = `status-badge status-${status}`;
    }

    // Replace action buttons with status
    const actionsDiv = card.querySelector('.card-actions');
    if (actionsDiv) {
      actionsDiv.innerHTML = `<div class="status-display"><span class="status-badge status-${status}">${status.toUpperCase()}</span></div>`;
      console.log("Mobile card updated");
    }
  }
}

// Show status message
function showStatusMessage(message, type) {
  // Remove existing message
  const existingMessage = document.querySelector('.status-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `status-message status-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
  `;

  if (type === 'success') {
    messageDiv.style.backgroundColor = '#28a745';
  } else {
    messageDiv.style.backgroundColor = '#dc3545';
  }

  document.body.appendChild(messageDiv);

  // Auto remove after 3 seconds
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 300);
  }, 3000);
}

function applyFilters() {
  const term = searchInput.value.trim().toLowerCase();
  const rows = document.querySelectorAll("#appointmentTableBody tr");
  const cards = document.querySelectorAll(".patient-card");

  let visible = 0;

  rows.forEach(row => {
    const name = row.querySelector("strong")?.textContent.toLowerCase() || "";
    const purok = row.dataset.purok || "";
    const matchPurok = currentPurokFilter === "all" || purok === currentPurokFilter;
    const matchSearch = term === "" || name.includes(term);
    row.style.display = matchPurok && matchSearch ? "" : "none";
    if (matchPurok && matchSearch) visible++;
  });

  cards.forEach(card => {
    const name = card.querySelector("h4")?.textContent.toLowerCase() || "";
    const purokElement = card.querySelector("p:nth-child(2)");
    const purok = purokElement ? purokElement.textContent.replace("Purok:", "").replace("Purok", "").trim() : "";
    const match = (currentPurokFilter === "all" || purok.includes(currentPurokFilter)) && (term === "" || name.includes(term));
    card.style.display = match ? "block" : "none";
    if (match) visible++;
  });

  if (visible === 0 && (rows.length > 0 || cards.length > 0)) {
    showNoResults();
  }
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  console.log("=== INITIALIZING APPOINTMENT REMINDER ===");
  setupAppointments();

  // Purok dropdown
  document.getElementById("purokDropdown").addEventListener("click", e => {
    e.stopPropagation();
    document.querySelector(".dropdown-menu").classList.toggle("show");
  });

  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
      document.getElementById("selectedPurokText").textContent = item.textContent;
      currentPurokFilter = item.dataset.purok;
      applyFilters();
      document.querySelector(".dropdown-menu").classList.remove("show");
    });
  });

  document.addEventListener("click", () => {
    document.querySelector(".dropdown-menu")?.classList.remove("show");
  });

  searchInput.addEventListener("input", () => {
    setTimeout(applyFilters, 300);
  });
});