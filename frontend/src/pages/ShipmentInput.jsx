import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Package, MapPin, Calendar, DollarSign, ShieldCheck, 
  Clock, Zap, Scale, Trash2, ArrowRight, Info, AlertTriangle, Activity, Globe
} from 'lucide-react';
import MapVisualization from '../components/MapVisualization';

const API_BASE = 'http://localhost:4000/api';

const ShipmentInput = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    origin: 'New York',
    destination: 'London',
    itemType: 'electronics',
    weight: 2500,
    volume: 12,
    fragility: 'medium',
    priorityMode: 'balanced',
    deadline: '',
    budget: '',
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [hubs, setHubs] = useState({ hubs: {}, cities: [] });

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/hubs`);
        setHubs(res.data);
      } catch (err) {
        console.error('Failed to fetch hubs', err);
      }
    };
    fetchHubs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/routes`, formData);
      setResults(res.data);
      if (res.data.routes && res.data.routes.length > 0) {
        setSelectedRoute(res.data.routes.find(r => r.recommended) || res.data.routes[0]);
      }
    } catch (err) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = async (routeId) => {
    try {
      await axios.post(`${API_BASE}/simulate/start`, {
        input: formData,
        selectedRouteId: routeId
      });
      navigate('/simulation');
    } catch (err) {
      alert('Start simulation failed: ' + err.message);
    }
  };

  // Logic to calculate map center for preview
  const getMapCenter = () => {
    if (!hubs.hubs || !hubs.hubs[formData.origin] || !hubs.hubs[formData.destination]) {
      return [20, 0];
    }
    const o = hubs.hubs[formData.origin];
    const d = hubs.hubs[formData.destination];
    return [(o.lat + d.lat) / 2, (o.lng + d.lng) / 2];
  };

  return (
    <div className="shipment-input-page">
      <div className="grid-2" style={{ gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* FORM SIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card animate-fade-in" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Package size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.5rem' }}>Shipment Details</h2>
            </div>
            
            <form onSubmit={handleAnalyze}>
              <div className="form-group">
                <label><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Origin City</label>
                <select name="origin" value={formData.origin} onChange={handleChange}>
                  {hubs.cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Destination</label>
                <select name="destination" value={formData.destination} onChange={handleChange}>
                  {hubs.cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Cargo Type</label>
                  <select name="itemType" value={formData.itemType} onChange={handleChange}>
                    <option value="electronics">Electronics</option>
                    <option value="perishable">Perishable</option>
                    <option value="hazardous">Hazardous</option>
                    <option value="pharmaceuticals">Pharmaceuticals</option>
                    <option value="machinery">Machinery</option>
                    <option value="general">General Cargo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fragility</label>
                  <select name="fragility" value={formData.fragility} onChange={handleChange}>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Sensitivity</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Volume (CBM)</label>
                  <input type="number" name="volume" value={formData.volume} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label><Scale size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Optimization Priority</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {['balanced', 'time', 'cost', 'risk'].map(mode => (
                    <button 
                      key={mode}
                      type="button" 
                      onClick={() => setFormData(f => ({ ...f, priorityMode: mode }))} 
                      className={`btn btn-secondary ${formData.priorityMode === mode ? 'active' : ''}`} 
                      style={{ 
                        borderColor: formData.priorityMode === mode ? 'var(--primary)' : '',
                        textTransform: 'capitalize',
                        fontSize: '0.8rem'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                {loading ? 'Analyzing Logistics Paths...' : 'Search Optimized Routes'}
              </button>
            </form>
          </div>
          
          {/* STATS SUMMARY (MOCK) */}
          <div className="card animate-fade-in" style={{ padding: '1.25rem' }}>
             <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} color="var(--primary)"/> Network Intelligence</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Global Hub Load</span>
                  <span style={{ color: 'var(--success)' }}>Nominal (24%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Avg Corridor Speed</span>
                  <span>920 km/h</span>
                </div>
             </div>
          </div>
        </div>

        {/* PREVIEW & RESULTS SIDE */}
        <div className="results-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* PREVIEW MAP */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '350px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 1000, background: 'rgba(10,10,12,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Globe size={18} color="var(--primary)" />
               <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Pathway Preview: {selectedRoute ? selectedRoute.name : 'Awaiting Input'}</span>
            </div>
            <MapVisualization 
              selectedRoute={selectedRoute} 
              center={getMapCenter()}
              zoom={3}
              interactive={false}
            />
          </div>

          {!results ? (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', minHeight: '300px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Activity size={48} />
              </div>
              <h3>Route Prediction Engine Ready</h3>
              <p style={{ maxWidth: '400px' }}>Select origin and destination to preview multi-modal logistics options on the map.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Logistics Pathway Analysis</h2>
                <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {results.routes.length} Deterministic Paths
                </span>
              </div>
              
              <div className="grid-2">
                {results.routes.map((route, i) => (
                  <div 
                    key={route.id} 
                    className={`card animate-fade-in ${selectedRoute?.id === route.id ? 'active-card' : ''}`} 
                    style={{ 
                      animationDelay: `${i * 0.1}s`, 
                      cursor: 'pointer',
                      border: selectedRoute?.id === route.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedRoute?.id === route.id ? 'rgba(59, 130, 246, 0.05)' : ''
                    }}
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem' }}>{route.icon}</div>
                      {route.recommended && <span className="badge badge-low" style={{ background: 'var(--primary-glow)', color: 'var(--text-main)', border: '1px solid var(--primary)' }}>Recommended</span>}
                    </div>
                    
                    <h3 style={{ marginBottom: '0.25rem' }}>{route.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{route.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TRANSIT TIME</span>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}><Clock size={12}/> {route.totalTimeDays} Days</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOTAL COST</span>
                        <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem' }}>${route.cost.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* ITINERARY PREVIEW */}
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Shipment Timeline</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {route.itinerary.slice(0, 4).map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700, minWidth: '15px' }}>D{step.day}</span>
                            <span style={{ color: 'var(--text-main)', opacity: 0.8 }}>{step.event}</span>
                          </div>
                        ))}
                        {route.itinerary.length > 4 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>+ {route.itinerary.length - 4} more steps</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RISK INDEX</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{route.risk.composite}%</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${route.risk.composite}%`, height: '100%', background: route.risk.composite < 30 ? 'var(--success)' : route.risk.composite < 60 ? 'var(--warning)' : 'var(--danger)' }}></div>
                      </div>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); startSimulation(route.id); }} className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }}>
                      Execute & Deploy <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentInput;
