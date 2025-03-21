import React, { useState } from "react";
import EmailVerification from "./components/EmailVerification";
import VideoChat from "./components/VideoChat";
import Chat from "./components/Chat";

function App() {
  const [verified, setVerified] = useState(false);
  const [mode, setMode] = useState(null); // "text" or "video"

  return (
    <div>
      <h1>MaheMeet - Anonymous Chat</h1>
      {!verified ? (
        <EmailVerification onVerified={() => setVerified(true)} />
      ) : (
        <>
          {!mode ? (
            <div>
              <button onClick={() => setMode("text")}>Text Chat</button>
              <button onClick={() => setMode("video")}>Video Chat</button>
            </div>
          ) : mode === "text" ? (
            <Chat />
          ) : (
            <VideoChat />
          )}
        </>
      )}
    </div>
  );
}

export default App;
