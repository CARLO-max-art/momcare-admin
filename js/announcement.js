// announcement.js 

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

// ===========================
// Firebase Config
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlcSsGoZBytJtsXe8J2srrQjaHQv1E",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:4f3599203cc4ef380ef083",
  measurementId: "G-GMSC9PZX8Y"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const announcementsRef = ref(db, "announcement");

// DOM Elements
const form = document.getElementById("announcementForm");
const titleInput = document.getElementById("titleInput");
const messageInput = document.getElementById("messageInput");
const eventDateInput = document.getElementById("eventDateInput");
const eventTimeInput = document.getElementById("eventTimeInput");
const announcementBox = document.getElementById("announcementBox");
const searchInput = document.getElementById("searchInput");

let announcementsArray = [];

// ===========================
// Date/Time Formatting Functions
// ===========================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(":");
  const date = new Date();
  date.setHours(hour, minute);
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ===========================
// Display Announcements
// ===========================
function displayAnnouncements(data) {
  announcementBox.innerHTML = "";
  if (!data.length) {
    announcementBox.innerHTML = "<p>No matching announcements.</p>";
    return;
  }
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "announcement-item";
    div.innerHTML = `
      <h4>${item.title}</h4>
      <p>${item.message}</p>
      <p><strong>Event Date:</strong> ${formatDate(item.eventDate)} @ ${formatTime(item.eventTime)}</p>
      <p><small>Posted: ${formatDate(item.postedDate)} at ${formatTime(item.postedTime)}</small></p>
    `;
    announcementBox.appendChild(div);
  });
}

// ===========================
// Firebase Listener
// ===========================
onValue(announcementsRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    announcementsArray = Object.values(data);

    // ===========================
    // FIXED SORT: earliest event first
    // ===========================
    announcementsArray.sort((a, b) => {
      const dateA = new Date(a.eventDate + "T" + a.eventTime);
      const dateB = new Date(b.eventDate + "T" + b.eventTime);
      return dateA - dateB; // ascending (pinaka-una nga event)
    });

    displayAnnouncements(announcementsArray);
  } else {
    announcementBox.innerHTML = "<p>No announcements available.</p>";
  }
});

// ===========================
// Search Filter
// ===========================
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = announcementsArray.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.eventDate.toLowerCase().includes(query) ||
    item.postedDate.toLowerCase().includes(query)
  );
  displayAnnouncements(filtered);
});

// ===========================
// Form Submission
// ===========================
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const message = messageInput.value.trim();
  const eventDate = eventDateInput.value;
  const eventTime = eventTimeInput.value;

  if (!title || !message || !eventDate || !eventTime) {
    alert("Please fill in all fields.");
    return;
  }

  const now = new Date();
  const postedDate = now.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const postedTime = now.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const newAnnouncement = {
    title,
    message,
    eventDate,
    eventTime,
    postedDate,
    postedTime
  };

  push(announcementsRef, newAnnouncement)
    .then(() => {
      alert("Announcement posted successfully!");
      form.reset();
    })
    .catch((error) => {
      alert("Error posting announcement: " + error.message);
    });
});
