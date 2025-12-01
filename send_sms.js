import axios from "axios";

// Credentials
const customerId = "0E09AF59-8B2D-4CEE-957D-5BF95A373B88";
const apiKey = "Ek/IDafyEGXGfHpsxahM5HhQa3GYolsLCQjPqgtuTKUkK5sR34l3dg/Glgy07qlz/WsvNDk7+Xt87glreRqiBA==";

// SMS Data
const phoneNumber = "639207209282";  // No '+' sign
const message = "Hello from Telesign!";
const messageType = "ARN";

// Basic Auth
const auth = Buffer.from(`${customerId}:${apiKey}`).toString("base64");

// URLSearchParams format (required by Telesign)
const data = new URLSearchParams();
data.append("phone_number", phoneNumber);
data.append("message", message);
data.append("message_type", messageType);

axios.post(
  "https://rest-ww.telesign.com/v1/messaging",
  data, // <-- send as URL-encoded
  {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }
)
.then(res => console.log("SMS Sent:", res.data))
.catch(err => console.error("SMS Error:", err.response?.data || err.message));
