import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Square,
  Eye,
  Mic,
  RotateCcw,
  RefreshCw,
  Camera,
  Video,
} from "lucide-react";
import { eyeTrackingApi } from "../../services/eyeTrackingApi";
import { useToast } from "../../contexts/ToastContext";
import "./LiveSession.css";
import { BASE_URL } from "../../services/eyeTrackingApi";
import { usePhrasesStorage } from "../../hooks/useLocalStorage";

const LiveSession: React.FC = () => {
  const { showToast } = useToast();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [videoStatus, setVideoStatus] = useState<"connected" | "disconnected">(
    "disconnected"
  );
  const [camIndex, setCamIndex] = useState<string>("");
  const [camLink, setCamLink] = useState<string>("");
  const videoImgRef = useRef<HTMLImageElement>(null);
  const videoWsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load phrases for Quick Access
  const { phrases, isLoading, incrementUsage } = usePhrasesStorage();

  // Choose up to 6 most-used phrases as quick access
  const quickPhrases = useMemo(() => {
    if (isLoading) return [];
    return [...phrases]
      .sort(
        (a, b) =>
          b.usageCount - a.usageCount ||
          b.createdAt.getTime() - a.createdAt.getTime()
      )
      .slice(0, 6);
  }, [phrases, isLoading]);

  // Speak helper (fallback if audio missing)
  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const playPhrase = useCallback(
    async (phraseId: string) => {
      const phrase = phrases.find((p) => p.id === phraseId);
      if (!phrase) return;
      try {
        if (audioRef.current && phrase.audioUrl) {
          audioRef.current.src = phrase.audioUrl;
          await audioRef.current.play();
        } else {
          speakText(phrase.text);
        }
        incrementUsage(phrase.id);
      } catch (err) {
        console.error("Error playing phrase:", err);
        speakText(phrase.text);
      }
    },
    [phrases, incrementUsage, speakText]
  );

  // Video WebSocket connection
  const connectVideoWebSocket = React.useCallback(() => {
    if (videoWsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsVideoURL = `ws://${BASE_URL.replace(/^https?:\/\//, "")}/video`;
    const wsVideo = new WebSocket(wsVideoURL);
    wsVideo.binaryType = "arraybuffer";

    wsVideo.onopen = () => {
      console.log("Video WS connected");
      setVideoStatus("connected");
    };

    wsVideo.onmessage = (event) => {
      if (videoImgRef.current) {
        const blob = new Blob([event.data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        videoImgRef.current.src = url;
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    };

    wsVideo.onclose = () => {
      console.log("Video WS closed");
      setVideoStatus("disconnected");
    };

    wsVideo.onerror = (error) => {
      console.error("Video WS error:", error);
      setVideoStatus("disconnected");
    };

    videoWsRef.current = wsVideo;
  }, []);

  // Check session status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isActive = await eyeTrackingApi.checkSessionStatus();
        setIsSessionActive(isActive);
        if (isActive) {
          connectVideoWebSocket();
        }
      } catch (error) {
        console.error("Failed to check session status:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("session_active");
        const isActive = stored === "true";
        setIsSessionActive(isActive);
        if (isActive) {
          connectVideoWebSocket();
        }
      }
    };
    checkStatus();
  }, [connectVideoWebSocket]);

  // Reconnect video WebSocket when session becomes active
  useEffect(() => {
    if (isSessionActive && videoStatus === "disconnected") {
      connectVideoWebSocket();
    } else if (!isSessionActive && videoWsRef.current) {
      videoWsRef.current.close();
      videoWsRef.current = null;
      setVideoStatus("disconnected");
    }
  }, [isSessionActive, videoStatus, connectVideoWebSocket]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (videoWsRef.current) {
        videoWsRef.current.close();
        videoWsRef.current = null;
      }
    };
  }, []);

  const startSession = async () => {
    try {
      await eyeTrackingApi.startSession();
      setIsSessionActive(true);
      localStorage.setItem("session_active", "true");
      connectVideoWebSocket();
      showToast("Session started successfully", "success");
    } catch (error) {
      console.error("Failed to start session:", error);
      showToast(
        "Failed to start session. Please check if the backend is running.",
        "error"
      );
    }
  };

  const stopSession = async () => {
    try {
      await eyeTrackingApi.stopSession();
      setIsSessionActive(false);
      localStorage.setItem("session_active", "false");
      if (videoWsRef.current) {
        videoWsRef.current.close();
        videoWsRef.current = null;
      }
      showToast("Session stopped successfully", "success");
    } catch (error) {
      console.error("Failed to stop session:", error);
      showToast("Failed to stop session.", "error");
    }
  };

  const handleCalibrate = async () => {
    try {
      await eyeTrackingApi.calibrate();
      showToast("Calibration started successfully", "success");
    } catch (error) {
      console.error("Failed to start calibration:", error);
      showToast(
        "Failed to start calibration. Please check if the backend is running.",
        "error"
      );
    }
  };

  const handleResetHaar = async () => {
    try {
      await eyeTrackingApi.resetHaar();
      showToast("Eye capture reset successfully", "success");
    } catch (error) {
      console.error("Failed to reset Haar cascade:", error);
      showToast(
        "Failed to reset eye capture. Please check if the backend is running.",
        "error"
      );
    }
  };

  const handleSetCameraIndex = async () => {
    if (!camIndex.trim()) {
      showToast("Please enter camera index", "warning");
      return;
    }
    const index = parseInt(camIndex);
    if (isNaN(index)) {
      showToast("Camera index must be a number", "warning");
      return;
    }
    try {
      const responseText = await eyeTrackingApi.setCameraIndex(index);

      // Check if backend is active
      if (responseText.includes("Please turn off backend first")) {
        showToast("Please turn off backend first", "warning");
        return;
      }

      // Check for missing parameter
      if (responseText.includes("Missing")) {
        showToast(responseText, "warning");
        return;
      }

      showToast(
        responseText || `Camera index ${index} set successfully`,
        "success"
      );
    } catch (error) {
      console.error("Failed to set camera index:", error);
      showToast(
        "Failed to set camera index. Please check if the backend is running.",
        "error"
      );
    }
  };

  const handleSetCameraLink = async () => {
    if (!camLink.trim()) {
      showToast("Please enter camera link", "warning");
      return;
    }
    try {
      const responseText = await eyeTrackingApi.setCameraLink(camLink);

      // Check if backend is active
      if (responseText.includes("Please turn off backend first")) {
        showToast("Please turn off backend first", "warning");
        return;
      }

      // Check for missing parameter
      if (responseText.includes("Missing")) {
        showToast(responseText, "warning");
        return;
      }

      showToast(responseText || "Camera link set successfully", "success");
    } catch (error) {
      console.error("Failed to set camera link:", error);
      showToast(
        "Failed to set camera link. Please check if the backend is running.",
        "error"
      );
    }
  };

  return (
    <div className="live-session">
      <div className="session-header">
        <h1>Live Session</h1>
        <div className="connection-status">
          <div
            className={`status-indicator ${
              videoStatus === "connected" ? "connected" : "disconnected"
            }`}
          />
          Video: {videoStatus === "connected" ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div className="session-content">
        {/* Video Preview */}
        <div className="video-section">
          <div className="video-container">
            {videoStatus === "connected" && isSessionActive ? (
              <img
                ref={videoImgRef}
                id="video"
                alt="Video Stream"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div className="video-placeholder">
                <Eye size={48} />
                <p>Eye Tracking Preview</p>
                {!isSessionActive && (
                  <p style={{ fontSize: "14px", marginTop: "10px" }}>
                    Start session to view video stream
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="session-controls">
            <button
              onClick={isSessionActive ? stopSession : startSession}
              className={`control-btn ${isSessionActive ? "stop" : "start"}`}
            >
              {isSessionActive ? <Square size={20} /> : <Play size={20} />}
              {isSessionActive ? "Stop Session" : "Start Session"}
            </button>

            <button onClick={handleCalibrate} className="control-btn secondary">
              <RotateCcw size={20} />
              Calibrate
            </button>

            <button onClick={handleResetHaar} className="control-btn secondary">
              <RefreshCw size={20} />
              Capture Eye
            </button>

            {/* Button untuk Voice Session */}
            <Link to="/voice-session" className="control-btn primary">
              <Mic size={20} />
              Voice Session
            </Link>
          </div>
        </div>

        {/* Status Section */}
        <div className="status-section">
          <h3>Session Status</h3>
          <div
            className={`calibration-status ${
              isSessionActive ? "completed" : "idle"
            }`}
          >
            {isSessionActive ? "Session Active" : "Session Inactive"}
          </div>

          <div className="status-grid">
            <div className="status-item">
              <span className="label">Video Stream:</span>
              <span
                className={`value ${
                  videoStatus === "connected" ? "active" : ""
                }`}
              >
                {videoStatus === "connected" ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Session:</span>
              <span className={`value ${isSessionActive ? "active" : ""}`}>
                {isSessionActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Camera Source Control */}
          <div className="camera-control-section">
            <h4>Camera Source Control</h4>
            <div className="camera-input-group">
              <div className="camera-input-item">
                <label>
                  <Camera size={16} />
                  Camera Index
                </label>
                <div className="camera-input-wrapper">
                  <input
                    type="text"
                    placeholder="Enter camera index (e.g. 0)"
                    value={camIndex}
                    onChange={(e) => setCamIndex(e.target.value)}
                    className="camera-input"
                  />
                  <button
                    onClick={handleSetCameraIndex}
                    className="control-btn secondary small"
                  >
                    Set
                  </button>
                </div>
              </div>
              <div className="camera-input-item">
                <label>
                  <Video size={16} />
                  Camera Link
                </label>
                <div className="camera-input-wrapper">
                  <input
                    type="text"
                    placeholder="Enter camera link (e.g. rtsp://...)"
                    value={camLink}
                    onChange={(e) => setCamLink(e.target.value)}
                    className="camera-input"
                  />
                  <button
                    onClick={handleSetCameraLink}
                    className="control-btn secondary small"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Phrases */}
        <div className="phrases-section">
          <h3>Quick Access Phrases</h3>
          <div className="phrase-grid">
            {quickPhrases.length === 0 && (
              <div className="no-phrases">No phrases available yet</div>
            )}
            {quickPhrases.map((p) => (
              <button
                key={p.id}
                className="phrase-btn"
                onClick={() => playPhrase(p.id)}
                title={p.category}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Hidden shared audio element */}
      <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
    </div>
  );
};

export default LiveSession;
