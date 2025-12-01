// ==============================
// Firebase Setup
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
  onValue,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "247258231797",
  appId: "1:247258231797:web:3f38cf5aef36a97ce36b84"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==============================
// Get patientId from URL
// ==============================
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get("patientId");

if (!patientId) {
  alert("No patient selected!");
  window.location.href = "patients.html";
}

// ==============================
// BP Helper Functions
// ==============================
function getBPStatus(sys, dia) {
  if (sys >= 180 || dia >= 120) return "HYPERTENSIVE CRISIS";
  if (sys >= 140 || dia >= 90) return "STAGE 2 HYPERTENSION";
  if (sys >= 130 || dia >= 80) return "STAGE 1 HYPERTENSION";
  if (sys >= 120) return "ELEVATED";
  return "NORMAL";
}

// ==============================
// Realtime BP Listener for BHW Form
// ==============================
function startBPListenerForBHW() {
  const bpRef = query(ref(db, "bp_data"), limitToLast(1));

  onChildAdded(bpRef, (snapshot) => {
    const d = snapshot.val();
    if (!d) return;

    const bp = `${d.systolic}/${d.diastolic}`;
    const status = getBPStatus(d.systolic, d.diastolic);

    // Update BP field in BHW form
    const bpEl = document.querySelector('[name="vitalsBP"]');
    if (bpEl) {
      bpEl.value = bp;
      bpEl.style.backgroundColor = "#f8f9fa"; // Visual feedback for readonly
      bpEl.style.color = "#495057";
      bpEl.style.cursor = "not-allowed";
      bpEl.setAttribute('readonly', 'true');
    }

    // You can also update other vital signs if needed
    console.log(`BP Updated: ${bp}, Status: ${status}`);
    
    // Optional: Auto-populate other fields if they exist
    const hrEl = document.querySelector('[name="vitalsHR"]');
    if (hrEl && d.heartRate) {
      hrEl.value = d.heartRate;
    }
  });
}

// ==============================
// Load basic patient info
// ==============================
async function loadUserInfo() {
  const snap = await get(ref(db, `users/${patientId}/pregnancyInfo`));
  if (!snap.exists()) return;

  const data = snap.val();

  const mapping = {
    fullname: `${data.firstName} ${data.middleName} ${data.lastName}`,
    address: data.address,
    age: data.age,
    birthdate: data.birthday,
    contact: data.contactNo,
    religion: data.religion,
    lmp: data.lmp,
    edc: data.edd
  };

  Object.entries(mapping).forEach(([field, value]) => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) input.value = value ?? "";
  });
}

// ==============================
// Helper function to convert file to base64
// ==============================
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ==============================
// Function to preview signature
// ==============================
function previewSignature(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('signaturePreview');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Signature Preview" style="max-width: 200px; max-height: 100px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
}

// ==============================
// Initialize BP fields as readonly
// ==============================
function initializeBPFields() {
  const bpField = document.querySelector('[name="vitalsBP"]');
  
  if (bpField) {
    bpField.setAttribute('readonly', 'true');
    bpField.style.backgroundColor = "#f8f9fa";
    bpField.style.color = "#495057";
    bpField.style.cursor = "not-allowed";
    
    // Set placeholder to indicate it's auto-populated
    if (!bpField.value) {
      bpField.placeholder = "Will be auto-filled from BP device";
    }
  }
}

// ==============================
// UPDATED SUBMIT FUNCTION
// ==============================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  // Handle file upload for e-signature
  const eSignatureFile = document.getElementById('eSignature').files[0];
  if (eSignatureFile) {
    // Convert image to base64 for storage
    const base64String = await convertToBase64(eSignatureFile);
    data.eSignature = base64String;
  }

  // Add timestamp
  data.saved_at = new Date().toISOString();

  try {
    // Save to Firebase
    const bhwRecordsRef = ref(db, `users/${patientId}/pregnancyInfo/bhw_records`);
    const newRecordRef = push(bhwRecordsRef);
    
    await set(newRecordRef, data);
    
    Swal.fire("Success!", "BHW record saved successfully.", "success")
      .then(() => {
        window.location.href = `patient_history.html?patientId=${patientId}`;
      });
      
  } catch (error) {
    console.error("Error saving BHW record:", error);
    Swal.fire("Error", "Failed to save BHW record.", "error");
  }
}

// ==============================
// Init Page
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserInfo();
  initBHWForm(patientId);
  
  // Initialize BP fields as readonly
  initializeBPFields();
  
  // Start listening for BP data
  startBPListenerForBHW();

  // BACK BUTTON FIX
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = `patient_history.html?patientId=${patientId}`;
    });
  }
});

// ==============================
// Initialize BHW Form
// ==============================
function initBHWForm(patientId) {
  const form = document.querySelector("form");
  if (!form) return;

  // ============================
  // UPDATED SAVE PATH HERE!!!
  // ============================
  const savePath = ref(db, `users/${patientId}/pregnancyInfo/bhw_records`);

  const latest = query(savePath, orderByChild("saved_at"), limitToLast(1));

  // ==============================
  // Load Existing BHW Record
  // ==============================
  onValue(latest, (snap) => {
    if (!snap.exists()) return;

    const last = Object.values(snap.val())[0];
    fillExisting(last);
  });

  function fillExisting(data) {
    // Fill normal inputs
    Object.entries(data).forEach(([key, val]) => {
      if (key === "vitals" || key === "eSignature") return;

      const input = form.querySelector(`[name="${key}"]`);
      if (input && typeof val !== "object") {
        input.value = val;
      }
    });

    // Fill vitals
    if (data.vitals) {
      Object.entries(data.vitals).forEach(([k, v]) => {
        const input = form.querySelector(`[name="vitals${k.toUpperCase()}"]`);
        if (input) input.value = v;
      });
    }

    // Fill e-signature preview if exists
    if (data.eSignature) {
      const preview = document.getElementById('signaturePreview');
      preview.innerHTML = `<img src="${data.eSignature}" alt="Signature Preview" style="max-width: 200px; max-height: 100px;">`;
    }
  }

  // ==============================
  // REPLACED SUBMIT BUTTON WITH FORM SUBMIT EVENT
  // ==============================
  form.addEventListener("submit", handleFormSubmit);

  // Remove old submit button if exists and add new one
  const oldSubmitBtn = document.querySelector(".submit-bhw-btn");
  if (oldSubmitBtn) {
    oldSubmitBtn.remove();
  }

  // Add proper submit button
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit";
  submitBtn.type = "submit";
  submitBtn.className = "submit-bhw-btn";
  submitBtn.style.cssText = `
    background: #007bff;
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin-top: 20px;
  `;
  
  // Find the form element and append submit button before closing fieldset
  const fieldset = form.querySelector('fieldset');
  if (fieldset) {
    fieldset.appendChild(submitBtn);
  } else {
    form.appendChild(submitBtn);
  }
}