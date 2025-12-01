// ==============================
// Firebase Setup
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// ==============================
// URL parameter
// ==============================
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("patientId");

if (!patientId) {
  alert("No patient selected.");
  window.location.href = "patients.html";
}

// DB references
const userInfoRef = ref(db, `users/${patientId}/pregnancyInfo`);
const maternalRecordsRef = ref(db, `users/${patientId}/pregnancyInfo/maternalRecords/past_records`);
const bhwRecordsRef = ref(db, `users/${patientId}/pregnancyInfo/bhw_records`);

// Modal
const modal = document.getElementById("pastRecordsModal");
const modalContainer = document.getElementById("modalRecordsContainer");
const closeModal = document.getElementById("closeModal");

// ==============================
// LOAD PATIENT BASIC INFORMATION
// ==============================
onValue(userInfoRef, (snapshot) => {
  const info = snapshot.val() || {};

  const fullName = `${info.firstName || ""} ${info.middleName || ""} ${info.lastName || ""}`.trim();
  document.getElementById("patientName").textContent = fullName || "Unnamed Patient";

  let container = document.getElementById("pillContainer");
  container.innerHTML = "";

  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = `Status: ${info.status || "No status"}`;
  container.appendChild(pill);
});

// ==============================
// LOAD MATERNAL RECORDS
// ==============================
function loadMaternalRecords() {
  onValue(maternalRecordsRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById("maternalRecordsContainer");
    container.innerHTML = "";

    if (!data) {
      container.innerHTML = `<div class="empty">No maternal records yet.</div>`;
      return;
    }

    Object.entries(data).forEach(([key, record], index) => {
      const div = document.createElement("div");
      div.className = "record-item";
      div.dataset.type = "maternal";
      div.dataset.key = key;

      const ts = record.saved_at ? new Date(record.saved_at).toLocaleString("en-PH") : "-";
      
      // Create record content with actions
      div.innerHTML = `
        <div class="record-content">
          <span>Maternal Record ${index + 1} — ${ts}</span>
          <div class="record-actions">
            <button class="btn-edit" data-type="maternal" data-key="${key}">Edit</button>
            <button class="btn-delete" data-type="maternal" data-key="${key}">Delete</button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  });
}

// ==============================
// LOAD BHW RECORDS
// ==============================
function loadBhwRecords() {
  onValue(bhwRecordsRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById("bhwRecordsContainer");
    container.innerHTML = "";

    if (!data) {
      container.innerHTML = `<div class="empty">No BHW records yet.</div>`;
      return;
    }

    Object.entries(data).forEach(([key, record], index) => {
      const div = document.createElement("div");
      div.className = "record-item";
      div.dataset.type = "bhw";
      div.dataset.key = key;

      const ts = record.saved_at ? new Date(record.saved_at).toLocaleString("en-PH") : "-";
      
      // Create record content with actions
      div.innerHTML = `
        <div class="record-content">
          <span>BHW Record ${index + 1} — ${ts}</span>
          <div class="record-actions">
            <button class="btn-edit" data-type="bhw" data-key="${key}">Edit</button>
            <button class="btn-delete" data-type="bhw" data-key="${key}">Delete</button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  });
}

// ==============================
// DELETE RECORD FUNCTION
// ==============================
async function deleteRecord(type, key) {
  if (!confirm(`Are you sure you want to delete this ${type} record? This action cannot be undone.`)) {
    return;
  }

  try {
    const path =
      type === "maternal"
        ? `users/${patientId}/pregnancyInfo/maternalRecords/past_records/${key}`
        : `users/${patientId}/pregnancyInfo/bhw_records/${key}`;

    await remove(ref(db, path));
    alert("Record deleted successfully!");
    
    // Close modal if open
    modal.style.display = "none";
  } catch (error) {
    console.error("Error deleting record:", error);
    alert("Error deleting record. Please try again.");
  }
}

// ==============================
// EDIT RECORD FUNCTION
// ==============================
function editRecord(type, key) {
  if (type === "maternal") {
    window.location.href = `maternal_record.html?patientId=${patientId}&editKey=${key}`;
  } else {
    window.location.href = `bhw_record.html?patientId=${patientId}&editKey=${key}`;
  }
}

// ==============================
// EVENT LISTENERS FOR ACTIONS
// ==============================
document.addEventListener("click", (e) => {
  // Delete button
  if (e.target.classList.contains("btn-delete")) {
    const type = e.target.dataset.type;
    const key = e.target.dataset.key;
    deleteRecord(type, key);
    return;
  }

  // Edit button
  if (e.target.classList.contains("btn-edit")) {
    const type = e.target.dataset.type;
    const key = e.target.dataset.key;
    editRecord(type, key);
    return;
  }

  // View record (original functionality)
  if (e.target.classList.contains("record-item") || e.target.closest(".record-content")) {
    const recordItem = e.target.classList.contains("record-item") ? e.target : e.target.closest(".record-item");
    if (!recordItem) return;

    const type = recordItem.dataset.type;
    const key = recordItem.dataset.key;
    viewRecordDetails(type, key);
    return;
  }
});

// ==============================
// UPDATED VIEW MODAL – COMPLETE FIELDS DISPLAY WITH ACTIONS
// ==============================
async function viewRecordDetails(type, key) {
  const path =
    type === "maternal"
      ? `users/${patientId}/pregnancyInfo/maternalRecords/past_records/${key}`
      : `users/${patientId}/pregnancyInfo/bhw_records/${key}`;

  const snap = await get(ref(db, path));
  const record = snap.val() || {};

  modalContainer.innerHTML = "";
  document.getElementById("modalTitle").textContent =
    type === "maternal" ? "Maternal Record Details" : "BHW Record Details";

  const card = document.createElement("div");
  card.className = "modal-card";

  // Add action buttons to modal
  const actionButtons = document.createElement("div");
  actionButtons.className = "modal-actions";
  actionButtons.innerHTML = `
    <button class="btn-edit-modal" data-type="${type}" data-key="${key}">Edit Record</button>
    <button class="btn-delete-modal" data-type="${type}" data-key="${key}">Delete Record</button>
  `;
  
  card.appendChild(actionButtons);

  if (type === "maternal") {
    // MATERNAL RECORD - COMPLETE DETAILED VIEW
    // ... (keep all your existing maternal record display code exactly as is)
    card.innerHTML += `
      <h3>📋 Basic Information</h3>
      <div class="info-grid">
        <div class="info-item"><strong>Saved At:</strong> ${record.saved_at ? new Date(record.saved_at).toLocaleString("en-PH") : "-"}</div>
        <div class="info-item"><strong>FN No:</strong> ${record.fn_no || "-"}</div>
        <div class="info-item"><strong>Name:</strong> ${record.first_name || ""} ${record.middle_name || ""} ${record.last_name || ""}</div>
        <div class="info-item"><strong>Birthday:</strong> ${record.birthday || "-"}</div>
        <div class="info-item"><strong>Age:</strong> ${record.age || "-"}</div>
        <div class="info-item"><strong>PRK:</strong> ${record.prk || "-"}</div>
        <div class="info-item"><strong>Education:</strong> ${record.education || "-"}</div>
        <div class="info-item"><strong>Course:</strong> ${record.education_course || "-"}</div>
        <div class="info-item"><strong>Occupation:</strong> ${record.occupation || "-"}</div>
        <div class="info-item"><strong>Employer:</strong> ${record.occupation_employer || "-"}</div>
        <div class="info-item"><strong>Mobile No:</strong> ${record.mobile_no || "-"}</div>
        <div class="info-item"><strong>Place of Birth:</strong> ${record.place_of_birth || "-"}</div>
        <div class="info-item"><strong>MCCT:</strong> ${record.mcct || "-"}</div>
        <div class="info-item"><strong>G:</strong> ${record.g || "-"}</div>
        <div class="info-item"><strong>P:</strong> ${record.p || "-"}</div>
        <div class="info-item"><strong>LMP:</strong> ${record.lmp || "-"}</div>
        <div class="info-item"><strong>EDD:</strong> ${record.edd || "-"}</div>
        <div class="info-item"><strong>Tribe:</strong> ${record.tribe_flag === "Yes" ? record.tribe : "No"}</div>
        <div class="info-item"><strong>Height:</strong> ${record.height_cm || "-"} cm</div>
        <div class="info-item"><strong>Civil Status:</strong> ${record.civil_status || "-"}</div>
        <div class="info-item"><strong>Spouse Name:</strong> ${record.spouse_name || "-"}</div>
        <div class="info-item"><strong>Spouse Occupation:</strong> ${record.spouse_occupation || "-"}</div>
        <div class="info-item"><strong>TDL:</strong> ${record.tdl || "-"}</div>
        <div class="info-item"><strong>Alcohol Intake:</strong> ${record.alcohol_intake || "No"} ${record.alcohol_intensity ? `(${record.alcohol_intensity})` : ""}</div>
        <div class="info-item"><strong>Smoker:</strong> ${record.smoker || "No"} ${record.smoker_details ? `(${record.smoker_details})` : ""}</div>
        <div class="info-item"><strong>PHIC:</strong> ${record.phic || "-"}</div>
        <div class="info-item"><strong>4P's:</strong> ${record.fourps || "-"}</div>
        <div class="info-item"><strong>M&C Book:</strong> ${record.mc_book || "-"}</div>
        <div class="info-item"><strong>FP Method:</strong> ${record.fp_method || "-"} ${record.fp_details ? `(${record.fp_details})` : ""}</div>
      </div>
      <hr>
    `;

    // ... (keep all other maternal record sections exactly as is)

  } else {
    // BHW RECORD - UPDATED DETAILED VIEW
    // ... (keep all your existing BHW record display code exactly as is)
    card.innerHTML += `
      <h3>📋 Barangay Health Station Record</h3>
      <div class="info-grid">
        <div class="info-item"><strong>Saved At:</strong> ${record.saved_at ? new Date(record.saved_at).toLocaleString("en-PH") : "-"}</div>
      </div>
      <hr>
    `;

    // ... (keep all other BHW record sections exactly as is)
  }

  modalContainer.appendChild(card);
  modal.style.display = "block";

  // Add event listeners for modal action buttons
  document.querySelector('.btn-edit-modal').addEventListener('click', function() {
    editRecord(this.dataset.type, this.dataset.key);
  });

  document.querySelector('.btn-delete-modal').addEventListener('click', function() {
    deleteRecord(this.dataset.type, this.dataset.key);
  });
}

// Close Modal
closeModal.onclick = () => (modal.style.display = "none");
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// REDIRECT BUTTONS
document.getElementById("btnMaternal")?.addEventListener("click", () => {
  window.location.href = `maternal_record.html?patientId=${patientId}`;
});

document.getElementById("btnBhw")?.addEventListener("click", () => {
  window.location.href = `bhw_record.html?patientId=${patientId}`;
});

loadMaternalRecords();
loadBhwRecords();