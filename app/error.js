'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    if (!error) return;
    console.warn('[Silent Auto-Recover Page Error]:', error);

    // Completely silent auto-recovery: soft reset first, silent refresh if needed
    try {
      reset();
    } catch {
      if (typeof window !== 'undefined') {
        window.location.replace(`${window.location.pathname}?recover=${Date.now()}`);
      }
    }
  }, [error, reset]);

  // NEVER render the green crash popup card to users!
  return null;
}
