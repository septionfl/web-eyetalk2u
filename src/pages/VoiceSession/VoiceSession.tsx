import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Square, RotateCcw, Eye, Volume2, Home, 
  Maximize2, Minimize2, Settings, Plus, Trash2,
  Save, Upload, Download
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { usePhrasesStorage } from '../../hooks/useLocalStorage';
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
  const [useMouseSimulation, setUseMouseSimulation] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newButtonConfig, setNewButtonConfig] = useState<Partial<VoiceButton>>({
    label: '',
    centerX: 50,
    centerY: 50,
    radius: 10,
    color: '#3B82F6',
    dwellTime: 2000
  });
  
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gazeContainerRef = useRef<HTMLDivElement>(null);
  
  const { lastMessage, sendMessage, isConnected } = useWebSocket();
  const { 
    phrases, 
    isLoading, 
    addPhrase, 
    updatePhrase, 
    deletePhrase, 
    resetPhrases,
    exportPhrases,
    incrementUsage 
  } = usePhrasesStorage();

  // Helper function untuk menentukan warna berdasarkan kategori
  const getColorByCategory = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      'kebutuhan_dasar': '#3B82F6', // Blue
      'medis': '#EF4444',           // Red
      'kenyamanan': '#10B981',      // Green
      'bantuan': '#F59E0B',         // Yellow
      'emergency': '#DC2626'        // Dark Red
    };
    
    return colorMap[category] || '#6B7280'; // Gray default
  };

  // Konversi phrases menjadi voiceButtons
  const voiceButtons: VoiceButton[] = phrases.map((phrase, index) => {
    // Position buttons in a grid
    const positions = [
      { x: 25, y: 30 }, // Top-left
      { x: 75, y: 30 }, // Top-right
      { x: 25, y: 70 }, // Bottom-left
      { x: 75, y: 70 }  // Bottom-right
    ];
    
    const position = positions[index % positions.length];
    
    return {
      id: phrase.id,
      label: phrase.text,
      audioUrl: phrase.audioUrl || `/audio/${phrase.id}.wav`, // Fallback URL
      centerX: position.x,
      centerY: position.y,
      radius: 10, // Default radius
      color: getColorByCategory(phrase.category),
      dwellTime: 2000 // Default dwell time
    };
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && isSessionActive) {
      console.log('WebSocket message received:', lastMessage);
      
      switch (lastMessage.type) {
        case 'gaze_data':
          const { x, y, timestamp } = lastMessage.data;
          const normalizedX = Math.max(0, Math.min(100, x));
          const normalizedY = Math.max(0, Math.min(100, y));
          
          setGazePoint({ x: normalizedX, y: normalizedY, timestamp });
          checkGazeInButtons(normalizedX, normalizedY);
          setUseMouseSimulation(false);
          break;
          
        case 'calibration_complete':
          console.log('Calibration completed');
          break;
          
        default:
          break;
      }
    }
  }, [lastMessage, isSessionActive]);

  // Mouse simulation for development
  useEffect(() => {
    if (!isSessionActive || !useMouseSimulation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('gaze-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setGazePoint({ x, y, timestamp: Date.now() });
      checkGazeInButtons(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSessionActive, useMouseSimulation]);

  // Full screen handling
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!gazeContainerRef.current) return;

    if (!document.fullscreenElement) {
      gazeContainerRef.current.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error('Error enabling full-screen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      });
    }
  }, []);

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
        return;
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
    
    // Increment usage count
    incrementUsage(button.id);
    
    if (audioRef.current) {
      audioRef.current.src = button.audioUrl;
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        speakText(button.label);
      });
    } else {
      speakText(button.label);
    }

    sendMessage({
      type: 'button_triggered',
      data: {
        buttonId: button.id,
        buttonLabel: button.label,
        timestamp: Date.now(),
        gazePoint: gazePoint
      }
    });
  }, [sendMessage, gazePoint, incrementUsage]);

  // Text-to-speech fallback
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Session control functions
  const startSession = () => {
    setIsSessionActive(true);
    setUseMouseSimulation(true);
    
    sendMessage({ 
      type: 'start_voice_session',
      data: { timestamp: Date.now() }
    });
  };

  const stopSession = () => {
    setIsSessionActive(false);
    clearAllTimers();
    setActiveButton(null);
    setDwellProgress(0);
    setGazePoint(null);
    
    sendMessage({ 
      type: 'stop_voice_session',
      data: { timestamp: Date.now() }
    });
  };

  const startCalibration = () => {
    sendMessage({ 
      type: 'start_calibration',
      data: { timestamp: Date.now() }
    });
  };

  const toggleInputMode = () => {
    setUseMouseSimulation(!useMouseSimulation);
    if (!useMouseSimulation) {
      sendMessage({ 
        type: 'request_gaze_data',
        data: { timestamp: Date.now() }
      });
    }
  };

  // Button management functions - now using phrases
  const handleAddButton = () => {
    if (!newButtonConfig.label?.trim()) {
      alert('Label is required');
      return;
    }

    addPhrase({
      text: newButtonConfig.label,
      category: 'kebutuhan_dasar', // Default category
      usageCount: 0,
      lastUsed: null,
      audioUrl: `/audio/${newButtonConfig.label.toLowerCase().replace(/\s+/g, '_')}.wav`
    });

    setNewButtonConfig({
      label: '',
      centerX: 50,
      centerY: 50,
      radius: 10,
      color: '#3B82F6',
      dwellTime: 2000
    });
  };

  const handleDeleteButton = (buttonId: string) => {
    deletePhrase(buttonId);
  };

  const handleExportConfig = () => {
    const config = exportPhrases();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eyetalk2u-phrases-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToDefaults = () => {
    resetPhrases();
  };

  const getActiveButton = () => {
    return voiceButtons.find(button => button.id === activeButton);
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
    <div className={`voice-session ${isFullScreen ? 'fullscreen' : ''}`}>
      {/* Header - Hidden in fullscreen */}
      {!isFullScreen && (
        <div className="session-header">
                    
          <div className="session-controls">
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            <button
              onClick={toggleInputMode}
              className="control-btn secondary"
              title={useMouseSimulation ? 'Using Mouse Simulation' : 'Using WebSocket Data'}
            >
              <Eye size={16} />
              {useMouseSimulation ? 'Mouse Mode' : 'WebSocket Mode'}
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
              className={`control-btn ${isSessionActive ? 'stop' : 'start'}`}
            >
              {isSessionActive ? <Square size={20} /> : <Play size={20} />}
              {isSessionActive ? 'Stop Session' : 'Start Session'}
            </button>
            
            <button
              onClick={startCalibration}
              disabled={!isConnected}
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
                className={`control-btn ${isSessionActive ? 'stop' : 'start'}`}
              >
                {isSessionActive ? <Square size={20} /> : <Play size={20} />}
                {isSessionActive ? 'Stop' : 'Start'}
              </button>
            </div>
          )}

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

          {/* Input Mode Indicator */}
          <div className="input-mode-indicator">
            Mode: {useMouseSimulation ? 'Mouse Simulation' : 'WebSocket Data'}
            {!isConnected && useMouseSimulation && ' (Fallback)'}
          </div>

          {/* Session Status Overlay */}
          {!isSessionActive && (
            <div className="session-overlay">
              <div className="overlay-content">
                <Eye size={48} />
                <h3>Session Not Active</h3>
                <p>Click "Start Session" to begin the voice session.</p>
                <div className="overlay-info">
                  <p><strong>WebSocket Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
                  <p><strong>Current Mode:</strong> {useMouseSimulation ? 'Mouse Simulation' : 'WebSocket Data'}</p>
                </div>
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
                <h4>Add New Button</h4>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Button Label"
                    value={newButtonConfig.label}
                    onChange={(e) => setNewButtonConfig(prev => ({ ...prev, label: e.target.value }))}
                  />
                  <input
                    type="color"
                    value={newButtonConfig.color}
                    onChange={(e) => setNewButtonConfig(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <label>
                    X Position: {newButtonConfig.centerX}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newButtonConfig.centerX}
                      onChange={(e) => setNewButtonConfig(prev => ({ ...prev, centerX: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Y Position: {newButtonConfig.centerY}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newButtonConfig.centerY}
                      onChange={(e) => setNewButtonConfig(prev => ({ ...prev, centerY: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Radius: {newButtonConfig.radius}%
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={newButtonConfig.radius}
                      onChange={(e) => setNewButtonConfig(prev => ({ ...prev, radius: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Dwell Time: {newButtonConfig.dwellTime}ms
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={newButtonConfig.dwellTime}
                      onChange={(e) => setNewButtonConfig(prev => ({ ...prev, dwellTime: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                <button onClick={handleAddButton} className="btn primary">
                  <Plus size={16} />
                  Add Button
                </button>
              </div>

              {/* Existing Buttons List */}
              <div className="buttons-list">
                <h4>Existing Buttons</h4>
                {voiceButtons.map(button => (
                  <div key={button.id} className="button-item">
                    <div 
                      className="button-preview"
                      style={{ backgroundColor: button.color }}
                    />
                    <div className="button-info">
                      <strong>{button.label}</strong>
                      <span>Pos: {button.centerX}%, {button.centerY}%</span>
                      <span>Radius: {button.radius}%</span>
                      <span>Dwell: {button.dwellTime}ms</span>
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
                <button onClick={handleResetToDefaults} className="btn secondary">
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
                  <span className={`value ${isSessionActive ? 'active' : 'inactive'}`}>
                    {isSessionActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">WebSocket:</span>
                  <span className={`value ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Input Mode:</span>
                  <span className="value">
                    {useMouseSimulation ? 'Mouse' : 'WebSocket'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Active Button:</span>
                  <span className="value">
                    {activeButtonData ? activeButtonData.label : 'None'}
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
                  <div>Time: {new Date(gazePoint.timestamp).toLocaleTimeString()}</div>
                </div>
              ) : (
                <p className="no-gaze">No gaze data</p>
              )}
            </div>

            <div className="panel-section">
              <h3>Button Configuration</h3>
              <div className="buttons-config">
                {voiceButtons.map(button => (
                  <div key={button.id} className="button-config-item">
                    <div 
                      className="color-indicator"
                      style={{ backgroundColor: button.color }}
                    />
                    <span className="button-name">{button.label}</span>
                    <span className="dwell-time">{button.dwellTime}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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