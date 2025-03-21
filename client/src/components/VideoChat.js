import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function VideoChat() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("message", (msg) => setMessages((prev) => [...prev, msg]));
  }, []);

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>
      <button onClick={() => socket.emit("skip")}>Skip</button>
    </div>
  );
}

export default VideoChat;
