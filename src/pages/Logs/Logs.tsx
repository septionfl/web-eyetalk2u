import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Search, Filter, Calendar } from 'lucide-react';
import { LogEntry } from '../../types';
import './Logs.css';

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Mock log data
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date('2025-01-20T10:30:00'),
        deviceId: 'device_001',
        patientId: 'patient_123',
        phrase: 'Saya haus',
        audioUrl: '/audio/saya_haus.wav',
        type: 'phrase_selected'
      },
      {
        id: '2',
        timestamp: new Date('2025-01-20T11:15:00'),
        deviceId: 'device_001',
        patientId: 'patient_123',
        phrase: 'Tolong panggil perawat',
        audioUrl: '/audio/tolong_perawat.wav',
        type: 'phrase_selected'
      },
      {
        id: '3',
        timestamp: new Date('2025-01-20T09:00:00'),
        deviceId: 'device_001',
        patientId: 'patient_123',
        phrase: 'Kalibrasi selesai',
        type: 'calibration'
      },
      {
        id: '4',
        timestamp: new Date('2025-01-19T14:20:00'),
        deviceId: 'device_002',
        patientId: 'patient_456',
        phrase: 'Saya lapar',
        audioUrl: '/audio/saya_lapar.wav',
        type: 'phrase_selected'
      }
    ];
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(log =>
        log.timestamp.toISOString().split('T')[0] === dateFilter
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    setFilteredLogs(filtered);
  }, [searchTerm, dateFilter, typeFilter, logs]);

  const handlePlayAudio = (audioUrl: string, logId: string) => {
    if (audioRef.current) {
      if (playingAudio === logId) {
        audioRef.current.pause();
        setPlayingAudio(null);
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(logId);
        
        audioRef.current.onended = () => {
          setPlayingAudio(null);
        };
      }
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Device ID', 'Patient ID', 'Phrase', 'Type'],
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.deviceId,
        log.patientId,
        log.phrase,
        log.type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eyetalk2u-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      phrase_selected: { label: 'Phrase', color: 'blue' },
      calibration: { label: 'Calibration', color: 'green' },
      system: { label: 'System', color: 'gray' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, color: 'gray' };
    return (
      <span className={`type-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1>Activity Logs</h1>
        <button className="btn secondary" onClick={exportLogs}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <div className="filter-item">
            <Calendar size={16} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          <div className="filter-item">
            <Filter size={16} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="phrase_selected">Phrases</option>
              <option value="calibration">Calibration</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="logs-stats">
        <div className="stat-card">
          <span className="stat-number">{filteredLogs.length}</span>
          <span className="stat-label">Total Logs</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">
            {filteredLogs.filter(log => log.type === 'phrase_selected').length}
          </span>
          <span className="stat-label">Phrases Used</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">
            {new Set(filteredLogs.map(log => log.patientId)).size}
          </span>
          <span className="stat-label">Active Patients</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>Patient</th>
              <th>Phrase / Event</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td className="timestamp">
                  {log.timestamp.toLocaleDateString()} {' '}
                  {log.timestamp.toLocaleTimeString()}
                </td>
                <td>
                  <span className="device-id">{log.deviceId}</span>
                </td>
                <td>
                  <span className="patient-id">{log.patientId}</span>
                </td>
                <td className="phrase">
                  {log.phrase}
                </td>
                <td>
                  {getTypeBadge(log.type)}
                </td>
                <td>
                  <div className="action-buttons">
                    {log.audioUrl && (
                      <button
                        onClick={() => handlePlayAudio(log.audioUrl!, log.id)}
                        className={`audio-btn ${playingAudio === log.id ? 'playing' : ''}`}
                        aria-label={playingAudio === log.id ? 'Pause audio' : 'Play audio'}
                      >
                        {playingAudio === log.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && (
          <div className="empty-state">
            <p>No logs found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default Logs;