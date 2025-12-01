import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { app } from "./firebaseConfig.js";

export function protectPage() {
  const auth = getAuth(app);

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // No session = redirect to login
      window.location.href = "login.html";
    }
  });
}
