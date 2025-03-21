import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./VideoChat.css";

const socket = io("http://localhost:5000");

function VideoChat({ email }) {
  const [status, setStatus] = useState("Connecting...");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [interests, setInterests] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Setup WebRTC
  const peerConnection = useRef(null);
  const dataChannel = useRef(null);

  useEffect(() => {
    // Start camera
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setStatus("Camera error. Please check permissions.");
      }
    };
    
    startVideo();
    
    // Set up socket listeners
    socket.on("status", (msg) => {
      setStatus(msg);
    });
    
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Auto scroll to bottom of chat
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
    
    socket.on("matched", async () => {
      setIsMatched(true);
      setStatus("Connected to a partner!");
      
      // Initialize WebRTC for new connection
      await initializeWebRTC();
    });
    
    socket.on("partnerLeft", () => {
      setIsMatched(false);
      setStatus("Partner disconnected. Looking for a new match...");
      
      // Clean up WebRTC connection
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    });
    
    socket.on("offer", async (offer) => {
      if (!peerConnection.current) {
        await initializeWebRTC();
      }
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.emit("answer", answer);
    });
    
    socket.on("answer", async (answer) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
    
    socket.on("ice-candidate", async (candidate) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
    
    return () => {
      // Clean up on component unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      
      socket.off("status");
      socket.off("message");
      socket.off("matched");
      socket.off("partnerLeft");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, []);
  
  const initializeWebRTC = async () => {
    // Create new peer connection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]
    });
    
    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream);
      });
    }
    
    // Set up data channel for chat
    dataChannel.current = peerConnection.current.createDataChannel("chat");
    dataChannel.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };
    
    // Handle incoming tracks (remote video)
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };
    
    // Create and send offer if we are the initiator
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", offer);
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };
  
  const joinChat = () => {
    socket.emit("join", { 
      email,
      preferences: { 
        category: interests.trim() || "general" 
      } 
    });
    setHasJoined(true);
    setStatus("Looking for a match...");
  };
  
  const skipPartner = () => {
    socket.emit("skip");
    setIsMatched(false);
    setStatus("Looking for a new match...");
    setMessages([]);
    
    // Clean up WebRTC connection
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };
  
  const sendMessage = () => {
    if (input.trim()) {
      const message = {
        text: input,
        sender: "you",
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, message]);
      
      // Send via data channel if available
      if (dataChannel.current && dataChannel.current.readyState === "open") {
        dataChannel.current.send(JSON.stringify({
          text: input,
          sender: "partner",
          timestamp: new Date().toISOString()
        }));
      } else {
        // Fallback to socket.io
        socket.emit("message", input);
      }
      
      setInput("");
      
      // Auto scroll to bottom of chat
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="video-chat-container">
      {!hasJoined ? (
        <div className="join-section">
          <h2>Ready to start video chatting?</h2>
          <p>You can specify interests to match with like-minded students (optional)</p>
          
          <div className="interests-input">
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Interests (optional, comma separated)"
              className="interests-field"
            />
          </div>
          
          <button className="join-button" onClick={joinChat}>
            Start Chatting
          </button>
        </div>
      ) : (
        <div className="chat-interface">
          <div className="status-bar">
            <div className="status-indicator">
              <span className={`status-dot ${isMatched ? "connected" : "searching"}`}></span>
              <span className="status-text">{status}</span>
            </div>
            <button className="skip-button" onClick={skipPartner}>
              Skip
            </button>
          </div>
          
          <div className="video-container">
            <div className="remote-video-wrapper">
              {isMatched ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              ) : (
                <div className="waiting-screen">
                  <div className="spinner"></div>
                  <p>Waiting for a match...</p>
                </div>
              )}
            </div>
            
            <div className="local-video-wrapper">
              <video ref={localVideoRef} autoPlay muted playsInline className="local-video" />
            </div>
          </div>
          
          <div className="chat-section">
            <div className="chat-messages" ref={chatContainerRef}>
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender === "you" ? "outgoing" : "incoming"}`}
                >
                  <div className="message-bubble">
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="chat-input">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isMatched}
              />
              <button onClick={sendMessage} disabled={!isMatched || !input.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoChat;