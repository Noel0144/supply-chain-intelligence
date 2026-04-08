import React, { useEffect, useState, Fragment } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plane, Ship, Truck, Activity, ShieldAlert, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon Generator
const createIcon = (color, svgPath) => {
  return L.divIcon({
    html: `<div style="background: ${color}; padding: 6px; border-radius: 50%; display: flex; box-shadow: 0 0 15px ${color}80; border: 2px solid white;">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
               ${svgPath}
             </svg>
           </div>`,
    className: 'custom-leaflet-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const shipIcon = createIcon('#0ea5e9', '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M19.38 20.42a2.4 2.4 0 0 0 1.62.58 2.4 2.4 0 0 0 1.62-.58"></path><path d="M3.5 18h17"></path><path d="m11 11.5 2.5-4h7.5L19 11.5"></path><path d="M7 11.5V18"></path><path d="M11 11.5V18"></path><path d="M15 11.5V18"></path>');
const planeIcon = createIcon('#a855f7', '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path>');
const truckIcon = createIcon('#f59e0b', '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4l-3 5"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>');
const disruptionIcon = createIcon('#ef4444', '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>');

const MODE_COLORS = {
  air: '#a855f7',
  sea: '#06b6d4',
  road: '#f59e0b',
  rail: '#10b981',
};

const MODE_DASH = {
  air: '10, 10',
  sea: 'none',
  road: '5, 5',
  rail: '15, 5',
};

// Map Centering and Events
const MapController = ({ center, zoom, bounds, onMapClick }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);

  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
};

const MapVisualization = ({ shipments = [], riskZones = [], activeDisruptions = [], selectedRoute = null, center = [20, 0], zoom = 2, interactive = true, onMapClick = null }) => {
  const [bounds, setBounds] = useState(null);

  // Stringify shipment IDs to prevent constant re-zooming on every animation tick
  const shipmentIds = shipments.map(s => s.id).join(',');

  useEffect(() => {
    if (selectedRoute && selectedRoute.displaySegments) {
      const allPoints = selectedRoute.displaySegments.flatMap(s => s.points);
      if (allPoints.length > 0) {
        setBounds(allPoints.map(p => [p.lat, p.lng]));
      }
    } else if (shipments.length > 0) {
      const allPoints = shipments.flatMap(s => s.route.displaySegments.flatMap(ds => ds.points));
      if (allPoints.length > 0) {
        setBounds(allPoints.map(p => [p.lat, p.lng]));
      }
    }
  }, [selectedRoute, shipmentIds]);

  const renderSegments = (segments, keyPrefix) => {
    if (!segments) return null;
    return segments.map((seg, idx) => (
      <Polyline 
        key={`${keyPrefix}-${idx}`}
        positions={seg.points.map(p => [p.lat, p.lng])}
        pathOptions={{ 
          color: MODE_COLORS[seg.mode] || 'var(--primary)', 
          weight: 4, 
          opacity: 0.8,
          dashArray: MODE_DASH[seg.mode]
        }}
      />
    ));
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', borderRadius: 'inherit', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={zoom} zoomControl={false} scrollWheelZoom={interactive} dragging={interactive}>
        <MapController center={center} zoom={zoom} bounds={bounds} onMapClick={onMapClick} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Global Risk Zones */}
        {riskZones.map((zone, idx) => (
          <Fragment key={`zone-${idx}`}>
            <Circle 
              center={[zone.lat, zone.lng]} 
              radius={zone.radius * 1000} 
              pathOptions={{ 
                color: zone.riskScore > 80 ? '#ef4444' : '#f59e0b', 
                fillOpacity: 0.1, 
                weight: 1,
                dashArray: '5, 10'
              }} 
            />
            <Marker position={[zone.lat, zone.lng]} icon={disruptionIcon}>
              <Popup>
                <div style={{ color: 'white', padding: '4px' }}>
                  <strong style={{ color: '#ef4444' }}>{zone.name}</strong><br/>
                  <small>Score: {zone.riskScore}%</small>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        ))}

        {/* Active Disruptions */}
        {activeDisruptions.map((d, idx) => (
          <Fragment key={`active-dis-${d.id || idx}`}>
            <Circle 
              center={[d.lat, d.lng]} 
              radius={d.radius * 600} 
              pathOptions={{ stroke: false, fillColor: '#ef4444', fillOpacity: 0.4 }} 
            />
            <Circle 
              center={[d.lat, d.lng]} 
              radius={d.radius * 1200} 
              pathOptions={{ stroke: false, fillColor: '#ef4444', fillOpacity: 0.15 }} 
            />
            <Circle 
              center={[d.lat, d.lng]} 
              radius={d.radius * 2000} 
              pathOptions={{ color: '#ef4444', weight: 1, dashArray: '5, 15', fillColor: '#ef4444', fillOpacity: 0.05 }} 
            />
            <Marker position={[d.lat, d.lng]} icon={disruptionIcon}>
              <Popup>
                <div style={{ color: 'white', padding: '4px' }}>
                  <strong style={{ color: '#ef4444' }}>{d.name.toUpperCase()}</strong><br/>
                  <small>Live Autonomous Threat Detection</small>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        ))}

        {/* Selected Preview Route */}
        {selectedRoute && renderSegments(selectedRoute.displaySegments, 'preview')}

        {/* Live Shipments */}
        {shipments.map((s) => (
          <Fragment key={s.id}>
            {renderSegments(s.route.displaySegments, `shipment-${s.id}`)}
            <Marker 
              position={[s.currentLat, s.currentLng]} 
              icon={s.route.modes.includes('air') ? planeIcon : s.route.modes.includes('sea') ? shipIcon : truckIcon}
            >
              <Popup>
                <div style={{ padding: '8px', minWidth: '150px' }}>
                  <h4 style={{ marginBottom: '4px', color: 'white' }}>{s.input.origin} ➝ {s.input.destination}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status: {s.status.replace('_', ' ')}</p>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Risk:</span> <span style={{ color: s.risk.composite > 60 ? '#ef4444' : '#10b981' }}>{s.risk.composite}%</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        ))}
      </MapContainer>

      {/* Legend Overlay */}
      <div style={{ 
        position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, 
        padding: '0.75rem', background: 'rgba(10,10,12,0.9)', 
        color: 'white', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#a855f7' }}></div> Air Path
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#06b6d4' }}></div> Sea Path
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div> Road Path
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', opacity: 0.3 }}></div> Threat Zone
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
