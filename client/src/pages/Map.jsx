import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MapComponent from '../components/MapComponent'
import SpacetimeDBSubscriber from '../components/SpacetimeDBSubscriber'
import api from '../api/axios'
import mockApi from '../api/mockApi'

function Map() {
  const navigate = useNavigate()
  const [selectedHazard, setSelectedHazard] = useState(null)
  const [hazards, setHazards] = useState([])
  
  /** * BACKEND_DEV_NOTE: 
   * mapInstance captures the 'L.Map' object from the child MapComponent. 
   * This is required for the HUD buttons (Zoom/Locate) to work from this parent file.
   */
  const [mapInstance, setMapInstance] = useState(null);

  /**
   * BACKEND_DEV_NOTE:
   * Initial Data Retrieval logic. 
   * Endpoint: GET /hazards
   * Response: { success: boolean, data: Array }
   */
  useEffect(() => {
    fetchHazards()
  }, [])

  const fetchHazards = async () => {
    try {
      const response = await api.get('/hazards')
      if (response.data.success) {
        setHazards(response.data.data)
      }
    } catch (error) {
      console.warn('Backend Offline: Using mockApi fallback.')
      try {
        const mockResponse = await mockApi.getHazards()
        if (mockResponse.success) setHazards(mockResponse.data)
      } catch (e) { console.error('Data acquisition failed:', e) }
    }
  }

  // --- MAP UI CONTROL HANDLERS ---
  // These use the mapInstance state to call Leaflet internal methods
  const handleZoomIn = () => mapInstance?.zoomIn();
  const handleZoomOut = () => mapInstance?.zoomOut();
  const handleMyLocation = () => {
    mapInstance?.locate({ setView: true, maxZoom: 16 });
  };

  /**
   * BACKEND_DEV_NOTE:
   * Real-time sync logic. SpacetimeDB pushes data to these handlers 
   * to update the UI without a page refresh.
   */
  const handleNewHazard = (newHazard) => setHazards(prev => [...prev, newHazard]);
  const handleHazardUpdated = (hazardId, field, value) => {
    setHazards(prev => prev.map(h => h._id === hazardId ? { ...h, [field]: value } : h));
  };

  const handleHazardClick = (hazard) => setSelectedHazard(hazard);
  const handleViewDetails = () => selectedHazard && navigate(`/hazard/${selectedHazard._id}`);

  return (
    <div className="h-screen bg-[#131313] text-[#e5e2e1] font-['Space_Grotesk'] overflow-hidden flex flex-col relative">
      {/* --- TACTICAL SHADERS & FILTERS --- */}
      <style>{`
    /* FORCES THE DARK BLUEPRINT THEME ON STANDARD TILES */
    .leaflet-tile { 
      filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) grayscale(100%) !important; 
    }

    /* GLOBAL TACTICAL OVERLAYS */
    .tactical-grain::before { 
      content: ""; position: absolute; inset: 0; 
      background-image: url("https://www.transparenttextures.com/patterns/stardust.png"); 
      opacity: 0.05; pointer-events: none; z-index: 50; 
    }
    
    @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
    .animate-scan { animation: scan 8s linear infinite; }
    
    .map-grid-overlay { 
      background-size: 40px 40px; 
      background-image: linear-gradient(to right, rgba(255, 140, 0, 0.05) 1px, transparent 1px), 
                        linear-gradient(to bottom, rgba(255, 140, 0, 0.05) 1px, transparent 1px); 
    }

    /* --- TACTICAL MARKER PIN ANIMATIONS --- */
    @keyframes rotate-cw {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    @keyframes rotate-ccw {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(-360deg); }
    }

    .tactical-marker-container {
      position: relative;
      width: 40px;
      height: 40px;
    }

    /* The central orange diamond */
    .marker-diamond {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 10px;
      height: 10px;
      background-color: #FF8C00;
      box-shadow: 0 0 15px rgba(255, 140, 0, 0.6);
      z-index: 3;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Outer square rotating slowly clockwise */
    .square-outer {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255, 140, 0, 0.3);
      animation: rotate-cw 10s linear infinite;
    }

    /* Inner square rotating faster counter-clockwise */
    .square-inner {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 24px;
      height: 24px;
      border: 1px solid rgba(255, 140, 0, 0.5);
      animation: rotate-ccw 5s linear infinite;
    }
`}</style>

      {/* --- HEADER --- */}
      <header className="flex justify-between items-center w-full px-6 py-4 border-b-[6px] border-[#1C1B1B] bg-[#131313] sticky top-0 z-[100]">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black italic text-[#FF8C00] tracking-tighter uppercase">ROADRASH</span>
          <div className="hidden md:flex gap-6">
            <span className="text-[#FF8C00] font-bold text-xs tracking-widest uppercase">Live Map View</span>
          </div>
        </div>
        <div className="bg-[#0e0e0e] flex items-center px-4 py-2 border border-[#564334]/20">
          <span className="material-symbols-outlined text-[#E5E2E1] text-sm mr-2">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-xs font-bold uppercase w-48 text-[#E5E2E1] placeholder:text-[#353534]" placeholder="COORDINATE SEARCH" type="text"/>
        </div>
      </header>

      <main className="relative flex-grow bg-[#0A0A0A] overflow-hidden">
        {/* --- MAP ENGINE --- */}
        <div className="absolute inset-0 z-0">
          <MapComponent 
            onHazardClick={handleHazardClick}
            selectedHazard={selectedHazard}
            hazards={hazards}
            setMapInstance={setMapInstance} 
          />
        </div>

        <div className="absolute inset-0 map-grid-overlay z-10 pointer-events-none"></div>

        {/* STATUS HUD */}
        <div className="absolute top-8 right-8 z-20">
          <div className="bg-[#0e0e0e]/90 backdrop-blur-md border border-[#00eefc]/30 px-4 py-2 flex items-center gap-4">
            <div className="w-2 h-2 bg-[#00eefc] animate-pulse"></div>
            <span className="text-[10px] font-bold text-[#00eefc] uppercase tracking-widest leading-none">SYSTEM_READY</span>
            <div className="h-4 w-[1px] bg-[#564334]/30"></div>
            <span className="text-[10px] font-bold text-[#e5e2e1] uppercase font-mono leading-none">LATENCY: 14MS</span>
          </div>
        </div>

        {/* FILTER PANEL */}
        <div className="absolute top-8 left-8 z-20 flex flex-col gap-2">
          <div className="bg-[#1c1b1b] p-4 space-y-3 min-w-[200px] border border-[#564334]/30">
            <h3 className="text-[10px] font-black text-[#ffb77d] uppercase tracking-tighter mb-4">Filter Issues</h3>
            {['Potholes', 'Road Damage', 'Garbage'].map((label, i) => (
              <button key={label} className="w-full flex items-center justify-between text-xs font-bold text-[#e5e2e1] group">
                <span className="flex items-center gap-2 uppercase">
                  <span className={`w-2 h-2 ${i === 0 ? 'bg-[#ffb4ab]' : i === 1 ? 'bg-[#ff8c00]' : 'bg-[#00b5fc]'}`}></span> {label}
                </span>
                <span className="material-symbols-outlined text-sm text-[#00eefc]">check_box</span>
              </button>
            ))}
          </div>
        </div>

        {/* DOSSIER PANEL - DATA MAPPING & POSITION FIX */}
        {selectedHazard && (
          <div className="absolute bottom-24 left-10 z-40 w-[420px] animate-in slide-in-from-left duration-500">
            <div className="bg-[#1c1b1b] border-l-[6px] border-[#ff8c00] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden border border-[#564334]/30">
              
              {/* Header: Severity Logic (Supports both Mock & Real Backend) */}
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] px-3 py-1 font-black uppercase tracking-[0.2em] ${
                  (selectedHazard.ai_severity || selectedHazard.final_score * 10) > 7 ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-[#FF8C00] text-black'
                }`}>
                  {(selectedHazard.ai_severity || selectedHazard.final_score * 10) > 7 ? 'Critical_Hazard' : 'Active_Observation'}
                </span>
                <div className="text-right">
                  <div className="text-[10px] font-black text-[#564334] uppercase tracking-widest">Severity</div>
                  <div className="text-4xl font-black text-[#e5e2e1] italic leading-none">
                    {/* Maps 0-10 (Mock) or 0-1 (Backend) to 00/10 format */}
                    {Math.round(selectedHazard.ai_severity || (selectedHazard.final_score * 10) || 0).toString().padStart(2, '0')}/10
                  </div>
                </div>
              </div>

              {/* Title & Dynamic Sector ID */}
              <h2 className="text-2xl font-black text-[#e5e2e1] uppercase tracking-tighter leading-tight mb-6">
                {selectedHazard.type || 'Hazard'} Detected // <span className="text-[#FF8C00]">Sector {selectedHazard._id?.$oid?.slice(-2).toUpperCase() || selectedHazard._id?.slice(-2).toUpperCase() || '7G'}</span>
              </h2>

              {/* Coordinate Grid - Mapped to latitude/longitude (Mock) and lat/long (Backend) */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0a0a0a]/80 p-4 border border-[#564334]/30">
                  <div className="text-[9px] font-black text-[#564334] uppercase mb-1">Lat_Coordinate</div>
                  <div className="text-sm font-bold text-[#e5e2e1]">
                    {(selectedHazard.latitude || selectedHazard.lat || 0).toFixed(4)}° N
                  </div>
                </div>
                <div className="bg-[#0a0a0a]/80 p-4 border border-[#564334]/30">
                  <div className="text-[9px] font-black text-[#564334] uppercase mb-1">Lng_Coordinate</div>
                  <div className="text-sm font-bold text-[#e5e2e1]">
                    {(selectedHazard.longitude || selectedHazard.long || 0).toFixed(4)}° W
                  </div>
                </div>
              </div>

              {/* Description Box */}
              <div className="relative mb-8">
                <div className="text-[9px] font-black text-[#564334] uppercase mb-2 tracking-widest">Report Details</div>
                <div className="bg-[#0a0a0a] p-5 border-r-[4px] border-[#93000a] max-h-32 overflow-y-auto">
                  <p className="text-[12px] leading-relaxed text-[#ddc1ae] font-medium uppercase italic">
                    <span className="text-[#93000a] font-black mr-2">[REDACTED]</span> 
                    {selectedHazard.ai_description || selectedHazard.description || "Analysis in progress..."}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex gap-3">
                <button 
                  onClick={handleViewDetails}
                  className="flex-grow bg-[#FF8C00] hover:bg-[#ffb77d] text-[#2f1500] font-black py-4 uppercase text-[11px] tracking-[0.3em] transition-all"
                >
                  Dispatch Repair
                </button>
                <button 
                  onClick={() => setSelectedHazard(null)}
                  className="px-5 bg-[#353534] text-[#e5e2e1] hover:bg-[#ffb4ab] hover:text-black transition-all flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MAP CONTROLS (WIRED & MOVED UP) --- */}
        <div className="absolute bottom-24 right-8 z-20 flex flex-col gap-2">
          <button 
            onClick={handleZoomIn}
            className="w-12 h-12 bg-[#1c1b1b] border border-outline-variant/30 flex items-center justify-center text-[#e5e2e1] hover:bg-[#353534] transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-12 h-12 bg-[#1c1b1b] border border-outline-variant/30 flex items-center justify-center text-[#e5e2e1] hover:bg-[#353534] transition-colors"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <div className="h-2"></div>
          <button 
            onClick={handleMyLocation}
            className="w-12 h-12 bg-[#1c1b1b] border border-outline-variant/30 flex items-center justify-center text-[#00eefc] hover:bg-[#353534] transition-colors"
          >
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>my_location</span>
          </button>
        </div>

        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#ff8c00] opacity-10 shadow-[0_0_20px_#FF8C00] animate-scan z-10 pointer-events-none"></div>
      </main>

      {/* BACKEND_DEV_NOTE: Real-time subscriber instance */}
      <SpacetimeDBSubscriber onNewHazard={handleNewHazard} onHazardUpdated={handleHazardUpdated} />
    </div>
  )
}

export default Map