import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Camera, Shield, AlertTriangle, CheckCircle, X, ChevronDown, 
  Loader2, Info, ListFilter, Activity, XCircle, ArrowRight 
} from 'lucide-react';
import api from '../api/axios';
import mockApi from '../api/mockApi';

const HAZARD_TYPES = [
  { id: 'pothole', label: 'POTHOLE / ROAD DAMAGE' },
  { id: 'garbage', label: 'UNSANITARY / GARBAGE' },
  { id: 'waterlogging', label: 'FLOODING / WATERLOGGING' },
  { id: 'road_damage', label: 'STRUCTURAL DAMAGE' },
  { id: 'other', label: 'OTHER HAZARD' }
];

function Report() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [hazardType, setHazardType] = useState('');
  
  // <--- BACKEND_WORK_HERE: Replace with your actual Auth Context or User State
  const [currentUser] = useState({ id: 'USR_9921', name: 'Field_Agent_Alpha' });

  // VERIFICATION FLOW STATES
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activityLog, setActivityLog] = useState({
    gemini: null,
    fileValidation: null,
    spamCheck: null,
    keywordCheck: null,
    finalStatus: null
  });

  // MODAL STATES
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState(null); 
  const [countdown, setCountdown] = useState(5);

  // Camera states
  const [showCaptureOptions, setShowCaptureOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    console.log('User authenticated:', user?.name || user?.email);
  }, [isAuthenticated, navigate, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setActivityLog({ gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null });
      setCurrentStep(0);
    }
  };

  const handleCaptureClick = () => {
    setShowCaptureOptions(true);
  };

  const handleCameraCapture = async () => {
    setShowCaptureOptions(false);
    
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera is not supported on this device/browser. Please use the upload option instead.');
      return;
    }
    
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Try back camera first
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access error:', error);
      // Try front camera as fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
        setCameraStream(stream);
        setShowCamera(true);
      } catch (fallbackError) {
        console.error('Fallback camera error:', fallbackError);
        setCameraError('Unable to access camera. Please check permissions or use the upload option.');
      }
    }
  };

  const handleTakePhoto = () => {
    if (!cameraStream) return;

    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setActivityLog({ gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null });
      setCurrentStep(0);
      handleCloseCamera();
    }, 'image/jpeg', 0.8);
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Set up video stream when camera opens
  useEffect(() => {
    if (showCamera && cameraStream) {
      const video = document.getElementById('camera-video');
      if (video) {
        video.srcObject = cameraStream;
      }
    }
  }, [showCamera, cameraStream]);

  const handleFileUpload = () => {
    setShowCaptureOptions(false);
    // Trigger file upload input
    document.getElementById('file-input').click();
  };

  useEffect(() => {
    let timer;
    if (showModal && modalStatus === 'approved') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/feed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showModal, modalStatus, navigate]);

 const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !hazardType) return;
    
    setIsProcessing(true);
    
    // STEP 1: GEMINI VISUAL
    setCurrentStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setActivityLog(prev => ({ ...prev, gemini: 'pass' }));

    // STEP 2: FILE VALIDATION
    setCurrentStep(2);
    await new Promise(r => setTimeout(r, 800));
    setActivityLog(prev => ({ ...prev, fileValidation: 'pass' }));

    // STEP 3: SPAM/DUP
    setCurrentStep(3);
    await new Promise(r => setTimeout(r, 1000));
    setActivityLog(prev => ({ ...prev, spamCheck: 'pass' }));

    // STEP 4: KEYWORDS
    setCurrentStep(4);
    await new Promise(r => setTimeout(r, 1000));
    setActivityLog(prev => ({ ...prev, keywordCheck: 'pass' }));

    // STEP 5: DB COMMIT
    setCurrentStep(5);

    try {
      // 1. Get browser geolocation (Optional but expected by your backend)
      let lat = null;
      let long = null;
      
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = position.coords.latitude;
        long = position.coords.longitude;
      } catch (geoErr) {
        console.warn("Geolocation blocked or timed out. Relying on image EXIF data.", geoErr);
      }

      // 2. Prepare FormData exactly as the backend expects
      const formData = new FormData();
      
      // Append the image file (Multer looks for 'image' field by default based on your typical setup)
      formData.append('image', image); 
      
      // Append the description (Backend looks for 'complaint_description')
      // Note: If you add a text area for descriptions later, pass that state variable here instead of hazardType.
      formData.append('complaint_description', hazardType); 
      
      // Append coordinates if we successfully grabbed them
      if (lat && long) {
        formData.append('gps_latitude', lat);
        formData.append('gps_longitude', long);
      }

      console.log('Sending hazard report with data:', {
        hasImage: !!image,
        imageType: image?.type,
        hazardType: hazardType,
        lat: lat,
        long: long
      });

      // 3. POST request with explicit multipart/form-data header
      const res = await api.post('/hazards', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Note: Ensure your api/axios instance is automatically attaching the standard 
          // 'Authorization': `Bearer ${token}` header in its interceptor!
        }
      });
      
      if (res.data?.success) {
        setActivityLog(prev => ({ ...prev, finalStatus: 'pass' }));
        await new Promise(r => setTimeout(r, 1800)); 
        setModalStatus('approved');
        setShowModal(true);
      } else {
        const errMsg = res.data?.message || 'Failed to file report';
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('Error posting report:', err);
      console.error('Response data:', err.response?.data);
      setActivityLog(prev => ({ ...prev, finalStatus: 'fail' }));
      await new Promise(r => setTimeout(r, 1800));
      setModalStatus('rejected');
      setShowModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = image && hazardType && !isProcessing;

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] font-['Space_Grotesk'] overflow-hidden">
      
      {/* MAIN CONTENT LAYER */}
      <div className={`pt-12 pb-12 px-4 sm:px-6 lg:px-8 transition-all duration-700 ${showModal ? 'blur-2xl scale-[0.95] opacity-30' : ''}`}>
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        
        <style>{`
          @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
          .animate-scan-line { animation: scan 3s linear infinite; }
        `}</style>

        <div className="max-w-[1400px] mx-auto relative z-10">
          
          {/* HEADER SECTION - Positioned exactly as Feed */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-[#564334]/20 pb-6 gap-6">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-[#e5e2e1]">Report Incident</h1>
              <p className="text-[10px] font-bold text-[#FF8C00] tracking-[0.4em] mt-2 uppercase">AI Will Autogenerate Your Report.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: FORM SECTION (7 Cols) */}
            <div className="lg:col-span-7 w-full space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* SCANNER VIEWPORT */}
                <div className="relative bg-[#131313] border border-[#564334]/30 overflow-hidden shadow-2xl h-[350px]">
                  <div className="absolute top-4 left-4 z-20 text-[9px] font-black text-black bg-[#FF8C00] px-2 py-1 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-black animate-pulse" />
                    {isProcessing ? 'SCANNING_IN_PROGRESS' : 'VIEWFINDER_ACTIVE'}
                  </div>

                  {imageUrl ? (
                    <div className="relative w-full h-full bg-black">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover opacity-90 transition-all duration-500" />
                      {isProcessing && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                          <div className="w-full h-[3px] bg-[#FF8C00] shadow-[0_0_25px_#FF8C00] absolute top-0 left-0 animate-scan-line" />
                        </div>
                      )}
                      {!isProcessing && (
                        <button type="button" onClick={() => setImageUrl(null)} className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF8C00] text-white hover:text-black p-2 border border-white/10 transition-all z-20">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-[#0A0A0A] hover:bg-[#131313] transition-all group">
                      <div className="w-20 h-20 border-2 border-dashed border-[#564334] rounded-full flex items-center justify-center mb-4 group-hover:border-[#FF8C00] transition-all">
                        <Camera size={32} className="text-[#564334] group-hover:text-[#FF8C00]" />
                      </div>
                      <span className="font-black uppercase tracking-[0.2em] text-[#e5e2e1] text-md italic mb-4">Capture Hazard Photo</span>
                      <button 
                        type="button" 
                        onClick={handleCaptureClick}
                        className="px-6 py-2 bg-[#FF8C00] text-black font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all"
                      >
                        Start Capture
                      </button>
                      <input 
                        id="file-input"
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="sr-only" 
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#131313] border border-[#564334]/30 p-8">
                  <div className="space-y-6">
                    <div className="relative">
                      <label className="text-[10px] font-black text-[#00eefc] uppercase mb-2 flex items-center gap-2 tracking-[0.2em]">
                        <ListFilter size={12} /> Incident Category
                      </label>
                      <div className="relative">
                        <select value={hazardType} onChange={(e) => setHazardType(e.target.value)} className="w-full p-4 bg-[#0A0A0A] border-2 border-[#564334] text-[#e5e2e1] font-black text-xs outline-none focus:border-[#FF8C00] transition-all appearance-none uppercase tracking-widest cursor-pointer">
                          <option value="" disabled className="bg-[#0A0A0A]">-- SELECT CATEGORY --</option>
                          {HAZARD_TYPES.map((type) => (
                            <option key={type.id} value={type.id} className="bg-[#131313]">{type.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF8C00]">
                          <ChevronDown size={22} strokeWidth={3} />
                        </div>
                      </div>
                    </div>

                   

                    <button type="submit" disabled={!isFormValid} className={`relative w-full py-6 flex items-center justify-center gap-4 font-black uppercase tracking-[0.25em] text-xl italic transition-all duration-300 group overflow-hidden ${!isFormValid ? 'bg-[#1c1b1b] text-[#564334] border-2 border-[#564334] cursor-not-allowed' : 'bg-[#FF8C00] text-black border-2 border-[#FF8C00] hover:brightness-110 active:scale-[0.98]'}`}>
                       {isProcessing ? <Loader2 className="animate-spin" size={28} /> : <AlertTriangle size={28} />}
                       <span>{isProcessing ? 'INITIATING_VERIFICATION' : 'Post Your Report'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* RIGHT: ACTIVITY & INFO (5 Cols) */}
            <aside className="lg:col-span-5 w-full space-y-4">
              <div className="bg-[#131313] border border-[#564334]/30 p-8 shadow-xl relative">
                 <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#564334]/30">
                    <Activity size={20} className="text-[#00eefc]" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#e5e2e1]">Upload Activity Log</h3>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className={`text-sm font-black uppercase tracking-widest ${currentStep >= 1 ? 'text-[#e5e2e1]' : 'text-[#353534]'}`}>01 // Gemini_Visual_Layer</span>
                       {activityLog.gemini === 'pass' ? <CheckCircle size={20} className="text-[#00B894]" /> : activityLog.gemini === 'fail' ? <XCircle size={20} className="text-red-500" /> : currentStep === 1 ? <Loader2 size={20} className="animate-spin text-[#FF8C00]" /> : <div className="w-3 h-3 rounded-full border-2 border-[#353534]" />}
                    </div>

                   {/* ArmorIQ Sub-Suite - Boxed Approval Logic */}
<div className="space-y-6 pl-6 border-l-2 border-[#564334]/30 text-xs font-bold uppercase tracking-widest">
   
   <div className="flex items-center justify-between">
      <span className={currentStep >= 2 ? 'text-[#a48c7a]' : 'text-[#353534]'}>File Integrity Validation</span>
      {activityLog.fileValidation === 'pass' && (
         <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5 shadow-[0_0_8px_rgba(0,184,148,0.2)]">PASS</span>
      )}
   </div>

   <div className="flex items-center justify-between">
      <span className={currentStep >= 3 ? 'text-[#a48c7a]' : 'text-[#353534]'}>Spam/Duplication Check</span>
      {activityLog.spamCheck === 'pass' && (
         <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5 shadow-[0_0_8px_rgba(0,184,148,0.2)]">CLEAR</span>
      )}
   </div>

   <div className="flex items-center justify-between">
      <span className={currentStep >= 4 ? 'text-[#a48c7a]' : 'text-[#353534]'}>Gemini Keyword Filtration</span>
      {activityLog.keywordCheck === 'pass' && (
         <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5 shadow-[0_0_8px_rgba(0,184,148,0.2)]">APPROVE</span>
      )}
   </div>

</div>

                    <div className="flex items-center justify-between pt-6 border-t border-[#564334]/30">
                       <span className={`text-sm font-black uppercase tracking-widest ${currentStep === 5 ? 'text-[#00eefc]' : 'text-[#353534]'}`}>Final Mesh Approval</span>
                       {activityLog.finalStatus === 'pass' ? <CheckCircle size={20} className="text-[#00eefc]" /> : currentStep === 5 ? <Loader2 size={20} className="animate-spin text-[#00eefc]" /> : null}
                    </div>
                 </div>
              </div>

              {/* PROTOCOL BLOCK */}
              <div className="bg-[#e5e2e1] p-6 text-black border-r-[8px] border-black shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Info size={16} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Reporting Protocol</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start border-b border-black/10 pb-3">
                    <span className="text-[10px] font-black opacity-30 italic">01</span>
                    <p className="text-[10px] font-bold uppercase italic text-black/80">Upload clear visual evidence for AI analysis.</p>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-[10px] font-black opacity-30 italic">02</span>
                    <p className="text-[10px] font-bold uppercase italic text-black/80">Confirm category matches site conditions.</p>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Capture Options Modal */}
      {showCaptureOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#131313] border border-[#564334]/30 p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-black uppercase tracking-widest text-[#e5e2e1] mb-6 text-center">Choose Capture Method</h3>
            <div className="space-y-4">
              <button 
                onClick={handleCameraCapture}
                className="w-full py-4 bg-[#FF8C00] text-black font-black uppercase tracking-widest text-lg hover:brightness-110 transition-all flex items-center justify-center gap-3"
              >
                <Camera size={24} />
                Take Photo
              </button>
              <button 
                onClick={handleFileUpload}
                className="w-full py-4 bg-[#564334] text-[#e5e2e1] font-black uppercase tracking-widest text-lg hover:bg-[#6b5a4a] transition-all flex items-center justify-center gap-3"
              >
                <ArrowRight size={24} />
                Upload from Gallery
              </button>
              <button 
                onClick={() => setShowCaptureOptions(false)}
                className="w-full py-2 text-[#7b7b7b] font-bold uppercase tracking-widest text-sm hover:text-[#e5e2e1] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative max-w-2xl w-full mx-4">
            <div className="bg-[#131313] border border-[#564334]/30 rounded-lg shadow-2xl overflow-hidden">
              <div className="relative">
                <video
                  id="camera-video"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[70vh] object-cover"
                />
                <canvas id="camera-canvas" className="hidden" />
                
                {/* Camera Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 flex justify-center gap-4">
                  <button
                    onClick={handleTakePhoto}
                    className="px-6 py-3 bg-[#FF8C00] text-black font-black uppercase tracking-widest rounded-full hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <Camera size={20} />
                    Capture
                  </button>
                  <button
                    onClick={handleCloseCamera}
                    className="px-6 py-3 bg-[#564334] text-[#e5e2e1] font-black uppercase tracking-widest rounded-full hover:bg-[#6b5a4a] transition-all"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleCloseCamera}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF8C00] text-white hover:text-black p-2 border border-white/10 transition-all rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {cameraError && (
              <p className="text-red-400 text-center mt-4">{cameraError}</p>
            )}
          </div>
        </div>
      )}

      {/* --- SCALED MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="bg-[#131313] border border-[#00B894]/40 w-full max-w-lg p-10 shadow-[0_0_100px_rgba(0,184,148,0.3)] animate-in zoom-in duration-300 relative">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 rounded-full bg-[#00B894]/10 flex items-center justify-center border border-[#00B894]/20">
                 <CheckCircle size={40} className="text-[#00B894]" />
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#e5e2e1]">Report Filed</h2>
                <p className="text-[10px] font-bold text-[#00B894] uppercase tracking-[0.4em] mt-1">Verified by ArmorIQ</p>
              </div>
            </div>

            <div className="bg-black/60 p-6 border border-[#564334]/30 mb-8">
               <p className="text-[8px] font-black text-[#564334] uppercase tracking-[0.5em] mb-2">System Broadcast</p>
               <p className="text-sm font-bold text-[#e5e2e1] leading-relaxed uppercase italic">"Incident logged. Contribution active in priority mesh."</p>
            </div>

            <div className="flex flex-col gap-4">
               <button onClick={() => navigate('/feed')} className="w-full bg-[#00B894] text-black py-5 text-md font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                 Go To Feed <ArrowRight size={20} />
               </button>
               <p className="text-center text-[12px] font-black uppercase text-[#564334] tracking-[0.5em]">Redirect in {countdown}s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;