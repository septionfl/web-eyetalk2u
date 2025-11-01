export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface Device {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'calibrating';
  patientId?: string;
  lastActive: Date;
}

export interface Phrase {
  id: string;
  text: string;
  category: string;
  usageCount: number;
  createdAt: Date;
}

export interface Session {
  id: string;
  deviceId: string;
  patientId: string;
  startTime: Date;
  endTime?: Date;
  calibrationStatus: 'pending' | 'completed' | 'failed';
  phrasesUsed: string[];
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  deviceId: string;
  patientId: string;
  phrase: string;
  audioUrl?: string;
  type: 'phrase_selected' | 'calibration' | 'system';
}