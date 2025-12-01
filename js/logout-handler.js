// js/logout-handler.js - Centralized Logout Handler
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function showLogoutConfirmation() {
    const result = await Swal.fire({
        title: 'Ready to Leave?',
        html: `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
                <p style="margin-bottom: 10px; font-size: 16px;">You're about to log out from <strong>MomCare Admin</strong></p>
                <p style="color: #666; font-size: 14px;">You'll need to log in again to access the system.</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Stay Logged In',
        confirmButtonColor: '#e53e3e',
        cancelButtonColor: '#718096',
        reverseButtons: true,
        background: '#fff',
        customClass: {
            popup: 'logout-confirmation-modal'
        }
    });

    if (result.isConfirmed) {
        await performLogout();
    }
}

export async function performLogout() {
    try {
        // Show loading
        Swal.fire({
            title: 'Signing out...',
            text: 'Please wait a moment',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const auth = getAuth();
        await signOut(auth);
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        console.log("✅ Logout successful");

        // Show success and redirect
        await Swal.fire({
            title: 'Success!',
            text: 'You have been logged out successfully.',
            icon: 'success',
            confirmButtonText: 'Continue to Login',
            confirmButtonColor: '#1e1f57',
            timer: 1500,
            timerProgressBar: true,
            willClose: () => {
                window.location.href = "login.html";
            }
        });

    } catch (error) {
        console.error("❌ Logout failed:", error);
        await Swal.fire({
            title: 'Logout Failed',
            text: 'There was an error signing out. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#e53e3e'
        });
    }
}

// Make functions available globally
window.showLogoutConfirmation = showLogoutConfirmation;
window.performLogout = performLogout;