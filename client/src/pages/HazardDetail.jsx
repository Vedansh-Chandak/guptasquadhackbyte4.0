import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import mockApi from '../api/mockApi'
import { useAuth } from '../contexts/AuthContext'
import { ArrowUp, CheckCircle, Check, User, Send } from 'lucide-react'

function HazardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hazard, setHazard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isUpvoting, setIsUpvoting] = useState(false)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const [proofImage, setProofImage] = useState(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')

  useEffect(() => {
    fetchHazard()
    fetchComments()
  }, [id])

  const fetchHazard = async () => {
    try {
      const response = await api.get(`/hazards/${id}`)
      if (response.data.success) {
        setHazard(response.data.hazard)
      }
    } catch (error) {
      console.error('Error fetching hazard from real API:', error)
      console.log('Switching to mock data...')
      
      try {
        const mockResponse = await mockApi.getHazardById(id)
        if (mockResponse.success) {
          setHazard(mockResponse.data)
        }
      } catch (mockError) {
        console.error('Error fetching mock hazard:', mockError)
      } finally {
        setLoading(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    setCommentsLoading(true)
    try {
      const response = await api.get(`/hazards/${id}/comments`)
      if (response.data.success) {
        setComments(response.data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const handlePostComment = async () => {
    if (!commentText.trim()) {
      setCommentError('Comment cannot be empty.')
      return
    }

    setIsSubmittingComment(true)
    setCommentError('')

    try {
      const response = await api.post(`/hazards/${id}/comments`, { text: commentText.trim() })
      if (response.data.success) {
        setCommentText('')
        await fetchComments()
      } else {
        setCommentError(response.data.message || 'Could not post comment')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      setCommentError(error.response?.data?.message || 'Could not post comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleConfirm = async () => {
    if (isConfirming) return
    
    setIsConfirming(true)
    try {
      const response = await api.patch(`/hazards/${hazard._id}/upvote`)
      if (response.data.success) {
        // Server returns upvote_count and priority_score
        setHazard(prev => ({
          ...prev,
          upvotes: response.data.upvote_count ?? (prev.upvotes + 1),
          priority_score: response.data.priority_score ?? prev.priority_score,
        }))
      }
    } catch (error) {
      console.error('Error confirming hazard:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleUpvote = async () => {
    if (isUpvoting) return
    
    setIsUpvoting(true)
    try {
      const response = await api.patch(`/hazards/${hazard._id}/upvote`)
      if (response.data.success) {
        setHazard(prev => ({
          ...prev,
          upvotes: response.data.upvote_count ?? prev.upvotes,
          priority_score: response.data.priority_score ?? prev.priority_score,
        }))
      }
    } catch (error) {
      console.error('Error upvoting hazard:', error)
    } finally {
      setIsUpvoting(false)
    }
  }

  const handleResolve = async () => {
    if (isResolving || !proofImage) {
      if (!proofImage) setResolveError('Proof image is required for resolution');
      return
    }

    setIsResolving(true)
    setResolveError('')

    const formData = new FormData()
    formData.append('proof_image', proofImage)

    try {
      const response = await api.patch(`/hazards/${hazard._id}/resolve`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setHazard(prev => ({ ...prev, status: 'resolved', resolved_at: response.data.hazard?.resolved_at || prev.resolved_at }))
      } else {
        setResolveError(response.data.message || 'Could not resolve hazard')
      }
    } catch (error) {
      console.error('Error resolving hazard:', error)
      setResolveError(error.response?.data?.message || 'Could not resolve hazard')
    } finally {
      setIsResolving(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryPillClass = (category) => {
    const colors = {
      'pothole': 'bg-red-100 text-red-800',
      'garbage': 'bg-purple-100 text-purple-800',
      'waterlogging': 'bg-blue-100 text-blue-800',
      'road_damage': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Space_Grotesk'] pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="animate-pulse">
            <div className="bg-[#131313] border border-[#564334]/20 rounded-lg overflow-hidden mb-4 flex flex-col">
              <div className="p-6">
                <div className="h-64 bg-[#0a0a0a] rounded mb-4"></div>
                <div className="h-4 bg-[#564334] rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-[#564334] rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-[#564334] rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hazard) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Space_Grotesk'] pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="text-center py-12">
            <p className="text-[#564334]">Hazard not found</p>
            <button 
              onClick={() => navigate('/feed')}
              className="mt-4 px-8 py-3 bg-[#FF8C00] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
            >
              BACK TO FEED
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Space_Grotesk'] pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      <div className="max-w-[1400px] mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8 border-b border-[#564334]/20 pb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-[#e5e2e1]">Hazard Detail</h1>
            <p className="text-[10px] font-bold text-[#FF8C00] tracking-[0.4em] mt-2 uppercase">REF_{hazard._id?.slice(-5).toUpperCase() || 'NULL'}</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-[#564334]/50 text-[10px] font-black uppercase tracking-widest hover:bg-[#1c1b1b] transition-all"
          >
            ← BACK
          </button>
        </div>
        
        {/* MAIN HAZARD CARD */}
        <article className="bg-[#131313] border border-[#564334]/20 group hover:border-[#FF8C00]/40 transition-all cursor-default overflow-hidden mb-8 flex flex-col">
          <div className="flex flex-col md:flex-row h-auto md:h-96 border-b border-[#564334]/10">
            <div className="md:w-1/2 h-64 md:h-full relative overflow-hidden bg-black shrink-0">
              <img 
                alt="Hazard Preview" 
                className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" 
                src={hazard.image_url || 'https://via.placeholder.com/400x300'} 
              />
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] shadow-lg ${
                  hazard.status === 'resolved' ? 'bg-[#00B894] text-black' : 'bg-black/80 text-[#FF8C00] border border-[#FF8C00]/20'
                }`}>
                  {hazard.status || 'OPEN'}
                </span>
              </div>
            </div>

            <div className="md:w-1/2 p-8 flex flex-col justify-between relative">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#FF8C00] text-black text-[9px] font-black tracking-widest uppercase">
                      {hazard.type || 'HAZARD'}
                    </span>
                    <span className="text-[10px] font-bold text-[#564334] uppercase tracking-tighter">
                      Sector_7G
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#564334] uppercase italic">
                    {new Date(hazard.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-[#e5e2e1] mb-4 uppercase line-clamp-1 group-hover:text-[#FF8C00] transition-colors leading-tight">
                  {hazard.type || 'HAZARD'} DETECTED
                </h2>
                
                <p className="text-[#e5e2e1]/60 text-sm leading-relaxed italic border-l border-[#FF8C00]/30 pl-4 mb-6">
                  {hazard.description}
                </p>

                {/* AI Analysis Section */}
                <div className="bg-[#0a0a0a] border border-[#564334]/30 rounded p-4 mb-6">
                  <h3 className="text-lg font-bold text-[#FF8C00] mb-3 uppercase tracking-wider">AI Analysis</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#564334] font-bold">Severity:</span>
                      <span className={`ml-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] ${
                        hazard.ai_severity >= 7 ? 'bg-red-900/50 text-red-400 border border-red-400/30' :
                        hazard.ai_severity >= 4 ? 'bg-amber-900/50 text-amber-400 border border-amber-400/30' :
                        'bg-green-900/50 text-green-400 border border-green-400/30'
                      }`}>
                        {hazard.ai_severity}/10
                      </span>
                    </div>
                    <div>
                      <span className="text-[#564334] font-bold">Priority:</span>
                      <span className="ml-2 text-[#e5e2e1] font-bold">{hazard.priority_score}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-[#564334]/20 pt-6 mt-6">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleUpvote}
                    disabled={isUpvoting}
                    className={`flex items-center gap-2 px-4 py-2 text-[9px] font-black tracking-widest uppercase transition-all border ${
                      isUpvoting ? 'border-[#00eefc]/50 text-[#00eefc]/50' : 'bg-[#0a0a0a] border-transparent text-[#564334] hover:text-[#e5e2e1] hover:border-[#00eefc]/30'
                    }`}
                  >
                    <ArrowUp size={12} strokeWidth={3} /> 
                    <span className="hidden sm:inline">UPVOTE</span>
                    <span>{hazard.counter?.upvotes || hazard.upvotes || 0}</span>
                  </button>
                  
                  <button 
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className={`flex items-center gap-2 px-4 py-2 text-[9px] font-black tracking-widest uppercase transition-all border ${
                      isConfirming ? 'border-[#00B894]/50 text-[#00B894]/50' : 'bg-[#0a0a0a] border-transparent text-[#564334] hover:text-[#e5e2e1] hover:border-[#00B894]/30'
                    }`}
                  >
                    <CheckCircle size={12} strokeWidth={3} /> 
                    <span className="hidden sm:inline">CONFIRM</span>
                    <span>{hazard.counter?.confirmations || hazard.confirmations || 0}</span>
                  </button>

                  {/* Officer Resolve Button */}
                  {user?.is_official && hazard.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <label className="text-[8px] font-bold text-[#564334] uppercase tracking-wider">PROOF:</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                        className="text-[8px] bg-[#0a0a0a] border border-[#564334]/30 text-[#e5e2e1] rounded px-2 py-1"
                      />
                      <button 
                        onClick={handleResolve}
                        disabled={isResolving || !proofImage}
                        className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase transition-all border bg-[#0a0a0a] border-[#00B894] text-[#00B894] hover:bg-[#00B894]/10 disabled:opacity-50"
                      >
                        <Check size={12} strokeWidth={3} /> 
                        <span className="hidden sm:inline">RESOLVE</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Show Resolved Badge for Officers on Resolved Hazards */}
                  {user?.is_official && hazard.status === 'resolved' && (
                    <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-widest uppercase bg-[#00B894] text-black rounded">
                      <Check size={12} strokeWidth={3} /> 
                      RESOLVED
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-[#0a0a0a] border-t border-[#564334]/30">
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-6 uppercase tracking-wider">Intelligence Reports</h3>
              
              {/* Add Comment Form */}
              <form onSubmit={(e) => { e.preventDefault(); handlePostComment(); }} className="mb-6 border-b border-[#564334]/20 pb-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#1A1A1A] border border-[#564334]/30 flex items-center justify-center shrink-0 rounded">
                    <User size={16} className="text-[#564334]" />
                  </div>
                  <div className="flex-grow">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="ADD TACTICAL INTEL..." 
                      className="w-full bg-[#131313] border border-[#564334]/30 text-[11px] font-bold uppercase tracking-wider text-[#e5e2e1] placeholder:text-[#353534] focus:ring-1 focus:ring-[#FF8C00] focus:border-[#FF8C00] transition-all px-4 py-3 rounded resize-none"
                      rows="3"
                      maxLength="300"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[8px] text-[#564334] font-bold">{commentText.length}/300</span>
                      <button 
                        type="submit" 
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="px-4 py-2 bg-[#FF8C00] text-black text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 rounded"
                      >
                        {isSubmittingComment ? 'POSTING...' : 'POST INTEL'}
                      </button>
                    </div>
                    {commentError && <p className="text-[10px] text-red-400 mt-1">{commentError}</p>}
                  </div>
                </div>
              </form>
              
              {/* Comments List */}
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-[#564334] font-bold uppercase tracking-wider">Loading intelligence...</p>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment._id} className="flex gap-4 group/comment">
                      <div className="w-1 h-auto bg-[#FF8C00]/20 group-hover/comment:bg-[#FF8C00] transition-colors shrink-0 rounded" />
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[9px] font-black text-[#FF8C00] uppercase tracking-widest">
                            {comment.user_id?.name || 'ANONYMOUS'}
                            {comment.user_id?.is_official && <span className="ml-2 text-[7px] bg-[#00B894] text-black px-1 py-0.5 rounded font-black">OFFICIAL</span>}
                          </span>
                          <span className="text-[8px] font-bold text-[#353534] uppercase">
                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#a48c7a] font-medium leading-tight uppercase italic">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-[#353534] font-black text-center uppercase tracking-[0.3em]">No active intel threads.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

export default HazardDetail