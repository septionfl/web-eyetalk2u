import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, RotateCcw, Eye, Mic } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import './LiveSession.css';

const LiveSession: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState<'idle' | 'calibrating' | 'completed'>('idle');
  const { lastMessage, sendMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'calibration_update':
          setCalibrationStatus(lastMessage.data.status);
          break;
        case 'gaze_data':
          // Update gaze position
          break;
        default:
          break;
      }
    }
  }, [lastMessage]);

  const startSession = () => {
    setIsSessionActive(true);
    sendMessage({ type: 'start_session' });
  };

  const stopSession = () => {
    setIsSessionActive(false);
    sendMessage({ type: 'stop_session' });
  };

  const startCalibration = () => {
    setCalibrationStatus('calibrating');
    sendMessage({ type: 'start_calibration' });
  };

  return (
    <div className="live-session">
      <div className="session-header">
        <h1>Live Session</h1>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="session-content">
        {/* Video Preview */}
        <div className="video-section">
          <div className="video-container">
            <div className="video-placeholder">
              <Eye size={48} />
              <p>Eye Tracking Preview</p>
            </div>
            <div className="gaze-cursor" />
          </div>
          
          <div className="session-controls">
            <button
              onClick={isSessionActive ? stopSession : startSession}
              className={`control-btn ${isSessionActive ? 'stop' : 'start'}`}
            >
              {isSessionActive ? <Square size={20} /> : <Play size={20} />}
              {isSessionActive ? 'Stop Session' : 'Start Session'}
            </button>
            
            <button
              onClick={startCalibration}
              disabled={calibrationStatus === 'calibrating'}
              className="control-btn secondary"
            >
              <RotateCcw size={20} />
              Calibrate
            </button>

            {/* Button untuk Voice Session */}
            <Link to="/voice-session" className="control-btn primary">
              <Mic size={20} />
              Voice Session
            </Link>
          </div>
        </div>

        {/* Calibration Status */}
        <div className="status-section">
          <h3>Calibration Status</h3>
          <div className={`calibration-status ${calibrationStatus}`}>
            {calibrationStatus === 'idle' && 'Not Calibrated'}
            {calibrationStatus === 'calibrating' && 'Calibrating...'}
            {calibrationStatus === 'completed' && 'Calibration Complete'}
          </div>
          
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Pupil Detection:</span>
              <span className="value active">Active</span>
            </div>
            <div className="status-item">
              <span className="label">Frame Rate:</span>
              <span className="value">30 FPS</span>
            </div>
            <div className="status-item">
              <span className="label">Accuracy:</span>
              <span className="value">95%</span>
            </div>
          </div>
        </div>

        {/* Quick Phrases */}
        <div className="phrases-section">
          <h3>Quick Access Phrases</h3>
          <div className="phrase-grid">
            {['Saya haus', 'Saya lapar', 'Tolong', 'Nyeri', 'Buang air'].map((phrase) => (
              <button key={phrase} className="phrase-btn">
                {phrase}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;