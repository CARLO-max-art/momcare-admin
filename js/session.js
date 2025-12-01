// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlCsSGoZBytJtsXe8J2srrQjaHQvIE",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  projectId: "momcareapp-b90b4",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:7ce9239ec25770db0ef083"
};

// Initialize Firebase kung wala pa naka-init
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// SESSION CHECK — IMPORTANT!!!
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    // if NOT logged in → redirect to login page
    window.location.href = "login.html";
  }
});
