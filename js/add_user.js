import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// Global functions
window.goBack = function() {
  window.location.href = "user.html";
};

window.togglePassword = function (fieldId, iconElement) {
  const input = document.getElementById(fieldId);
  if (input.type === "password") {
    input.type = "text";
    iconElement.textContent = "🙈";
  } else {
    input.type = "password";
    iconElement.textContent = "👁️";
  }
};

function calculateAge(birthdate) {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Event listener for birthdate changes
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded - initializing form...');
  
  const birthdateInput = document.getElementById('birthdate');
  const ageInput = document.getElementById('age');
  
  if (birthdateInput && ageInput) {
    birthdateInput.addEventListener('change', function() {
      if (this.value) {
        const age = calculateAge(this.value);
        ageInput.value = age;
      } else {
        ageInput.value = '';
      }
    });
  }

  // Check if form exists
  const form = document.getElementById("addUserForm");
  if (!form) {
    console.error('Form with id "addUserForm" not found!');
    alert('Form not found. Please check the HTML.');
    return;
  }
  console.log('Form found, adding event listener...');
});

// Form submission
document.getElementById("addUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log('Form submitted');

  const submitBtn = e.target.querySelector('.btn-primary');
  const originalText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating User...';
  submitBtn.style.opacity = '0.7';

  try {
    // Get form values
    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const birthdate = document.getElementById("birthdate").value;
    const purok = document.getElementById("purok").value;
    const contactNo = document.getElementById("contactNo").value.trim();
    const address = document.getElementById("address").value.trim();

    console.log('Form values collected:', { firstName, email, birthdate });

    // VALIDATION
    if (!firstName || !lastName) {
      alert("Please enter first name and last name!");
      resetButton(submitBtn, originalText);
      return;
    }

    if (!email) {
      alert("Please enter email!");
      resetButton(submitBtn, originalText);
      return;
    }

    if (!birthdate) {
      alert("Please enter birthdate!");
      resetButton(submitBtn, originalText);
      return;
    }

    if (!password) {
      alert("Please enter password!");
      resetButton(submitBtn, originalText);
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do NOT match! Please re-enter.");
      resetButton(submitBtn, originalText);
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      resetButton(submitBtn, originalText);
      return;
    }

    // Calculate age from birthdate
    const age = calculateAge(birthdate);
    console.log('Age calculated:', age);

    // Step 1 — Create Firebase Auth Account
    console.log('Creating Firebase Auth user...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Auth user created:', userCredential.user.uid);
    } catch (error) {
      console.error('Auth Error:', error);
      let errorMessage = "Error creating user: ";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage += "Email is already registered.";
          break;
        case 'auth/invalid-email':
          errorMessage += "Invalid email format.";
          break;
        case 'auth/weak-password':
          errorMessage += "Password is too weak.";
          break;
        case 'auth/network-request-failed':
          errorMessage += "Network error. Please check your connection.";
          break;
        default:
          errorMessage += error.message;
      }
      
      alert(errorMessage);
      resetButton(submitBtn, originalText);
      return;
    }

    const uid = userCredential.user.uid;
    console.log('User UID:', uid);

    // Step 2 — Save user profile to Realtime Database (following your existing structure)
    const newUserData = {
      pregnancyInfo: {
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        purok: purok,
        contactNo: contactNo,
        email: email,
        address: address,
        birthdate: birthdate,
        age: age,
        status: "Active", // Default status
        barangay: "", // Empty by default as per your structure
        street: "", // Empty by default as per your structure
        
        // Initialize empty structures for maternal records
        maternalRecords: {
          past_records: {},
          vitals_history: {}
        },
        
        // Initialize empty structure for BHW records
        bhw_records: {},
        
        // Add creation timestamp
        createdAt: new Date().toISOString()
      }
    };

    console.log('Saving to database...', newUserData);
    await set(ref(db, "users/" + uid), newUserData);
    console.log('Database save completed');

    // Show success animation
    submitBtn.classList.add('success-pulse');
    submitBtn.textContent = '✓ User Created!';
    
    setTimeout(() => {
      alert("User created successfully!\n\nUser can now login to the mobile app using:\nEmail: " + email + "\nPassword: [the password they entered]");
      window.location.href = "user.html";
    }, 1000);

  } catch (error) {
    console.error("Unexpected Error:", error);
    alert("An unexpected error occurred: " + error.message);
    resetButton(submitBtn, originalText);
  }
});

// Helper function to reset button state
function resetButton(button, originalText) {
  button.disabled = false;
  button.textContent = originalText;
  button.style.opacity = '1';
}