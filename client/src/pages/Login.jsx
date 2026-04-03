import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('citizen'); // 'citizen' or 'official'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    department: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * BACKEND_DEV_NOTE:
   * Google OAuth Handshake & Verification Protocol.
   * 1. On success, the frontend receives an 'id_token' or 'access_token'.
   * 2. This token MUST be sent to the server (POST /auth/google).
   */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const id_token = tokenResponse.id_token || tokenResponse.access_token;
        if (!id_token) {
          throw new Error('Google login token not found');
        }

        const response = await api.post('/auth/google', { id_token });
        if (response.data.success) {
          login(response.data.user, response.data.token);
          navigate('/feed');
        }
      } catch (error) {
        console.error('Google login failed:', error);
        setErrorMessage(error.response?.data?.message || error.message || 'Google login failed');
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setErrorMessage('Google login failed');
    },
  });

  /**
   * BACKEND_DEV_NOTE:
   * Manual Authentication & Security.
   * Endpoint: POST /api/auth/login
   * * SECURITY REQUIREMENTS:
   * - Passwords MUST be hashed using Argon2 or BCrypt on the server.
   * - Implement Rate Limiting (e.g., max 5 attempts per 10 mins) to prevent 
   * brute-force attacks on this terminal.
   * - Respond with 401 (Unauthorized) for invalid credentials but avoid 
   * specifying if it was the email or password that failed to prevent user enumeration.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      if (loginMode === 'official') {
        // Officer Login
        const response = await api.post('/auth/official', {
          username: formData.username,
          password: formData.password,
          department: formData.department,
        });

        if (response.data.success) {
          login(response.data.official, response.data.token);
          navigate('/feed');
        }
      } else {
        // Citizen Login
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });

        if (response.data.success) {
          login(response.data.user, response.data.token);
          navigate('/feed');
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage(error.response?.data?.message || 'Invalid login credentials');
    }
  };

  /**
   * BACKEND_DEV_NOTE:
   * Persistence & Auth State.
   * - After successful authentication, return a JWT (HttpOnly Cookie recommended 
   * for XSS protection) containing user claims (UID, Role).
   * - The frontend AuthContext will expect the user profile (name, image) to 
   * update the dynamic Header dossier.
   */

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Space_Grotesk'] overflow-hidden flex relative">
      {/* Global Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {/* LEFT SIDE: FIELD SENSOR PERSPECTIVE (Hidden on mobile) */}
      <section className="hidden md:flex w-1/2 relative bg-[#0e0e0e] overflow-hidden">
        <img 
          alt="Urban Geometry" 
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-150 opacity-40" 
          src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131313] via-transparent to-transparent opacity-40"></div>
        
        {/* HUD Overlay Elements */}
        <div className="absolute top-12 left-12 border-l-2 border-t-2 border-[#ffb77d] w-24 h-24 opacity-50"></div>
        <div className="absolute bottom-12 right-12 border-r-2 border-b-2 border-[#ffb77d] w-24 h-24 opacity-50"></div>
        
        <div className="absolute bottom-24 left-12 z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 bg-[#FF8C00] animate-pulse"></span>
            
          </div>
          <h2 className="text-6xl font-black text-[#e5e2e1] leading-none tracking-tighter uppercase">
            IDENTIFY.<br/>MAP.<br/>SECURE.
          </h2>
          <p className="text-[#a48c7a] mt-4 text-sm font-medium tracking-widest uppercase">Just Report and get it resolved.</p>
        </div>

        {/* Decorative Scanning Line */}
        <style>{`
          @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
          .animate-scan { animation: scan 6s linear infinite; }
        `}</style>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ff8c00] opacity-20 shadow-[0_0_15px_#FF8C00] animate-scan"></div>
      </section>

      {/* RIGHT SIDE: TACTICAL PAPER DOSSIER */}
      <section className="w-full md:w-1/2 relative flex items-center justify-center bg-[#131313] p-8 md:p-16">
        {/* Local Grain Filter */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-12">
            <div className="inline-block bg-[#FF8C00] text-[#4d2600] px-2 py-0.5 mb-4 text-[10px] font-black tracking-widest uppercase">
              Your Automated Reporting
            </div>
            <h1 className="text-4xl font-black text-[#e5e2e1] tracking-tighter uppercase leading-tight mb-2">
              Access Granted? Log In.
            </h1>
            <div className="h-1 w-24 bg-[#ff8c00]"></div>
            <p className="text-[#564334] mt-6 text-sm leading-relaxed uppercase tracking-wider">
              Verification required to access the feed.
            </p>
          </div>

          {/* Login Mode Toggle */}
          <div className="flex gap-2 mb-8 border-b border-[#564334]/30">
            <button
              type="button"
              onClick={() => {
                setLoginMode('citizen');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all border-b-2 ${
                loginMode === 'citizen' 
                  ? 'border-[#FF8C00] text-[#FF8C00]' 
                  : 'border-transparent text-[#564334] hover:text-[#e5e2e1]'
              }`}
            >
              CITIZEN LOGIN
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('official');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all border-b-2 ${
                loginMode === 'official' 
                  ? 'border-[#00B894] text-[#00B894]' 
                  : 'border-transparent text-[#564334] hover:text-[#e5e2e1]'
              }`}
            >
              OFFICIAL LOGIN
            </button>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {errorMessage}
              </div>
            )}

            {/* Citizen Login Form */}
            {loginMode === 'citizen' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#00eefc] tracking-widest uppercase ml-1">Email Address</label>
                  <div className="relative group">
                    <input 
                      className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] p-4 focus:ring-1 focus:ring-[#ff8c00] placeholder:text-[#353534] placeholder:uppercase transition-all" 
                      placeholder="example@gmail.com" 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF8C00] group-focus-within:w-full transition-all duration-300"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#00eefc] tracking-widest uppercase ml-1">Password</label>
                  <div className="relative group">
                    <input 
                      className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] p-4 focus:ring-1 focus:ring-[#ff8c00] placeholder:text-[#353534] transition-all" 
                      placeholder="••••••••••••" 
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF8C00] group-focus-within:w-full transition-all duration-300"></div>
                  </div>
                </div>
              </>
            )}

            {/* Official Login Form */}
            {loginMode === 'official' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#00B894] tracking-widest uppercase ml-1">Official Username</label>
                  <div className="relative group">
                    <input 
                      className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] p-4 focus:ring-1 focus:ring-[#00B894] placeholder:text-[#353534] placeholder:uppercase transition-all" 
                      placeholder="official@roadrash.gov" 
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#00B894] group-focus-within:w-full transition-all duration-300"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#00B894] tracking-widest uppercase ml-1">Password</label>
                  <div className="relative group">
                    <input 
                      className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] p-4 focus:ring-1 focus:ring-[#00B894] placeholder:text-[#353534] transition-all" 
                      placeholder="••••••••••••" 
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#00B894] group-focus-within:w-full transition-all duration-300"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#00B894] tracking-widest uppercase ml-1">Department (Optional)</label>
                  <div className="relative group">
                    <input 
                      className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] p-4 focus:ring-1 focus:ring-[#00B894] placeholder:text-[#353534] placeholder:uppercase transition-all" 
                      placeholder="e.g., Public Works" 
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    />
                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#00B894] group-focus-within:w-full transition-all duration-300"></div>
                  </div>
                </div>

                <div className="bg-[#00B894]/10 border border-[#00B894]/30 p-3 rounded text-[10px] text-[#00B894] font-bold uppercase tracking-wider">
                  ✓ Official credentials required. Contact administration for access.
                </div>
              </>
            )}

            <div className="pt-4 flex flex-col gap-4">
              <button 
                className={`w-full py-5 font-black uppercase tracking-tighter text-lg transition-all active:scale-[0.98] ${
                  loginMode === 'official'
                    ? 'bg-[#00B894] text-black hover:brightness-110'
                    : 'bg-[#FF8C00] text-[#4d2600] hover:brightness-110'
                }`}
                type="submit"
              >
                {loginMode === 'official' ? 'OFFICIAL LOGIN' : 'LOGIN'}
              </button>
              
              {loginMode === 'citizen' && (
                <>
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-[#564334] opacity-30"></div>
                    <span className="text-[10px] font-bold text-[#564334] uppercase tracking-[0.3em]">OR</span>
                    <div className="h-[1px] flex-1 bg-[#564334] opacity-30"></div>
                  </div>

                  <button 
                    onClick={() => googleLogin()}
                    className="w-full border-2 border-[#564334] text-[#d2fbff] py-4 font-bold uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-[#353534] transition-colors active:scale-[0.98]" 
                    type="button"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                    </svg> 
                    Continue with Google
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="mt-12 flex justify-between items-end border-t border-[#564334] border-opacity-20 pt-6">
            <div>
              <span className="block text-[8px] font-bold text-[#a48c7a] uppercase tracking-widest mb-1">PROTO_VER</span>
              <span className="block font-mono text-[10px] text-[#ff8c00]">V0.1</span>
            </div>
            <Link 
              to="/signup" 
              className="text-[10px] font-bold text-[#00eefc] underline underline-offset-4 hover:text-[#79f4ff] uppercase tracking-widest"
            >
              Unregistered? Create An Account
            </Link>
          </div>
        </div>

        {/* Aesthetic Dossier Marks */}
        <div className="absolute top-8 right-8 text-[10px] font-mono text-[#564334] opacity-40 select-none hidden md:block">
          [FILE_ID: RR_AUTH_01]<br/>[STAMP: RESTRICTED]<br/>[ORIGIN: SEC_TERMINAL]
        </div>
      </section>
    </div>
  );
};

export default Login;