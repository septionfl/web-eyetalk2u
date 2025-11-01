import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Video, 
  MessageSquare, 
  History, 
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Live Session', href: '/', icon: Video },
    { name: 'Phrases', href: '/phrases', icon: MessageSquare },
    { name: 'Logs', href: '/logs', icon: History },
    { name: 'Devices', href: '/devices', icon: Settings },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>EyeTalk2U</h2>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="toggle-btn"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item ${
                  location.pathname === item.href ? 'active' : ''
                }`}
              >
                <Icon size={20} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="user-info">
            <User size={20} />
            {isSidebarOpen && (
              <div>
                <p className="user-name">{user?.name}</p>
                <p className="user-role">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;