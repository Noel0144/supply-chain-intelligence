import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapVisualization from '../components/MapVisualization';
import { 
  ShieldAlert, AlertTriangle, Info, 
  Thermometer, Wind, Zap, Globe, 
  TrendingUp, Eye, Search, Filter 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const RiskDashboard = () => {
  const [riskZones, setRiskZones] = useState([]);
  const [activeDisruptions, setActiveDisruptions] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/risk-zones`);
        setRiskZones(res.data.riskZones);
      } catch (err) {
        console.error('Failed to fetch risk data');
      } finally {
        setLoading(false);
      }
    };
    fetchStaticData();

    const fetchRadar = async () => {
      try {
        const res = await axios.get(`${API_BASE}/simulate/radar`);
        setActiveDisruptions(res.data.activeDisruptions);
        setNewsFeed(res.data.newsFeed);
      } catch (err) {
        console.error('Failed to fetch radar', err);
      }
    };

    fetchRadar(); // initial radar fetch
    const interval = setInterval(fetchRadar, 3000); // Poll every 3 seconds for radar
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="risk-dashboard-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Global Intelligence Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time monitoring of geopolitical, weather, and operational risk corridors.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>High Threat: {activeDisruptions.length}</span>
          </div>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 360px', flex: 1, gap: '1.5rem', minHeight: 0 }}>
        {/* BIG MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={18} color="var(--primary)"/> Global Threat Heatmap</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="search-box" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="var(--text-dim)"/>
                <input type="text" placeholder="Search Hub..." style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none' }} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <MapVisualization 
              riskZones={riskZones} 
              activeDisruptions={activeDisruptions}
              interactive={true}
              zoom={2.5}
            />
          </div>
        </div>

        {/* INTELLIGENCE FEED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div className="card">
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} color="var(--primary)"/> Intelligence Feed
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {newsFeed.map(item => (
                <div key={item.id} className="news-item" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{item.type}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : item.time}</span>
                  </div>
                  <h5 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{item.title}</h5>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.75rem', color: item.impact === 'High' ? 'var(--danger)' : item.impact === 'Medium' ? 'var(--warning)' : 'var(--success)' }}>
                       Impact: {item.impact}
                     </span>
                     <Eye size={12} style={{ opacity: 0.5, cursor: 'pointer' }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.75rem' }}>View Full Archive</button>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} color="var(--success)"/> Disruptive Trends
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>Fuel Price Volatility</span>
                    <span style={{ color: 'var(--danger)' }}>+12.4%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: 'var(--danger)' }}></div>
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>Port Congestion Index</span>
                    <span style={{ color: 'var(--warning)' }}>+4.1%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '45%', height: '100%', background: 'var(--warning)' }}></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
