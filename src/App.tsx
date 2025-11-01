import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import LiveSession from './pages/LiveSession/LiveSession';
import Phrases from './pages/Phrases/Phrases';
import Logs from './pages/Logs/Logs';
import Devices from './pages/Devices/Devices';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<LiveSession />} />
            <Route path="phrases" element={<Phrases />} />
            <Route path="logs" element={<Logs />} />
            <Route path="devices" element={<Devices />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;