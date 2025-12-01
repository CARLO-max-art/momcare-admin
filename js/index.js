import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Use the shared Firebase app from index.html
const db = window.firebaseDb;

// If db is not available, show error and wait
if (!db) {
  console.error("❌ Firebase database not available. Make sure index.html loads first.");
  
  // Try to get db after a delay
  setTimeout(() => {
    const retryDb = window.firebaseDb;
    if (retryDb) {
      console.log("✅ Firebase database now available, starting data load...");
      initializeDataLoad(retryDb);
    } else {
      console.error("❌ Still no Firebase database after delay");
    }
  }, 1000);
} else {
  console.log("✅ Firebase database connected successfully");
  initializeDataLoad(db);
}

function initializeDataLoad(db) {
  console.log("🚀 Starting to load realtime data...");

  // Dashboard Elements
  const totalUsersElement = document.getElementById("totalUsers");
  const totalAppointmentsElement = document.getElementById("totalApptCount");
  const todaysAppointmentsElement = document.getElementById("todaysAppointments");
  const pendingRequestsElement = document.getElementById("pendingRequests");
  const purokAnalyticsBox = document.getElementById("purokAnalytics");
  const latestAnnouncementEl = document.getElementById("latestAnnouncement");
  const monthFilterSelect = document.getElementById("monthFilter");

  // canonical purok list
  const puroks = ["Purok 1A","Purok 1B","Purok 1C","Purok 2","Purok 3","Purok 4","Purok 5"];

  // colors
  const purokColors = {
    "Purok 1A": "#1f77b4",
    "Purok 1B": "#ff7f0e",
    "Purok 1C": "#2ca02c",
    "Purok 2": "#d62728",
    "Purok 3": "#9467bd",
    "Purok 4": "#8c564b",
    "Purok 5": "#e377c2"
  };

  // formatting helpers
  function formatDateMMDDYYYY(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr || "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }

  function formatTo12Hour(timeStr) {
    if (!timeStr) return "";
    let [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m || 0).padStart(2, "0")} ${ampm}`;
  }

  // Normalize purok text into canonical labels
  function normalizePurok(raw) {
    if (!raw && raw !== 0) return null;
    let s = String(raw).trim().toLowerCase();

    // direct matches for 1A/1B/1C (allow "1a", "1 a", "purok 1a")
    s = s.replace(/\s+/g, " ");

    // handle variants
    const map = {
      "1a": "Purok 1A",
      "1 a": "Purok 1A",
      "purok 1a": "Purok 1A",
      "purok 1 a": "Purok 1A",
      "1b": "Purok 1B",
      "1 b": "Purok 1B",
      "purok 1b": "Purok 1B",
      "1c": "Purok 1C",
      "1 c": "Purok 1C",
      "purok 1c": "Purok 1C",
      "purok1a": "Purok 1A",
      "purok1b": "Purok 1B",
      "purok1c": "Purok 1C",

      "1": "Purok 1A",
      "purok 1": "Purok 1A",
      "purok 2": "Purok 2",
      "purok2": "Purok 2",
      "2": "Purok 2",
      "purok 3": "Purok 3",
      "3": "Purok 3",
      "purok 4": "Purok 4",
      "4": "Purok 4",
      "purok 5": "Purok 5",
      "5": "Purok 5",
      "purok5": "Purok 5",
      "purok 6": "Purok 5",
      "purok6": "Purok 5"
    };

    // try direct map
    if (map[s]) return map[s];

    // try to extract number-letter combos
    const m = s.match(/([1-9])\s*([a-c])?/);
    if (m) {
      const num = m[1];
      const letter = (m[2] || "").toUpperCase();
      if (num === "1" && letter) return `Purok 1${letter}`;
      if (num === "1" && !letter) return "Purok 1A";
      if (num === "2") return "Purok 2";
      if (num === "3") return "Purok 3";
      if (num === "4") return "Purok 4";
      if (num === "5") return "Purok 5";
    }

    // last resort: look for digits
    const digit = s.match(/\d+/);
    if (digit) {
      const n = parseInt(digit[0], 10);
      if (n === 1) return "Purok 1A";
      if (n === 2) return "Purok 2";
      if (n === 3) return "Purok 3";
      if (n === 4) return "Purok 4";
      if (n >= 5) return "Purok 5";
    }

    return null;
  }

  // =========== Realtime: users count ==========
  onValue(ref(db, "users"), (snap) => {
    if (!snap.exists()) {
      totalUsersElement.textContent = "0";
      return;
    }
    const users = snap.val();
    totalUsersElement.textContent = Object.keys(users).length;
    console.log("✅ Users data loaded:", Object.keys(users).length);
  });

  // =========== Realtime: appointments counts ==========
  onValue(ref(db, "appointments"), (snap) => {
    if (!snap.exists()) {
      totalAppointmentsElement.textContent = "0";
      todaysAppointmentsElement.textContent = "0";
      pendingRequestsElement.textContent = "0";
      return;
    }

    const allAppts = snap.val();
    let total = 0;
    let todayCount = 0;
    const todayISO = new Date().toISOString().split("T")[0];

    for (const uid in allAppts) {
      for (const aid in allAppts[uid]) {
        const ap = allAppts[uid][aid];
        total++;
        if (ap.date === todayISO) todayCount++;
      }
    }
    totalAppointmentsElement.textContent = total;
    todaysAppointmentsElement.textContent = todayCount;

    // pending:
    let pending = 0;
    for (const uid in allAppts) {
      for (const aid in allAppts[uid]) {
        if (allAppts[uid][aid].status === "pending") pending++;
      }
    }
    pendingRequestsElement.textContent = pending;
    
    console.log("✅ Appointments data loaded - Total:", total, "Today:", todayCount, "Pending:", pending);
  });

  // =========== Latest Announcement ==========
  onValue(ref(db, "announcement"), (snap) => {
    if (!snap.exists()) {
      latestAnnouncementEl.textContent = "No announcements yet.";
      return;
    }
    const announcements = Object.values(snap.val());
    // sort descending by eventDate+eventTime (newest first)
    announcements.sort((a, b) => {
      const da = new Date((a.eventDate || "") + "T" + (a.eventTime || "00:00"));
      const dbt = new Date((b.eventDate || "") + "T" + (b.eventTime || "00:00"));
      return dbt - da;
    });

    const latest = announcements[0];
    if (!latest) {
      latestAnnouncementEl.textContent = "No announcements yet.";
      return;
    }

    latestAnnouncementEl.innerHTML = `
      <strong>${latest.title || "Announcement"}</strong><br>
      ${latest.message || ""}<br>
      <small>${formatDateMMDDYYYY(latest.eventDate || "")} ${
        latest.eventTime ? formatTo12Hour(latest.eventTime) : ""
      }</small>
    `;
    console.log("✅ Announcements data loaded");
  });

  // =========== High-Risk Analytics ==========
  let lastRiskCount = {};
  puroks.forEach(p => lastRiskCount[p] = 0);

  function notifyPurokRisk(purok, newCount) {
    if (newCount > (lastRiskCount[purok] || 0)) {
      if (window.Swal) {
        Swal.fire({
          icon: "warning",
          title: "High-Risk Alert!",
          text: `New high-risk case detected in ${purok}`,
          toast: true,
          timer: 2500,
          position: "top-end",
          showConfirmButton: false
        });
      } else console.warn("High-risk:", purok, newCount);
    }
    lastRiskCount[purok] = newCount;
  }

  function loadRiskAnalytics() {
    onValue(ref(db, "users"), (snap) => {
      const riskCount = {};
      puroks.forEach(p => riskCount[p] = 0);
      const selectedMonth = monthFilterSelect.value;

      if (!snap.exists()) {
        renderAnalyticsUI(riskCount);
        return;
      }

      const users = snap.val();
      console.log("✅ Users data for analytics:", Object.keys(users).length);

      for (const uid in users) {
        const pInfo = users[uid].pregnancyInfo || {};
        const purokNorm = normalizePurok(pInfo.purok || pInfo.prk || pInfo.barangay || "");
        if (!purokNorm || !riskCount.hasOwnProperty(purokNorm)) {
          continue;
        }

        // find latest vitals from vitals_history and past_records
        let latest = null;
        let latestTime = 0;

        const mr = pInfo.maternalRecords || {};
        const hist = mr.vitals_history || {};
        const past = mr.past_records || {};

        for (const hId in hist) {
          try {
            const rec = hist[hId];
            const t = new Date(rec.timestamp || rec.saved_at || rec.time).getTime();
            if (!isNaN(t) && t > latestTime) {
              latestTime = t;
              latest = rec;
            }
          } catch (e) { /* ignore */ }
        }

        for (const pId in past) {
          try {
            const rec = past[pId];
            const t = new Date(rec.saved_at || rec.vitals?.last_updated || rec.savedAt).getTime();
            if (!isNaN(t) && t > latestTime) {
              latestTime = t;
              latest = rec.vitals ? { ...rec.vitals } : rec;
            }
          } catch (e) { /* ignore */ }
        }

        if (!latest) continue;

        // try to extract BP as "sys/dia"
        const bpRaw = (latest.bp || latest.vitals_bp || latest.bp_reading || latest.bp_value || "").toString().trim();
        if (!bpRaw) continue;

        const parts = bpRaw.split("/").map(s => Number((s || "").replace(/[^\d]/g, "")));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
        const sys = parts[0], dia = parts[1];

        // check high risk condition
        if (sys >= 140 || dia >= 90) {
          const recMonth = new Date(latestTime).toISOString().split("-")[1];
          if (selectedMonth === "all" || recMonth === selectedMonth) {
            riskCount[purokNorm]++;
          }
        }
      }

      puroks.forEach(p => notifyPurokRisk(p, riskCount[p]));
      renderAnalyticsUI(riskCount);
      updateTrendLine(riskCount);
    });
  }

  function renderAnalyticsUI(riskCount) {
    purokAnalyticsBox.innerHTML = "";
    puroks.forEach(p => {
      const color = purokColors[p] || "#333";
      purokAnalyticsBox.innerHTML += `
        <div class="analytics-card" style="border-left:6px solid ${color}">
          <h4>${p}</h4>
          <p>${riskCount[p] || 0} High-Risk</p>
        </div>
      `;
    });

    puroks.forEach((p) => {
      const canvasId = "chart" + p.replace(/\s+/g, "");
      const candidates = [
        `chart${p.replace(/\s+/g, "")}`,
        `chartPurok${p.replace(/\s+/, "")}`,
        `chart${p.replace(/ /g, "")}`,
        `chart${p.replace(/\s+/g, "")}`
      ];
      let canvasEl = null;
      for (const id of candidates) {
        canvasEl = document.getElementById(id);
        if (canvasEl) break;
      }
      if (canvasEl) {
        renderChart(canvasEl.id, riskCount[p] || 0, purokColors[p]);
      }
    });
  }

  function renderChart(canvasId, value, color) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const ctx = el.getContext("2d");

    if (Chart.getChart(canvasId)) Chart.getChart(canvasId).destroy();

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["High-Risk Cases"],
        datasets: [{
          label: "Count",
          data: [value],
          backgroundColor: color
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }

  let trendData = {
    labels: [],
    datasets: puroks.map(p => ({
      label: p,
      data: [],
      borderWidth: 2,
      fill: false,
      borderColor: purokColors[p]
    }))
  };
  let trendChart = null;

  function updateTrendLine(riskCount) {
    const now = new Date().toLocaleTimeString();
    trendData.labels.push(now);
    puroks.forEach((p, i) => {
      trendData.datasets[i].data.push(riskCount[p] || 0);
    });
    if (trendData.labels.length > 20) {
      trendData.labels.shift();
      trendData.datasets.forEach(d => d.data.shift());
    }

    const tEl = document.getElementById("trendLineChart");
    if (!tEl) return;
    const ctx = tEl.getContext("2d");
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: "line",
      data: trendData,
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  // Start loading data
  loadRiskAnalytics();
  monthFilterSelect.addEventListener("change", loadRiskAnalytics);
}