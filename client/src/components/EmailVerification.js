import React, { useState, useEffect } from "react";
import axios from "axios";

const EmailVerification = ({ onVerified }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);

  // Handle countdown timer for OTP expiration
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (otpSent && timer === 0) {
      setOtpSent(false);
    }
    return () => clearInterval(interval);
  }, [timer, otpSent]);

  // Format timer as minutes and seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Send OTP to user's email
  const sendOtp = async () => {
    // Reset states
    setError("");
    setOtp("");
    
    // Validate email
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    if (!email.endsWith("@learner.manipal.edu")) {
      setError("Please use your Manipal University email (@learner.manipal.edu)");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post("http://localhost:5000/send-otp", { email });
      
      if (response.data.success) {
        setOtpSent(true);
        setTimer(5 * 60); // 5 minutes in seconds
        setError("");
      } else {
        setError(response.data.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError(
        error.response?.data?.error || 
        "Failed to send verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the OTP entered by user
  const verifyOtp = async () => {
    // Reset error state
    setError("");
    
    // Validate OTP
    if (!otp) {
      setError("Please enter the verification code");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post("http://localhost:5000/verify-otp", { 
        email,
        otp 
      });
      
      if (response.data.success) {
        // Call the onVerified callback with the verified email
        if (typeof onVerified === 'function') {
          onVerified(email);
        }
      } else {
        setError(response.data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError(
        error.response?.data?.error || 
        "Verification failed. Please check your code and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
        Email Verification
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Email Input Section */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Manipal University Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, sendOtp)}
            placeholder="yourname@learner.manipal.edu"
            disabled={isLoading || otpSent}
            className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          
          {!otpSent ? (
            <button
              onClick={sendOtp}
              disabled={isLoading}
              className="w-full mt-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isLoading ? "Sending..." : "Send Verification Code"}
            </button>
          ) : (
            <p className="text-sm text-green-600 mt-2">
              Verification code sent! Valid for {formatTime(timer)}
              <button 
                onClick={sendOtp}
                disabled={isLoading || timer > 4 * 60} // Prevent resend in the first minute
                className="ml-2 text-blue-600 underline disabled:text-gray-400 disabled:no-underline"
              >
                Resend
              </button>
            </p>
          )}
        </div>
        
        {/* OTP Input Section - Only show when OTP is sent */}
        {otpSent && (
          <div className="space-y-2">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.trim())}
              onKeyPress={(e) => handleKeyPress(e, verifyOtp)}
              placeholder="Enter 6-digit code"
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
            />
            <button
              onClick={verifyOtp}
              disabled={isLoading || !otp}
              className="w-full mt-2 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </button>
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center mt-4">
          Only Manipal University email addresses (@learner.manipal.edu) are accepted.
        </p>
      </div>
    </div>
  );
};

export default EmailVerification;