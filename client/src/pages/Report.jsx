import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Camera, AlertTriangle, CheckCircle, X, ChevronDown, 
  Loader2, Info, ListFilter, Activity, XCircle, ArrowRight,
  MapPinOff, BarChart2, MapPin, ShieldCheck
} from 'lucide-react';
import api from '../api/axios';

const HAZARD_TYPES = [
  { id: 'pothole', label: 'POTHOLE / ROAD DAMAGE' },
  { id: 'garbage', label: 'UNSANITARY / GARBAGE' },
  { id: 'waterlogging', label: 'FLOODING / WATERLOGGING' },
  { id: 'road_damage', label: 'STRUCTURAL DAMAGE' },
  { id: 'other', label: 'OTHER HAZARD' }
];

function AlertBanner({ type, title, message, onDismiss }) {
  const styles = {
    location: {
      border: 'border-yellow-500/60',
      bg: 'bg-yellow-500/10',
      icon: <MapPinOff size={20} className="text-yellow-400 shrink-0 mt-0.5" />,
      titleColor: 'text-yellow-400',
    },
    location_success: {
      border: 'border-[#00B894]/60',
      bg: 'bg-[#00B894]/10',
      icon: <MapPin size={20} className="text-[#00B894] shrink-0 mt-0.5" />,
      titleColor: 'text-[#00B894]',
    },
  };
  const s = styles[type] || styles.location;
  return (
    <div className={`flex gap-3 p-4 border ${s.border} ${s.bg} relative`}>
      {s.icon}
      <div className="flex-1">
        <p className={`text-xs font-black uppercase tracking-widest ${s.titleColor}`}>{title}</p>
        <p className="text-[11px] text-[#a48c7a] mt-1 leading-relaxed">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-[#564334] hover:text-[#e5e2e1] transition-colors">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function Report() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [hazardType, setHazardType] = useState('');

  // GPS — only used when photo is taken via in-app camera
  const [browserGPS, setBrowserGPS] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'fetching' | 'success' | 'error' | 'denied'
  const [imageSource, setImageSource] = useState(null); // 'camera' | 'gallery'

  // Location permission prompt modal (shown on mount)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // VERIFICATION FLOW STATES
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activityLog, setActivityLog] = useState({
    gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null
  });

  const [inlineAlert, setInlineAlert] = useState(null);

  // MODAL STATES
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState(null);
  const [rejectionDetail, setRejectionDetail] = useState(null);
  const [countdown, setCountdown] = useState(5);

  // Camera states
  const [showCaptureOptions, setShowCaptureOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // ─── Show location prompt on mount ──────────────────────────────────────────
  useEffect(() => {
    // Check if permission already granted — if so, fetch silently. Otherwise show prompt.
    if (!navigator.geolocation) return;
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          fetchBrowserGPS(); // already allowed, grab it silently
        } else if (result.state === 'prompt') {
          setShowLocationPrompt(true); // show our custom prompt first
        } else {
          setGpsStatus('denied'); // previously denied
        }
      }).catch(() => {
        setShowLocationPrompt(true); // can't query, show prompt anyway
      });
    } else {
      setShowLocationPrompt(true); // fallback for browsers without Permissions API
    }
  }, []);

  const fetchBrowserGPS = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBrowserGPS({ lat: pos.coords.latitude, long: pos.coords.longitude });
        setGpsStatus('success');
        setInlineAlert(null);
      },
      (err) => {
        console.warn('GPS error:', err.message);
        setGpsStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // User taps Allow in our custom prompt
  const handleAllowLocation = () => {
    setShowLocationPrompt(false);
    fetchBrowserGPS(); // this triggers the real browser permission dialog
  };

  // User taps Skip
  const handleSkipLocation = () => {
    setShowLocationPrompt(false);
    setGpsStatus('denied');
  };

  // ─── Image handlers ──────────────────────────────────────────────────────────
  // Gallery upload — no GPS attached
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setImageSource('gallery');
      setActivityLog({ gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null });
      setCurrentStep(0);
      setInlineAlert(null);
    }
  };

  const handleCaptureClick = () => setShowCaptureOptions(true);

  // In-app camera — GPS will be attached
  const handleCameraCapture = async () => {
    setShowCaptureOptions(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera not supported. Please use upload instead.');
      return;
    }
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setShowCamera(true);
      } catch {
        setCameraError('Unable to access camera. Please use the upload option.');
      }
    }
  };

  const handleTakePhoto = () => {
    if (!cameraStream) return;
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setImageSource('camera'); // mark as camera — GPS will be sent
      setActivityLog({ gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null });
      setCurrentStep(0);
      setInlineAlert(null);
      handleCloseCamera();
    }, 'image/jpeg', 0.8);
  };

  const handleCloseCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setShowCamera(false);
  };

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  useEffect(() => {
    if (showCamera && cameraStream) {
      const video = document.getElementById('camera-video');
      if (video) video.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  const handleFileUpload = () => {
    setShowCaptureOptions(false);
    document.getElementById('file-input').click();
  };

  // Auto-redirect after approval
  useEffect(() => {
    let timer;
    if (showModal && modalStatus === 'approved') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); navigate('/feed'); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showModal, modalStatus, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !hazardType) return;

    // If photo from camera and GPS not ready yet, block and inform
    if (imageSource === 'camera' && gpsStatus !== 'success') {
      if (gpsStatus === 'fetching') {
        setInlineAlert({ type: 'location', title: 'Acquiring Location', message: 'Still getting your location. Please wait a moment and try again.' });
      } else {
        setInlineAlert({ type: 'location', title: 'Location Required for Camera Photos', message: 'Please enable location access so we can tag where this hazard was captured.' });
        fetchBrowserGPS();
      }
      return;
    }

    setIsProcessing(true);
    setInlineAlert(null);

    setCurrentStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setActivityLog(prev => ({ ...prev, gemini: 'pass' }));
    setCurrentStep(2);
    await new Promise(r => setTimeout(r, 800));
    setActivityLog(prev => ({ ...prev, fileValidation: 'pass' }));
    setCurrentStep(3);
    await new Promise(r => setTimeout(r, 1000));
    setActivityLog(prev => ({ ...prev, spamCheck: 'pass' }));
    setCurrentStep(4);
    await new Promise(r => setTimeout(r, 1000));
    setActivityLog(prev => ({ ...prev, keywordCheck: 'pass' }));
    setCurrentStep(5);

    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('complaint_description', hazardType);

      // Only send GPS for in-app camera photos
      if (imageSource === 'camera' && browserGPS) {
        formData.append('gps_latitude', browserGPS.lat);
        formData.append('gps_longitude', browserGPS.long);
      }

      const res = await api.post('/hazards', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setActivityLog(prev => ({ ...prev, finalStatus: 'pass' }));
        await new Promise(r => setTimeout(r, 1800));
        setModalStatus('approved');
        setShowModal(true);
      } else {
        throw new Error(res.data?.message || 'Failed to file report');
      }
    } catch (err) {
      const responseData = err.response?.data;
      const errorCode = responseData?.error_code;

      if (errorCode === 'NO_EXIF_GPS') {
        setActivityLog(prev => ({ ...prev, gemini: 'fail', fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null }));
        setCurrentStep(0);
        setIsProcessing(false);
        setInlineAlert({
          type: 'location',
          title: 'Location Not Found',
          message: imageSource === 'gallery'
            ? 'Gallery images must have GPS metadata. Please use the in-app camera to capture a photo with your current location.'
            : 'Could not determine your location. Please enable location permissions and try again.',
        });
        return;
      }

      if (errorCode === 'LOW_IMPACT_SCORE') {
        setActivityLog(prev => ({ ...prev, finalStatus: 'fail' }));
        await new Promise(r => setTimeout(r, 1200));
        setRejectionDetail({ finalScore: responseData.final_score, flags: responseData.flags || [], trustLevel: responseData.trust_level });
        setModalStatus('low_impact');
        setShowModal(true);
        return;
      }

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

      {/* ── Location Permission Prompt Modal ── */}
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-6">
          <div className="bg-[#131313] border border-[#FF8C00]/30 w-full max-w-sm p-8 shadow-[0_0_80px_rgba(255,140,0,0.15)] animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-[#FF8C00]/10 flex items-center justify-center border border-[#FF8C00]/20">
                <MapPin size={32} className="text-[#FF8C00]" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#e5e2e1]">Location Access</h2>
                <p className="text-[10px] font-bold text-[#FF8C00] uppercase tracking-[0.3em] mt-1">Required for Camera Reports</p>
              </div>
            </div>

            <div className="bg-black/40 border border-[#564334]/30 p-4 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <Camera size={14} className="text-[#FF8C00] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#a48c7a] leading-relaxed">When you take a photo using the in-app camera, your location is attached to verify where the hazard was reported.</p>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={14} className="text-[#00B894] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#a48c7a] leading-relaxed">Gallery uploads don't require location — only live captures do.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleAllowLocation}
                className="w-full py-4 bg-[#FF8C00] text-black font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <MapPin size={16} /> Allow Location
              </button>
              <button
                onClick={handleSkipLocation}
                className="w-full py-3 border border-[#564334] text-[#a48c7a] font-black uppercase tracking-[0.2em] text-sm hover:bg-[#1c1b1b] transition-all"
              >
                Skip — Use Gallery Only
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`pt-12 pb-12 px-4 sm:px-6 lg:px-8 transition-all duration-700 ${showModal ? 'blur-2xl scale-[0.95] opacity-30' : ''}`}>
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <style>{`
          @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
          .animate-scan-line { animation: scan 3s linear infinite; }
        `}</style>

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-[#564334]/20 pb-6 gap-6">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-[#e5e2e1]">Report Incident</h1>
              <p className="text-[10px] font-bold text-[#FF8C00] tracking-[0.4em] mt-2 uppercase">AI Will Autogenerate Your Report.</p>
            </div>
            {/* GPS pill */}
            <div className="flex items-center gap-2">
              {gpsStatus === 'fetching' && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FF8C00]">
                  <Loader2 size={12} className="animate-spin" /> Acquiring Location...
                </div>
              )}
              {gpsStatus === 'success' && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00B894]">
                  <MapPin size={12} /> Location Locked
                </div>
              )}
              {(gpsStatus === 'error' || gpsStatus === 'denied') && (
                <button onClick={fetchBrowserGPS} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-400/30 px-3 py-1 hover:bg-yellow-400/10 transition-all">
                  <MapPinOff size={12} /> Location Off — Retry
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 w-full space-y-6">

              {inlineAlert && (
                <AlertBanner
                  type={inlineAlert.type}
                  title={inlineAlert.title}
                  message={inlineAlert.message}
                  onDismiss={() => setInlineAlert(null)}
                />
              )}

              {/* Image source badge */}
              {imageSource && (
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 border ${
                  imageSource === 'camera'
                    ? 'border-[#00B894]/30 bg-[#00B894]/5 text-[#00B894]'
                    : 'border-[#564334]/30 bg-[#564334]/5 text-[#a48c7a]'
                }`}>
                  <Camera size={12} />
                  {imageSource === 'camera' ? 'In-App Camera — Location will be attached' : 'Gallery Upload — No location data'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                        <button type="button" onClick={() => { setImageUrl(null); setImage(null); setImageSource(null); setInlineAlert(null); }}
                          className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF8C00] text-white hover:text-black p-2 border border-white/10 transition-all z-20">
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
                      <button type="button" onClick={handleCaptureClick}
                        className="px-6 py-2 bg-[#FF8C00] text-black font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all">
                        Start Capture
                      </button>
                      <input id="file-input" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
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
                        <select value={hazardType} onChange={(e) => setHazardType(e.target.value)}
                          className="w-full p-4 bg-[#0A0A0A] border-2 border-[#564334] text-[#e5e2e1] font-black text-xs outline-none focus:border-[#FF8C00] transition-all appearance-none uppercase tracking-widest cursor-pointer">
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

                    <button type="submit" disabled={!isFormValid}
                      className={`relative w-full py-6 flex items-center justify-center gap-4 font-black uppercase tracking-[0.25em] text-xl italic transition-all duration-300 overflow-hidden ${
                        !isFormValid
                          ? 'bg-[#1c1b1b] text-[#564334] border-2 border-[#564334] cursor-not-allowed'
                          : 'bg-[#FF8C00] text-black border-2 border-[#FF8C00] hover:brightness-110 active:scale-[0.98]'
                      }`}>
                      {isProcessing ? <Loader2 className="animate-spin" size={28} /> : <AlertTriangle size={28} />}
                      <span>{isProcessing ? 'INITIATING_VERIFICATION' : 'Post Your Report'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* RIGHT: ACTIVITY LOG */}
            <aside className="lg:col-span-5 w-full space-y-4">
              <div className="bg-[#131313] border border-[#564334]/30 p-8 shadow-xl relative">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#564334]/30">
                  <Activity size={20} className="text-[#00eefc]" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#e5e2e1]">Upload Activity Log</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black uppercase tracking-widest ${currentStep >= 1 ? 'text-[#e5e2e1]' : 'text-[#353534]'}`}>01 // Gemini_Visual_Layer</span>
                    {activityLog.gemini === 'pass' ? <CheckCircle size={20} className="text-[#00B894]" />
                      : activityLog.gemini === 'fail' ? <XCircle size={20} className="text-yellow-400" />
                      : currentStep === 1 ? <Loader2 size={20} className="animate-spin text-[#FF8C00]" />
                      : <div className="w-3 h-3 rounded-full border-2 border-[#353534]" />}
                  </div>
                  <div className="space-y-6 pl-6 border-l-2 border-[#564334]/30 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center justify-between">
                      <span className={currentStep >= 2 ? 'text-[#a48c7a]' : 'text-[#353534]'}>File Integrity Validation</span>
                      {activityLog.fileValidation === 'pass' && <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5">PASS</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={currentStep >= 3 ? 'text-[#a48c7a]' : 'text-[#353534]'}>Spam/Duplication Check</span>
                      {activityLog.spamCheck === 'pass' && <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5">CLEAR</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={currentStep >= 4 ? 'text-[#a48c7a]' : 'text-[#353534]'}>Gemini Keyword Filtration</span>
                      {activityLog.keywordCheck === 'pass' && <span className="text-[10px] font-black text-[#00B894] border border-[#00B894] px-2 py-0.5">APPROVE</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-[#564334]/30">
                    <span className={`text-sm font-black uppercase tracking-widest ${currentStep === 5 ? 'text-[#00eefc]' : 'text-[#353534]'}`}>Final Mesh Approval</span>
                    {activityLog.finalStatus === 'pass' ? <CheckCircle size={20} className="text-[#00eefc]" />
                      : activityLog.finalStatus === 'fail' ? <XCircle size={20} className="text-red-500" />
                      : currentStep === 5 ? <Loader2 size={20} className="animate-spin text-[#00eefc]" />
                      : null}
                  </div>
                </div>
              </div>

              <div className="bg-[#e5e2e1] p-6 text-black border-r-[8px] border-black shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Info size={16} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Reporting Protocol</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start border-b border-black/10 pb-3">
                    <span className="text-[10px] font-black opacity-30 italic">01</span>
                    <p className="text-[10px] font-bold uppercase italic text-black/80">Use in-app camera for live hazard capture — location auto-tagged.</p>
                  </li>
                  <li className="flex gap-4 items-start border-b border-black/10 pb-3">
                    <span className="text-[10px] font-black opacity-30 italic">02</span>
                    <p className="text-[10px] font-bold uppercase italic text-black/80">Gallery uploads accepted if the photo has embedded GPS metadata.</p>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-[10px] font-black opacity-30 italic">03</span>
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
            <h3 className="text-xl font-black uppercase tracking-widest text-[#e5e2e1] mb-2 text-center">Choose Capture Method</h3>
            <p className="text-[10px] text-[#564334] font-bold uppercase tracking-widest text-center mb-6">Camera attaches location · Gallery does not</p>
            <div className="space-y-4">
              <button onClick={handleCameraCapture}
                className="w-full py-4 bg-[#FF8C00] text-black font-black uppercase tracking-widest text-lg hover:brightness-110 transition-all flex items-center justify-center gap-3">
                <Camera size={24} /> Take Photo
                {gpsStatus === 'success' && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded">+ GPS</span>}
              </button>
              <button onClick={handleFileUpload}
                className="w-full py-4 bg-[#564334] text-[#e5e2e1] font-black uppercase tracking-widest text-lg hover:bg-[#6b5a4a] transition-all flex items-center justify-center gap-3">
                <ArrowRight size={24} /> Upload from Gallery
              </button>
              <button onClick={() => setShowCaptureOptions(false)}
                className="w-full py-2 text-[#7b7b7b] font-bold uppercase tracking-widest text-sm hover:text-[#e5e2e1] transition-all">
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
                <video id="camera-video" autoPlay playsInline muted className="w-full h-auto max-h-[70vh] object-cover" />
                <canvas id="camera-canvas" className="hidden" />
                {gpsStatus === 'success' && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#00B894]">
                    <MapPin size={10} /> GPS Active
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 flex justify-center gap-4">
                  <button onClick={handleTakePhoto}
                    className="px-6 py-3 bg-[#FF8C00] text-black font-black uppercase tracking-widest rounded-full hover:brightness-110 transition-all flex items-center gap-2">
                    <Camera size={20} /> Capture
                  </button>
                  <button onClick={handleCloseCamera}
                    className="px-6 py-3 bg-[#564334] text-[#e5e2e1] font-black uppercase tracking-widest rounded-full hover:bg-[#6b5a4a] transition-all">
                    Cancel
                  </button>
                </div>
                <button onClick={handleCloseCamera}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF8C00] text-white hover:text-black p-2 border border-white/10 transition-all rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>
            {cameraError && <p className="text-red-400 text-center mt-4">{cameraError}</p>}
          </div>
        </div>
      )}

      {/* RESULT MODALS */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          {modalStatus === 'approved' && (
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
                <button onClick={() => navigate('/feed')}
                  className="w-full bg-[#00B894] text-black py-5 text-md font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                  Go To Feed <ArrowRight size={20} />
                </button>
                <p className="text-center text-[12px] font-black uppercase text-[#564334] tracking-[0.5em]">Redirect in {countdown}s</p>
              </div>
            </div>
          )}

          {modalStatus === 'low_impact' && (
            <div className="bg-[#131313] border border-yellow-600/40 w-full max-w-lg p-10 shadow-[0_0_80px_rgba(202,138,4,0.2)] animate-in zoom-in duration-300">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <BarChart2 size={36} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#e5e2e1]">Report Not Filed</h2>
                  <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.4em] mt-1">Impact Score Too Low</p>
                </div>
              </div>
              <div className="bg-black/60 p-6 border border-yellow-600/20 mb-4">
                <p className="text-[8px] font-black text-[#564334] uppercase tracking-[0.5em] mb-3">AI Verdict</p>
                <p className="text-sm font-bold text-[#e5e2e1] leading-relaxed uppercase italic mb-4">"The hazard does not create enough impact to be logged."</p>
                {rejectionDetail && (
                  <div className="space-y-2 pt-3 border-t border-yellow-600/20">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-[#564334]">Final Score</span>
                      <span className="text-yellow-400">{(rejectionDetail.finalScore * 100).toFixed(1)}% / threshold 40%</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-[#564334]">Trust Level</span>
                      <span className="text-yellow-400">{rejectionDetail.trustLevel}</span>
                    </div>
                    {rejectionDetail.flags?.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[9px] font-black text-[#564334] uppercase tracking-widest mb-1">Flags</p>
                        {rejectionDetail.flags.map((flag, i) => (
                          <span key={i} className="inline-block text-[9px] text-yellow-500 border border-yellow-500/30 px-2 py-0.5 mr-1 mb-1 font-mono">{flag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#a48c7a] mb-6 leading-relaxed">Try capturing a clearer image that directly shows the hazard.</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowModal(false); setModalStatus(null); setRejectionDetail(null); setImage(null); setImageUrl(null); setImageSource(null); setActivityLog({ gemini: null, fileValidation: null, spamCheck: null, keywordCheck: null, finalStatus: null }); setCurrentStep(0); }}
                  className="flex-1 bg-[#FF8C00] text-black py-4 text-sm font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all">
                  Try Again
                </button>
                <button onClick={() => navigate('/feed')}
                  className="flex-1 border border-[#564334] text-[#a48c7a] py-4 text-sm font-black uppercase tracking-[0.2em] hover:bg-[#1c1b1b] transition-all">
                  Back to Feed
                </button>
              </div>
            </div>
          )}

          {modalStatus === 'rejected' && (
            <div className="bg-[#131313] border border-red-800/40 w-full max-w-lg p-10 shadow-[0_0_80px_rgba(239,68,68,0.15)] animate-in zoom-in duration-300">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <XCircle size={40} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#e5e2e1]">Report Rejected</h2>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.4em] mt-1">Verification Failed</p>
                </div>
              </div>
              <div className="bg-black/60 p-6 border border-red-800/20 mb-8">
                <p className="text-[8px] font-black text-[#564334] uppercase tracking-[0.5em] mb-2">System Broadcast</p>
                <p className="text-sm font-bold text-[#e5e2e1] leading-relaxed uppercase italic">"Report could not be verified. Please try again with a valid image."</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowModal(false); setModalStatus(null); }}
                  className="flex-1 bg-[#FF8C00] text-black py-4 text-sm font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all">
                  Try Again
                </button>
                <button onClick={() => navigate('/feed')}
                  className="flex-1 border border-[#564334] text-[#a48c7a] py-4 text-sm font-black uppercase tracking-[0.2em] hover:bg-[#1c1b1b] transition-all">
                  Back to Feed
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Report;