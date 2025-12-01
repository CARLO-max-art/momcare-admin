// js/login.js - COMPLETELY CORRECTED VERSION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:7ce9239ec25770db0ef083"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");
const loginText = document.getElementById("loginText");
const loginSpinner = document.getElementById("loginSpinner");

// Login form submission
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const captchaResponse = grecaptcha.getResponse();

  // Basic validation
  if (!email || !password) {
    showMessage("Please fill in all fields.", "red");
    return;
  }

  if (!captchaResponse) {
    showMessage("Please complete the CAPTCHA verification.", "red");
    return;
  }

  // Show loading state
  setLoadingState(true);
  showMessage("", ""); // Clear previous messages

// SUCCESSFUL LOGIN - ENHANCED VERSION
try {
  console.log("Attempting login...");

  // Firebase login
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  console.log("✅ Login successful:", user.email);
  console.log("📍 User ID:", user.uid);
  
  // Verify user is truly authenticated before redirect
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.uid === user.uid) {
    console.log("🔐 User authentication verified, redirecting...");
    showMessage("✅ Login successful! Redirecting...", "green");
    
    // Clear form
    loginForm.reset();
    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
      grecaptcha.reset();
    }
    
    // Redirect with verification
    setTimeout(() => {
      console.log("🚀 Final redirect to index.html");
      window.location.href = "index.html";
    }, 1500);
  } else {
    throw new Error("User authentication not persisted");
  }
  
  } catch (error) {
    console.error("Login error:", error);
    
    let errorMessage = "Login failed. ";
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "❌ No account found with this email address.";
        break;
      case 'auth/wrong-password':
        errorMessage = "❌ Incorrect password. Please try again.";
        break;
      case 'auth/invalid-email':
        errorMessage = "❌ Invalid email address format.";
        break;
      case 'auth/invalid-credential':
        errorMessage = "❌ Invalid email or password.";
        break;
      case 'auth/user-disabled':
        errorMessage = "❌ This account has been disabled.";
        break;
      case 'auth/too-many-requests':
        errorMessage = "❌ Too many failed attempts. Please try again later.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "❌ Network error. Please check your internet connection.";
        break;
      default:
        errorMessage = "❌ Login failed: " + error.message;
    }
    
    showMessage(errorMessage, "red");
    setLoadingState(false);
    grecaptcha.reset();
  }
});

// Helper functions
function setLoadingState(isLoading) {
  if (isLoading) {
    loginText.textContent = "Logging in...";
    loginSpinner.style.display = "inline-block";
    loginButton.disabled = true;
  } else {
    loginText.textContent = "Login";
    loginSpinner.style.display = "none";
    loginButton.disabled = false;
  }
}

function showMessage(text, color) {
  if (loginMessage) {
    loginMessage.textContent = text;
    loginMessage.style.color = color;
    loginMessage.style.backgroundColor = color === 'green' ? '#f0f9f0' : '#fef2f2';
    loginMessage.style.borderColor = color === 'green' ? '#d1fae5' : '#fecaca';
    loginMessage.style.display = text ? 'block' : 'none';
  }
}

// Enter key to submit form
loginForm.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    loginForm.dispatchEvent(new Event('submit'));
  }
});

// Check if user is already logged in
// Check if user is already logged in - ADD DELAY AND VERIFICATION
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🔄 User already logged in, waiting before redirect...");
    // Add delay and verify user is truly authenticated
    setTimeout(() => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("✅ Verified user, redirecting to index.html");
        window.location.href = "index.html";
      } else {
        console.log("❌ User not persisted, staying on login page");
      }
    }, 1000);
  }
});

// Add some interactive effects
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function() {
    this.style.backgroundColor = 'white';
    this.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
  });
  
  input.addEventListener('blur', function() {
    this.style.backgroundColor = '#fafafa';
    this.style.boxShadow = 'none';
  });
});