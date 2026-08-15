import React, { useState } from 'react';

// User avatar: renders the profile photo when available, otherwise the name initial.
export function Avatar({ name, picture, size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || 'T').charAt(0).toUpperCase();
  const dim = { width: size, height: size };
  const base = `rounded-full shrink-0 overflow-hidden ${className}`;

  if (picture && !failed) {
    return (
      <img
        src={picture}
        alt={name || 'User'}
        data-testid="user-avatar-image"
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        className={`${base} object-cover ring-1 ring-white/10`}
        style={dim}
      />
    );
  }
  return (
    <div
      data-testid="user-avatar-initial"
      className={`${base} bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#08090c] font-bold`}
      style={{ ...dim, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  );
}

export default Avatar;
