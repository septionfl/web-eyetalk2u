import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Square,
  Eye,
  Volume2,
  Maximize2,
  Minimize2,
  Settings,
  Plus,
  Trash2,
  Save,
  Download,
  ArrowLeft,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { usePhrasesStorage } from "../../hooks/useLocalStorage";
import { eyeTrackingApi } from "../../services/eyeTrackingApi";
import { useToast } from "../../contexts/ToastContext";
import "./VoiceSession.css";

interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

// =========================
// Dwell/Tracking Parameters
// =========================
// These defaults can be tuned or moved to a shared constants file if needed.
const DEFAULT_DWELL_SECONDS = 0.6; // T
const DEFAULT_FPS = 24; // F
const DEFAULT_THETA = 0.8; // θ
const DEFAULT_CONSEC_MS = 1500; // M in milliseconds
const SMOOTHING_WINDOW = 12; // moving average of last K gaze points

interface VoiceButton {
  id: string;
  label: string;
  audioUrl: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  type?: "standard" | "lock";
}

const VoiceSession: React.FC = () => {
  const { showToast } = useToast();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null); // smoothed point for UI
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const [lastPlayedAudio, setLastPlayedAudio] = useState<string | null>(null);
  const [useMouseSimulation, setUseMouseSimulation] = useState(true);
  const inputModeRef = useRef<boolean>(true); // Persist mode across re-renders

  // Sync ref with state
  useEffect(() => {
    inputModeRef.current = useMouseSimulation;
  }, [useMouseSimulation]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newButtonConfig, setNewButtonConfig] = useState<Partial<VoiceButton>>({
    label: "",
    color: "#3B82F6",
  });
  const [isScreenLocked, setIsScreenLocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gazeContainerRef = useRef<HTMLDivElement>(null);

  const { gazeData, sendMessage, isConnected } = useWebSocket(
    "ws://localhost:9001/mapping"
  );
  const {
    phrases,
    isLoading,
    addPhrase,
    deletePhrase,
    reloadPhrases,
    incrementUsage,
  } = usePhrasesStorage();

  // Helper function untuk menentukan warna berdasarkan kategori
  const getColorByCategory = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      kebutuhan_dasar: "#3B82F6", // Blue
      medis: "#EF4444", // Red
      kenyamanan: "#10B981", // Green
      bantuan: "#F59E0B", // Yellow
      emergency: "#DC2626", // Dark Red
    };

    return colorMap[category] || "#6B7280"; // Gray default
  };

  // Konversi phrases menjadi voiceButtons
  const voiceButtons: VoiceButton[] = React.useMemo(() => {
    if (phrases.length === 0) return [];
    const n = phrases.length;

    if (n === 1) {
      const phrase = phrases[0];
      const color = phrase.color || getColorByCategory(phrase.category);
      return [
        {
          id: phrase.id,
          label: phrase.text,
          audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`,
          centerX: 50,
          centerY: 50,
          radius: 24,
          color,
          type: "standard",
        },
      ];
    }

    if (n === 2) {
      const positions = [
        { x: 25, y: 50 },
        { x: 75, y: 50 },
      ];
      return phrases.map((phrase, index) => ({
        id: phrase.id,
        label: phrase.text,
        audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`,
        centerX: positions[index].x,
        centerY: positions[index].y,
        radius: 20,
        color: phrase.color || getColorByCategory(phrase.category),
        type: "standard",
      }));
    }

    if (n === 3) {
      const positions = [
        { x: 50, y: 30 },
        { x: 30, y: 70 },
        { x: 70, y: 70 },
      ];
      return phrases.map((phrase, index) => ({
        id: phrase.id,
        label: phrase.text,
        audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`,
        centerX: positions[index].x,
        centerY: positions[index].y,
        radius: 12,
        color: phrase.color || getColorByCategory(phrase.category),
        type: "standard",
      }));
    }

    if (n === 5) {
      const positions = [
        { x: 25, y: 25 },
        { x: 75, y: 25 },
        { x: 50, y: 50 },
        { x: 25, y: 75 },
        { x: 75, y: 75 },
      ];
      return phrases.map((phrase, index) => ({
        id: phrase.id,
        label: phrase.text,
        audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`,
        centerX: positions[index].x,
        centerY: positions[index].y,
        radius: 12,
        color: phrase.color || getColorByCategory(phrase.category),
        type: "standard",
      }));
    }

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    // Keep some safety padding from the container edges
    const edgePad = 6; // percent
    const effW = 100 - edgePad * 2;
    const effH = 100 - edgePad * 2;

    const cellW = effW / cols;
    const cellH = effH / rows;
    const minCell = Math.min(cellW, cellH);

    // Smaller fill factors = more gap between circles
    const fillFactor = n <= 4 ? 0.44 : n <= 9 ? 0.4 : n <= 16 ? 0.36 : 0.32;
    const targetRadius = (minCell * fillFactor) / 2;
    const maxRadius = Math.max(8, minCell / 2 - 4); // ensure visible gap
    const minRadius = n > 12 ? 8 : 10;
    const computedRadius = Math.max(
      6,
      Math.max(minRadius, Math.min(targetRadius, maxRadius)) - 2
    );

    return phrases.map((phrase, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const centerX = edgePad + c * cellW + cellW / 2;
      const centerY = edgePad + r * cellH + cellH / 2;

      return {
        id: phrase.id,
        label: phrase.text,
        audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`,
        centerX,
        centerY,
        radius: computedRadius,
        color: phrase.color || getColorByCategory(phrase.category),
        type: "standard",
      };
    });
  }, [phrases]);

  const lockControlButton: VoiceButton = React.useMemo(
    () => ({
      id: isScreenLocked ? "unlock-control" : "lock-control",
      label: isScreenLocked ? "Open" : "Lock",
      audioUrl: "",
      centerX: 50,
      centerY: 96,
      radius: isScreenLocked ? 14 : 12,
      color: isScreenLocked ? "#16a34a" : "#111827",
      type: "lock",
    }),
    [isScreenLocked]
  );

  // =========================
  // Eye-Tracking State/Refs
  // =========================
  // Raw gaze samples used for smoothing (not rendered)
  const rawGazeBufferRef = useRef<GazePoint[]>([]);
  // Tracking of the current candidate button
  const trackingButtonIdRef = useRef<string | null>(null);
  // Sliding window buffer for the last T seconds for the current button
  const windowBufferRef = useRef<{ t: number; inside: boolean }[]>([]);
  // Count of consecutive frames inside current button region
  const consecutiveInsideRef = useRef<number>(0);
  // RAF control
  const rafIdRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef<number>(0);

  // Text-to-speech fallback
  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Trigger button action
  const triggerButton = useCallback(
    (button: VoiceButton) => {
      if (button.type === "lock") {
        setIsScreenLocked((prev) => {
          const nextState = !prev;
          sendMessage({
            type: "lock_toggle",
            data: {
              locked: nextState,
              timestamp: Date.now(),
            },
          });
          showToast(nextState ? "Screen locked" : "Screen unlocked", "info");
          return nextState;
        });
        setActiveButton(null);
        setDwellProgress(0);
        trackingButtonIdRef.current = null;
        windowBufferRef.current = [];
        consecutiveInsideRef.current = 0;
        return;
      }

      console.log(`Triggering button: ${button.label}`);
      setLastPlayedAudio(button.label);

      // Increment usage count
      incrementUsage(button.id);

      if (audioRef.current) {
        audioRef.current.src = button.audioUrl;
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          speakText(button.label);
        });
      } else {
        speakText(button.label);
      }

      sendMessage({
        type: "button_triggered",
        data: {
          buttonId: button.id,
          buttonLabel: button.label,
          timestamp: Date.now(),
          gazePoint: gazePoint,
        },
      });
    },
    [sendMessage, gazePoint, incrementUsage, speakText, showToast]
  );

  // =========================
  // Geometry helpers
  // =========================
  const isInsideButton = useCallback(
    (x: number, y: number, button: VoiceButton) => {
      const distance = Math.sqrt(
        Math.pow(x - button.centerX, 2) + Math.pow(y - button.centerY, 2)
      );
      return distance <= button.radius;
    },
    []
  );

  const findButtonAtPoint = useCallback(
    (x: number, y: number): VoiceButton | null => {
      const interactableButtons = isScreenLocked
        ? [lockControlButton]
        : [...voiceButtons, lockControlButton];
      for (const button of interactableButtons) {
        if (isInsideButton(x, y, button)) return button;
      }
      return null;
    },
    [voiceButtons, lockControlButton, isInsideButton, isScreenLocked]
  );

  // =========================
  // Smoothing and Frame Loop
  // =========================
  // Push a raw sample and compute smoothed gaze (moving average)
  const pushRawGazeSample = useCallback((sample: GazePoint) => {
    const buf = rawGazeBufferRef.current;
    buf.push(sample);
    if (buf.length > SMOOTHING_WINDOW) buf.shift();

    // Moving average smoothing
    const sum = buf.reduce(
      (acc, p) => {
        acc.x += p.x;
        acc.y += p.y;
        return acc;
      },
      { x: 0, y: 0 }
    );
    const k = buf.length || 1;
    const smoothed: GazePoint = {
      x: sum.x / k,
      y: sum.y / k,
      timestamp: sample.timestamp,
    };
    setGazePoint(smoothed);
    return smoothed;
  }, []);

  // Core dwell-time eye-tracking loop
  useEffect(() => {
    if (!isSessionActive) {
      // Reset all tracking state
      trackingButtonIdRef.current = null;
      windowBufferRef.current = [];
      consecutiveInsideRef.current = 0;
      setActiveButton(null);
      setDwellProgress(0);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const targetFrameIntervalMs = 1000 / DEFAULT_FPS;
    const dwellWindowMs = DEFAULT_DWELL_SECONDS * 1000;
    const mFramesRequired = Math.max(
      1,
      Math.round((DEFAULT_CONSEC_MS / 1000) * DEFAULT_FPS)
    );

    const tick = () => {
      rafIdRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastSampleTimeRef.current < targetFrameIntervalMs) return;
      lastSampleTimeRef.current = now;

      // Use the latest smoothed gaze point
      const currentGaze = gazePoint;
      if (!currentGaze) return;

      // Determine candidate button under current gaze
      const candidate = findButtonAtPoint(currentGaze.x, currentGaze.y);
      const currentTrackingId = trackingButtonIdRef.current;

      // Handle transitions between buttons or no button
      if ((candidate?.id || null) !== currentTrackingId) {
        trackingButtonIdRef.current = candidate ? candidate.id : null;
        windowBufferRef.current = [];
        consecutiveInsideRef.current = 0;
        setDwellProgress(0);
        setActiveButton(candidate ? candidate.id : null);
      }

      if (!candidate) {
        // No button under gaze; nothing to accumulate
        return;
      }

      // For current candidate, accumulate frame sample
      const inside = isInsideButton(currentGaze.x, currentGaze.y, candidate);
      windowBufferRef.current.push({ t: now, inside });

      // Keep only samples within last T seconds
      const cutoff = now - dwellWindowMs;
      while (
        windowBufferRef.current.length &&
        windowBufferRef.current[0].t < cutoff
      ) {
        windowBufferRef.current.shift();
      }

      // Consecutive inside tracking
      if (inside) {
        consecutiveInsideRef.current += 1;
      } else {
        consecutiveInsideRef.current = 0;
      }

      // Occupancy ratio over the window
      const total = windowBufferRef.current.length;
      const insideCount = windowBufferRef.current.reduce(
        (acc, s) => acc + (s.inside ? 1 : 0),
        0
      );
      const occupancy = total > 0 ? insideCount / total : 0;

      // Progress visualization is constrained by both conditions
      const ratioA =
        DEFAULT_THETA > 0 ? Math.min(1, occupancy / DEFAULT_THETA) : 1;
      const ratioB = Math.min(
        1,
        consecutiveInsideRef.current / mFramesRequired
      );
      const progress = Math.min(ratioA, ratioB) * 100;
      setDwellProgress(progress);

      // Trigger only when both conditions are satisfied
      if (
        occupancy > DEFAULT_THETA &&
        consecutiveInsideRef.current >= mFramesRequired
      ) {
        triggerButton(candidate);
        // Reset state to avoid immediate re-trigger; require user to look away and back
        trackingButtonIdRef.current = null;
        windowBufferRef.current = [];
        consecutiveInsideRef.current = 0;
        setActiveButton(null);
        setDwellProgress(0);
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [
    isSessionActive,
    gazePoint,
    triggerButton,
    findButtonAtPoint,
    isInsideButton,
  ]);

  // Handle WebSocket messages from mapping endpoint
  useEffect(() => {
    if (gazeData && isSessionActive && !inputModeRef.current) {
      // gazeData contains absolute pixel coordinates (e.g., 1920x1080 screen)
      // Reference: x / 1920 * canvas.width, y / 1080 * canvas.height
      // Normalize to percentage based on reference screen size (1920x1080)
      const screenWidth = 1920;
      const screenHeight = 1080;

      const normalizedX = (gazeData.x / screenWidth) * 100;
      const normalizedY = (gazeData.y / screenHeight) * 100;

      // Clamp to 0-100 range
      const clampedX = Math.max(0, Math.min(100, normalizedX));
      const clampedY = Math.max(0, Math.min(100, normalizedY));

      // Push raw sample and update smoothed UI point
      pushRawGazeSample({
        x: clampedX,
        y: clampedY,
        timestamp: gazeData.timestamp,
      });
    }
  }, [gazeData, isSessionActive, pushRawGazeSample]);

  // Mouse simulation for development
  useEffect(() => {
    if (!isSessionActive || !useMouseSimulation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById("gaze-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Push raw sample and update smoothed UI point
      pushRawGazeSample({ x, y, timestamp: Date.now() });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isSessionActive, useMouseSimulation, pushRawGazeSample]);

  // Full screen handling - preserve input mode
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      // Don't reset input mode when fullscreen changes
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!gazeContainerRef.current) return;

    if (!document.fullscreenElement) {
      gazeContainerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullScreen(true);
        })
        .catch((err) => {
          console.error("Error enabling full-screen:", err);
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      });
    }
  }, []);

  // Check session status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isActive = await eyeTrackingApi.checkSessionStatus();
        setIsSessionActive(isActive);
        // Don't reset input mode on mount - preserve user's choice
      } catch (error) {
        console.error("Failed to check session status:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("session_active");
        const isActive = stored === "true";
        setIsSessionActive(isActive);
      }
    };
    checkStatus();
  }, []);

  // Session control functions
  const startSession = async () => {
    try {
      await eyeTrackingApi.startSession();
      setIsSessionActive(true);
      setIsScreenLocked(false);
      // Don't reset input mode - preserve user's choice
      localStorage.setItem("session_active", "true");

      sendMessage({
        type: "start_voice_session",
        data: { timestamp: Date.now() },
      });
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
      setIsScreenLocked(false);
      localStorage.setItem("session_active", "false");
      setActiveButton(null);
      setDwellProgress(0);
      setGazePoint(null);

      sendMessage({
        type: "stop_voice_session",
        data: { timestamp: Date.now() },
      });
      showToast("Session stopped successfully", "success");
    } catch (error) {
      console.error("Failed to stop session:", error);
      showToast("Failed to stop session.", "error");
    }
  };

  const startCalibration = async () => {
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

  const toggleInputMode = () => {
    const newMode = !inputModeRef.current;
    inputModeRef.current = newMode;
    setUseMouseSimulation(newMode);

    if (!newMode) {
      // Switching to Device Mode - WebSocket will provide data automatically
      sendMessage({
        type: "request_gaze_data",
        data: { timestamp: Date.now() },
      });
    }
  };

  const handleAddButton = () => {
    if (!newButtonConfig.label?.trim()) {
      showToast("Label is required", "warning");
      return;
    }

    addPhrase({
      text: newButtonConfig.label,
      category: "kebutuhan_dasar", // Default category
      audioUrl: `/audio/${newButtonConfig.label
        .toLowerCase()
        .replace(/\s+/g, "_")}.wav`,
      color: newButtonConfig.color || "#3B82F6",
    });

    setNewButtonConfig({
      label: "",
      color: "#3B82F6",
    });
  };

  const handleDeleteButton = (buttonId: string) => {
    deletePhrase(buttonId);
  };

  const handleExportConfig = () => {
    const config = JSON.stringify(phrases, null, 2);
    const blob = new Blob([config], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eyetalk2u-phrases-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToDefaults = () => {
    reloadPhrases();
  };

  const getActiveButton = () => {
    if (activeButton === lockControlButton.id) {
      return lockControlButton;
    }
    return voiceButtons.find((button) => button.id === activeButton);
  };

  const activeButtonData = getActiveButton();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading voice buttons...</p>
      </div>
    );
  }

  return (
    <div className={`voice-session ${isFullScreen ? "fullscreen" : ""}`}>
      {/* Header - Hidden in fullscreen */}
      {!isFullScreen && (
        <div className="session-header">
          <div className="session-header-left">
            <Link to="/" className="back-btn">
              <ArrowLeft size={18} />
              Back to Live Session
            </Link>
          </div>
          <div className="session-controls">
            <div className="connection-status">
              <div
                className={`status-indicator ${
                  isConnected ? "connected" : "disconnected"
                }`}
              />
              {isConnected ? "Connected" : "Disconnected"}
            </div>

            <button
              onClick={toggleInputMode}
              className="control-btn secondary"
              title={
                useMouseSimulation
                  ? "Using Mouse Simulation"
                  : "Using Device Data"
              }
            >
              <Eye size={16} />
              {useMouseSimulation ? "Mouse Mode" : "Device Mode"}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="control-btn secondary"
            >
              <Settings size={16} />
              Settings
            </button>

            <button
              onClick={toggleFullScreen}
              className="control-btn secondary"
            >
              <Maximize2 size={16} />
              Full Screen
            </button>

            <button
              onClick={isSessionActive ? stopSession : startSession}
              className={`control-btn ${isSessionActive ? "stop" : "start"}`}
            >
              {isSessionActive ? <Square size={20} /> : <Play size={20} />}
              {isSessionActive ? "Stop Session" : "Start Session"}
            </button>

            <button
              onClick={startCalibration}
              className="control-btn secondary"
            >
              <RotateCcw size={20} />
              Calibrate
            </button>
          </div>
        </div>
      )}

      <div className="session-content">
        {/* Main Gaze Container */}
        <div
          className="gaze-container"
          id="gaze-container"
          ref={gazeContainerRef}
        >
          {/* Full Screen Controls */}
          {isFullScreen && (
            <div className="fullscreen-controls">
              <button
                className="control-btn secondary"
                onClick={toggleFullScreen}
              >
                <Minimize2 size={16} />
                Exit Full Screen
              </button>
              <button
                onClick={isSessionActive ? stopSession : startSession}
                className={`control-btn ${isSessionActive ? "stop" : "start"}`}
              >
                {isSessionActive ? <Square size={20} /> : <Play size={20} />}
                {isSessionActive ? "Stop" : "Start"}
              </button>
            </div>
          )}

          {/* Voice Buttons */}
          {voiceButtons.map((button) => (
            <div
              key={button.id}
              className={`voice-button circular ${
                activeButton === button.id ? "active" : ""
              }`}
              style={{
                left: `${button.centerX}%`,
                top: `${button.centerY}%`,
                width: `${button.radius * 2}%`,
                backgroundColor: button.color,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="button-label"
                style={{
                  fontSize: `clamp(14px, ${button.radius * 0.25}vmin, 36px)`,
                  lineHeight: 1.15,
                }}
              >
                {button.label}
              </div>

              {/* Dwell Progress Indicator */}
              {activeButton === button.id && (
                <div
                  className="dwell-progress"
                  style={{
                    width: `${dwellProgress}%`,
                    backgroundColor: button.color,
                  }}
                />
              )}
            </div>
          ))}

          {/* Lock Control Button */}
          <div
            className={`lock-control-button ${isScreenLocked ? "locked" : ""} ${
              activeButton === lockControlButton.id ? "active" : ""
            }`}
            style={{
              left: `${lockControlButton.centerX}%`,
              top: `${isFullScreen ? 90 : lockControlButton.centerY}%`,
              width: `${lockControlButton.radius * 2}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: lockControlButton.color,
              aspectRatio: "2 / 1",
            }}
          >
            <div className="lock-control-content">
              <div className="lock-icon-wrapper">
                {isScreenLocked ? <Unlock size={24} /> : <Lock size={24} />}
              </div>
              <span className="lock-label">{lockControlButton.label}</span>
            </div>
            {activeButton === lockControlButton.id && (
              <div
                className="dwell-progress lock-progress"
                style={{ width: `${dwellProgress}%` }}
              />
            )}
          </div>

          {/* Gaze Point Indicator */}
          {gazePoint && isSessionActive && (
            <div
              className="gaze-point"
              style={{
                left: `${gazePoint.x}%`,
                top: `${gazePoint.y}%`,
              }}
            />
          )}

          {/* Input Mode Indicator */}
          <div className="input-mode-indicator">
            Mode: {useMouseSimulation ? "Mouse Simulation" : "Device Data"}
            {!isConnected && !useMouseSimulation && " (Disconnected)"}
            {!isConnected && useMouseSimulation && " (Fallback)"}
          </div>

          {/* Session Status Overlay */}
          {!isSessionActive && (
            <div className="session-overlay">
              <div className="overlay-content">
                <Eye size={48} />
                <h3>Session Not Active</h3>
                <p>Click "Start Session" to begin the voice session.</p>
                <div className="overlay-info">
                  <p>
                    <strong>WebSocket Status:</strong>{" "}
                    {isConnected ? "Connected" : "Disconnected"}
                  </p>
                  <p>
                    <strong>Current Mode:</strong>{" "}
                    {useMouseSimulation ? "Mouse Simulation" : "Device Data"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lock Screen Overlay */}
          {isScreenLocked && (
            <div className="lock-screen-overlay">
              <div className="lock-screen-message">
                <Lock size={40} />
                <h3>Screen Locked</h3>
                <p>Look at "Open" to unlock.</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && !isFullScreen && (
          <div className="settings-panel">
            <div className="panel-section">
              <h3>Manage Voice Buttons</h3>

              {/* Add New Button Form */}
              <div className="add-button-form">
                <h4>Change Button</h4>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Button Label"
                    value={newButtonConfig.label}
                    onChange={(e) =>
                      setNewButtonConfig((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="color"
                    value={newButtonConfig.color}
                    onChange={(e) =>
                      setNewButtonConfig((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                  />
                </div>
                <button onClick={handleAddButton} className="btn primary">
                  <Plus size={16} />
                  Add Button
                </button>
              </div>

              {/* Existing Buttons List */}
              <div className="buttons-list">
                <h4>Existing Buttons</h4>
                {voiceButtons.map((button) => (
                  <div key={button.id} className="button-item">
                    <div
                      className="button-preview"
                      style={{ backgroundColor: button.color }}
                    />
                    <div className="button-info">
                      <strong>{button.label}</strong>
                      <span>
                        Pos: {button.centerX}%, {button.centerY}%
                      </span>
                      <span>Radius: {button.radius}%</span>
                    </div>
                    <button
                      onClick={() => handleDeleteButton(button.id)}
                      className="btn danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Export/Reset Controls */}
              <div className="management-controls">
                <button onClick={handleExportConfig} className="btn secondary">
                  <Download size={16} />
                  Export Config
                </button>
                <button
                  onClick={handleResetToDefaults}
                  className="btn secondary"
                >
                  <Save size={16} />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Info Panel */}
        {!showSettings && !isFullScreen && (
          <div className="info-panel">
            <div className="panel-section">
              <h3>Status Session</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="label">Status:</span>
                  <span
                    className={`value ${
                      isSessionActive ? "active" : "inactive"
                    }`}
                  >
                    {isSessionActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">WebSocket:</span>
                  <span
                    className={`value ${
                      isConnected ? "connected" : "disconnected"
                    }`}
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Input Mode:</span>
                  <span className="value">
                    {useMouseSimulation ? "Mouse" : "WebSocket"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Active Button:</span>
                  <span className="value">
                    {activeButtonData ? activeButtonData.label : "None"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Progress:</span>
                  <span className="value">
                    {activeButtonData ? `${Math.round(dwellProgress)}%` : "0%"}
                  </span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <h3>Last Played Audio</h3>
              {lastPlayedAudio ? (
                <div className="last-audio">
                  <Volume2 size={20} />
                  <span>{lastPlayedAudio}</span>
                </div>
              ) : (
                <p className="no-audio">No audio played</p>
              )}
            </div>

            <div className="panel-section">
              <h3>Gaze Data</h3>
              {gazePoint ? (
                <div className="gaze-data">
                  <div>X: {gazePoint.x.toFixed(1)}%</div>
                  <div>Y: {gazePoint.y.toFixed(1)}%</div>
                  <div>
                    Time: {new Date(gazePoint.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <p className="no-gaze">No gaze data</p>
              )}
            </div>

            <div className="panel-section">
              <h3>Button Configuration</h3>
              <div className="buttons-config">
                {voiceButtons.map((button) => (
                  <div key={button.id} className="button-config-item">
                    <div
                      className="color-indicator"
                      style={{ backgroundColor: button.color }}
                    />
                    <span className="button-name">{button.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
    </div>
  );
};

export default VoiceSession;
