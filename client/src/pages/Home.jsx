import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Cpu, ShieldCheck, Construction, ArrowRight, Activity, Globe, Zap } from 'lucide-react';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Space_Grotesk'] overflow-x-hidden">
      
      {/* TACTICAL GRAIN OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      <main>
        {/* HERO SECTION */}
        <section className="relative w-full pt-48 pb-32 px-8 flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 z-0 opacity-[0.07] grayscale brightness-50 pointer-events-none">
            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1533230393619-bcad81548243?q=80&w=2070&auto=format&fit=crop" alt="City Background" />
          </div>

          <div className="relative z-10 max-w-4xl space-y-8">
            {/* Refined Badge */}
            <div className="inline-flex items-center gap-3 bg-[#131313] border border-[#564334]/40 px-4 py-1.5 text-[#FF8C00] text-[9px] font-black tracking-[0.4em] uppercase rounded-full">
              <span className="w-1.5 h-1.5 bg-[#FF8C00] animate-pulse rounded-full"></span>
              Network Status: Active // Gwalior Sector
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#e5e2e1] leading-[0.9] uppercase italic">
              Patch The<br/> <span className="text-[#FF8C00]">Reality.</span>
            </h1>
            
            <p className="max-w-xl mx-auto text-[#a48c7a] text-sm md:text-base font-medium tracking-wide leading-relaxed uppercase italic">
              A high-precision AI mesh network monitoring structural decay in real-time. Turn your hardware into a tool for collective civic restoration.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
              <button 
                onClick={() => navigate('/report')}
                className="bg-[#FF8C00] text-black font-black py-4 px-10 text-xs tracking-[0.3em] uppercase hover:brightness-110 transition-all"
              >
                Report the issue
              </button>
              <button 
                onClick={() => navigate('/map')}
                className="bg-transparent border border-[#564334] text-[#e5e2e1] py-4 px-10 text-xs font-black tracking-[0.3em] uppercase hover:bg-[#564334]/20 transition-colors"
              >
                Access Live Map
              </button>
            </div>
          </div>
        </section>

        {/* PROTOCOL FLOW SECTION - Refined Grid */}
        <section className="w-full py-32 px-8 bg-[#0e0e0e] border-y border-[#564334]/20">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-20 text-center md:text-left">
               <h2 className="text-xs font-black tracking-[0.5em] uppercase text-[#564334] mb-4">Core_Protocol</h2>
               <h3 className="text-4xl font-black tracking-tight uppercase italic">Automated Data Pipeline</h3>
               <div className="h-1 w-20 bg-[#FF8C00] mt-4 hidden md:block"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[#564334]/20 border border-[#564334]/20">
              {/* Step 1 */}
              <div className="bg-[#0a0a0a] p-10 flex flex-col items-center text-center group">
                <div className="w-12 h-12 flex items-center justify-center border border-[#564334]/40 text-[#00eefc] mb-6 group-hover:bg-[#00eefc]/5 transition-colors">
                  <Camera size={20} />
                </div>
                <h4 className="text-[10px] font-black tracking-[0.3em] text-[#564334] mb-2 uppercase">Step_01</h4>
                <p className="text-s font-bold uppercase italic text-[#e5e2e1]/80 leading-relaxed">Optical capture with embedded SpacetimeDB metadata.</p>
              </div>
              {/* Step 2 */}
              <div className="bg-[#0a0a0a] p-10 flex flex-col items-center text-center group">
                <div className="w-12 h-12 flex items-center justify-center border border-[#564334]/40 text-[#00eefc] mb-6 group-hover:bg-[#00eefc]/5 transition-colors">
                  <Cpu size={20} />
                </div>
                <h4 className="text-[10px] font-black tracking-[0.3em] text-[#564334] mb-2 uppercase">Step_02</h4>
                <p className="text-s font-bold uppercase italic text-[#e5e2e1]/80 leading-relaxed">Gemini 1.5 Vision analysis and priority scoring.</p>
              </div>
              {/* Step 3 */}
              <div className="bg-[#0a0a0a] p-10 flex flex-col items-center text-center group">
                <div className="w-12 h-12 flex items-center justify-center border border-[#564334]/40 text-[#00eefc] mb-6 group-hover:bg-[#00eefc]/5 transition-colors">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-[10px] font-black tracking-[0.3em] text-[#564334] mb-2 uppercase">Step_03</h4>
                <p className="text-s font-bold uppercase italic text-[#e5e2e1]/80 leading-relaxed">ArmorIQ validation to ensure mesh integrity.</p>
              </div>
              {/* Step 4 */}
              <div className="bg-[#0a0a0a] p-10 flex flex-col items-center text-center group">
                <div className="w-12 h-12 flex items-center justify-center border border-[#564334]/40 text-[#00eefc] mb-6 group-hover:bg-[#00eefc]/5 transition-colors">
                  <Construction size={20} />
                </div>
                <h4 className="text-[10px] font-black tracking-[0.3em] text-[#564334] mb-2 uppercase">Step_04</h4>
                <p className="text-s font-bold uppercase italic text-[#e5e2e1]/80 leading-relaxed">Direct dispatch to municipal repair units.</p>
              </div>
            </div>
          </div>
        </section>

        {/* REFINED CTA */}
        {/* PUBLIC WELFARE / MONTHLY GOAL SECTION */}
<section className="w-full py-32 px-8 relative overflow-hidden bg-[#0a0a0a]">
  <div className="max-w-[1200px] mx-auto">
    
    {/* Section Header */}
    <div className="mb-16 text-center md:text-left">
      <h2 className="text-xs font-black tracking-[0.5em] uppercase text-[#564334] mb-4">Welfare_Metrics</h2>
      <h3 className="text-4xl font-black tracking-tight uppercase italic">Community Impact Report</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
      
      {/* Monthly Goal Tracker (Circular Gauge) */}
      <div className="md:col-span-5 bg-[#131313] border border-[#564334]/30 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#FF8C00]/20" />
        
        {/* Tactical Gauge SVG */}
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96" cy="96" r="88"
              fill="transparent"
              stroke="#1c1b1b"
              strokeWidth="8"
            />
            <circle
              cx="96" cy="96" r="88"
              fill="transparent"
              stroke="#FF8C00"
              strokeWidth="8"
              strokeDasharray="552.9"
              strokeDashoffset="138.2" // Represents 75%
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-[#e5e2e1] italic">75%</span>
            <span className="text-[10px] font-black text-[#564334] tracking-widest uppercase">Target_Met</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xl font-black uppercase italic tracking-tighter">Monthly Resolve Goal</h4>
          <p className="text-[11px] font-bold text-[#a48c7a] uppercase tracking-[0.2em]">Current: 375 / 500 Infrastructure Fixes</p>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
        
        {/* Resolved Count */}
        <div className="bg-[#131313] border border-[#564334]/30 p-8 flex flex-col justify-between group hover:border-[#00eefc]/30 transition-all">
          <Activity size={24} className="text-[#00eefc] mb-6" />
          <div>
            <span className="block text-4xl font-black text-[#e5e2e1] italic mb-1">1,248</span>
            <span className="text-[10px] font-black text-[#564334] tracking-widest uppercase">Total Hazards Resolved</span>
          </div>
        </div>

        {/* Public Trust Level */}
        <div className="bg-[#131313] border border-[#564334]/30 p-8 flex flex-col justify-between group hover:border-[#00B894]/30 transition-all">
          <ShieldCheck size={24} className="text-[#00B894] mb-6" />
          <div>
            <span className="block text-4xl font-black text-[#e5e2e1] italic mb-1">98.4%</span>
            <span className="text-[10px] font-black text-[#564334] tracking-widest uppercase">Data Accuracy Rating</span>
          </div>
        </div>

        {/* Community Size */}
        <div className="bg-[#131313] border border-[#564334]/30 p-8 flex flex-col justify-between group hover:border-[#FF8C00]/30 transition-all">
          <Globe size={24} className="text-[#FF8C00] mb-6" />
          <div>
            <span className="block text-4xl font-black text-[#e5e2e1] italic mb-1">8.2k</span>
            <span className="text-[10px] font-black text-[#564334] tracking-widest uppercase">Active Field Agents</span>
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-[#131313] border border-[#564334]/30 p-8 flex flex-col justify-between group hover:border-[#00eefc]/30 transition-all">
          <Zap size={24} className="text-[#00eefc] mb-6" />
          <div>
            <span className="block text-4xl font-black text-[#e5e2e1] italic mb-1">5s</span>
            <span className="text-[10px] font-black text-[#564334] tracking-widest uppercase">Avg AI Processing Time</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</section>
{/* MISSION & TECHNOLOGY SECTION */}
<section className="w-full py-32 px-8 border-t border-[#564334]/10 bg-[#0a0a0a]">
  <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
    
    {/* Simple Mission Statement */}
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xs font-black tracking-[0.5em] uppercase text-[#FF8C00]">Our_Simple_Mission</h2>
        <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-[1.1]">
          We use <span className="text-[#00eefc]">Smart Tech</span> to give you <span className="text-[#FF8C00]">Better Roads.</span>
        </h3>
      </div>
      
      <p className="text-lg text-[#a48c7a] font-medium leading-relaxed uppercase italic">
        "Our goal is to stop road problems from being ignored. We connect your phone directly to the city’s repair teams, making sure every pothole reported is a pothole fixed."
      </p>

      <div className="flex items-center gap-6 pt-4">
         <div className="h-px w-16 bg-[#564334]"></div>
         <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#564334]">Tech_Stack // v2.0</span>
      </div>
    </div>

    {/* The Big Four Tech Boxes */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#564334]/30 border border-[#564334]/30">
       
       {/* Box 1: SpacetimeDB */}
       <div className="bg-[#0d0d0d] p-8 space-y-4 group hover:bg-[#131313] transition-colors">
          <h4 className="text-[#00eefc] text-xs font-black uppercase tracking-widest">01 // SpacetimeDB</h4>
          <p className="text-[11px] text-[#a48c7a] font-bold uppercase leading-tight italic">
            The heart of the system. It records every report instantly and keeps the map updated for everyone in real-time.
          </p>
       </div>

       {/* Box 2: ArmorIQ */}
       <div className="bg-[#0d0d0d] p-8 space-y-4 group hover:bg-[#131313] transition-colors">
          <h4 className="text-[#00eefc] text-xs font-black uppercase tracking-widest">02 // ArmorIQ</h4>
          <p className="text-[11px] text-[#a48c7a] font-bold uppercase leading-tight italic">
            The security filter. It checks every upload to stop spam and fake reports, making sure the city only sees real issues.
          </p>
       </div>

       {/* Box 3: Gemini AI */}
       <div className="bg-[#0d0d0d] p-8 space-y-4 group hover:bg-[#131313] transition-colors">
          <h4 className="text-[#00eefc] text-xs font-black uppercase tracking-widest">03 // Gemini_AI</h4>
          <p className="text-[11px] text-[#a48c7a] font-bold uppercase leading-tight italic">
            The system's brain. It "looks" at your photos to automatically identify the hazard and decide how urgent it is.
          </p>
       </div>

       {/* Box 4: Quick_Resolve */}
       <div className="bg-[#0d0d0d] p-8 space-y-4 group hover:bg-[#131313] transition-colors">
          <h4 className="text-[#00eefc] text-xs font-black uppercase tracking-widest">04 // Quick_Resolve</h4>
          <p className="text-[11px] text-[#a48c7a] font-bold uppercase leading-tight italic">
            The action plan. It sends verified data straight to repair crews, cutting through red tape to get the job done fast.
          </p>
       </div>

    </div>

  </div>
</section>
      </main>

      {/* FOOTER - Professional & Compact */}
      <footer className="bg-[#0a0a0a] py-10 border-t border-[#564334]/20">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center px-12 gap-6">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#564334]">
            © 2026 ROADRASH_INTEL // MUNICIPAL RESPONSE UNIT
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[12px] font-black uppercase tracking-widest text-[#564334] hover:text-[#FF8C00] transition-colors">GuptaSquad</a>
            <a href="#" className="text-[12px] font-black uppercase tracking-widest text-[#564334] hover:text-[#FF8C00] transition-colors">v0.1</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;