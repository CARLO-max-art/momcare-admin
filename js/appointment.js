// ✅ Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAoPqlcSsGoZBytJtsXe8J2srrQjaHQv1E",
  authDomain: "momcareapp-b90b4.firebaseapp.com",
  databaseURL: "https://momcareapp-b90b4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momcareapp-b90b4",
  storageBucket: "momcareapp-b90b4.appspot.com",
  messagingSenderId: "1020126784186",
  appId: "1:1020126784186:web:4f3599203cc4ef380ef083"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ FullCalendar setup with DARK BLUE buttons
document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day'
    },
    eventDisplay: 'block',
    events: [],
    eventColor: '#6c757d',
    eventTextColor: '#fff',

    eventClick: function(info) {
      const { title, start, extendedProps } = info.event;
      const date = start.toLocaleDateString();
      const time = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // VIEW ONLY - No approval functionality
      const viewMsg = `📅 Appointment Details\n\n👤 Name: ${title}\n📆 Date: ${date}\n⏰ Time: ${time}\n📌 Title: ${extendedProps.title}\n🎂 Age: ${extendedProps.age}\n📍 Status: ${extendedProps.status}\n\nℹ️ This is view-only mode.`;
      alert(viewMsg);
    },

    eventDidMount: function(info) {
      const status = info.event.extendedProps.status;
      const eventEl = info.el;
      
      switch(status.toLowerCase()) {
        case 'confirmed':
          eventEl.style.backgroundColor = '#224abe'; // Darker blue
          eventEl.style.borderColor = '#224abe';
          break;
        case 'pending':
          eventEl.style.backgroundColor = '#f6c23e';
          eventEl.style.borderColor = '#f6c23e';
          break;
        case 'cancelled':
          eventEl.style.backgroundColor = '#e74a3b';
          eventEl.style.borderColor = '#e74a3b';
          break;
        case 'completed':
          eventEl.style.backgroundColor = '#1cc88a';
          eventEl.style.borderColor = '#1cc88a';
          break;
        default:
          eventEl.style.backgroundColor = '#6c757d';
          eventEl.style.borderColor = '#6c757d';
      }
      
      eventEl.style.color = '#fff';
      eventEl.style.fontWeight = '500';
      eventEl.style.borderRadius = '4px';
      eventEl.style.boxShadow = '0 0.15rem 0.35rem rgba(0,0,0,.1)';
      
      // Add tooltip for better user experience
      eventEl.title = `Click to view ${info.event.title}'s appointment details`;
    }
  });

  calendar.render();

  // Apply DARK BLUE button styling
  setTimeout(() => {
    // Main button styling
    document.querySelectorAll('.fc-button').forEach(button => {
      button.style.backgroundColor = '#224abe'; // Dark blue
      button.style.color = 'white';
      button.style.border = '1px solid #224abe';
      button.style.borderRadius = '0.35rem';
      button.style.padding = '0.375rem 0.75rem';
      button.style.fontSize = '0.875rem';
      button.style.fontWeight = '400';
      button.style.textTransform = 'none';
      button.style.boxShadow = '0 0.15rem 0.35rem rgba(0,0,0,.1)';
      button.style.margin = '0 3px';
      button.style.transition = 'all 0.3s ease';
      
      // Hover effects (even darker blue)
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#193b8a';
        button.style.borderColor = '#193b8a';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#224abe';
        button.style.borderColor = '#224abe';
      });
    });

    // Active button styling
    document.querySelectorAll('.fc-button-active').forEach(button => {
      button.style.backgroundColor = '#193b8a';
      button.style.borderColor = '#193b8a';
      button.style.boxShadow = 'inset 0 0.15rem 0.3rem rgba(0,0,0,.2)';
    });

    // Today button styling
    const todayBtn = document.querySelector('.fc-today-button');
    if (todayBtn) {
      todayBtn.style.marginRight = '10px';
    }

    // Header title styling
    const titleEl = document.querySelector('.fc-toolbar-title');
    if (titleEl) {
      titleEl.style.fontSize = '1.25rem';
      titleEl.style.fontWeight = '600';
      titleEl.style.color = '#5a5c69';
    }
  }, 100);

  // ✅ Firebase data listener - READ ONLY
  const appointmentsRef = ref(db, 'appointments');
  onValue(appointmentsRef, (snapshot) => {
    const data = snapshot.val();
    const events = [];

    for (let uid in data) {
      const userAppointments = data[uid];

      for (let apptId in userAppointments) {
        const appt = userAppointments[apptId];

        if (appt.date && appt.time) {
          let timeStr = convertTo24Hour(appt.time.trim());
          const start = `${appt.date}T${timeStr}`;
          const eventId = `${uid}_${apptId}`;

          events.push({
            id: eventId,
            title: appt.fullName,
            start: start,
            extendedProps: {
              title: appt.title || 'No title',
              age: appt.age || 'N/A',
              status: appt.status || 'pending'
            }
          });
        }
      }
    }

    calendar.removeAllEvents();
    events.forEach(event => calendar.addEvent(event));
  });

  // ✅ Time format converter (12h to 24h)
  function convertTo24Hour(timeStr) {
    const [time, modifier] = timeStr.split(/(AM|PM)/i);
    let [hours, minutes] = time.trim().split(':').map(Number);

    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
});