'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getApiEndpoint } from '../app/utils/apiConfig';

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function VisitorTracker() {
  const pathname = usePathname();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper to get or generate persistent device ID
    let deviceId = localStorage.getItem('chatbot_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      try {
        localStorage.setItem('chatbot_device_id', deviceId);
      } catch {}
    }

    // Check last visit session timestamp (1-Hour rule like YouTube viewer)
    const lastSessionStr = localStorage.getItem('chatbot_last_session_time');
    const lastSessionTime = lastSessionStr ? parseInt(lastSessionStr, 10) : 0;
    const now = Date.now();

    // If already counted in this browser within the last 1 hour, do not re-count
    // (even if browsing across multiple pages / KonBong / KonPov)
    if (lastSessionTime && now - lastSessionTime < ONE_HOUR_MS) {
      return;
    }

    if (trackedRef.current) return;
    trackedRef.current = true;

    // Record new 1-hour session timestamp
    try {
      localStorage.setItem('chatbot_last_session_time', String(now));
    } catch {}

    const username = localStorage.getItem('chatbot_username') || 'Guest';
    const screen = `${window.innerWidth}x${window.innerHeight}`;
    const referrer = document.referrer || '';
    const trackEndpoint = getApiEndpoint('/api/track');

    fetch(trackEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId
      },
      body: JSON.stringify({
        deviceId,
        pathname: pathname || window.location.pathname,
        screen,
        referrer,
        username
      })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
