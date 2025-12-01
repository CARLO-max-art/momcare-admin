// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:7ce9239ec25770db0ef083"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// DOM elements
const form = document.getElementById("signupForm");
const signupText = document.getElementById("signupText");
const signupSpinner = document.getElementById("signupSpinner");
const message = document.getElementById("signupMessage");
const signupBtn = document.getElementById("signupBtn");

// Signup logic - SIMPLIFIED VERSION
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const confirmPassword = document.getElementById("signupConfirmPassword").value.trim();
  const captchaResponse = grecaptcha.getResponse();

  // Basic validation
  if (!email || !password || !confirmPassword) {
    showMessage("Please fill in all fields.", "red");
    return;
  }

  if (!captchaResponse) {
    showMessage("Please complete the CAPTCHA.", "red");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "red");
    grecaptcha.reset();
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters long.", "red");
    grecaptcha.reset();
    return;
  }

  // Show loading state
  setLoadingState(true);
  showMessage("", ""); // Clear previous messages

  try {
    console.log("Creating user account with Firebase...");

    // DIRECT Firebase signup - no server-side CAPTCHA verification
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    console.log("User created successfully:", user.uid);
    
    showMessage("✅ Account created successfully! Redirecting to login...", "green");
    
    // Optional: Send email verification
    try {
      await user.sendEmailVerification();
      console.log("Verification email sent");
    } catch (emailError) {
      console.log("Email verification might not be setup:", emailError);
    }
    
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);

  } catch (error) {
    console.error("Firebase signup error:", error);
    
    let errorMessage = "Signup failed. ";
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = "❌ This email is already registered. Please use a different email.";
        break;
      case 'auth/invalid-email':
        errorMessage = "❌ Invalid email address format.";
        break;
      case 'auth/operation-not-allowed':
        errorMessage = "❌ Email/password accounts are not enabled. Contact support.";
        break;
      case 'auth/weak-password':
        errorMessage = "❌ Password is too weak. Use at least 6 characters.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "❌ Network error. Check your internet connection.";
        break;
      default:
        errorMessage = "❌ An error occurred: " + error.message;
    }
    
    showMessage(errorMessage, "red");
    setLoadingState(false);
    grecaptcha.reset();
  }
});

// Helper functions
function setLoadingState(isLoading) {
  if (isLoading) {
    signupText.style.display = "none";
    signupSpinner.style.display = "inline-block";
    signupBtn.disabled = true;
  } else {
    signupText.style.display = "inline-block";
    signupSpinner.style.display = "none";
    signupBtn.disabled = false;
  }
}

function showMessage(text, color) {
  message.textContent = text;
  message.style.color = color;
}

// Real-time password matching
document.getElementById('signupPassword').addEventListener('input', checkPasswordMatch);
document.getElementById('signupConfirmPassword').addEventListener('input', checkPasswordMatch);

function checkPasswordMatch() {
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  
  if (confirmPassword.length === 0) {
    showMessage("", "");
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage("❌ Passwords do not match", "red");
  } else {
    showMessage("✅ Passwords match", "green");
  }
}

// Password strength indicator (optional)
document.getElementById('signupPassword').addEventListener('input', function(e) {
  const password = e.target.value;
  const strengthElement = document.getElementById('passwordStrength') || createPasswordStrengthElement();
  
  if (password.length === 0) {
    strengthElement.textContent = '';
    return;
  }
  
  let strength = 'Weak';
  let color = 'red';
  
  if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'Strong';
    color = 'green';
  } else if (password.length >= 6) {
    strength = 'Medium';
    color = 'orange';
  }
  
  strengthElement.textContent = strength + ' password';
  strengthElement.style.color = color;
});

function createPasswordStrengthElement() {
  const strengthElement = document.createElement('div');
  strengthElement.id = 'passwordStrength';
  strengthElement.style.fontSize = '12px';
  strengthElement.style.marginTop = '5px';
  strengthElement.style.fontWeight = '500';
  document.getElementById('signupPassword').parentNode.appendChild(strengthElement);
  return strengthElement;
}