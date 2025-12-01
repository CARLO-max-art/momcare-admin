// js/auth.js - Centralized Authentication Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// Global logout function
window.logoutUser = async function() {
    const { value: shouldLogout } = await Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the system",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, logout!',
        cancelButtonText: 'Cancel'
    });

    if (shouldLogout) {
        try {
            await signOut(auth);
            localStorage.clear();
            sessionStorage.clear();
            
            Swal.fire({
                title: 'Logged out!',
                text: 'You have been successfully logged out.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "login.html";
            });
            
        } catch (error) {
            console.error('Logout error:', error);
            Swal.fire('Error', 'Logout failed. Please try again.', 'error');
        }
    }
};

// Authentication state listener
onAuthStateChanged(auth, (user) => {
    if (!user && !window.location.href.includes('login.html')) {
        window.location.href = "login.html";
    }
});

export { auth };