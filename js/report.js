import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Use the shared Firebase app from index.html
const db = window.firebaseDb;

// Report Generation Functionality
export function initializeReportGeneration() {
    const generateReportBtn = document.getElementById("generateReportBtn");
    
    if (!generateReportBtn) {
        console.error("❌ Generate Report button not found");
        return;
    }

    generateReportBtn.addEventListener("click", async function() {
        console.log("📊 Generating report...");
        
        // Show loading state
        generateReportBtn.disabled = true;
        generateReportBtn.textContent = 'Generating Report...';
        
        try {
            await generateComprehensiveReport();
        } catch (error) {
            console.error("❌ Report generation failed:", error);
            alert("Failed to generate report: " + error.message);
        } finally {
            // Reset button
            generateReportBtn.disabled = false;
            generateReportBtn.textContent = 'Generate Report';
        }
    });
}

async function generateComprehensiveReport() {
    // Get current data for the report
    const reportData = await gatherReportData();
    
    // Generate and download the report
    generatePDFReport(reportData);
    
    // Also show summary in alert
    showReportSummary(reportData);
}

async function gatherReportData() {
    return new Promise((resolve) => {
        // Get users data
        onValue(ref(db, "users"), (usersSnap) => {
            const users = usersSnap.exists() ? usersSnap.val() : {};
            
            // Get appointments data
            onValue(ref(db, "appointments"), (appointmentsSnap) => {
                const appointments = appointmentsSnap.exists() ? appointmentsSnap.val() : {};
                
                // Get announcements data
                onValue(ref(db, "announcement"), (announcementsSnap) => {
                    const announcements = announcementsSnap.exists() ? announcementsSnap.val() : {};
                    
                    const reportData = {
                        timestamp: new Date().toLocaleString(),
                        dateRange: getCurrentMonthRange(),
                        users: analyzeUsersData(users),
                        appointments: analyzeAppointmentsData(appointments),
                        highRisk: analyzeHighRiskData(users),
                        announcements: analyzeAnnouncementsData(announcements),
                        summary: generateExecutiveSummary(users, appointments, announcements)
                    };
                    
                    resolve(reportData);
                }, { onlyOnce: true });
            }, { onlyOnce: true });
        }, { onlyOnce: true });
    });
}

function analyzeUsersData(users) {
    const totalUsers = Object.keys(users).length;
    const purokDistribution = {};
    const statusDistribution = {};
    
    Object.values(users).forEach(user => {
        const pInfo = user.pregnancyInfo || {};
        const purok = normalizePurok(pInfo.purok || pInfo.prk || "") || "Unknown";
        const status = pInfo.status || "Unknown";
        
        purokDistribution[purok] = (purokDistribution[purok] || 0) + 1;
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });
    
    return {
        totalUsers,
        purokDistribution,
        statusDistribution,
        averageAge: calculateAverageAge(users)
    };
}

function analyzeAppointmentsData(appointments) {
    let totalAppointments = 0;
    let todayCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    const todayISO = new Date().toISOString().split("T")[0];
    
    for (const uid in appointments) {
        for (const aid in appointments[uid]) {
            const ap = appointments[uid][aid];
            totalAppointments++;
            
            if (ap.date === todayISO) todayCount++;
            if (ap.status === "pending") pendingCount++;
            if (ap.status === "completed") completedCount++;
        }
    }
    
    return {
        totalAppointments,
        todayCount,
        pendingCount,
        completedCount,
        completionRate: totalAppointments > 0 ? (completedCount / totalAppointments * 100).toFixed(1) : 0
    };
}

function analyzeHighRiskData(users) {
    const riskCount = {
        "Purok 1A": 0,
        "Purok 1B": 0, 
        "Purok 1C": 0,
        "Purok 2": 0,
        "Purok 3": 0,
        "Purok 4": 0,
        "Purok 5": 0
    };
    
    Object.values(users).forEach(user => {
        const pInfo = user.pregnancyInfo || {};
        const purokNorm = normalizePurok(pInfo.purok || pInfo.prk || "");
        
        if (!purokNorm || !riskCount.hasOwnProperty(purokNorm)) return;
        
        // Check for high risk in maternal records
        const mr = pInfo.maternalRecords || {};
        const hist = mr.vitals_history || {};
        const past = mr.past_records || {};
        
        let isHighRisk = false;
        
        // Check vitals history
        Object.values(hist).forEach(rec => {
            if (isHighRiskBP(rec.bp)) isHighRisk = true;
        });
        
        // Check past records
        Object.values(past).forEach(rec => {
            if (isHighRiskBP(rec.vitals?.bp)) isHighRisk = true;
        });
        
        if (isHighRisk) riskCount[purokNorm]++;
    });
    
    return riskCount;
}

function isHighRiskBP(bpValue) {
    if (!bpValue) return false;
    const parts = bpValue.toString().split("/").map(s => Number((s || "").replace(/[^\d]/g, "")));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
    
    const sys = parts[0], dia = parts[1];
    return sys >= 140 || dia >= 90;
}

function analyzeAnnouncementsData(announcements) {
    const totalAnnouncements = Object.keys(announcements).length;
    const recentAnnouncements = Object.values(announcements)
        .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
        .slice(0, 5);
    
    return {
        totalAnnouncements,
        recentAnnouncements
    };
}

function calculateAverageAge(users) {
    const ages = Object.values(users)
        .map(user => user.pregnancyInfo?.age)
        .filter(age => age && !isNaN(age));
    
    if (ages.length === 0) return 0;
    return (ages.reduce((sum, age) => sum + parseInt(age), 0) / ages.length).toFixed(1);
}

function getCurrentMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
        month: now.toLocaleString('default', { month: 'long' }),
        year: now.getFullYear(),
        start: firstDay.toLocaleDateString(),
        end: lastDay.toLocaleDateString()
    };
}

function generateExecutiveSummary(users, appointments, announcements) {
    const totalUsers = Object.keys(users).length;
    const appointmentsData = analyzeAppointmentsData(appointments);
    const highRiskData = analyzeHighRiskData(users);
    const totalHighRisk = Object.values(highRiskData).reduce((sum, count) => sum + count, 0);
    
    return {
        totalUsers,
        totalAppointments: appointmentsData.totalAppointments,
        pendingAppointments: appointmentsData.pendingCount,
        totalHighRisk,
        highRiskPercentage: totalUsers > 0 ? ((totalHighRisk / totalUsers) * 100).toFixed(1) : 0
    };
}

// Helper function to normalize purok names
function normalizePurok(raw) {
    if (!raw && raw !== 0) return null;
    let s = String(raw).trim().toLowerCase();
    s = s.replace(/\s+/g, " ");

    const map = {
        "1a": "Purok 1A", "1 a": "Purok 1A", "purok 1a": "Purok 1A", "purok 1 a": "Purok 1A",
        "1b": "Purok 1B", "1 b": "Purok 1B", "purok 1b": "Purok 1B", 
        "1c": "Purok 1C", "1 c": "Purok 1C", "purok 1c": "Purok 1C",
        "purok1a": "Purok 1A", "purok1b": "Purok 1B", "purok1c": "Purok 1C",
        "1": "Purok 1A", "purok 1": "Purok 1A",
        "purok 2": "Purok 2", "purok2": "Purok 2", "2": "Purok 2",
        "purok 3": "Purok 3", "3": "Purok 3",
        "purok 4": "Purok 4", "4": "Purok 4",
        "purok 5": "Purok 5", "5": "Purok 5", "purok5": "Purok 5",
        "purok 6": "Purok 5", "purok6": "Purok 5"
    };

    if (map[s]) return map[s];

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

// Helper function to format dates
function formatDateMMDDYYYY(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr || "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
}

// Helper function to format time
function formatTo12Hour(timeStr) {
    if (!timeStr) return "";
    let [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

function generatePDFReport(reportData) {
    // Create a printable report in new window
    const reportWindow = window.open('', '_blank');
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MomCare Analytics Report - ${reportData.timestamp}</title>
        <link rel="stylesheet" href="css/report.css">
      </head>
      <body class="report-body">
        <div class="report-container">
          <div class="report-header">
            <h1>📊 MomCare Analytics Report</h1>
            <p>Generated on: ${reportData.timestamp}</p>
            <p>Period: ${reportData.dateRange.month} ${reportData.dateRange.year}</p>
          </div>

          <div class="report-section">
            <h3>🎯 Executive Summary</h3>
            <div class="report-stats-grid">
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.summary.totalUsers}</span>
                <span class="report-stat-label">Total Users</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.summary.totalAppointments}</span>
                <span class="report-stat-label">Total Appointments</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.summary.pendingAppointments}</span>
                <span class="report-stat-label">Pending Appointments</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.summary.totalHighRisk}</span>
                <span class="report-stat-label">High-Risk Cases</span>
              </div>
            </div>
          </div>

          <div class="report-section">
            <h3>👥 User Distribution by Purok</h3>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Purok</th>
                  <th>User Count</th>
                  <th>High-Risk Cases</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportData.users.purokDistribution).map(([purok, count]) => `
                  <tr>
                    <td><strong>${purok}</strong></td>
                    <td>${count}</td>
                    <td>${reportData.highRisk[purok] || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="report-section">
            <h3>📅 Appointment Statistics</h3>
            <div class="report-stats-grid">
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.appointments.todayCount}</span>
                <span class="report-stat-label">Today's Appointments</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.appointments.completionRate}%</span>
                <span class="report-stat-label">Completion Rate</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.appointments.pendingCount}</span>
                <span class="report-stat-label">Pending Requests</span>
              </div>
              <div class="report-stat-card">
                <span class="report-stat-number">${reportData.appointments.completedCount}</span>
                <span class="report-stat-label">Completed</span>
              </div>
            </div>
          </div>

          <div class="report-section">
            <h3>⚠️ High-Risk Analysis</h3>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Purok</th>
                  <th>High-Risk Cases</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportData.highRisk).map(([purok, count]) => {
                  const riskLevel = count === 0 ? 'Low' : count <= 2 ? 'Medium' : 'High';
                  const riskClass = count === 0 ? 'risk-low' : count <= 2 ? 'risk-medium' : 'risk-high';
                  return `
                    <tr>
                      <td><strong>${purok}</strong></td>
                      <td>${count}</td>
                      <td><span class="${riskClass}">${riskLevel}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="report-section">
            <h3>📢 Recent Announcements</h3>
            ${reportData.announcements.recentAnnouncements.map(ann => `
              <div class="report-announcement-card">
                <strong>${ann.title || 'No Title'}</strong>
                <div>${ann.message || 'No message'}</div>
                <small>📅 Date: ${formatDateMMDDYYYY(ann.eventDate)} | ⏰ Time: ${formatTo12Hour(ann.eventTime)}</small>
              </div>
            `).join('')}
            ${reportData.announcements.recentAnnouncements.length === 0 ? 
              '<div class="report-announcement-card"><em>No announcements found</em></div>' : ''}
          </div>

          <div class="report-footer">
            <p>Generated by MomCare Admin System | Comprehensive Maternal Care Analytics</p>
            <div class="report-button-group">
              <button class="report-print-btn no-print" onclick="window.print()">Print Report</button>
              <button class="report-download-btn no-print" onclick="downloadAsPDF()">Download PDF</button>
              <button class="report-close-btn no-print" onclick="window.close()">Close Window</button>
            </div>
          </div>
        </div>

        <script>
          function downloadAsPDF() {
            alert('To download as PDF, please use the "Print" feature and choose "Save as PDF" as the printer destination.');
          }
        </script>
      </body>
      </html>
    `;
    
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
}

function showReportSummary(reportData) {
    const summary = reportData.summary;
    
    Swal.fire({
        title: '📊 Report Generated Successfully!',
        html: `
        <div style="text-align: left;">
            <p><strong>Executive Summary:</strong></p>
            <ul>
            <li>Total Users: ${summary.totalUsers}</li>
            <li>Total Appointments: ${summary.totalAppointments}</li>
            <li>Pending Appointments: ${summary.pendingAppointments}</li>
            <li>High-Risk Cases: ${summary.totalHighRisk}</li>
            <li>High-Risk Rate: ${summary.highRiskPercentage}%</li>
            </ul>
            <p>A detailed report has been opened in a new window.</p>
        </div>
        `,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1e1f57'
    });
}

// Initialize report generation when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReportGeneration);
} else {
    initializeReportGeneration();
}