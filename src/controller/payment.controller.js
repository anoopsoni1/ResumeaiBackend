import crypto from "crypto";
import { Cashfree } from "cashfree-pg";
import dotenv from "dotenv";
import { Asynchandler } from "../utils/Asynchandler.js";

dotenv.config();

const cashfree = new Cashfree(
  Cashfree.SANDBOX,
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

function generateOrderId() {
  const uniqueId = crypto.randomBytes(16).toString("hex");
  return crypto.createHash("sha256").update(uniqueId).digest("hex").substr(0, 12);
}

export const Payment = Asynchandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: " Name and Email are required" });
  }

  const requestBody = {
  order_amount: 100,
  order_currency: "INR",
  order_id: generateOrderId(),
  customer_details: {
    customer_id:  "cust_" + Date.now(),
    customer_name: name,
    customer_email: email,
    customer_phone: "9999999999"
  },
  order_meta: {
    return_url: "http://localhost:5173/payment-success"  
  }
};
  try {
    const response = await cashfree.PGCreateOrder(requestBody);
    // console.log("Order created:", response.data);
    res.json(response.data);
  } catch (error) {
    // console.error("Error creating order:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


export const VerifyPayment = Asynchandler(async (req, res) => {
  const { order_id } = req.body; 
  try {
    const response = await cashfree.PGOrderFetchPayments(order_id);
    // console.log("Payment verification:", response.data);
    res.json(response.data);
  } catch (error) {
    // console.error("Verification error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});
