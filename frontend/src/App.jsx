import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ShipmentInput from './pages/ShipmentInput';
import SimulationDashboard from './pages/SimulationDashboard';
import RiskDashboard from './pages/RiskDashboard';
import { Truck, Activity, ShieldAlert, BarChart3, Globe, Zap } from 'lucide-react';

function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <nav>
        <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
            <Globe size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            SCIS <span style={{ color: 'var(--primary)', fontWeight: 400 }}>| INTELLIGENCE</span>
          </span>
        </div>
        
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Truck size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            New Shipment
          </Link>
          <Link to="/risk" className={`nav-link ${location.pathname === '/risk' ? 'active' : ''}`}>
            <ShieldAlert size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Global Intel
          </Link>
          <Link to="/simulation" className={`nav-link ${location.pathname === '/simulation' ? 'active' : ''}`}>
            <Activity size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Live Simulation
          </Link>
        </div>

        <div className="nav-actions">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="status-indicator">
              <div className="pulse-dot"></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>NETWORK ACTIVE</span>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--accent))', border: '2px solid rgba(255,255,255,0.1)' }}></div>
          </div>
        </div>
      </nav>

      <main className="animate-fade-in">
        <Routes>
          <Route path="/" element={<ShipmentInput />} />
          <Route path="/risk" element={<RiskDashboard />} />
          <Route path="/simulation" element={<SimulationDashboard />} />
        </Routes>
      </main>

      <footer style={{ padding: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
        &copy; 2026 Autonomous Supply Chain Intelligence System • GDG Solution Challenge
      </footer>
    </div>
  );
}

export default App;
