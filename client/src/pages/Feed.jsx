import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HazardCard from '../components/HazardCard';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Shield, Info, RefreshCw, Plus, Filter } from 'lucide-react';

function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hazards, setHazards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' or 'resolved' for officers

  // BACKEND_DEV_NOTE: Initial data fetch. Ensure the API returns an array of hazard objects.
  useEffect(() => {
    fetchHazards(statusFilter);
  }, [statusFilter]);

  const fetchHazards = async (status = 'active') => {
    try {
      // <--- BACKEND_WORK_HERE: Replace with your GET hazards endpoint. Expected: { success: true, hazards: [] }
      const response = await api.get('/hazards', {
        params: { status } // Filter by status: 'active' or 'resolved'
      }); 
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const hazardsData = response.data.hazards || response.data.data || [];
        console.log('Hazards Data:', hazardsData);
        // Sort by updatedAt in descending order (most recent first)
        setHazards(hazardsData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))); 
      }
    } catch (error) {
      console.error('Error fetching hazards from MongoDB backend:', error);
      setHazards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHazardUpdate = (hazardId, updateType, newValue) => {
    // <--- BACKEND_WORK_HERE: newValue should ideally be the updated 'counter' object from the DB.
    setHazards(prev => 
      prev.map(h => h._id === hazardId ? { ...h, [updateType]: newValue } : h)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  // The feed is intentionally sourced only from MongoDB via GET /hazards.
  // Real-time websocket events are disabled to avoid non-persistent test data in the UI.
  const handleNewHazard = () => {
    // no-op; we rely on fetchHazards() only.
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Space_Grotesk'] pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        
        {/* HEADER SECTION - Standardized Position */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-[#564334]/20 pb-8 gap-6">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-[#e5e2e1]">Explore</h1>
            <p className="text-[10px] font-bold text-[#FF8C00] tracking-[0.4em] mt-2 uppercase">Community Safety Feed</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            {user?.is_official && (
              <div className="flex gap-2 border border-[#564334]/50 p-1 bg-[#0a0a0a] rounded">
                <button 
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    statusFilter === 'active' 
                      ? 'bg-[#FF8C00] text-black' 
                      : 'text-[#564334] hover:text-[#e5e2e1]'
                  }`}
                >
                  <Filter size={12} /> Unresolved
                </button>
                <button 
                  onClick={() => setStatusFilter('resolved')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    statusFilter === 'resolved' 
                      ? 'bg-[#00B894] text-black' 
                      : 'text-[#564334] hover:text-[#e5e2e1]'
                  }`}
                >
                  <Filter size={12} /> Resolved
                </button>
              </div>
            )}
            <button onClick={() => fetchHazards(statusFilter)} className="px-6 py-3 border border-[#564334]/50 text-[10px] font-black uppercase tracking-widest hover:bg-[#1c1b1b] transition-all flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => navigate('/report')} className="px-8 py-3 bg-[#FF8C00] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              <Plus size={14} strokeWidth={3} /> New Report
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            {loading ? (
               <div className="animate-pulse space-y-4">
                 {[...Array(3)].map((_, i) => (
                   <div key={i} className="h-64 bg-[#131313] border border-[#564334]/10" />
                 ))}
               </div>
            ) : (
              hazards.map((hazard) => (
                <HazardCard key={hazard._id} hazard={hazard} onUpdate={handleHazardUpdate} />
              ))
            )}
          </div>

          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-24 h-fit">
            <div className="bg-[#131313] border border-[#564334]/30 p-6 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="text-[#00eefc]" size={18} />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#e5e2e1]">City Stats</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-[#564334]/10 pb-2">
                  <span className="text-[10px] font-bold text-[#564334] uppercase">Regional Coverage</span>
                  <span className="text-xs font-black text-[#e5e2e1]">100%</span>
                </div>
                <div className="flex justify-between border-b border-[#564334]/10 pb-2">
                  <span className="text-[10px] font-bold text-[#564334] uppercase">Verification Status</span>
                  <span className="text-[10px] font-black text-[#00B894]">ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FF8C00] p-6 text-black">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Reporting Guide</h3>
              <p className="text-[11px] leading-tight font-bold uppercase italic opacity-80">
                "Upvote critical issues to help the city prioritize repairs. Confirm other reports to help keep our data accurate."
              </p>
            </div>

            <div className="bg-[#131313] border border-[#564334]/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="text-[#00eefc]" size={18} />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#e5e2e1]">AI Analysis Node</h3>
              </div>
              <p className="text-[9px] text-[#a48c7a] uppercase leading-relaxed font-medium">
                Gemini Vision-1.5 is currently processing imagery in Sector 7G. System monitoring is 24/7 to categorize hazards and calculate severity scores automatically. Detection accuracy: 98.4%.
              </p>
            </div>
          </aside>
        </div>
      </div>
      {/* Feed is MongoDB-sourced only; no SpacetimeDB fallback data is rendered. */}
    </div>
  );
}

export default Feed;