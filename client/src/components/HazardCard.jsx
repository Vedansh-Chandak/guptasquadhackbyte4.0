import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Share2, MessageSquare, Send, User, Camera, Upload, X, Loader2, Check } from 'lucide-react'; 
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext'; // Ensure this path is correct

function HazardCard({ hazard, onUpdate }) {
  const navigate = useNavigate();
  const { user } = useAuth(); // <--- CRITICAL: This was likely missing or unused
  
  const [localHazard, setLocalHazard] = useState(hazard);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(localHazard.comments || []);

  // UI Interaction States
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Officer Resolve States
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalHazard(hazard);
  }, [hazard]);

  // ─── Camera Handlers ──────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Unable to access camera. Please use the upload option instead.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], `proof-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setProofImage(file);
        setProofImageUrl(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleProofImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      setProofImageUrl(URL.createObjectURL(file));
    }
  };

  const handleResolveHazard = async () => {
    if (!proofImage) {
      alert('Please provide a proof image');
      return;
    }

    setIsResolving(true);
    try {
      const formData = new FormData();
      formData.append('proof_image', proofImage);

      const response = await api.patch(`/hazards/${localHazard._id}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        // Update local state
        setLocalHazard(prev => ({ 
          ...prev, 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          repair_image_url: response.data.hazard?.repair_image_url
        }));
        
        // Notify parent
        onUpdate(localHazard._id, 'status', 'resolved');
        
        // Close modal
        setShowResolveModal(false);
        setProofImage(null);
        setProofImageUrl(null);
      }
    } catch (error) {
      console.error('Resolve failed:', error);
      alert(error.response?.data?.message || 'Failed to resolve hazard');
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (isUpvoting) return;
    setIsUpvoting(true);
    
    const isRemoving = hasUpvoted;
    const currentCount = localHazard.counter?.upvotes || 0;
    const optimisticCount = isRemoving ? currentCount - 1 : currentCount + 1;
    
    // Optimistic UI update
    setLocalHazard(prev => ({ ...prev, counter: { ...prev.counter, upvotes: optimisticCount } }));
    setHasUpvoted(!isRemoving);
    
    try {
      console.log(`Sending ${isRemoving ? 'unvote' : 'upvote'} request for hazard ${localHazard._id}`);
      const response = await api.patch(`/hazards/${localHazard._id}/upvote`);
      console.log('Upvote API response:', response.data);
      
      // Save server canonical response to state
      if (response.data.success && response.data.counter) {
        setLocalHazard(prev => ({ ...prev, counter: response.data.counter }));
        setHasUpvoted(response.data.user_has_upvoted);
      }
      
      // Notify parent
      onUpdate(localHazard._id, 'counter', response.data.counter);
    } catch (error) {
      console.error('Upvote failed:', error);
      
      // Error rollback - revert optimistic update
      setLocalHazard(prev => ({ ...prev, counter: { ...prev.counter, upvotes: currentCount } }));
      setHasUpvoted(isRemoving);
      
      alert(error.response?.data?.message || 'Failed to update upvote');
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleCommentToggle = (e) => {
    e.stopPropagation();
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);

    try {
      const response = await api.post(`/hazards/${localHazard._id}/comments`, {
        text: commentText.trim()
      });

      if (response.data.success) {
        // Update comments and counter from backend response
        if (response.data.comment) {
          const newComment = {
            ...response.data.comment,
            id: response.data.comment._id,
            user: response.data.comment.user_id?.name || "Anonymous",
            text: response.data.comment.text,
            timestamp: new Date(response.data.comment.createdAt).toLocaleString()
          };
          setComments([newComment, ...comments]);
        }

        // Update counter from backend
        if (response.data.counter) {
          setLocalHazard(prev => ({ ...prev, counter: response.data.counter }));
          onUpdate(localHazard._id, 'counter', response.data.counter);
        }

        setCommentText("");
      }
    } catch (error) {
      console.error('Comment submission failed:', error);

      if (error.response?.status === 403 && error.response?.data?.message?.includes('COMMENT_BLOCKED')) {
        alert(`Comment blocked by ArmorIQ: ${error.response.data.message}`);
      } else {
        alert(error.response?.data?.message || 'Failed to post comment. Please try again.');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/hazard/${localHazard._id}`);
  };

  return (
    <article className="bg-[#131313] border border-[#564334]/20 group hover:border-[#FF8C00]/40 transition-all cursor-default overflow-hidden mb-4 flex flex-col">
      <div className="flex flex-col md:flex-row h-auto md:h-64 border-b border-[#564334]/10">
        <div className="md:w-1/3 h-52 md:h-full relative overflow-hidden bg-black shrink-0">
          <img 
            alt="Hazard Preview" 
            className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" 
            src={localHazard.image_url || 'https://via.placeholder.com/400x300'} 
          />
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] shadow-lg ${
              localHazard.status === 'resolved' ? 'bg-[#00B894] text-black' : 'bg-black/80 text-[#FF8C00] border border-[#FF8C00]/20'
            }`}>
              {localHazard.status || 'OPEN'}
            </span>
          </div>
        </div>

        <div className="md:w-2/3 p-6 flex flex-col justify-between relative">
          <div onClick={() => navigate(`/hazard/${localHazard._id}`)} className="cursor-pointer">
             <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                 <span className="px-2 py-0.5 bg-[#FF8C00] text-black text-[9px] font-black tracking-widest uppercase">
                   {localHazard.type || 'HAZARD'}
                 </span>
                 <span className="text-[10px] font-bold text-[#564334] uppercase tracking-tighter">
                   REF_{localHazard._id?.slice(-5).toUpperCase() || 'NULL'}
                 </span>
               </div>
               <span className="text-[10px] font-bold text-[#564334] uppercase italic">
                   Sector_7G
                 </span>
             </div>
             <h3 className="text-lg font-bold text-[#e5e2e1] mb-2 uppercase line-clamp-1 group-hover:text-[#FF8C00] transition-colors leading-tight">
               {localHazard.description || 'HAZARD'} DETECTED
             </h3>
             <p className="text-[#e5e2e1]/60 text-xs leading-relaxed line-clamp-2 italic border-l border-[#FF8C00]/30 pl-3">
               {localHazard.type}
             </p>
          </div>

          <div className="flex items-center justify-between border-t border-[#564334]/20 pt-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <button onClick={handleUpvote} className={`flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase transition-all border ${hasUpvoted ? 'border-[#00eefc] text-[#00eefc] bg-[#00eefc]/5' : 'bg-[#0a0a0a] border-transparent text-[#564334] hover:text-[#e5e2e1]'}`}>
                <ArrowUp size={12} strokeWidth={3} /> 
                <span className="hidden sm:inline">UPVOTE</span>
                <span>{localHazard.counter?.upvotes || 0}</span>
              </button>
              <button onClick={handleCommentToggle} className={`flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase transition-all border ${showComments ? 'border-[#FF8C00] text-[#FF8C00] bg-[#FF8C00]/5' : 'bg-[#0a0a0a] border-transparent text-[#564334] hover:text-[#e5e2e1]'}`}>
                <MessageSquare size={12} strokeWidth={3} /> 
                <span className="hidden sm:inline">COMMENT</span>
                <span>{localHazard.counter?.comments || 0}</span>
              </button>
              
              {/* Officer Resolve Button */}
              {user?.is_official && localHazard.status === 'active' && (
                <button 
                  onClick={() => setShowResolveModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase transition-all border bg-[#0a0a0a] border-[#00B894] text-[#00B894] hover:bg-[#00B894]/10"
                >
                  <Check size={12} strokeWidth={3} /> 
                  <span className="hidden sm:inline">RESOLVE</span>
                </button>
              )}
              
              {/* Show Resolved Badge for Officers on Resolved Hazards */}
              {user?.is_official && localHazard.status === 'resolved' && (
                <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase bg-[#00B894] text-black rounded">
                  <Check size={12} strokeWidth={3} /> 
                  <span>RESOLVED</span>
                </div>
              )}
            </div>
            <button onClick={handleShareClick} className="p-2 text-[#564334] hover:text-[#FF8C00] transition-colors">
               <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="bg-[#0a0a0a] border-t border-[#564334]/30 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAddComment} className="p-4 border-b border-[#564334]/10 flex gap-3">
             <div className="w-8 h-8 bg-[#1A1A1A] border border-[#564334]/30 flex items-center justify-center shrink-0">
                <User size={14} className="text-[#564334]" />
             </div>
             <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="ADD TACTICAL INTEL..." 
                className="flex-grow bg-[#131313] border-none text-[11px] font-bold uppercase tracking-wider text-[#e5e2e1] placeholder:text-[#353534] focus:ring-1 focus:ring-[#FF8C00] transition-all px-4"
             />
             <button 
                type="submit" 
                disabled={isSubmittingComment || !commentText.trim()}
                className={`p-2 transition-all ${isSubmittingComment ? 'text-[#564334]' : 'text-[#FF8C00] hover:scale-110'}`}
             >
                {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
             </button>
          </form>
          <div className="max-h-48 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {comments.length > 0 ? comments.map(cmt => (
              <div key={cmt.id} className="flex gap-3 group/cmt">
                 <div className="w-1 h-auto bg-[#FF8C00]/20 group-hover/cmt:bg-[#FF8C00] transition-colors shrink-0" />
                 <div className="space-y-1">
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-[#FF8C00] uppercase tracking-widest">{cmt.user}</span>
                       <span className="text-[8px] font-bold text-[#353534]">{cmt.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#a48c7a] font-medium leading-tight uppercase italic">{cmt.text}</p>
                 </div>
              </div>
            )) : (
              <p className="text-[9px] text-[#353534] font-black text-center uppercase tracking-[0.3em] py-4">No active intel threads.</p>
            )}
          </div>
        </div>
      )}

      {/* Officer Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-[#564334]/50 rounded-lg max-w-md w-full p-6 space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase text-[#e5e2e1]">RESOLVE HAZARD</h2>
              <button 
                onClick={() => {
                  setShowResolveModal(false);
                  setProofImage(null);
                  setProofImageUrl(null);
                  stopCamera();
                }}
                className="p-1 hover:bg-[#564334]/20 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Proof Image Preview */}
            {proofImageUrl && (
              <div className="relative w-full">
                <img 
                  src={proofImageUrl} 
                  alt="Proof" 
                  className="w-full h-64 object-cover border border-[#564334]/30 rounded"
                />
                <button
                  onClick={() => {
                    setProofImage(null);
                    setProofImageUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-black/80 p-1 rounded hover:bg-black transition-colors"
                >
                  <X size={18} className="text-[#FF8C00]" />
                </button>
              </div>
            )}

            {/* Camera View */}
            {showCamera && !proofImageUrl && (
              <div className="relative w-full space-y-4">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full h-64 bg-black object-cover border border-[#564334]/30 rounded"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-3">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-[#00B894] text-black px-4 py-2 rounded font-black uppercase text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> CAPTURE
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-[#564334]/30 text-[#e5e2e1] px-4 py-2 rounded font-black uppercase text-sm hover:bg-[#564334]/50 transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Upload/Capture Options */}
            {!proofImageUrl && !showCamera && (
              <div className="space-y-3">
                <button
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-2 bg-[#00B894]/10 border border-[#00B894] text-[#00B894] px-4 py-3 rounded font-black uppercase hover:bg-[#00B894]/20 transition-all"
                >
                  <Camera size={16} /> TAKE PHOTO
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF8C00]/10 border border-[#FF8C00] text-[#FF8C00] px-4 py-3 rounded font-black uppercase hover:bg-[#FF8C00]/20 transition-all"
                >
                  <Upload size={16} /> UPLOAD PHOTO
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProofImageUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Proof Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#564334]">Hazard Details</label>
              <div className="bg-[#0a0a0a] border border-[#564334]/20 p-3 rounded text-[10px] space-y-1">
                <p><span className="text-[#FF8C00] font-black">Type:</span> {localHazard.type}</p>
                <p><span className="text-[#FF8C00] font-black">Location:</span> ({localHazard.lat?.toFixed(4)}, {localHazard.long?.toFixed(4)})</p>
                <p><span className="text-[#FF8C00] font-black">Status:</span> {localHazard.status}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setProofImage(null);
                  setProofImageUrl(null);
                  stopCamera();
                }}
                disabled={isResolving}
                className="flex-1 bg-[#564334]/30 text-[#e5e2e1] px-4 py-3 rounded font-black uppercase text-sm hover:bg-[#564334]/50 transition-all disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                onClick={handleResolveHazard}
                disabled={!proofImage || isResolving}
                className="flex-1 bg-[#00B894] text-black px-4 py-3 rounded font-black uppercase text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResolving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> RESOLVING...
                  </>
                ) : (
                  <>
                    <Check size={16} /> CONFIRM RESOLUTION
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default HazardCard;