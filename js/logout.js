/**
 * MomCare Admin - Enhanced Logout Functionality
 * Handles user logout with beautiful confirmation and smooth transitions
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
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
const auth = getAuth(app);

// ====================== ENHANCED LOGOUT FUNCTION ======================
async function performLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const originalText = logoutBtn.innerHTML;
    
    try {
        // Show loading state
        logoutBtn.classList.add('loading');
        logoutBtn.disabled = true;

        // 1. Clear all local storage
        localStorage.clear();
        sessionStorage.clear();
        
        console.log("🗑️ Local storage cleared");

        // 2. Firebase sign-out
        await signOut(auth);
        console.log("✅ Firebase sign-out successful");

        // 3. Show success message
        await Swal.fire({
            title: 'Logged Out Successfully!',
            text: 'You have been safely logged out of your account.',
            icon: 'success',
            confirmButtonText: 'Continue to Login',
            confirmButtonColor: '#1e1f57',
            timer: 2000,
            timerProgressBar: true,
            willClose: () => {
                // 4. Redirect to login page
                window.location.href = "login.html";
            }
        });

    } catch (error) {
        console.error("❌ Logout failed:", error);
        
        // Show error message
        await Swal.fire({
            title: 'Logout Failed',
            text: 'There was an error during logout. Please try again.',
            icon: 'error',
            confirmButtonText: 'Try Again',
            confirmButtonColor: '#e53e3e'
        });
        
        // Reset button state
        logoutBtn.classList.remove('loading');
        logoutBtn.disabled = false;
        logoutBtn.innerHTML = originalText;
    }
}

// ====================== CONFIRMATION DIALOG ======================
function showLogoutConfirmation() {
    Swal.fire({
        title: 'Are you sure?',
        html: `
            <div style="text-align: left; margin: 15px 0;">
                <p style="margin-bottom: 10px;">You're about to log out from:</p>
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #1e1f57;">
                    <strong>MomCare Admin Panel</strong><br>
                    <small style="color: #6c757d;">Administrator Account</small>
                </div>
                <p style="margin-top: 15px; font-size: 0.9rem; color: #6c757d;">
                    You'll need to log in again to access the system.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#e53e3e',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        customClass: {
            popup: 'logout-swal-popup',
            actions: 'logout-swal-actions'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            performLogout();
        }
    });
}

// ====================== GET CURRENT USER INFO ======================
function updateUserInfo() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userNameElement = document.querySelector('.user-name');
            const userEmail = user.email || 'Admin User';
            userNameElement.textContent = userEmail;
        }
    });
}

// ====================== EVENT LISTENERS ======================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Logout page initialized');
    
    // Update user info
    updateUserInfo();
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLogoutConfirmation();
        });
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Go back to previous page or dashboard
            if (document.referrer && document.referrer.includes(window.location.host)) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to cancel
        if (e.key === 'Escape') {
            if (document.referrer && document.referrer.includes(window.location.host)) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        }
        
        // Enter key to confirm logout (only when focused on logout button)
        if (e.key === 'Enter' && document.activeElement === logoutBtn) {
            showLogoutConfirmation();
        }
    });
});

// ====================== AUTO-REDIRECT IF NOT LOGGED IN ======================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // If no user is logged in, redirect to login page
        window.location.href = "login.html";
    }
});

// Export functions for use in other files
window.showLogoutConfirmation = showLogoutConfirmation;
window.performLogout = performLogout;