import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/**
 * BACKEND_DEV_NOTE:
 * This helper component captures the Leaflet map object 
 * and sends it to the parent Map.jsx so our custom HUD buttons work.
 */

const tacticalIcon = L.divIcon({
  className: 'custom-tactical-icon', // This prevents Leaflet's default styles
  html: `
    <div class="tactical-marker-container">
      <div class="square-outer"></div>
      <div class="square-inner"></div>
      <div class="marker-diamond"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const MapController = ({ setMapInstance }) => {
  const map = useMap();
  useEffect(() => {
    if (map && setMapInstance) {
      setMapInstance(map); 
    }
  }, [map, setMapInstance]);
  return null;
};

const MapComponent = ({ hazards = [], onHazardClick, setMapInstance }) => {
  
  const tacticalIcon = L.divIcon({
  className: 'custom-tactical-icon',
  html: `
    <div class="tactical-marker-container">
      <div class="square-outer"></div>
      <div class="square-inner"></div>
      <div class="marker-diamond"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

  return (
    <MapContainer 
      center={[26.2183, 78.1828]} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false} // Disabled standard controls to use our Tactical HUD
    >
      <MapController setMapInstance={setMapInstance} />
      
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {(hazards || []).map((hazard) => {
        const lat = parseFloat(hazard.latitude ?? hazard.lat)
        const long = parseFloat(hazard.longitude ?? hazard.long)

        if (Number.isNaN(lat) || Number.isNaN(long)) {
          return null
        }

        return (
          <Marker
            key={hazard._id || hazard.id || `${lat}-${long}`}
            position={[lat, long]}
            icon={tacticalIcon}
            eventHandlers={{
              click: () => onHazardClick && onHazardClick(hazard),
            }}
          />
        )
      })}
    </MapContainer>
  );
};

export default MapComponent;