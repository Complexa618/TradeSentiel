import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

// Handles the Emergent OAuth redirect: reads session_id from the URL fragment,
// exchanges it via the backend, then navigates to the dashboard.
export default function AuthCallback() {
  const { googleLogin } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const processed = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const params = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    const sessionId = params.get('session_id');
    if (!sessionId) { navigate('/login', { replace: true }); return; }
    (async () => {
      const res = await googleLogin(sessionId);
      // Clear the session_id from the URL regardless of outcome
      window.history.replaceState({}, document.title, window.location.pathname);
      if (res.ok) navigate('/dashboard', { replace: true });
      else setError(res.error || 'Sign-in failed. Please try again.');
    })();
  }, [location.hash, googleLogin, navigate]);

  return (
    <div className="min-h-screen bg-[#08090c] flex flex-col items-center justify-center gap-4 text-center px-6">
      {!error ? (
        <>
          <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
          <p className="text-gray-400 text-sm">Signing you in…</p>
        </>
      ) : (
        <>
          <p className="text-red-400 text-sm" data-testid="auth-callback-error">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })}
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium" data-testid="auth-callback-retry">Back to login</button>
        </>
      )}
    </div>
  );
}
