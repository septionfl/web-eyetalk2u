import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Settings, Power, Calendar, Battery } from 'lucide-react';
import { Device } from '../../types/index';
import './Devices.css';

const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    // Mock data
    const mockDevices: Device[] = [
      {
        id: 'device_001',
        name: 'EyeTalk2U Device #001',
        status: 'connected',
        patientId: 'patient_123',
        lastActive: new Date('2024-01-20T11:30:00')
      },
      {
        id: 'device_002',
        name: 'EyeTalk2U Device #002',
        status: 'disconnected',
        lastActive: new Date('2024-01-19T15:45:00')
      },
      {
        id: 'device_003',
        name: 'EyeTalk2U Device #003',
        status: 'calibrating',
        patientId: 'patient_456',
        lastActive: new Date('2024-01-20T10:15:00')
      },
      {
        id: 'device_004',
        name: 'EyeTalk2U Device #004',
        status: 'connected',
        lastActive: new Date('2024-01-20T09:30:00')
      }
    ];
    setDevices(mockDevices);
  }, []);

  const handleCalibrate = (deviceId: string) => {
    // Send calibration command to device
    setDevices(devices.map(device =>
      device.id === deviceId
        ? { ...device, status: 'calibrating' as const }
        : device
    ));
    
    // Simulate calibration completion
    setTimeout(() => {
      setDevices(devices.map(device =>
        device.id === deviceId
          ? { ...device, status: 'connected' as const }
          : device
      ));
    }, 3000);
  };

  const handleRestart = (deviceId: string) => {
    // Send restart command to device
    setDevices(devices.map(device =>
      device.id === deviceId
        ? { ...device, status: 'calibrating' as const }
        : device
    ));
    
    // Simulate restart completion
    setTimeout(() => {
      setDevices(devices.map(device =>
        device.id === deviceId
          ? { ...device, status: 'connected' as const }
          : device
      ));
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi size={20} className="status-connected" />;
      case 'disconnected':
        return <WifiOff size={20} className="status-disconnected" />;
      case 'calibrating':
        return <RefreshCw size={20} className="status-calibrating" />;
      default:
        return <WifiOff size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'calibrating':
        return 'Calibrating';
      default:
        return status;
    }
  };

  return (
    <div className="devices-page">
      <div className="page-header">
        <h1>Device Management</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">
              {devices.filter(d => d.status === 'connected').length}
            </span>
            <span className="stat-label">Connected</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {devices.filter(d => d.status === 'disconnected').length}
            </span>
            <span className="stat-label">Offline</span>
          </div>
          <div className="stat">
            <span className="stat-value">{devices.length}</span>
            <span className="stat-label">Total Devices</span>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="devices-grid">
        {devices.map((device) => (
          <div 
            key={device.id} 
            className={`device-card ${device.status} ${
              selectedDevice?.id === device.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedDevice(device)}
          >
            <div className="device-header">
              <div className="device-info">
                <h3>{device.name}</h3>
                <div className="device-status">
                  {getStatusIcon(device.status)}
                  <span className={`status-text ${device.status}`}>
                    {getStatusText(device.status)}
                  </span>
                </div>
              </div>
              <button 
                className="device-settings"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDevice(device);
                }}
              >
                <Settings size={16} />
              </button>
            </div>

            <div className="device-details">
              <div className="detail-row">
                <span className="label">Device ID:</span>
                <span className="value">{device.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Patient:</span>
                <span className="value">
                  {device.patientId || 'Not assigned'}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Last Active:</span>
                <span className="value">
                  <Calendar size={14} />
                  {device.lastActive.toLocaleDateString()} {' '}
                  {device.lastActive.toLocaleTimeString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Battery:</span>
                <span className="value">
                  <Battery size={14} />
                  {device.status === 'connected' ? '85%' : 'N/A'}
                </span>
              </div>
            </div>

            <div className="device-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCalibrate(device.id);
                }}
                disabled={device.status !== 'connected'}
                className="btn secondary"
              >
                <RefreshCw size={16} />
                Calibrate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart(device.id);
                }}
                disabled={device.status === 'disconnected'}
                className="btn secondary"
              >
                <Power size={16} />
                Restart
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Device Details Panel */}
      {selectedDevice && (
        <div className="device-details-panel">
          <div className="panel-header">
            <h3>Device Details</h3>
            <button 
              onClick={() => setSelectedDevice(null)}
              className="close-btn"
            >
              ×
            </button>
          </div>
          
          <div className="panel-content">
            <div className="detail-section">
              <h4>Device Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Name</span>
                  <span className="value">{selectedDevice.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">ID</span>
                  <span className="value">{selectedDevice.id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span className={`value status ${selectedDevice.status}`}>
                    {getStatusText(selectedDevice.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Patient</span>
                  <span className="value">
                    {selectedDevice.patientId || 'Not assigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Recent Activity</h4>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-time">
                    {selectedDevice.lastActive.toLocaleString()}
                  </div>
                  <div className="activity-desc">
                    Last device communication
                  </div>
                </div>
                {/* Add more activity items as needed */}
              </div>
            </div>

            <div className="detail-section">
              <h4>Advanced Actions</h4>
              <div className="action-buttons-advanced">
                <button className="btn danger">
                  Factory Reset
                </button>
                <button className="btn secondary">
                  Update Firmware
                </button>
                <button className="btn secondary">
                  Export Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;