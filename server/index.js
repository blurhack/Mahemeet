require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Store OTPs temporarily with expiration
const otpStore = new Map();

// OTP email sending endpoint
app.post("/send-otp", async (req, res) => {
  try {
    console.log("Received request:", req.body);
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      console.error("Error: Email is missing");
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    
    if (!email.endsWith("@learner.manipal.edu")) {
      console.error("Error: Invalid email domain");
      return res.status(400).json({ success: false, error: "Invalid email domain" });
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${email}:`, otp);
    
    // Store OTP with 5-minute expiration
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000  // 5 minutes
    });
    
    // Set timeout to clear the OTP after expiration
    setTimeout(() => {
      if (otpStore.has(email)) {
        otpStore.delete(email);
        console.log(`OTP for ${email} expired and removed`);
      }
    }, 5 * 60 * 1000);
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Configure email content
    const mailOptions = {
      from: `"Manipal Chat Verification" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3f51b5;">Your Verification Code</h2>
          <p>Please use the following code to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 10px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #757575; font-size: 14px;">This code will expire in 5 minutes.</p>
        </div>
      `
    };
    
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to:", email);
    
    // Return success response (without revealing the OTP)
    return res.json({ success: true, message: "Verification code sent successfully" });
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ success: false, error: "Failed to send verification code", details: error.message });
  }
});

// Verify OTP endpoint
app.post("/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: "Email and verification code are required" 
      });
    }
    
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        error: "No verification code found or code has expired" 
      });
    }
    
    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        error: "Verification code has expired" 
      });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid verification code" 
      });
    }
    
    // Code verified successfully, remove from store
    otpStore.delete(email);
    return res.json({ 
      success: true, 
      message: "Email verified successfully" 
    });
    
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
});

// Socket.io chat logic
let waitingUsers = new Map();  // Store waiting users by category

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);
  
  // User joins chat with preferences
  socket.on("join", ({ email, preferences }) => {
    // Store user data
    socket.userData = { email, preferences };
    socket.emit("status", "Looking for a match...");
    
    // Find a match based on preferences
    findChatPartner(socket);
  });
  
  // Handle messages
  socket.on("message", (message) => {
    if (socket.partner) {
      socket.partner.emit("message", {
        text: message,
        sender: "partner"
      });
    }
  });
  
  // Handle user skipping current chat
  socket.on("skip", () => {
    if (socket.partner) {
      socket.partner.emit("status", "Partner has disconnected");
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
    }
    
    socket.partner = null;
    socket.emit("status", "Looking for a new partner...");
    
    // Find a new partner
    findChatPartner(socket);
  });
  
  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove from waiting list if applicable
    if (socket.userData && socket.userData.preferences) {
      const category = socket.userData.preferences.category || "general";
      
      if (waitingUsers.has(category)) {
        const categoryUsers = waitingUsers.get(category);
        const filteredUsers = categoryUsers.filter(user => user.id !== socket.id);
        
        if (filteredUsers.length === 0) {
          waitingUsers.delete(category);
        } else {
          waitingUsers.set(category, filteredUsers);
        }
      }
    }
    
    // Notify partner of disconnect
    if (socket.partner) {
      socket.partner.emit("status", "Partner has disconnected");
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
    }
  });
});

// Function to find chat partner
function findChatPartner(socket) {
  if (!socket.userData || !socket.userData.preferences) return;
  
  const category = socket.userData.preferences.category || "general";
  
  if (!waitingUsers.has(category)) {
    waitingUsers.set(category, []);
  }
  
  const categoryUsers = waitingUsers.get(category);
  
  // Find a waiting user that isn't ourselves
  const partnerIndex = categoryUsers.findIndex(user => user.id !== socket.id);
  
  if (partnerIndex !== -1) {
    // Found a match
    const partner = categoryUsers[partnerIndex];
    
    // Remove partner from waiting list
    categoryUsers.splice(partnerIndex, 1);
    if (categoryUsers.length === 0) {
      waitingUsers.delete(category);
    } else {
      waitingUsers.set(category, categoryUsers);
    }
    
    // Connect the two users
    socket.partner = partner;
    partner.partner = socket;
    
    // Notify both users of successful connection
    socket.emit("matched", { category });
    partner.emit("matched", { category });
    
    socket.emit("status", "Connected to a partner");
    partner.emit("status", "Connected to a partner");
  } else {
    // No partner found, add to waiting list
    categoryUsers.push(socket);
    waitingUsers.set(category, categoryUsers);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Something went wrong!" });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});