import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "../src/components/Layout/Layout";
import Login from "../src/pages/Login/Login";
import LiveSession from "../src/pages/LiveSession/LiveSession";
import Phrases from "../src/pages/Phrases/Phrases";
import Logs from "../src/pages/Logs/Logs";
import Devices from "../src/pages/Devices/Devices";
import VoiceSession from "../src/pages/VoiceSession/VoiceSession";
import "./App.css";
import "./components/Toast/Toast.css";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<LiveSession />} />
              <Route path="phrases" element={<Phrases />} />
              <Route path="logs" element={<Logs />} />
              <Route
                path="devices"
                element={
                  <ProtectedRoute requiredRole={["admin", "operator"]}>
                    <Devices />
                  </ProtectedRoute>
                }
              />
              {/* Tambahkan route baru */}
              <Route path="voice-session" element={<VoiceSession />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
