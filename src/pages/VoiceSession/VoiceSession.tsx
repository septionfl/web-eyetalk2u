import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, RotateCcw, Eye, Volume2, Home, RefreshCw, Camera } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { eyeTrackingApi } from '../../services/eyeTrackingApi';
import './VoiceSession.css';

interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

interface VoiceButton {
  id: string;
  label: string;
  audioUrl: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  dwellTime: number;
}

const VoiceSession: React.FC = () => {
  const navigate = useNavigate();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const [lastPlayedAudio, setLastPlayedAudio] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { gazeData, isConnected, error: wsError, sendMessage } = useWebSocket();

  // Voice buttons configuration
  const voiceButtons: VoiceButton[] = [
    {
      id: 'thirsty',
      label: 'Saya Haus',
      audioUrl: '/audio/saya_haus.wav',
      centerX: 25,
      centerY: 30,
      radius: 12,
      color: '#3B82F6',
      dwellTime: 2000
    },
    {
      id: 'hungry',
      label: 'Saya Lapar',
      audioUrl: '/audio/saya_lapar.wav',
      centerX: 75,
      centerY: 30,
      radius: 12,
      color: '#10B981',
      dwellTime: 2000
    },
    {
      id: 'help',
      label: 'Tolong',
      audioUrl: '/audio/tolong.wav',
      centerX: 25,
      centerY: 70,
      radius: 10,
      color: '#EF4444',
      dwellTime: 1500
    },
    {
      id: 'pain',
      label: 'Sakit',
      audioUrl: '/audio/sakit.wav',
      centerX: 75,
      centerY: 70,
      radius: 10,
      color: '#F59E0B',
      dwellTime: 1500
    },
    {
      id: 'bathroom',
      label: 'Kamar Mandi',
      audioUrl: '/audio/kamar_mandi.wav',
      centerX: 50,
      centerY: 50,
      radius: 10,
      color: '#8B5CF6',
      dwellTime: 1800
    }
  ];

  // Handle incoming gaze data from WebSocket
  useEffect(() => {
    if (gazeData && isSessionActive) {
      setGazePoint({ 
        x: gazeData.x, 
        y: gazeData.y, 
        timestamp: gazeData.timestamp 
      });
      checkGazeInButtons(gazeData.x, gazeData.y);
    }
  }, [gazeData, isSessionActive]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // Check if gaze is inside any button
  const checkGazeInButtons = useCallback((x: number, y: number) => {
    let foundButton: VoiceButton | null = null;

    for (const button of voiceButtons) {
      const distance = Math.sqrt(
        Math.pow(x - button.centerX, 2) + Math.pow(y - button.centerY, 2)
      );
      
      if (distance <= button.radius) {
        foundButton = button;
        break;
      }
    }

    if (foundButton) {
      if (activeButton === foundButton.id) {
        return; // Timer already running
      } else {
        setActiveButton(foundButton.id);
        startDwellTimer(foundButton);
      }
    } else {
      if (activeButton) {
        clearAllTimers();
        setActiveButton(null);
        setDwellProgress(0);
      }
    }
  }, [activeButton, voiceButtons, clearAllTimers]);

  // Start dwell timer for button
  const startDwellTimer = useCallback((button: VoiceButton) => {
    clearAllTimers();
    setDwellProgress(0);

    const startTime = Date.now();
    const updateInterval = 50;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / button.dwellTime) * 100;
      setDwellProgress(Math.min(progress, 100));
    }, updateInterval);

    dwellTimerRef.current = setTimeout(() => {
      triggerButton(button);
      clearAllTimers();
      setActiveButton(null);
      setDwellProgress(0);
    }, button.dwellTime);
  }, [clearAllTimers]);

  // Trigger button action
  const triggerButton = useCallback((button: VoiceButton) => {
    console.log(`Triggering button: ${button.label}`);
    setLastPlayedAudio(button.label);
    
    // Play audio
    if (audioRef.current) {
      audioRef.current.src = button.audioUrl;
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        speakText(button.label);
      });
    } else {
      speakText(button.label);
    }

    // Send trigger event via WebSocket (optional)
    sendMessage({
      type: 'button_triggered',
      data: {
        buttonId: button.id,
        buttonLabel: button.label,
        timestamp: Date.now()
      }
    });
  }, [sendMessage]);

  // Text-to-speech fallback
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Session control functions
  const startSession = async () => {
    try {
      setSessionError(null);
      await eyeTrackingApi.startSession();
      setIsSessionActive(true);
      console.log('Eye tracking session started');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      setSessionError(errorMessage);
      console.error('Failed to start session:', error);
    }
  };

  const stopSession = async () => {
    try {
      await eyeTrackingApi.stopSession();
      setIsSessionActive(false);
      clearAllTimers();
      setActiveButton(null);
      setDwellProgress(0);
      setGazePoint(null);
      console.log('Eye tracking session stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop session';
      setSessionError(errorMessage);
      console.error('Failed to stop session:', error);
    }
  };

  const startCalibration = async () => {
    try {
      setIsCalibrating(true);
      setSessionError(null);
      await eyeTrackingApi.calibrate();
      console.log('Calibration started');
      
      // Calibration typically takes a few seconds
      setTimeout(() => {
        setIsCalibrating(false);
        console.log('Calibration likely completed');
      }, 5000);
      
    } catch (error) {
      setIsCalibrating(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start calibration';
      setSessionError(errorMessage);
      console.error('Failed to start calibration:', error);
    }
  };

  const resetHaar = async () => {
    try {
      setSessionError(null);
      await eyeTrackingApi.resetHaar();
      console.log('Haar cascade reset');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset Haar cascade';
      setSessionError(errorMessage);
      console.error('Failed to reset Haar cascade:', error);
    }
  };

  const getActiveButton = () => {
    return voiceButtons.find(button => button.id === activeButton);
  };

  const activeButtonData = getActiveButton();

  return (
    <div className="voice-session">
      {/* Header */}
      <div className="session-header">
        
        <div className="session-controls">
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            {wsError && <span className="error-text"> - {wsError}</span>}
          </div>
          
          <button
            onClick={resetHaar}
            className="control-btn secondary"
            title="Reset Haar Cascade Classifier"
          >
            <RefreshCw size={16} />
            Reset Haar
          </button>
          
          <button
            onClick={isSessionActive ? stopSession : startSession}
            disabled={isCalibrating}
            className={`control-btn ${isSessionActive ? 'stop' : 'start'}`}
          >
            {isSessionActive ? <Square size={20} /> : <Play size={20} />}
            {isSessionActive ? 'Stop Session' : 'Start Session'}
          </button>
          
          <button
            onClick={startCalibration}
            disabled={!isConnected || isCalibrating}
            className={`control-btn secondary ${isCalibrating ? 'calibrating' : ''}`}
          >
            <RotateCcw size={20} />
            {isCalibrating ? 'Calibrating...' : 'Kalibrasi'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {sessionError && (
        <div className="error-banner">
          <span>Error: {sessionError}</span>
          <button onClick={() => setSessionError(null)}>×</button>
        </div>
      )}

      <div className="session-content">
        {/* Main Gaze Container */}
        <div className="gaze-container" id="gaze-container">
          {/* Voice Buttons */}
          {voiceButtons.map((button) => (
            <div
              key={button.id}
              className={`voice-button ${activeButton === button.id ? 'active' : ''}`}
              style={{
                left: `${button.centerX}%`,
                top: `${button.centerY}%`,
                width: `${button.radius * 2}%`,
                height: `${button.radius * 2}%`,
                backgroundColor: button.color,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="button-label">{button.label}</div>
              
              {/* Dwell Progress Indicator */}
              {activeButton === button.id && (
                <div 
                  className="dwell-progress"
                  style={{ 
                    width: `${dwellProgress}%`,
                    backgroundColor: button.color
                  }}
                />
              )}
            </div>
          ))}

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

          {/* Calibration Overlay */}
          {isCalibrating && (
            <div className="calibration-overlay">
              <div className="calibration-content">
                <Eye size={48} />
                <h3>Sedang Kalibrasi</h3>
                <p>Ikuti titik kalibrasi yang muncul di layar...</p>
                <div className="calibration-spinner"></div>
              </div>
            </div>
          )}

          {/* Session Status Overlay */}
          {!isSessionActive && !isCalibrating && (
            <div className="session-overlay">
              <div className="overlay-content">
                <Camera size={48} />
                <h3>Session Eye Tracking</h3>
                <p>Klik "Start Session" untuk memulai tracking tatapan mata</p>
                <div className="overlay-info">
                  <p><strong>WebSocket Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
                  <p><strong>Endpoint:</strong> ws://localhost:9001/mapping</p>
                  {!isConnected && (
                    <p className="warning-text">
                      Pastikan server eye tracking berjalan di localhost:9001
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Info Panel */}
        <div className="info-panel">
          <div className="panel-section">
            <h3>Status Sistem</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="label">Session:</span>
                <span className={`value ${isSessionActive ? 'active' : 'inactive'}`}>
                  {isSessionActive ? 'Aktif' : 'Tidak Aktif'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">WebSocket:</span>
                <span className={`value ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Kalibrasi:</span>
                <span className={`value ${isCalibrating ? 'calibrating' : 'ready'}`}>
                  {isCalibrating ? 'Berlangsung' : 'Siap'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Button Aktif:</span>
                <span className="value">
                  {activeButtonData ? activeButtonData.label : 'Tidak ada'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Progress:</span>
                <span className="value">
                  {activeButtonData ? `${Math.round(dwellProgress)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <h3>Audio Terakhir</h3>
            {lastPlayedAudio ? (
              <div className="last-audio">
                <Volume2 size={20} />
                <span>{lastPlayedAudio}</span>
              </div>
            ) : (
              <p className="no-audio">Belum ada audio yang diputar</p>
            )}
          </div>

          <div className="panel-section">
            <h3>Data Gaze Real-time</h3>
            {gazePoint ? (
              <div className="gaze-data">
                <div className="gaze-coord">
                  <span>X:</span>
                  <strong>{gazePoint.x.toFixed(1)}%</strong>
                </div>
                <div className="gaze-coord">
                  <span>Y:</span>
                  <strong>{gazePoint.y.toFixed(1)}%</strong>
                </div>
                <div className="gaze-time">
                  <span>Updated:</span>
                  {new Date(gazePoint.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <p className="no-gaze">Menunggu data gaze...</p>
            )}
          </div>

          <div className="panel-section">
            <h3>Konfigurasi Button</h3>
            <div className="buttons-config">
              {voiceButtons.map(button => (
                <div key={button.id} className="button-config-item">
                  <div 
                    className="color-indicator"
                    style={{ backgroundColor: button.color }}
                  />
                  <div className="button-info">
                    <span className="button-name">{button.label}</span>
                    <span className="button-position">
                      ({button.centerX}%, {button.centerY}%) - R{button.radius}%
                    </span>
                  </div>
                  <span className="dwell-time">{button.dwellTime}ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h3>Endpoint Info</h3>
            <div className="endpoint-info">
              <div className="endpoint-item">
                <strong>WebSocket:</strong> ws://localhost:9001/mapping
              </div>
              <div className="endpoint-item">
                <strong>HTTP Start:</strong> http://localhost:9001/start
              </div>
              <div className="endpoint-item">
                <strong>HTTP Stop:</strong> http://localhost:9001/stop
              </div>
              <div className="endpoint-item">
                <strong>HTTP Calibrate:</strong> http://localhost:9001/calibrate
              </div>
              <div className="endpoint-item">
                <strong>HTTP Reset Haar:</strong> http://localhost:9001/reset-haar
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceSession;