import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==============================
// Telesign credentials
// ==============================
const TELE_CUSTOMER_ID = "0E09AF59-8B2D-4CEE-957D-5BF95A373B88";
const TELE_API_KEY = "Ek/IDafyEGXGfHpsxahM5HhQa3GYolsLCQjPqgtuTKUkK5sR34l3dg/Glgy07qlz/WsvNDk7+Xt87glreRqiBA==";

// ==============================
// Helper function: send SMS
// ==============================
async function sendSms(number, message) {
  try {
    const formattedNumber = number.replace(/^\+/, ""); // remove + if exists
    const auth = Buffer.from(`${TELE_CUSTOMER_ID}:${TELE_API_KEY}`).toString("base64");

    const data = new URLSearchParams();
    data.append("phone_number", formattedNumber);
    data.append("message", message);
    data.append("message_type", "ARN");

    const response = await axios.post(
      "https://rest-ww.telesign.com/v1/messaging",
      data,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

// ==============================
// API Endpoint: POST /send-sms
// ==============================
app.post("/send-sms", async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ success: false, error: "Missing parameters" });

  try {
    const result = await sendSms(to, text);

    if (result.success) {
      res.json({ success: true, response: result.data });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// Start server
// ==============================
const PORT = 3001;
app.listen(PORT, () => console.log(`SMS server running on port ${PORT}`));
