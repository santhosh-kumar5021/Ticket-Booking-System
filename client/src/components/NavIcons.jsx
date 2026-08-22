import React from 'react';

/**
 * Custom Futuristic Precision Navigation Icon Family for TicketPass
 * Unified 24x24 viewBox, 1.8px stroke width, rounded geometry, cyan-electric glow styling
 */

export function IconExplore({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      {/* Precision compass ring with orbit accents */}
      <circle cx="12" cy="12" r="8.5" />
      <polygon points="14.5 9.5 13 14 9.5 14.5 11 10" fill="currentColor" fillOpacity="0.25" strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function IconTickets({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      {/* Digital Ticket Pass with side notched cutouts */}
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V6z" />
      {/* Micro QR-code matrix cells */}
      <rect x="8" y="8" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="13.5" y="8" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="8" y="13.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" />
      <path d="M13.5 13.5h2.5v2.5" strokeWidth="1.5" />
    </svg>
  );
}

export function IconOffers({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      {/* Geometric price tag */}
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      {/* Precision tag eyelet */}
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      {/* Corner Sparkle / Star detail */}
      <path d="M16.5 4l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHelp({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      {/* Refined support circle */}
      <circle cx="12" cy="12" r="9" />
      {/* Sleek question mark path */}
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      {/* Bottom indicator dot */}
      <circle cx="12" cy="17" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function IconSignIn({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      {/* Profile avatar avatar ring + body */}
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19a6 6 0 0 1 10.5-4" />
      {/* Directional login arrow */}
      <path d="M15 12h6m0 0l-2.5-2.5M21 12l-2.5 2.5" strokeWidth="2" />
    </svg>
  );
}

export function IconEvents({ size = 18, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-svg-icon ${className}`}
      {...props}
    >
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.4" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}
