import App from "./App.tsx"
import "./index.css"
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AudioContextProvider } from "./context/useAudioContext"

ReactDOM.createRoot(document.getElementById("qchat-chat-popup-container")!).render(
  <React.StrictMode>
    <BrowserRouter>
    <AudioContextProvider>
      <App />
      </AudioContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
