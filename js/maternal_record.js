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
  limitToLast,
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
// Load Patient Info
// ==============================
async function loadUserInfo() {
  const snap = await get(ref(db, `users/${patientId}/pregnancyInfo`));
  if (!snap.exists()) return;

  const data = snap.val();

  const map = {
    first_name: data.firstName,
    middle_name: data.middleName,
    last_name: data.lastName,
    prk: data.purok,
    mobile_no: data.contactNo,
    age: data.age
  };

  Object.entries(map).forEach(([field, value]) => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) input.value = value ?? "";
  });
}

// ==============================
// Save BP History
// ==============================
function saveMaternalRecord(patientId, bpValue, notes = "") {
  const refPath = ref(db, `users/${patientId}/pregnancyInfo/maternalRecords/vitals_history`);

  const entry = {
    bp: bpValue,
    notes: notes,
    timestamp: new Date().toISOString()
  };

  return set(push(refPath), entry);
}

// ==============================
// Helpers
// ==============================
function calculateAgeFromDOB(dobStr) {
  if (!dobStr) return "";
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : "";
}

function calculateEDDFromLMP(lmpStr) {
  if (!lmpStr) return "";
  const lmp = new Date(lmpStr);
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  return edd.toISOString().split("T")[0];
}

function getBPStatus(sys, dia) {
  if (sys >= 180 || dia >= 120) return "HYPERTENSIVE CRISIS";
  if (sys >= 140 || dia >= 90) return "STAGE 2 HYPERTENSION";
  if (sys >= 130 || dia >= 80) return "STAGE 1 HYPERTENSION";
  if (sys >= 120) return "ELEVATED";
  return "NORMAL";
}

// ==============================
// Init Page
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  loadUserInfo();
  initializeForm();
  startBPListener();
  setupDynamicFieldListeners();
  setupBirthdayLMPListeners();

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = `patient_history.html?patientId=${patientId}`;
    });
  }
});

// ==============================
// Dynamic Fields Listener
// ==============================
function setupDynamicFieldListeners() {
  const education = document.getElementById("education");
  const courseWrap = document.getElementById("education-course-wrap");

  education?.addEventListener("change", () => {
    courseWrap.classList.toggle("hidden", education.value !== "College" && education.value !== "Vocational");
  });

  const tribeFlag = document.getElementById("tribe_flag");
  const tribeWrap = document.getElementById("tribe-select-wrap");

  tribeFlag?.addEventListener("change", () => {
    tribeWrap.classList.toggle("hidden", tribeFlag.value !== "Yes");
  });

  const civil = document.getElementById("civil_status");
  const spouseWrap = document.getElementById("spouse-wrap");
  const spouseOcc = document.getElementById("spouse-occupation-wrap");

  civil?.addEventListener("change", () => {
    const show = civil.value === "Married" || civil.value === "Live-in";
    spouseWrap.classList.toggle("hidden", !show);
    spouseOcc.classList.toggle("hidden", !show);
  });

  const alcohol = document.getElementById("alcohol_intake");
  const alcoholWrap = document.getElementById("alcohol-intensity-wrap");
  alcohol?.addEventListener("change", () => {
    alcoholWrap.classList.toggle("hidden", alcohol.value !== "Yes");
  });

  const smoker = document.getElementById("smoker");
  const smokerWrap = document.getElementById("smoker-details-wrap");
  smoker?.addEventListener("change", () => {
    smokerWrap.classList.toggle("hidden", smoker.value !== "Yes");
  });

  const fp = document.getElementById("fp_method");
  const fpWrap = document.getElementById("fp-details-wrap");
  fp?.addEventListener("change", () => {
    fpWrap.classList.toggle("hidden", fp.value === "None" || fp.value === "");
  });
}

// ==============================
// Birthday & LMP Auto Listeners
// ==============================
function setupBirthdayLMPListeners() {
  const birthday = document.querySelector('[name="birthday"]');
  const age = document.querySelector('[name="age"]');
  birthday?.addEventListener("change", () => {
    age.value = calculateAgeFromDOB(birthday.value);
  });

  const lmp = document.querySelector('[name="lmp"]');
  const edd = document.querySelector('[name="edd"]');
  lmp?.addEventListener("change", () => {
    edd.value = calculateEDDFromLMP(lmp.value);
  });
}

// ==============================
// Add Child Entry
// ==============================
function addChildEntry() {
  const tbody = document.getElementById("children-table-body");

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>#</td>
    <td><input type="date" name="child_birthday[]"></td>
    <td><input type="text" name="child_place_of_delivery[]"></td>
    <td><input type="text" name="child_birth_attendant[]"></td>
    <td><input type="checkbox" name="child_term[]" value="true"></td>
    <td><input type="checkbox" name="child_pre_term[]" value="true"></td>
    <td><input type="checkbox" name="child_post_term[]" value="true"></td>
    <td><input type="text" name="child_remarks[]"></td>
    <td><button type="button" class="remove-child-btn">❌</button></td>
  `;

  tbody.appendChild(tr);

  tr.querySelector(".remove-child-btn").addEventListener("click", () => tr.remove());
}

// ==============================
// Realtime BP Listener
// ==============================
function startBPListener() {
  const bpRef = query(ref(db, "bp_data"), limitToLast(1));

  onChildAdded(bpRef, (snapshot) => {
    const d = snapshot.val();
    if (!d) return;

    const bp = `${d.systolic}/${d.diastolic}`;

    const bpEl = document.getElementById("bp-value");
    if (bpEl) {
      bpEl.value = bp;
      bpEl.style.backgroundColor = "#f8f9fa"; // Visual feedback for readonly
      bpEl.style.color = "#495057";
      bpEl.style.cursor = "not-allowed";
    }

    const statusEl = document.querySelector('[name="vitals_status"]');
    if (statusEl) {
      statusEl.value = getBPStatus(d.systolic, d.diastolic);
      statusEl.style.backgroundColor = "#f8f9fa"; // Visual feedback for readonly
      statusEl.style.color = "#495057";
      statusEl.style.cursor = "not-allowed";
    }
  });
}

// ==============================
// Initialize form with readonly styling
// ==============================
function initializeForm() {
  const form = document.getElementById("maternal-form");

  // Apply readonly styling to BP and Status fields on load
  const bpField = document.getElementById("bp-value");
  const statusField = document.querySelector('[name="vitals_status"]');
  
  if (bpField) {
    bpField.setAttribute('readonly', 'true');
    bpField.style.backgroundColor = "#f8f9fa";
    bpField.style.color = "#495057";
    bpField.style.cursor = "not-allowed";
  }
  
  if (statusField) {
    statusField.setAttribute('readonly', 'true');
    statusField.style.backgroundColor = "#f8f9fa";
    statusField.style.color = "#495057";
    statusField.style.cursor = "not-allowed";
  }

  // Rest of your existing initializeForm code...
  document.getElementById("addChildBtn").addEventListener("click", addChildEntry);

  // UPDATED SUBMIT EVENT LISTENER
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Get checkbox values for complaints
    const complaints = [];
    document.querySelectorAll('input[name="complaints[]"]:checked').forEach(cb => {
      complaints.push(cb.value);
    });
    
    // Get children data - UPDATED to match your structure
    const children = [];
    document.querySelectorAll('#children-table-body tr').forEach(tr => {
      const childData = {
        birthday: tr.querySelector('input[name="child_birthday[]"]')?.value || '',
        place_of_delivery: tr.querySelector('input[name="child_place_of_delivery[]"]')?.value || '',
        birth_attendant: tr.querySelector('input[name="child_birth_attendant[]"]')?.value || '',
        term: tr.querySelector('input[name="child_term[]"]')?.checked || false,
        pre_term: tr.querySelector('input[name="child_pre_term[]"]')?.checked || false,
        post_term: tr.querySelector('input[name="child_post_term[]"]')?.checked || false,
        remarks: tr.querySelector('input[name="child_remarks[]"]')?.value || ''
      };
      if (childData.birthday) children.push(childData);
    });

    // Prepare complete record - UPDATED structure
    const completeRecord = {
      ...data,
      complaints: complaints,
      children: children,
      saved_at: new Date().toISOString(),
      
      // Vital signs
      vitals: {
        date: data.vitals_date,
        aog: data.vitals_aog,
        weight: data.vitals_weight,
        status: data.vitals_status,
        bp: data.vitals_bp,
        hr: data.vitals_hr,
        temp: data.vitals_temp,
        o2sat: data.vitals_o2sat,
        fhr: data.vitals_fhr,
        fh: data.vitals_fh
      },
      
      // Laboratory results
      lab_results: {
        hgb_count: data.lab_results_hgb_count,
        ua: data.lab_results_ua,
        rbc: data.lab_results_rbc,
        albumin: data.lab_results_albumin,
        hbsag: data.lab_results_hbsag,
        fbs: data.lab_results_fbs,
        rbs: data.lab_results_rbs,
        bt: data.lab_results_bt,
        hiv: data.lab_results_hiv,
        vdrl: data.lab_results_vdrl
      }
    };

    // Remove duplicate fields
    delete completeRecord.vitals_date;
    delete completeRecord.vitals_aog;
    delete completeRecord.vitals_weight;
    delete completeRecord.vitals_status;
    delete completeRecord.vitals_bp;
    delete completeRecord.vitals_hr;
    delete completeRecord.vitals_temp;
    delete completeRecord.vitals_o2sat;
    delete completeRecord.vitals_fhr;
    delete completeRecord.vitals_fh;
    
    delete completeRecord.lab_results_hgb_count;
    delete completeRecord.lab_results_ua;
    delete completeRecord.lab_results_rbc;
    delete completeRecord.lab_results_albumin;
    delete completeRecord.lab_results_hbsag;
    delete completeRecord.lab_results_fbs;
    delete completeRecord.lab_results_rbs;
    delete completeRecord.lab_results_bt;
    delete completeRecord.lab_results_hiv;
    delete completeRecord.lab_results_vdrl;

    try {
      // Save to Firebase - UPDATED to use your structure
      const newRecordRef = ref(db, `users/${patientId}/pregnancyInfo/maternalRecords/past_records`);
      const newChildRef = push(newRecordRef);
      
      await set(newChildRef, completeRecord);
      
      // Also save to vitals history
      const bpValue = data.vitals_bp || "N/A";
      await saveMaternalRecord(patientId, bpValue, data.remarks || "");
      
      Swal.fire("Success!", "Maternal record saved successfully.", "success")
        .then(() => {
          window.location.href = `patient_history.html?patientId=${patientId}`;
        });
        
    } catch (error) {
      console.error("Error saving record:", error);
      Swal.fire("Error", "Failed to save record.", "error");
    }
  });
}