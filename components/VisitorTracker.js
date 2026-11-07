'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getApiEndpoint } from '../app/utils/apiConfig';

const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minutes inactivity/exit window

export default function VisitorTracker() {
  const pathname = usePathname();
  const isTrackingRef = useRef(false);

  // Send View / Visit Tracking Request to Server
  const trackView = useCallback((isReturn = false) => {
    if (typeof window === 'undefined' || isTrackingRef.current) return;

    try {
      isTrackingRef.current = true;
      const now = Date.now();

      // Ensure persistent Device ID exists
      let deviceId = localStorage.getItem('chatbot_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + now;
        try {
          localStorage.setItem('chatbot_device_id', deviceId);
        } catch {}
      }

      // Mark view counted time & last active time
      try {
        localStorage.setItem('chatbot_last_view_counted_time', String(now));
        localStorage.setItem('chatbot_last_active_time', String(now));
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
          username,
          isReturnAfter5Min: isReturn
        })
      })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isTrackingRef.current = false;
          }, 1500);
        });
    } catch {
      isTrackingRef.current = false;
    }
  }, [pathname]);

  // Check if user has been away for >= 5 minutes
  const checkAndTrackIfAway5Min = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const now = Date.now();
      const lastActiveStr = localStorage.getItem('chatbot_last_active_time');
      const lastCountedStr = localStorage.getItem('chatbot_last_view_counted_time');

      const lastActiveTime = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
      const lastCountedTime = lastCountedStr ? parseInt(lastCountedStr, 10) : 0;

      // Case 1: First visit ever on this browser
      if (!lastCountedTime || !lastActiveTime) {
        trackView(false);
        return;
      }

      // Case 2: User exited or was inactive for >= 5 minutes and has returned
      const elapsedAwayMs = now - lastActiveTime;
      if (elapsedAwayMs >= FIVE_MINUTES_MS) {
        trackView(true);
      } else {
        // Still within same active session, update last active
        localStorage.setItem('chatbot_last_active_time', String(now));
      }
    } catch {}
  }, [trackView]);

  // Main lifecycle effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check on initial page mount or path navigation
    checkAndTrackIfAway5Min();

    // 2. Tab Visibility / Return from background detection (switching apps / returning after 5 min)
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        // Record precise exit/minimize time
        try {
          localStorage.setItem('chatbot_last_active_time', String(now));
        } catch {}
      } else if (document.visibilityState === 'visible') {
        // User returned to tab/app -> check if away for >= 5 minutes
        checkAndTrackIfAway5Min();
      }
    };

    // 3. Page exit listeners to record exact departure timestamp
    const handleExit = () => {
      try {
        localStorage.setItem('chatbot_last_active_time', String(Date.now()));
      } catch {}
    };

    // 4. Activity heartbeat: update active timestamp every 20 seconds while user is active
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        try {
          localStorage.setItem('chatbot_last_active_time', String(Date.now()));
        } catch {}
      }
    }, 20000);

    // 5. User interaction touch/click listener (throttled)
    let lastTouchRecord = 0;
    const handleUserTouch = () => {
      const now = Date.now();
      if (now - lastTouchRecord > 30000) {
        lastTouchRecord = now;
        try {
          localStorage.setItem('chatbot_last_active_time', String(now));
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pointerdown', handleUserTouch, { passive: true });
    window.addEventListener('keydown', handleUserTouch, { passive: true });

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pointerdown', handleUserTouch);
      window.removeEventListener('keydown', handleUserTouch);
    };
  }, [checkAndTrackIfAway5Min]);

  return null;
}
