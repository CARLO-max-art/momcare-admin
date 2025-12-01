const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Serve static files (e.g., dashboard.html, login.html, CSS, JS)
app.use(express.static(path.join(__dirname, "public"))); // 👈 Put your frontend files in a 'public' folder

// ✅ CAPTCHA route
app.post("/verify-captcha", async (req, res) => {
  const { response } = req.body;
  const secret = "6LfSyFgrAAAAAFMb1qzxQRmGoMg6EtNmkysaP33-"; // your reCAPTCHA secret

  try {
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${response}`
    });

    const data = await verifyRes.json();
    res.json(data);
  } catch (error) {
    console.error("CAPTCHA backend error:", error);
    res.status(500).json({ success: false });
  }
});

// ✅ Optional: Route for the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html")); // Or whatever your main page is
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
