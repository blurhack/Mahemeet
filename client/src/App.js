import React, { useState } from "react";
import EmailVerification from "./components/EmailVerification";
import VideoChat from "./components/VideoChat";
import Chat from "./components/Chat";
import "./App.css";

function App() {
  const [verified, setVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [mode, setMode] = useState(null); // "text" or "video"

  const handleVerification = (email) => {
    setVerified(true);
    setVerifiedEmail(email);
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title">MaheMeet</h1>
        <p className="subtitle">Random Connect for Manipal Students</p>
      </div>
      
      {!verified ? (
        <div className="content-container">
          <div className="intro-section">
            <h2>Connect with fellow Manipal students anonymously</h2>
            <p>Chat privately with other students from Manipal University. Use your university email to get started.</p>
            
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h3>Text Chat</h3>
                <p>Connect through text messages</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎥</div>
                <h3>Video Chat</h3>
                <p>Face-to-face conversations</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">⏭️</div>
                <h3>Skip Option</h3>
                <p>Move to the next person anytime</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Secure Verification</h3>
                <p>Only for Manipal students</p>
              </div>
            </div>
            
            <EmailVerification onVerified={handleVerification} />
          </div>
        </div>
      ) : (
        <div className="content-container">
          {!mode ? (
            <div className="mode-selection">
              <h2>Choose your chat mode</h2>
              <div className="mode-buttons">
                <button className="mode-button text-mode" onClick={() => setMode("text")}>
                  <span className="button-icon">💬</span>
                  <span className="button-text">Text Chat</span>
                </button>
                <button className="mode-button video-mode" onClick={() => setMode("video")}>
                  <span className="button-icon">🎥</span>
                  <span className="button-text">Video Chat</span>
                </button>
              </div>
            </div>
          ) : mode === "text" ? (
            <Chat email={verifiedEmail} />
          ) : (
            <VideoChat email={verifiedEmail} />
          )}
        </div>
      )}
      
      <footer className="footer">
        <p>MaheMeet &copy; {new Date().getFullYear()} - For Manipal University Students</p>
      </footer>
    </div>
  );
}

export default App;