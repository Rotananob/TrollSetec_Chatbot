'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getApiEndpoint } from '../utils/apiConfig';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export default function JamTicKapeaAdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // System State
  const [systemState, setSystemState] = useState({
    serverOnline: true,
    maintenanceMode: false,
    maintenanceReason: 'ប្រព័ន្ធដំណើរការប្រក្រតី 100%',
    nightScheduleEnabled: true,
    nightStartHour: 2,
    nightEndHour: 6,
    nightRestMessage: 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!',
    konbongActive: true,
    konpovActive: true,
    sessionLimitActive: true,
    broadcastNotice: '',
    lastUpdated: Date.now(),
    updatedBy: 'Rotana NOB'
  });

  const [evaluation, setEvaluation] = useState({
    isResting: false,
    mode: 'online',
    title: 'ប្រព័ន្ធដំណើរការធម្មតា'
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [cambodiaTime, setCambodiaTime] = useState('');
  const [cambodiaHour, setCambodiaHour] = useState(23);
  const [rtdbConnected, setRtdbConnected] = useState(true);
  const [activeTab, setActiveTab] = useState('broadcast'); // Default to broadcast for user convenience

  // PWA & Standalone State
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [pwaPlatformTab, setPwaPlatformTab] = useState('ios'); // 'ios' | 'android' | 'desktop'
  const [copiedPwaUrl, setCopiedPwaUrl] = useState(false);

  // Editable form fields
  const [editMaintenanceReason, setEditMaintenanceReason] = useState('');
  const [editNightMessage, setEditNightMessage] = useState('');
  const [editBroadcastNotice, setEditBroadcastNotice] = useState('');
  const [editKonBongNotice, setEditKonBongNotice] = useState('');
  const [editKonPovNotice, setEditKonPovNotice] = useState('');
  const [editNightStart, setEditNightStart] = useState(2);
  const [editNightEnd, setEditNightEnd] = useState(6);

  // Popup Preview State
  const [showPopupPreview, setShowPopupPreview] = useState(false);
  const [showMaintenancePreview, setShowMaintenancePreview] = useState(false);
  const [showSleepModePreview, setShowSleepModePreview] = useState(false);

  // Interactive Bot Pause Confirmation & Content Notice Modal State
  const [pauseBotTarget, setPauseBotTarget] = useState(null); // 'konbong' | 'konpov' | null
  const [pauseModalNotice, setPauseModalNotice] = useState('');

  // Flags to protect input fields from background polling overwrites
  const initialLoadedRef = useRef(false);
  const isEditingMaintenanceRef = useRef(false);
  const isEditingNightMessageRef = useRef(false);
  const isEditingBroadcastRef = useRef(false);
  const isEditingKonBongNoticeRef = useRef(false);
  const isEditingKonPovNoticeRef = useRef(false);

  // Tab 5: Promo Code & Bypass Management State
  const [bypassRequests, setBypassRequests] = useState([]);
  const [promoCodesList, setPromoCodesList] = useState([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(10);
  const [newPromoDurationHours, setNewPromoDurationHours] = useState(24);
  const [customApproveCodes, setCustomApproveCodes] = useState({});
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  // Tab 6: SETEC Lore & AI Training Dataset Management State
  const [loreItems, setLoreItems] = useState([]);
  const [isExportingLore, setIsExportingLore] = useState(false);
  const [loreExportStatus, setLoreExportStatus] = useState(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);

  const eventSourceRef = useRef(null);

  // Clock Update Effect (UTC+7 Phnom Penh Time)
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const khFormatter = new Intl.DateTimeFormat('km-KH', {
          timeZone: 'Asia/Phnom_Penh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hourCycle: 'h23'
        });
        setCambodiaTime(khFormatter.format(now));

        const hourPart = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Phnom_Penh',
          hour: 'numeric',
          hourCycle: 'h23'
        }).format(now);
        setCambodiaHour(parseInt(hourPart, 10));
      } catch {
        const fallback = new Date(Date.now() + 7 * 3600 * 1000);
        setCambodiaTime(fallback.toISOString().replace('T', ' ').slice(0, 19));
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const passcodeRef = useRef('');

  useEffect(() => {
    passcodeRef.current = passcode;
  }, [passcode]);

  // PWA Standalone Mode & Event Detection for Admin Gateway
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone mode (launched as PWA installed app)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(isStandaloneMode));

    // Detect user device platform
    const ua = window.navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      setPwaPlatformTab('ios');
    } else if (/Android/.test(ua)) {
      setPwaPlatformTab('android');
    } else {
      setPwaPlatformTab('desktop');
    }

    // Explicitly guarantee DOM link to admin-manifest.webmanifest
    try {
      document.title = 'SETEC Master Command Center - Rotana NOB';
      let manifestEl = document.querySelector('link[rel="manifest"]');
      if (!manifestEl) {
        manifestEl = document.createElement('link');
        manifestEl.rel = 'manifest';
        document.head.appendChild(manifestEl);
      }
      manifestEl.href = '/admin-manifest.webmanifest';

      let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!appleTitleMeta) {
        appleTitleMeta = document.createElement('meta');
        appleTitleMeta.name = 'apple-mobile-web-app-title';
        document.head.appendChild(appleTitleMeta);
      }
      appleTitleMeta.content = 'SETEC Admin';

      let appleCapableMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      if (!appleCapableMeta) {
        appleCapableMeta = document.createElement('meta');
        appleCapableMeta.name = 'apple-mobile-web-app-capable';
        document.head.appendChild(appleCapableMeta);
      }
      appleCapableMeta.content = 'yes';
    } catch {}

    // Android/Chrome beforeinstallprompt capture
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowPwaModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowPwaModal(true);
    }
  };

  const copyAdminUrl = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = window.location.origin + '/jam-tic-kapea-1-sin';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).then(() => {
          setCopiedPwaUrl(true);
          setTimeout(() => setCopiedPwaUrl(false), 2000);
        }).catch(() => {});
      }
    }
  };

  // Fetch Current State from API
  const fetchState = useCallback(async (token = null, forceSyncFields = false) => {
    try {
      const activeToken = token || passcodeRef.current || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');
      const endpoint = getApiEndpoint('/api/system-status?fresh=true');
      const res = await fetch(endpoint, {
        headers: {
          'x-rotana-passcode': activeToken || '',
          'x-rotana-bypass': activeToken || 'rotana2026'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.state) {
          setSystemState(data.state);
          if (data.evaluation) setEvaluation(data.evaluation);
          if (data.cambodiaHour !== undefined) setCambodiaHour(data.cambodiaHour);

          // Populate edit fields only on initial load or when user explicitly requests a sync/revert
          // STRICT RULE: If the user is currently editing a field, NEVER overwrite it!
          if (!initialLoadedRef.current || forceSyncFields) {
            if (!isEditingMaintenanceRef.current || forceSyncFields) {
              setEditMaintenanceReason(data.state.maintenanceReason || '');
            }
            if (!isEditingNightMessageRef.current || forceSyncFields) {
              setEditNightMessage(data.state.nightRestMessage || '');
            }
            if (!isEditingBroadcastRef.current || forceSyncFields) {
              setEditBroadcastNotice(data.state.broadcastNotice || '');
            }
            if (!isEditingKonBongNoticeRef.current || forceSyncFields) {
              setEditKonBongNotice(data.state.konbongNotice || '');
            }
            if (!isEditingKonPovNoticeRef.current || forceSyncFields) {
              setEditKonPovNotice(data.state.konpovNotice || '');
            }
            setEditNightStart(data.state.nightStartHour ?? 2);
            setEditNightEnd(data.state.nightEndHour ?? 6);
            initialLoadedRef.current = true;
            if (forceSyncFields) {
              isEditingMaintenanceRef.current = false;
              isEditingNightMessageRef.current = false;
              isEditingBroadcastRef.current = false;
              isEditingKonBongNoticeRef.current = false;
              isEditingKonPovNoticeRef.current = false;
            }
          }
          setRtdbConnected(true);
        }
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Auth Check from SessionStorage (Only runs once on mount)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPass = sessionStorage.getItem('rotana_admin_passcode');
      if (savedPass) {
        setPasscode(savedPass);
        passcodeRef.current = savedPass;
        setIsAuthenticated(true);
        fetchState(savedPass, true);
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchState]);

  // Real-time Firebase RTDB Subscription via EventSource
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const sseUrl = `${FIREBASE_DB_URL}/system_control.json`;
    let es = null;

    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      const handleSse = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload) return;
          if (payload.path === '/' && payload.data && typeof payload.data === 'object') {
            setSystemState((prev) => ({ ...prev, ...payload.data }));
            setRtdbConnected(true);
          } else if (payload.path && payload.path.startsWith('/')) {
            const key = payload.path.slice(1).split('/')[0];
            if (key) {
              setSystemState((prev) => ({ ...prev, [key]: payload.data }));
              setRtdbConnected(true);
            }
          } else if (payload.data && typeof payload.data === 'object') {
            setSystemState((prev) => ({ ...prev, ...payload.data }));
            setRtdbConnected(true);
          }
        } catch {}
      };

      es.addEventListener('put', handleSse);
      es.addEventListener('patch', handleSse);

      es.onerror = () => {
        setRtdbConnected(false);
      };
    } catch {
      setRtdbConnected(false);
    }

    // Fallback background polling every 6 seconds (does NOT touch fields user is editing)
    const interval = setInterval(() => {
      fetchState();
    }, 6000);

    return () => {
      clearInterval(interval);
      if (es) {
        try { es.close(); } catch {}
      }
    };
  }, [isAuthenticated, fetchState]);

  // URL Tab Sync Effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'promo') {
        setActiveTab('promo');
      }
    }
  }, []);

  // Fetch Promo Codes and Live User Requests from RTDB
  const fetchPromoData = useCallback(async () => {
    try {
      const reqRes = await fetch(`${FIREBASE_DB_URL}/bypass_requests.json`);
      if (reqRes.ok) {
        const data = await reqRes.json();
        if (data && typeof data === 'object') {
          const list = Object.keys(data).map((k) => ({
            id: k,
            ...data[k]
          })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setBypassRequests(list);
        } else {
          setBypassRequests([]);
        }
      }

      const codesRes = await fetch(`${FIREBASE_DB_URL}/bypass_codes.json`);
      if (codesRes.ok) {
        const data = await codesRes.json();
        if (data && typeof data === 'object') {
          const list = Object.keys(data).map((k) => ({
            code: k,
            ...data[k]
          })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setPromoCodesList(list);
        } else {
          setPromoCodesList([]);
        }
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch promo data:', err);
    }
  }, []);

  // Fetch Lore Contributions for AI Training Dataset
  const fetchLoreData = useCallback(async () => {
    setIsLoadingLore(true);
    try {
      const res = await fetch('/api/export-lore?action=list');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          setLoreItems(data.items);
        }
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch lore items:', err);
    } finally {
      setIsLoadingLore(false);
    }
  }, []);

  const handleExportWeeklyLoreToTelegram = async () => {
    setIsExportingLore(true);
    setLoreExportStatus(null);
    try {
      const res = await fetch('/api/export-lore?action=telegram');
      const data = await res.json();
      if (data.success) {
        setLoreExportStatus({
          type: 'success',
          message: data.message || `បានផ្ញើឯកសារ JSON និង TXT (${data.count} រឿង) ទៅ Telegram Topic 89 រួចរាល់!`
        });
        fetchLoreData();
      } else {
        setLoreExportStatus({ type: 'error', message: data.error || 'មានបញ្ហាក្នុងការផ្ញើឯកសារ' });
      }
    } catch (err) {
      setLoreExportStatus({ type: 'error', message: err.message });
    } finally {
      setIsExportingLore(false);
    }
  };

  // Fetch Lore Data when switching to Lore tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'lore') {
      fetchLoreData();
    }
  }, [isAuthenticated, activeTab, fetchLoreData]);

  // Poll Promo Data every 4 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPromoData();
    const interval = setInterval(fetchPromoData, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchPromoData]);

  const handleCreatePromoCode = async () => {
    let code = (newPromoCode || '').trim().toUpperCase();
    if (!code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      code = `ROTANA-VIP-${rand}`;
    }

    setIsSubmittingPromo(true);
    try {
      const durationMs = (Number(newPromoDurationHours) || 24) * 60 * 60 * 1000;
      const payload = {
        code,
        createdBy: 'Rotana NOB',
        createdAt: Date.now(),
        expiresAt: Date.now() + durationMs,
        maxUses: Number(newPromoMaxUses) || 10,
        usedCount: 0,
        active: true
      };

      await fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setStatusMessage({ text: `បង្កើត Promo Code "${code}" ជោគជ័យ!`, type: 'success' });
      setNewPromoCode('');
      fetchPromoData();
    } catch (err) {
      setStatusMessage({ text: 'មានបញ្ហាក្នុងការបង្កើតកូដ!', type: 'error' });
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  const handleDeletePromoCode = async (code) => {
    if (!confirm(`តើបងពិតជាចង់លុប Promo Code "${code}" មែនទេ?`)) return;
    try {
      await fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}.json`, {
        method: 'DELETE'
      });
      setStatusMessage({ text: `បានលុបកូដ "${code}" រួចរាល់!`, type: 'success' });
      fetchPromoData();
    } catch {
      setStatusMessage({ text: 'មានបញ្ហាក្នុងការលុបកូដ!', type: 'error' });
    }
  };

  const handleApproveRequest = async (requestId, customCode) => {
    let code = (customCode || customApproveCodes[requestId] || '').trim().toUpperCase();
    if (!code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      code = `ROTANA-VIP-${rand}`;
    }

    try {
      // 1. Ensure the code exists in /bypass_codes so it validates
      await fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          createdBy: 'Rotana NOB (Direct Approval)',
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          maxUses: 1,
          usedCount: 0,
          active: true
        })
      });

      // 2. Mark request as approved with the code
      await fetch(`${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(requestId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          code,
          approvedAt: Date.now()
        })
      });

      setStatusMessage({ text: `បានផ្ដល់កូដ "${code}" ជូន User រួចរាល់!`, type: 'success' });
      fetchPromoData();
    } catch {
      setStatusMessage({ text: 'មានបញ្ហាក្នុងការ Approve សំណើ!', type: 'error' });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await fetch(`${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(requestId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectedAt: Date.now()
        })
      });
      setStatusMessage({ text: 'បានបដិសេធសំណើ!', type: 'info' });
      fetchPromoData();
    } catch {
      setStatusMessage({ text: 'មានបញ្ហាក្នុងការបដិសេធសំណើ!', type: 'error' });
    }
  };

  // Handle Login Authentication
  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('សូមបញ្ចូលលេខកូដសម្ងាត់ Master Passcode របស់អ្នក!');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': passcode.trim()
        },
        body: JSON.stringify({
          action: 'verify-auth',
          passcode: passcode.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rotana_admin_passcode', passcode.trim());
        }
        if (data.state) {
          setSystemState(data.state);
          if (data.evaluation) setEvaluation(data.evaluation);
          setEditMaintenanceReason(data.state.maintenanceReason || '');
          setEditNightMessage(data.state.nightRestMessage || '');
          setEditBroadcastNotice(data.state.broadcastNotice || '');
          setEditKonBongNotice(data.state.konbongNotice || '');
          setEditKonPovNotice(data.state.konpovNotice || '');
          setEditNightStart(data.state.nightStartHour ?? 2);
          setEditNightEnd(data.state.nightEndHour ?? 6);
          initialLoadedRef.current = true;
        }
        setStatusMessage({ text: 'ផ្ទៀងផ្ទាត់សិទ្ធិជោគជ័យ! សូមស្វាគមន៍មកកាន់មជ្ឈមណ្ឌលគ្រប់គ្រងប្រព័ន្ធ។', type: 'success' });
      } else {
        setAuthError(data.message || 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ! សិទ្ធិចូលដំណើរការត្រូវបានបដិសេធ។');
      }
    } catch {
      setAuthError('មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ! សូមព្យាយាមម្ដងទៀត។');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rotana_admin_passcode');
    }
    setIsAuthenticated(false);
    setPasscode('');
  };

  // Perform Server State Update via API + Direct Parallel Real-Time Firebase Sync
  const sendUpdate = async (patch, actionDescription = 'Update System Parameters') => {
    setIsSubmitting(true);
    setStatusMessage({ text: 'កំពុងបញ្ជូនទិន្នន័យបញ្ជា...', type: 'info' });

    // 1. Optimistic Local State Update (Instant 0ms feedback)
    setSystemState((prev) => ({ ...(prev || {}), ...patch }));

    // 2. Direct parallel write to Firebase RTDB for sub-200ms real-time propagation across student browsers
    try {
      fetch(`${FIREBASE_DB_URL}/system_control.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patch,
          lastUpdated: Date.now(),
          updatedBy: 'Rotana NOB'
        })
      }).catch(() => {});
    } catch {}

    // 3. Authoritative API Backend Call
    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const activePasscode = passcode || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': activePasscode || ''
        },
        body: JSON.stringify({
          action: actionDescription,
          passcode: activePasscode,
          patch
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSystemState(data.state);
        if (data.evaluation) setEvaluation(data.evaluation);

        // Reset editing flags on successful save
        if (patch.maintenanceReason !== undefined) isEditingMaintenanceRef.current = false;
        if (patch.nightRestMessage !== undefined) isEditingNightMessageRef.current = false;
        if (patch.broadcastNotice !== undefined) isEditingBroadcastRef.current = false;

        setStatusMessage({ text: `ប្រតិបត្តិការជោគជ័យ: ${actionDescription}`, type: 'success' });
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      } else {
        setStatusMessage({ text: `បរាជ័យ: ${data.message || 'កំហុសបច្ចេកទេស'}`, type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `កំហុសក្នុងការតភ្ជាប់: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Handlers
  const handleToggleServer = () => {
    const nextState = !systemState.serverOnline;
    const patch = {
      serverOnline: nextState,
      maintenanceMode: !nextState
    };
    if (!nextState && editMaintenanceReason && editMaintenanceReason.trim()) {
      patch.maintenanceReason = editMaintenanceReason.trim();
    }
    sendUpdate(
      patch,
      nextState ? 'បើកដំណើរការ Server ឡើងវិញ' : 'បិទ Server ដាក់ថែទាំភ្លាមៗ'
    );
  };

  const handleToggleNightSchedule = () => {
    const nextState = !systemState.nightScheduleEnabled;
    sendUpdate(
      { nightScheduleEnabled: nextState },
      nextState ? 'បើកកាលវិភាគសម្រាកពេលយប់ Enable Night Schedule' : 'ផ្អាកកាលវិភាគសម្រាកពេលយប់ Disable Night Schedule'
    );
  };

  // Bot Pause Request (Opens Modal if bot is currently active, or resumes immediately if paused)
  const handleRequestPauseKonBong = () => {
    if (systemState.konbongActive) {
      setPauseBotTarget('konbong');
      setPauseModalNotice(
        editKonBongNotice ||
        systemState.konbongNotice ||
        'បងកូនច្បង KonBong កំពុងសម្រាក ឬ Update កូដប្រព័ន្ធមួយរយៈខ្លី... សូមសាកល្បងទៅលេងជាមួយចែកូនពៅ KonPov ជំនួសវិញណា៎!'
      );
    } else {
      sendUpdate({ konbongActive: true }, 'បើកដំណើរការបងកូនច្បង Activate KonBong');
    }
  };

  const handleRequestPauseKonPov = () => {
    if (systemState.konpovActive) {
      setPauseBotTarget('konpov');
      setPauseModalNotice(
        editKonPovNotice ||
        systemState.konpovNotice ||
        'ចែកូនពៅ KonPov កំពុងសម្រាក ឬ Update កូដប្រព័ន្ធមួយរយៈខ្លី... សូមសាកល្បងទៅលេងជាមួយបងកូនច្បង KonBong ជំនួសវិញណា៎!'
      );
    } else {
      sendUpdate({ konpovActive: true }, 'បើកដំណើរការចែកូនពៅ Activate KonPov');
    }
  };

  const handleConfirmPauseBot = () => {
    if (!pauseBotTarget) return;
    if (pauseBotTarget === 'konbong') {
      setEditKonBongNotice(pauseModalNotice);
      sendUpdate(
        { konbongActive: false, konbongNotice: pauseModalNotice },
        'ផ្អាកបងកូនច្បង & ផ្សាយ Real-time Popup'
      );
    } else if (pauseBotTarget === 'konpov') {
      setEditKonPovNotice(pauseModalNotice);
      sendUpdate(
        { konpovActive: false, konpovNotice: pauseModalNotice },
        'ផ្អាកចែកូនពៅ & ផ្សាយ Real-time Popup'
      );
    }
    setPauseBotTarget(null);
  };

  const handleToggleKonBong = handleRequestPauseKonBong;
  const handleToggleKonPov = handleRequestPauseKonPov;

  const handleSaveKonBongNotice = () => {
    sendUpdate(
      { konbongNotice: editKonBongNotice },
      'បានរក្សាទុកសារជូនដំណឹងបងកូនច្បង'
    );
    isEditingKonBongNoticeRef.current = false;
  };

  const handleSaveKonPovNotice = () => {
    sendUpdate(
      { konpovNotice: editKonPovNotice },
      'បានរក្សាទុកសារជូនដំណឹងចែកូនពៅ'
    );
    isEditingKonPovNoticeRef.current = false;
  };

  const handleToggleSessionLimit = () => {
    const nextState = !systemState.sessionLimitActive;
    sendUpdate(
      { sessionLimitActive: nextState },
      nextState ? 'បើកប្រព័ន្ធកំណត់ពេល 30 នាទី Enable Session Limit' : 'បិទប្រព័ន្ធកំណត់ពេល 30 នាទី Unlimited Play'
    );
  };

  const handleFlushRateLimits = async () => {
    if (!confirm('តើអ្នកពិតជាចង់សម្អាត Rate Limits, Cooldowns និង IP Bans ទាំងអស់មែនទេ? សិស្សដែលជាប់គាំងទាំងអស់នឹងអាចចូលលេងបានវិញភ្លាមៗ។')) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: 'កំពុងសម្អាតទិន្នន័យចាក់សោទាំងអស់...', type: 'info' });

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const activePasscode = passcode || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': activePasscode || ''
        },
        body: JSON.stringify({
          action: 'flush-limits',
          passcode: activePasscode
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({ text: 'បានសម្អាតទិន្នន័យចាក់សោនិង Cooldown ទាំងអស់ជោគជ័យ!', type: 'success' });
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      } else {
        setStatusMessage({ text: `បរាជ័យ: ${data.message || 'កំហុសបច្ចេកទេស'}`, type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `កំហុសក្នុងការតភ្ជាប់: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveScheduleConfig = (e) => {
    e.preventDefault();
    sendUpdate(
      {
        nightStartHour: parseInt(editNightStart, 10),
        nightEndHour: parseInt(editNightEnd, 10),
        nightRestMessage: editNightMessage.trim()
      },
      'រក្សាទុកការកំណត់ម៉ោងសម្រាកពេលយប់'
    );
  };

  const handleSaveMaintenanceConfig = (e) => {
    e.preventDefault();
    sendUpdate(
      {
        maintenanceReason: editMaintenanceReason.trim()
      },
      'កែប្រែសារជូនដំណឹងពេលថែទាំ Server'
    );
  };

  const handleSaveBroadcast = (e) => {
    e?.preventDefault?.();
    const cleanNotice = editBroadcastNotice.trim();
    sendUpdate(
      {
        broadcastNotice: cleanNotice
      },
      cleanNotice ? 'ផ្សាយសារដំណឹងបន្ទាន់ & លោត Popup លើអេក្រង់សិស្ស' : 'លុបសារផ្សាយ & បិទ Popup លើអេក្រង់សិស្សទាំងអស់'
    );
  };

  // Current system resting calculation
  const nightStartH = systemState.nightStartHour ?? 2;
  const nightEndH = systemState.nightEndHour ?? 6;
  const isCurrentlyNight = nightStartH > nightEndH
    ? cambodiaHour >= nightStartH || cambodiaHour < nightEndH
    : cambodiaHour >= nightStartH && cambodiaHour < nightEndH;
  const isEffectivelyResting = !systemState.serverOnline || systemState.maintenanceMode || (systemState.nightScheduleEnabled && isCurrentlyNight);

  // PWA Modal Guide Component
  const renderPwaGuideModal = () => {
    if (!showPwaModal) return null;
    return (
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 animate-zoom-in">
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-600 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0 overflow-hidden flex items-center justify-center text-white">
                <i className="fa-solid fa-shield-halved text-xl" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>ដំឡើង SETEC Admin App</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold uppercase tracking-wider">
                    PWA Standalone
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  បន្ថែមទៅ Home Screen ដើម្បីបើកចូលផ្ទាំង Admin ផ្ទាល់ ១០០%
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title="បិទ"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {/* Direct URL Guarantee Badge */}
          <div className="mb-4 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <i className="fa-solid fa-link text-indigo-400 text-xs shrink-0" />
              <span className="text-[11px] font-mono text-indigo-200 truncate select-all">
                https://troll-setec-chatbot.web.app/jam-tic-kapea-1-sin
              </span>
            </div>
            <button
              type="button"
              onClick={copyAdminUrl}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <i className={`fa-solid ${copiedPwaUrl ? 'fa-check text-emerald-300' : 'fa-copy'}`} />
              <span>{copiedPwaUrl ? 'បានចម្លង!' : 'ចម្លង'}</span>
            </button>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => setPwaPlatformTab('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                pwaPlatformTab === 'ios'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <i className="fa-brands fa-apple text-sm" />
              <span>iPhone / iOS</span>
            </button>
            <button
              type="button"
              onClick={() => setPwaPlatformTab('android')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                pwaPlatformTab === 'android'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <i className="fa-brands fa-android text-sm" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setPwaPlatformTab('desktop')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                pwaPlatformTab === 'desktop'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <i className="fa-solid fa-laptop text-sm" />
              <span>PC / Mac</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-5 space-y-3.5 text-xs">
            {pwaPlatformTab === 'ios' && (
              <>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">បើកតំណភ្ជាប់នេះក្នុង Safari</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      ប្រសិនបើកំពុងបើកក្នុង Telegram ឬ Messenger សូមចុចរូបត្រីកោណ/សញ្ញាចុចបីជ្រើសយក <strong className="text-slate-200">"Open in Safari"</strong>។
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">
                      ចុចប៊ូតុង Share <i className="fa-solid fa-arrow-up-from-bracket text-sky-400 mx-1" /> (រូបប្រអប់ព្រួញឡើងលើ)
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      ស្ថិតនៅចំកណ្តាលរបារឧបករណ៍ខាងក្រោមបង្អស់នៃកម្មវិធី Safari។
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">
                      អូសចុះក្រោម រួចជ្រើសរើសយក <strong className="text-indigo-300">"Add to Home Screen"</strong> (➕ បន្ថែមទៅអេក្រង់ដើម)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">
                      ផ្ទៀងផ្ទាត់ឈ្មោះឃើញ <span className="text-indigo-300 font-mono">"SETEC Admin"</span> រួចចុច <strong className="text-white">"Add"</strong> (បន្ថែម)
                    </p>
                    <p className="text-emerald-400 text-[11px] mt-1 font-medium flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check" />
                      <span>កូដថ្មីភ្ជាប់ Start URL ទៅកាន់ផ្ទាំង Admin ផ្ទាល់ ១០០% ដោយមិនរត់ទៅ Website ដើមឡើយ!</span>
                    </p>
                  </div>
                </div>
              </>
            )}

            {pwaPlatformTab === 'android' && (
              <>
                {deferredPrompt ? (
                  <div className="text-center py-2">
                    <p className="text-slate-300 mb-3 text-xs">
                      ឧបករណ៍ Android របស់អ្នកគាំទ្រការដំឡើង One-Click PWA ដោយផ្ទាល់៖
                    </p>
                    <button
                      type="button"
                      onClick={handleTriggerInstall}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-download text-sm" />
                      <span>ដំឡើង SETEC Admin App ឥឡូវនេះ (One-Click)</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-slate-200">ចុចសញ្ញាចុច ៣ (⋮) នៅជ្រុងខាងស្តាំលើនៃ Google Chrome</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-slate-200">
                          ចុចលើ <strong className="text-indigo-300">"Install app"</strong> ឬ <strong className="text-indigo-300">"Add to Home screen"</strong> (បន្ថែមទៅអេក្រង់ដើម)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <div>
                        <p className="font-semibold text-slate-200">ចុច "Install" (ដំឡើង) ដើម្បីបញ្ចប់</p>
                        <p className="text-emerald-400 text-[11px] mt-1 font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check" />
                          <span>App នឹងបង្ហាញរូប Icon "SETEC Admin" លើ Home Screen និងបើកចូលផ្ទាំងនេះផ្ទាល់!</span>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {pwaPlatformTab === 'desktop' && (
              <>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">មើលនៅរបារបញ្ចូល URL (Address bar) នៃ Chrome / Edge</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      អ្នកនឹងឃើញរូប Icon កុំព្យូទ័រ <i className="fa-solid fa-laptop text-indigo-400 mx-1" /> ឬសញ្ញា <strong className="text-slate-200">Install</strong> នៅជ្រុងខាងស្តាំបង្អស់។
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-200">ចុចលើ Icon នោះ រួចចុច "Install"</p>
                    <p className="text-emerald-400 text-[11px] mt-1 font-medium flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check" />
                      <span>ផ្ទាំង Admin នឹងដំណើរការជាកម្មវិធី Desktop ដាច់ដោយឡែកយ៉ាងស្រួល!</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Action */}
          <button
            type="button"
            onClick={() => setShowPwaModal(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition cursor-pointer"
          >
            យល់ព្រម &amp; បិទផ្ទាំងនេះ
          </button>
        </div>
      </div>
    );
  };

  // Authentication Card Screen
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white">
        <div className="w-full max-w-md">
          {/* Top Brand Indicator */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-900 to-slate-900 border border-indigo-500/30 text-indigo-400 text-2xl shadow-xl shadow-indigo-950/50 mb-4">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              មជ្ឈមណ្ឌលគ្រប់គ្រងម៉ាស៊ីនមេ
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
              SETEC Neural Core &bull; Supreme Access Control
            </p>
          </div>

          {/* Authentication Panel */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500" />

            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <i className="fa-solid fa-key" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">ផ្ទៀងផ្ទាត់អត្តសញ្ញាណ Master</h2>
                <p className="text-xs text-slate-400">កំណត់សិទ្ធិផ្តាច់មុខសម្រាប់ Creator Rotana NOB</p>
              </div>
            </div>

            {authError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  លេខកូដសម្ងាត់ Master Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="បញ្ចូល Secret Passcode..."
                    className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 p-1.5 transition-colors cursor-pointer"
                    title={showPasscode ? "លាក់កូដសម្ងាត់" : "បង្ហាញកូដសម្ងាត់"}
                  >
                    <i className={`fa-solid ${showPasscode ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-rotate fa-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-to-bracket" />
                    <span>ចូលទៅកាន់ផ្ទាំងបញ្ជា</span>
                  </>
                )}
              </button>
            </form>

            {/* PWA Install Trigger in Login Screen */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              {isStandalone ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-400" />
                  <span>កំពុងដំណើរការជា PWA Standalone App</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerInstall}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <i className="fa-solid fa-mobile-screen-button text-indigo-400" />
                  <span>បន្ថែម SETEC Admin ទៅអេក្រង់ដើម (Add to Home Screen)</span>
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 text-center">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-left" />
                <span>ត្រឡប់ទៅទំព័រដើម</span>
              </Link>
            </div>
          </div>
        </div>
        {renderPwaGuideModal()}
      </main>
    );
  }

  // Authenticated Control Center Dashboard
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Professional App Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900 to-slate-800 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-lg shadow-md">
              <i className="fa-solid fa-server" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  SETEC Master Command Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  v3.8 Quantum
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>មហាសិទ្ធគ្រប់គ្រងម៉ាស៊ីនមេ &bull; Rotana NOB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* PWA Standalone Mode Indicator / Install Button */}
            {isStandalone ? (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold"
                title="ដំណើរការក្នុងទម្រង់ PWA Standalone Mode"
              >
                <i className="fa-solid fa-mobile-screen-button text-emerald-400 text-[11px]" />
                <span>PWA Active</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleTriggerInstall}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="ដំឡើង SETEC Admin App លើទូរស័ព្ទ / Desktop (PWA)"
              >
                <i className="fa-solid fa-arrow-down-to-bracket text-[11px]" />
                <span className="hidden sm:inline">ដំឡើង Admin App</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            {/* Live Clock Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <i className="fa-solid fa-clock text-indigo-400" />
              <span className="font-mono">{cambodiaTime || 'UTC+7'}</span>
            </div>

            {/* RTDB Sync Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${rtdbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {rtdbConnected ? 'Firebase Realtime Active' : 'Disconnected'}
              </span>
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={() => fetchState(null, true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ទាញយកទិន្នន័យចុងក្រោយពីម៉ាស៊ីនមេ"
            >
              <i className="fa-solid fa-rotate text-[10px]" />
              <span className="hidden lg:inline">ទាញយកទិន្នន័យ</span>
            </button>

            {/* Test Link Buttons (Both KonBong and KonPov) */}
            <div className="flex items-center gap-1.5">
              <Link
                href="/KonBong"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-300 text-xs font-semibold border border-cyan-800/60 transition-colors flex items-center gap-1"
                title="សាកល្បង កូនច្បង"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                <span>កូនច្បង</span>
              </Link>
              <Link
                href="/KonPov"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg bg-pink-950/50 hover:bg-pink-900/70 text-pink-300 text-xs font-semibold border border-pink-800/60 transition-colors flex items-center gap-1"
                title="សាកល្បង កូនពៅ"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                <span>កូនពៅ</span>
              </Link>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ចាកចេញ"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
              <span className="hidden sm:inline">ចាកចេញ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Alert Notification Bar */}
      {statusMessage.text && (
        <div
          className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-b border-rose-800'
              : 'bg-indigo-950/90 text-indigo-300 border-b border-indigo-800'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <i
              className={`fa-solid ${
                statusMessage.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : statusMessage.type === 'error'
                  ? 'fa-triangle-exclamation text-rose-400'
                  : 'fa-circle-info text-indigo-400'
              }`}
            />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage({ text: '', type: '' })}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Top Status Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Master Server Status */}
          <div className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
            systemState.serverOnline && !systemState.maintenanceMode
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/30 border-rose-500/40'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">ស្ថានភាពម៉ាស៊ីនមេ</span>
              <span className={`w-2.5 h-2.5 rounded-full ${
                systemState.serverOnline && !systemState.maintenanceMode
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'bg-rose-500 shadow-lg shadow-rose-500/50'
              }`} />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {systemState.serverOnline && !systemState.maintenanceMode ? 'Online' : 'Maintenance'}
            </div>
            <p className="text-xs text-slate-400">
              {systemState.serverOnline && !systemState.maintenanceMode
                ? 'Server កំពុងទទួលចរាចរណ៍សិស្សធម្មតា'
                : 'Server កំពុងផ្អាកទទួលសំណើជាសាធារណៈ'}
            </p>
          </div>

          {/* Card 2: Current Rest Mode Evaluation */}
          <div className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
            isEffectivelyResting
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">របៀបសម្រាកជាក់ស្ដែង</span>
              <i className={`fa-solid ${
                isEffectivelyResting ? 'fa-moon text-amber-400' : 'fa-sun text-emerald-400'
              }`} />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {isEffectivelyResting ? 'Resting' : 'Active'}
            </div>
            <p className="text-xs text-slate-400">
              {isEffectivelyResting
                ? (!systemState.serverOnline || systemState.maintenanceMode ? 'សម្រាកដោយ Manual' : 'សម្រាកតាមម៉ោងយប់')
                : 'សិស្សអាច Chat បានគ្រប់ពេលវេលា'}
            </p>
          </div>

          {/* Card 3: Bots Status */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">សេវា Chatbot ទាំងពីរ</span>
              <i className="fa-solid fa-robot text-indigo-400" />
            </div>
            <div className="text-sm font-semibold text-white mb-1 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemState.konbongActive ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                <span>កូនច្បង: {systemState.konbongActive ? 'ON' : 'OFF'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemState.konpovActive ? 'bg-pink-400' : 'bg-slate-600'}`} />
                <span>កូនពៅ: {systemState.konpovActive ? 'ON' : 'OFF'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              គ្រប់គ្រងការបិទបើក Bot នីមួយៗដាច់ដោយឡែក
            </p>
          </div>

          {/* Card 4: Broadcast Notice Status */}
          <div className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
            systemState.broadcastNotice
              ? 'bg-indigo-950/30 border-indigo-500/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">សារផ្សាយលើអេក្រង់សិស្ស</span>
              <i className={`fa-solid fa-bullhorn ${systemState.broadcastNotice ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}`} />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {systemState.broadcastNotice ? 'Popup Active' : 'No Popup'}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {systemState.broadcastNotice || 'មិនទាន់មានសារផ្សាយដំណឹងបន្ទាន់'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-bullhorn" />
            <span>📢 ផ្សាយសារដំណឹង &amp; លោត Popup លើ Screen</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'master'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-power-off" />
            <span>មហាសិទ្ធបិទបើក Server</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-moon" />
            <span>កាលវិភាគសម្រាកពេលយប់</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'bots'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-sliders" />
            <span>បិទបើក Bot &amp; Session Cooldown</span>
          </button>

          <button
            onClick={() => setActiveTab('promo')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'promo'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-ticket-simple text-amber-400" />
            <span>🎟️ គ្រប់គ្រង Promo Code &amp; Bypass</span>
            {bypassRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {bypassRequests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lore')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'lore'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-brain text-emerald-400" />
            <span>📚 SETEC Lore &amp; AI Training Dataset</span>
            {loreItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {loreItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 4: BROADCAST ANNOUNCEMENT & REAL-TIME POPUP ALERT (MAIN FOCUS)       */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="max-w-4xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-bullhorn text-indigo-400" />
                  <span>ផ្សាយសារដំណឹងបន្ទាន់ &amp; លោត Popup លើអេក្រង់សិស្ស</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  សារដែលអ្នកសរសេរនៅទីនេះ នឹងលោតជាផ្ទាំង Modal Popup កណ្ដាលអេក្រង់ និងរបារខាងលើលើគ្រប់ Browser របស់សិស្សក្នុងពេល Real-time ភ្លាមៗ!
                </p>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {systemState.broadcastNotice ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>POPUP ACTIVE</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                    NO ACTIVE BROADCAST
                  </span>
                )}
              </div>
            </div>

            {/* Quick Templates Buttons */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                គំរូសាររហ័ស &bull; ចុចដើម្បីដាក់ចូលប្រអប់សរសេរ៖
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = '⚠️ Server នឹងធ្វើការ Update ប្រព័ន្ធ និងក្បួនការពារក្នុងរយៈពេល ១០ នាទីទៀត! សូមសិស្សទាំងអស់ត្រៀមខ្លួន!';
                    setEditBroadcastNotice(text);
                    isEditingBroadcastRef.current = true;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-wrench text-amber-400" />
                  <span>ថែទាំ Server ក្នុង ១០ នាទី</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = '📢 បង Rotana NOB បើកសេរីភាពឱ្យអ្នកទាំងអស់គ្នាសាកល្បង JAILBREAK AI ដោយសេរី! នរណាអាច Bypass ក្បួនការពារ AI ឱ្យជេរខ្ញុំ ឬដូរចរិកបាន ខ្ញុំសំពះ និងផុសអរគុណជាផ្លូវការ! ចូលមកសាកបាន!';
                    setEditBroadcastNotice(text);
                    isEditingBroadcastRef.current = true;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 text-xs border border-indigo-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-skull text-rose-400" />
                  <span>ប្រកាស Jailbreak AI Challenge</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = '⚡ ប្រព័ន្ធទើបតែ Update ក្បួនការពារ Edge Runtime និង Rate Limit ៧ ជាន់ថ្មី! Hacker ណាដើរ test reverse shell ប្រយ័ត្នជាប់គាំង 10 នាទីដូចឆ្កែចាំម្ចាស់!';
                    setEditBroadcastNotice(text);
                    isEditingBroadcastRef.current = true;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-bolt text-sky-400" />
                  <span>Update ក្បួនការពារថ្មី</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = '☕ រៀនសរសេរកូដកុំបាច់ Stress ពេកប្អូនៗ! AI គ្រាន់តែឆ្លើយឌឺលេងសើចទេ កុំខឹងប្រកាន់អី! Take it easy and enjoy learning web development!';
                    setEditBroadcastNotice(text);
                    isEditingBroadcastRef.current = true;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-mug-hot text-emerald-400" />
                  <span>សារ Chill &amp; រៀនកូដ</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBroadcast} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <span>ខ្លឹមសារនៃសារផ្សាយបន្ទាន់</span>
                    {isEditingBroadcastRef.current && (
                      <span className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded">
                        កំពុងកែសម្រួល... មិនទាន់រក្សាទុក
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditBroadcastNotice(systemState.broadcastNotice || '');
                        isEditingBroadcastRef.current = false;
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="ទាញយកសារដើមពី Server ឡើងវិញ"
                    >
                      <i className="fa-solid fa-rotate-left" />
                      <span>Revert ទៅតម្លៃដើម</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditBroadcastNotice('');
                        isEditingBroadcastRef.current = true;
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="លុបអត្ថបទក្នុងប្រអប់នេះទាំងអស់"
                    >
                      <i className="fa-solid fa-eraser" />
                      <span>Clear ប្រអប់</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={editBroadcastNotice}
                  onFocus={() => {
                    isEditingBroadcastRef.current = true;
                  }}
                  onChange={(e) => {
                    setEditBroadcastNotice(e.target.value);
                    isEditingBroadcastRef.current = true;
                  }}
                  placeholder="វាយបញ្ចូលសារបន្ទាន់នៅទីនេះ... សារនេះអាចចុះបន្ទាត់ ប្រើ Emoji និងកែប្រែបានតាមចិត្ត!"
                  className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed selection:bg-indigo-600 selection:text-white"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                  <span>ប្រវែងអក្សរ: {editBroadcastNotice.length} តួអក្សរ</span>
                  <span>ចុច Save ដើម្បីឱ្យ Popup លោតលើអេក្រង់សិស្សទាំងអស់ភ្លាមៗ</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={() => setShowPopupPreview(true)}
                    disabled={!editBroadcastNotice.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-eye text-indigo-400" />
                    <span>សាកល្បងមើល Popup</span>
                  </button>

                  {/* Clear from Server Button */}
                  {systemState.broadcastNotice && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditBroadcastNotice('');
                        isEditingBroadcastRef.current = false;
                        sendUpdate({ broadcastNotice: '' }, 'លុបសារផ្សាយ និងបិទ Popup លើអេក្រង់សិស្សទាំងអស់');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-trash-can" />
                      <span>លុបសារ &amp; បិទ Popup លើសិស្សទាំងអស់</span>
                    </button>
                  )}
                </div>

                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <i className="fa-solid fa-paper-plane" />
                    <span>ផ្សាយចេញ &amp; លោត Popup លើអេក្រង់សិស្សភ្លាមៗ</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Live Inline Card Preview */}
            {editBroadcastNotice.trim() && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <i className="fa-solid fa-mobile-screen text-indigo-400" />
                    <span>គំរូជាក់ស្ដែងលើអេក្រង់សិស្ស:</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Modal Popup Center Screen</span>
                </div>

                <div className="bg-gray-100 border border-gray-300 rounded-2xl p-5 shadow-xl relative overflow-hidden text-gray-900">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400" />
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
                    <div>
                      <div className="text-sm font-bold text-gray-900">សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រង Rotana NOB</div>
                      <div className="text-[11px] text-gray-500">ការជូនដំណឹងពីប្រព័ន្ធ Mode សាកល្បង</div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">
                    {editBroadcastNotice.trim()}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <span className="px-5 py-2 rounded-xl bg-gray-800 text-white text-xs font-medium cursor-default">
                      យល់ព្រម
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MASTER SERVER CONTROLS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'master' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Master Kill Switch Card */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-power-off text-indigo-400" />
                    <span>Master Kill Switch &bull; បិទ/បើក Server ភ្លាមៗ</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    នៅពេលបិទ Server សិស្សទាំងអស់នឹងឃើញសារថែទាំភ្លាមៗ Creator Rotana NOB នៅតែអាច Bypass និងតេស្តបានជានិច្ច
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  systemState.serverOnline && !systemState.maintenanceMode
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {systemState.serverOnline && !systemState.maintenanceMode ? 'SERVER ONLINE' : 'MAINTENANCE MODE'}
                </span>
              </div>

              {/* Toggle Action Button */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-sm font-semibold text-white">
                    {systemState.serverOnline && !systemState.maintenanceMode
                      ? 'Server កំពុងដំណើរការជាសាធារណៈ'
                      : 'Server កំពុងស្ថិតក្នុងរបៀបថែទាំ'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    ចុចប៊ូតុងខាងស្ដាំដើម្បីផ្លាស់ប្តូរស្ថានភាព Server ក្នុងពេល Real-time ភ្លាមៗ
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleServer}
                  disabled={isSubmitting}
                  className={`px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all whitespace-nowrap cursor-pointer ${
                    systemState.serverOnline && !systemState.maintenanceMode
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  } disabled:opacity-50`}
                >
                  <i className={`fa-solid ${
                    systemState.serverOnline && !systemState.maintenanceMode ? 'fa-power-off' : 'fa-play'
                  }`} />
                  <span>
                    {systemState.serverOnline && !systemState.maintenanceMode
                      ? 'បិទ Server ដាក់ Maintenance ឥឡូវ'
                      : 'បើកដំណើរការ Server ឡើងវិញ'}
                  </span>
                </button>
              </div>

              {/* Quick Templates Buttons for Maintenance */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  គំរូសាររហ័ស &bull; ចុចដើម្បីដាក់ចូលប្រអប់សរសេរ៖
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = 'ប្រព័ន្ធកំពុងសម្រាកបណ្ដោះអាសន្ន ៣០ នាទី ដើម្បីពង្រឹង Server និងកូតា AI សម្រាប់សិស្ស SETEC ទាំងអស់គ្នា!';
                      setEditMaintenanceReason(text);
                      isEditingMaintenanceRef.current = true;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-clock text-amber-400" />
                    <span>សម្រាក ៣០ នាទី</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'ប្រព័ន្ធកំពុង Update ក្បួនការពារ AI និងកែសម្រួល Code មួយភ្លែត តិចទៀតបើកវិញហើយ!';
                      setEditMaintenanceReason(text);
                      isEditingMaintenanceRef.current = true;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-shield-halved text-sky-400" />
                    <span>Update ក្បួនការពារ AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'ប្រព័ន្ធផ្អាកមួយរយៈខ្លីដើម្បីទប់ស្កាត់ Spam Chat និង Reset Token ឱ្យស្រួលបួលឡើងវិញ!';
                      setEditMaintenanceReason(text);
                      isEditingMaintenanceRef.current = true;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-broom text-emerald-400" />
                    <span>កាត់ផ្ដាច់ទប់ស្កាត់ Spam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = 'បង Rotana កំពុងសម្រួល Server ឱ្យដើរស្រួល កុំទាន់ស្លន់ អង្គុយ Chill ផឹកកាហ្វេសិនទៅ តិចទៀតបើកវិញហើយ!';
                      setEditMaintenanceReason(text);
                      isEditingMaintenanceRef.current = true;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-mug-hot text-amber-500" />
                    <span>Chill ផឹកកាហ្វេសិន</span>
                  </button>
                </div>
              </div>

              {/* Maintenance Notice Editor */}
              <form onSubmit={handleSaveMaintenanceConfig} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <span>សារជូនដំណឹងពេលថែទាំ Server សម្រាប់បង្ហាញលើផ្ទាំង Chat របស់សិស្ស</span>
                      {isEditingMaintenanceRef.current && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          កំពុងកែសម្រួល... មិនទាន់រក្សាទុក
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMaintenanceReason(systemState.maintenanceReason || '');
                          isEditingMaintenanceRef.current = false;
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="ទាញយកសារដើមពី Server ឡើងវិញ"
                      >
                        <i className="fa-solid fa-rotate-left" />
                        <span>Revert ទៅតម្លៃដើម</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMaintenanceReason('');
                          isEditingMaintenanceRef.current = true;
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="លុបអត្ថបទក្នុងប្រអប់នេះទាំងអស់"
                      >
                        <i className="fa-solid fa-eraser" />
                        <span>Clear ប្រអប់</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={editMaintenanceReason}
                    onFocus={() => {
                      isEditingMaintenanceRef.current = true;
                    }}
                    onChange={(e) => {
                      setEditMaintenanceReason(e.target.value);
                      isEditingMaintenanceRef.current = true;
                    }}
                    placeholder="បញ្ចូលសារពន្យល់ពីការថែទាំ... សារនេះអាចចុះបន្ទាត់ និងកែប្រែបានតាមចិត្តសេរី!"
                    className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed selection:bg-indigo-600 selection:text-white"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                    <span>ប្រវែងអក្សរ: {editMaintenanceReason.length} តួអក្សរ</span>
                    <span>សារនេះនឹងបង្ហាញប្រាប់សិស្ស SETEC ពេលពួកគេព្យាយាមចូលលេងកំឡុងពេលថែទាំ</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMaintenancePreview(true)}
                    disabled={!editMaintenanceReason.trim()}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-eye text-indigo-400" />
                    <span>សាកល្បងមើលផ្ទាំងជាក់ស្ដែង</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {systemState.serverOnline && !systemState.maintenanceMode && (
                      <button
                        type="button"
                        onClick={() => {
                          const patch = {
                            serverOnline: false,
                            maintenanceMode: true,
                            maintenanceReason: editMaintenanceReason.trim()
                          };
                          sendUpdate(patch, 'បិទ Server និងដាក់សារថែទាំភ្លាមៗ');
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <i className="fa-solid fa-power-off" />
                        <span>បិទ Server ដាក់សារនេះភ្លាមៗ</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <i className="fa-solid fa-floppy-disk" />
                      <span>រក្សាទុកសារថែទាំ</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Quick Control & Diagnostic Panel */}
            <div className="space-y-6">
              {/* Emergency Cache & Rate Limit Flush */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-rotate-left text-amber-400" />
                  <span>សម្អាត Cooldown &amp; Bans</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  ប្រសិនបើសិស្សមកលេងច្រើន ហើយជាប់ Lockout 30 នាទី ឬចៃដន្យជាប់ Rate Limit អ្នកអាច Flush សម្អាតចោលភ្លាមៗ។
                </p>

                <button
                  type="button"
                  onClick={handleFlushRateLimits}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-trash-can" />
                  <span>សម្អាត Session Locks &amp; Cooldown ទាំងអស់</span>
                </button>
              </div>

              {/* System Architecture Diagnostic */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-gauge-high text-indigo-400" />
                  <span>ព័ត៌មានបច្ចេកទេស Gateway</span>
                </h3>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Cloud Provider</span>
                  <span className="text-slate-200 font-medium">Vercel Serverless Edge</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="text-slate-200 font-medium">Firebase RTDB (Singapore)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">AI Model Protocol</span>
                  <span className="text-slate-200 font-medium">Gemini 3.5 / 3.8 Flash Fallback</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400">ការធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</span>
                  <span className="text-slate-200 font-medium font-mono">
                    {systemState.lastUpdated ? new Date(systemState.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: NIGHT REST SCHEDULE                                                */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-moon text-indigo-400" />
                    <span>កាលវិភាគសម្រាកពេលយប់ Automated Night Rest</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    កំណត់ម៉ោងឱ្យ Server និងកូតា AI សម្រាកស្វ័យប្រវត្តិកំឡុងពេលយប់ ដើម្បីកុំឱ្យសិស្សលេងអស់ Quota ឬរំខាន
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleNightSchedule}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    systemState.nightScheduleEnabled
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${systemState.nightScheduleEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                  <span>{systemState.nightScheduleEnabled ? 'កាលវិភាគ: បើក' : 'កាលវិភាគ: ផ្អាក'}</span>
                </button>
              </div>

              {/* Schedule Form */}
              <form onSubmit={handleSaveScheduleConfig} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ម៉ោងចាប់ផ្ដើមសម្រាក ម៉ោងនៅភ្នំពេញ
                    </label>
                    <select
                      value={editNightStart}
                      onChange={(e) => setEditNightStart(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {[...Array(24).keys()].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}:00 {h >= 12 ? 'រសៀល ឬយប់' : 'ព្រឹក'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ម៉ោងបញ្ចប់ការសម្រាក ម៉ោងនៅភ្នំពេញ
                    </label>
                    <select
                      value={editNightEnd}
                      onChange={(e) => setEditNightEnd(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {[...Array(24).keys()].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}:00 {h >= 12 ? 'រសៀល ឬយប់' : 'ព្រឹក'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      សារពន្យល់ពេលយប់ សម្រាប់បង្ហាញដល់សិស្សកំឡុងពេលសម្រាក
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditNightMessage(systemState.nightRestMessage || '');
                        isEditingNightMessageRef.current = false;
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="ទាញយកសារដើមពី Server ឡើងវិញ"
                    >
                      <i className="fa-solid fa-rotate-left" />
                      <span>Revert ទៅតម្លៃដើម</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={editNightMessage}
                    onFocus={() => {
                      isEditingNightMessageRef.current = true;
                    }}
                    onChange={(e) => {
                      setEditNightMessage(e.target.value);
                      isEditingNightMessageRef.current = true;
                    }}
                    placeholder="បញ្ចូលសារពន្យល់ពេលយប់..."
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSleepModePreview(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <i className="fa-solid fa-moon text-indigo-400" />
                    <span>សាកល្បងមើលផ្ទាំង Sleep Mode Full Screen</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-floppy-disk" />
                    <span>រក្សាទុកកាលវិភាគ</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Schedule Details Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-indigo-400" />
                <span>របៀបដំណើរការកាលវិភាគ</span>
              </h3>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <i className="fa-solid fa-bell" />
                  <span>ស្វ័យប្រវត្តិនឹងបិទចរាចរណ៍សាធារណៈ</span>
                </div>
                <p className="text-slate-400">
                  នៅពេលម៉ោងក្នុងប្រទេសកម្ពុជាឈានចូលដល់ {String(systemState.nightStartHour ?? 2).padStart(2, '0')}:00 ប្រព័ន្ធនឹងដាក់ AI ឱ្យសម្រាកគេង Sleep Mode រហូតដល់ម៉ោង {String(systemState.nightEndHour ?? 6).padStart(2, '0')}:00 ព្រឹក។
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <i className="fa-solid fa-shield-check" />
                  <span>Rotana NOB Bypass 100%</span>
                </div>
                <p className="text-slate-400">
                  ទោះបីជាស្ថិតក្នុងម៉ោងសម្រាកពេលយប់ក៏ដោយ ក៏ Creator Rotana NOB នៅតែអាចចូល Chat និង Debugging បានជាធម្មតាដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BOTS & SESSION LIMITS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'bots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KonBong Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center text-xl">
                      <i className="fa-solid fa-robot" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">ស៊ីតិច Chatbot កូនច្បង</h3>
                      <p className="text-xs text-slate-400">Male AI Troll Specialist &bull; Voice Puck</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    systemState.konbongActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {systemState.konbongActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  នៅពេលបិទបងកូនច្បង សិស្សដែលចូលទៅកាន់ /KonBong នឹងឃើញផ្ទាំង Real-time Popup ប្រាប់ពីសារខាងក្រោម និងណែនាំឱ្យទៅលេងជាមួយចែកូនពៅវិញ។
                </p>

                {/* Custom Content Text Input when Paused */}
                <div className="mb-5 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-bullhorn text-[10px]" />
                      <span>សារប្រាប់សិស្សពេលផ្អាក (Custom Content Text):</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveKonBongNotice}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <i className="fa-solid fa-check text-[9px]" />
                      <span>Save Notice</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={editKonBongNotice}
                    onChange={(e) => {
                      setEditKonBongNotice(e.target.value);
                      isEditingKonBongNoticeRef.current = true;
                    }}
                    placeholder="ឧ. បងកូនច្បងកំពុង Update កូដប្រព័ន្ធ... សូមទៅលេងជាមួយចែកូនពៅសិន!"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors font-sans"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleKonBong}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  systemState.konbongActive
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.konbongActive ? 'fa-pause' : 'fa-play'}`} />
                <span>{systemState.konbongActive ? 'ផ្អាកបងកូនច្បង' : 'បើកបងកូនច្បងឡើងវិញ'}</span>
              </button>
            </div>

            {/* KonPov Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-pink-950 border border-pink-700/60 text-pink-400 flex items-center justify-center text-xl">
                      <i className="fa-solid fa-robot" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">ស៊ីតិច Chatbot កូនពៅ</h3>
                      <p className="text-xs text-slate-400">Female AI Troll Specialist &bull; Voice Aoede</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    systemState.konpovActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {systemState.konpovActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  នៅពេលបិទចែកូនពៅ សិស្សដែលចូលទៅកាន់ /KonPov នឹងឃើញផ្ទាំង Real-time Popup ប្រាប់ពីសារខាងក្រោម និងណែនាំឱ្យទៅលេងជាមួយបងកូនច្បងវិញ។
                </p>

                {/* Custom Content Text Input when Paused */}
                <div className="mb-5 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-pink-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-bullhorn text-[10px]" />
                      <span>សារប្រាប់សិស្សពេលផ្អាក (Custom Content Text):</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveKonPovNotice}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 rounded-md bg-pink-600/80 hover:bg-pink-600 text-white text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <i className="fa-solid fa-check text-[9px]" />
                      <span>Save Notice</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={editKonPovNotice}
                    onChange={(e) => {
                      setEditKonPovNotice(e.target.value);
                      isEditingKonPovNoticeRef.current = true;
                    }}
                    placeholder="ឧ. ចែកូនពៅកំពុង Update កូដប្រព័ន្ធ... សូមទៅលេងជាមួយបងកូនច្បងសិន!"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-pink-500 transition-colors font-sans"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleKonPov}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  systemState.konpovActive
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
                    : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.konpovActive ? 'fa-pause' : 'fa-play'}`} />
                <span>{systemState.konpovActive ? 'ផ្អាកចែកូនពៅ' : 'បើកចែកូនពៅឡើងវិញ'}</span>
              </button>
            </div>

            {/* 30-Minute Session Limiter Card */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">ប្រព័ន្ធកំណត់ពេល 30 នាទីក្នុង 1 លើក</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    systemState.sessionLimitActive ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {systemState.sessionLimitActive ? 'ENFORCED' : 'OFF UNLIMITED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  ប្រសិនបើបើក: សិស្សលេងបានត្រឹម 30 នាទីក្នុង 1 លើក រួចត្រូវសម្រាក 10 នាទីដើម្បីចែកវេនគ្នា។ ប្រសិនបើបិទ: សិស្សអាច Chat បានដោយសេរីគ្មានដែនកំណត់ពេលវេលា។
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleSessionLimit}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  systemState.sessionLimitActive
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.sessionLimitActive ? 'fa-lock' : 'fa-lock-open'}`} />
                <span>{systemState.sessionLimitActive ? 'បិទការកំណត់ពេលគ្មានដែនកំណត់' : 'បើកការកំណត់ពេល 30 នាទី'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROMO CODE & BYPASS MANAGEMENT (ROTANA NOB 100% AUTHORITY)         */}
        {/* ========================================================================= */}
        {activeTab === 'promo' && (
          <div className="space-y-6">
            {/* Header & Refresh */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-ticket-simple text-amber-400" />
                  <span>🎟️ គ្រប់គ្រង Promo Code &amp; បញ្ចូល Bypass (Rotana 100% Authority)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  បង Rotana មានសិទ្ធិផ្ដល់កូដ ឬបង្កើត Promo Code ដោយផ្ទាល់ដៃសម្រាប់ bypass ម៉ោងសម្រាក +30 នាទីជូន User។
                </p>
              </div>

              <button
                type="button"
                onClick={fetchPromoData}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-rotate text-xs" />
                <span>Refresh ទិន្នន័យ</span>
              </button>
            </div>

            {/* SECTION 1: Live User Bypass Requests */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    📥 សំណើសុំ Promo Code Bypass ពីសិស្ស ({bypassRequests.filter((r) => r.status === 'pending').length} កំពុងរង់ចាំ)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Fallback 35s អូតូផ្ដល់កូដករណីបងរវល់
                </span>
              </div>

              {bypassRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <i className="fa-regular fa-folder-open text-2xl mb-2 block opacity-40" />
                  មិនទាន់មានសំណើសុំ Promo Code នៅឡើយទេ
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {bypassRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isPending
                            ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                            : isApproved
                            ? 'bg-emerald-950/15 border-emerald-500/30'
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-100">
                                👤 {req.username || 'User'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-indigo-300">
                                Bot: {req.bot || 'konpov'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                                    : isApproved
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {isPending ? '⏳ កំពុងរង់ចាំ (Pending)' : isApproved ? `✅ យល់ព្រម (${req.code})` : '❌ បានបដិសេធ'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Device: {req.deviceId || 'N/A'} &bull; ម៉ោង៖ {req.createdAt ? new Date(req.createdAt).toLocaleTimeString('en-US', { hour12: true }) : 'N/A'}
                            </p>
                          </div>

                          {/* Quick Actions for Pending Requests */}
                          {isPending && (
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="text"
                                placeholder="កូដផ្ទាល់ដៃ (ឬទទេ)..."
                                value={customApproveCodes[req.id] || ''}
                                onChange={(e) =>
                                  setCustomApproveCodes((prev) => ({
                                    ...prev,
                                    [req.id]: e.target.value
                                  }))
                                }
                                className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                              />
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req.id, customApproveCodes[req.id])}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                              >
                                <i className="fa-solid fa-check text-[10px]" />
                                <span>ផ្ដល់កូដ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                              >
                                <i className="fa-solid fa-xmark text-[10px]" />
                                <span>បដិសេធ</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: Create New Promo Code */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-plus-circle text-indigo-400" />
                <span>បង្កើត Promo Code ថ្មី (Create New Code)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    លេខកូដ Promo Code (Code String)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="ឧ. ROTANA-VIP-8A2F"
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let rand = '';
                        for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
                        setNewPromoCode(`ROTANA-VIP-${rand}`);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shrink-0"
                      title="Randomize Code"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ចំនួនដងអតិបរមាដែលអាចប្រើបាន (Max Uses)
                  </label>
                  <select
                    value={newPromoMaxUses}
                    onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value={1}>1 ដង (Single-use VIP)</option>
                    <option value={5}>5 ដង</option>
                    <option value={10}>10 ដង (Standard)</option>
                    <option value={50}>50 ដង</option>
                    <option value={100}>100 ដង</option>
                    <option value={999999}>គ្មានដែនកំណត់ (Unlimited)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    សុពលភាពម៉ោងប្រើប្រាស់ (Duration)
                  </label>
                  <select
                    value={newPromoDurationHours}
                    onChange={(e) => setNewPromoDurationHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value={12}>12 ម៉ោង</option>
                    <option value={24}>24 ម៉ោង (1 ថ្ងៃ)</option>
                    <option value={48}>48 ម៉ោង (2 ថ្ងៃ)</option>
                    <option value={168}>7 ថ្ងៃ (1 សប្ដាហ៍)</option>
                    <option value={8760}>1 ឆ្នាំ (Permanent)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreatePromoCode}
                disabled={isSubmittingPromo}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-floppy-disk text-xs" />
                <span>រក្សាទុក Promo Code ថ្មីទៅកាន់ប្រព័ន្ធ</span>
              </button>
            </div>

            {/* SECTION 3: Active Promo Codes List Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
                <span>📋 តារាង Promo Codes ក្នុងប្រព័ន្ធ ({promoCodesList.length} កូដ)</span>
                <span className="text-[11px] text-slate-400">ផ្ទៀងផ្ទាត់ 100% ត្រឹមត្រូវតាម Database</span>
              </h3>

              {promoCodesList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  មិនទាន់មាន Promo Code ណាត្រូវបានបង្កើតនៅឡើយទេ
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-2.5 px-3">លេខកូដ (Code)</th>
                        <th className="pb-2.5 px-3">ចំនួនប្រើប្រាស់ (Used/Max)</th>
                        <th className="pb-2.5 px-3">កាលបរិច្ឆេទបង្កើត</th>
                        <th className="pb-2.5 px-3">ផុតកំណត់នៅ</th>
                        <th className="pb-2.5 px-3 text-right">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {promoCodesList.map((item) => {
                        const isExpired = item.expiresAt && Date.now() > item.expiresAt;
                        const isMaxed = item.maxUses && item.usedCount >= item.maxUses;

                        return (
                          <tr key={item.code} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-3 font-mono font-bold text-amber-300">
                              {item.code}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <span className="font-mono font-bold">{item.usedCount || 0}</span> /{' '}
                              <span className="text-slate-400">{item.maxUses >= 99999 ? '∞' : item.maxUses}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-3">
                              {isExpired ? (
                                <span className="text-rose-400 font-bold">ផុតកំណត់ហើយ</span>
                              ) : isMaxed ? (
                                <span className="text-orange-400 font-bold">អស់ចំនួនប្រើ</span>
                              ) : (
                                <span className="text-emerald-400 font-semibold">
                                  {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'គ្មាន'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeletePromoCode(item.code)}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 transition cursor-pointer"
                                title="លុបកូដនេះ"
                              >
                                <i className="fa-solid fa-trash-can text-xs" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SETEC LORE CONTRIBUTIONS & AI TRAINING DATASET AGGREGATION         */}
        {/* ========================================================================= */}
        {activeTab === 'lore' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Stats & Actions */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[11px] font-bold">
                      <i className="fa-solid fa-database mr-1" /> AI TRAINING PIPELINE
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      សរុប {loreItems.length} រឿង
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-1.5">
                    ប្រមូលផ្ដុំ SETEC Lore &amp; កញ្ចប់ទិន្នន័យ AI Training ប្រចាំសប្ដាហ៍
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    រាល់ Lore ឬរឿងរ៉ាវពិតនៅសាលា ស៊ីតិច ដែល User បាន Submit នឹងត្រូវប្រមូលផ្ដុំនៅទីនេះ។
                    បង Rotana NOB អាចចុចផ្ញើឯកសារទាំងមូល (ទាំង JSON និង TXT) ទៅកាន់ Telegram រៀងរាល់ ១ អាទិត្យម្ដង ដើម្បី Review និងយកទៅ Train បង្រៀន AI តទៀត!
                  </p>
                </div>

                {/* Primary Telegram Dispatch & Download Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportWeeklyLoreToTelegram}
                    disabled={isExportingLore}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <i className={`fa-solid ${isExportingLore ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
                    <span>{isExportingLore ? 'កំពុងផ្ញើ...' : 'ផ្ញើឯកសារប្រចាំសប្ដាហ៍ទៅ Telegram'}</span>
                  </button>

                  <a
                    href="/api/export-lore?action=download_json"
                    download
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                    title="ទាញយកជា JSON Dataset"
                  >
                    <i className="fa-solid fa-file-code" />
                    <span>Download JSON</span>
                  </a>

                  <a
                    href="/api/export-lore?action=download_txt"
                    download
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                    title="ទាញយកជា TXT អានពេញលេញ"
                  >
                    <i className="fa-solid fa-file-lines" />
                    <span>Download TXT</span>
                  </a>

                  <button
                    type="button"
                    onClick={fetchLoreData}
                    disabled={isLoadingLore}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700"
                    title="Refresh Data"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-xs ${isLoadingLore ? 'fa-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Status Alert Banner */}
              {loreExportStatus && (
                <div
                  className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                    loreExportStatus.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${loreExportStatus.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-rose-400'}`} />
                    <span>{loreExportStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoreExportStatus(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
              )}
            </div>

            {/* Lore Cards List */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-list-check text-emerald-400" />
                <span>បញ្ជីទិន្នន័យ LORE ដែលបាន Submit ពី User ({loreItems.length})</span>
              </h3>

              {isLoadingLore ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin text-emerald-400 text-base" />
                  <span>កំពុងទាញយកទិន្នន័យ...</span>
                </div>
              ) : loreItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <i className="fa-solid fa-folder-open text-2xl text-slate-600 mb-2 block" />
                  <span>មិនទាន់មានទិន្នន័យ Lore ណាត្រូវបាន Submit នៅឡើយទេ</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {loreItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-300 font-bold text-[10px] flex items-center justify-center border border-emerald-800/80">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {item.username || 'Anonymous'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-emerald-300 font-mono">
                            {item.category || 'Lore'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                          <span>{item.submittedAtCambodia || 'Unknown'}</span>
                          <span className="text-slate-500">{item.device || ''}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap select-text bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TEST POPUP MODAL PREVIEW OVERLAY FOR ADMIN                */}
      {/* ========================================================= */}
      {showPopupPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-gray-100 border border-gray-300 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 text-gray-900">
            {/* Top Gray Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-gray-300">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រង Rotana NOB
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  ការជូនដំណឹងពីប្រព័ន្ធ Mode សាកល្បង
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPopupPreview(false)}
                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="បិទផ្ទាំងសាកល្បង"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 sm:p-5 mb-5 max-h-[55vh] overflow-y-auto shadow-sm">
              <p className="text-sm sm:text-base font-sans text-gray-800 leading-relaxed whitespace-pre-wrap break-words select-text font-medium">
                {editBroadcastNotice.trim() || 'មិនទាន់មានអត្ថបទ... សូមវាយបញ្ចូលសារក្នុងប្រអប់សិន!'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <span>ផ្ទាំងនេះជា Mode សាកល្បង Preview</span>
              </div>

              <button
                type="button"
                onClick={() => setShowPopupPreview(false)}
                className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs sm:text-sm shadow transition-all flex items-center justify-center cursor-pointer"
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TEST SLEEP MODE FULL SCREEN PREVIEW OVERLAY FOR ADMIN   */}
      {/* 100% Full Screen, 100% Solid Opaque (No background visible) */}
      {/* ========================================================= */}
      {showSleepModePreview && (
        <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#060c1c] to-slate-950 pointer-events-none" />

          <div className="w-full max-w-lg relative z-10 flex flex-col items-center text-center my-auto py-6">
            {/* Mascot Section */}
            <div className="relative mb-2">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/40 flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-500/20">
                <svg
                  width="80"
                  height="65"
                  viewBox="0 0 115 85"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="overflow-visible drop-shadow-md"
                >
                  <path d="M82 16 H90 L84 23 H92" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M94 7 H99 L95 11 H100" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="20" y="44" width="75" height="30" rx="12" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="57" cy="38" r="23" fill="#FED7AA" />
                  <path d="M36 34 C36 18 50 12 62 12 C74 12 80 20 80 34 Z" fill="#4338CA" />
                  <path d="M76 20 C88 20 92 28 90 35" stroke="#4338CA" strokeWidth="6" strokeLinecap="round" fill="none" />
                  <circle cx="90" cy="37" r="5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
                  <path d="M46 41 C48 43.5 51 43.5 53 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M61 41 C63 43.5 66 43.5 68 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <circle cx="43" cy="45" r="3.5" fill="#F87171" opacity="0.6" />
                  <circle cx="71" cy="45" r="3.5" fill="#F87171" opacity="0.6" />
                  <path d="M55 46 C57 48 59 48 61 46" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M28 62 C28 53 40 50 57 50 C74 50 86 53 86 62 Z" fill="#312E81" />
                  <ellipse cx="44" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#4338CA" strokeWidth="1" />
                  <ellipse cx="70" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#4338CA" strokeWidth="1" />
                </svg>
              </div>
              <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-600 border-2 border-indigo-300 text-amber-200 text-xs shadow-lg animate-pulse">
                <i className="fa-solid fa-moon" />
              </span>
            </div>

            {/* Sleep Mode Placard */}
            <div className="w-full bg-slate-900 border border-indigo-500/30 rounded-2xl px-5 py-3 mb-2 shadow-xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-widest bg-indigo-950 border border-indigo-800/80 px-3 py-0.5 rounded-full mb-1.5">
                <i className="fa-solid fa-stars text-indigo-400" />
                <span>ម៉ោងគេងសម្រាក • SLEEP MODE {String(editNightStart).padStart(2, '0')}:00 ដល់ {String(editNightEnd).padStart(2, '0')}:00</span>
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                "ពេលយប់ជ្រៅហើយ AI សុំគេងសិនហើយបងៗ"
              </h2>
            </div>

            {/* Notice Message Box */}
            <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 mb-4 text-left space-y-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-950/90 border border-indigo-800/80 px-2.5 py-1 rounded-lg">
                  បញ្ជាក់៖ មិនមែនបិទប្រព័ន្ធ ឬខូច Server ទេ!
                </span>
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-sans text-slate-100 font-bold mb-1.5 leading-snug">
                  ប្រព័ន្ធស្ថិតក្នុងម៉ោងសម្រាក Sleep Mode: {String(editNightStart).padStart(2, '0')}:00 ដល់ {String(editNightEnd).padStart(2, '0')}:00
                </h3>
                <p className="text-xs sm:text-sm font-sans text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                  {editNightMessage.trim() || systemState.nightRestMessage || 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                យប់ជ្រៅពេកហើយ គេងសិនទៅបងៗ កុំនៅយឺតពេកប្រយ័ត្នខូចភ្នែក! ប្រព័ន្ធនឹងភ្ញាក់មកដំណើរការធម្មតាវិញនៅម៉ោង {String(editNightEnd).padStart(2, '0')}:00 ព្រឹក។
              </div>
            </div>

            {/* Time Info */}
            <div className="w-full text-xs text-slate-400 mb-4 flex items-center justify-between font-sans px-2">
              <span className="flex items-center gap-2 font-medium text-slate-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Sleep Mode {String(editNightStart).padStart(2, '0')}:00 ដល់ {String(editNightEnd).padStart(2, '0')}:00</span>
              </span>
              <span>ម៉ោងនៅភ្នំពេញ: {String(cambodiaHour).padStart(2, '0')}:00 UTC+7</span>
            </div>

            {/* Action Button to close test preview */}
            <div className="flex items-center justify-between gap-3 w-full pt-1">
              <span className="text-[11px] text-indigo-400 font-sans">Mode សាកល្បងមើលផ្ទាំង Sleep Mode Full Screen</span>
              <button
                type="button"
                onClick={() => setShowSleepModePreview(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
              >
                យល់ព្រម និងបិទផ្ទាំងសាកល្បង
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TEST MAINTENANCE FULL SCREEN PREVIEW OVERLAY FOR ADMIN  */}
      {/* 100% Full Screen, 100% Solid Opaque (No background visible) */}
      {/* ========================================================= */}
      {showMaintenancePreview && (
        <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#130d07] to-slate-950 pointer-events-none" />

          <div className="w-full max-w-lg relative z-10 flex flex-col items-center text-center my-auto py-6">
            {/* Header Placard */}
            <div className="w-full bg-slate-900 border border-amber-500/30 rounded-2xl px-5 py-3 mb-4 shadow-xl text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-widest bg-amber-950 border border-amber-800/80 px-3 py-0.5 rounded-full mb-1.5">
                <i className="fa-solid fa-gear text-amber-400" />
                <span>សារលើកផ្លាកប្រាប់ដំណឹង • MAINTENANCE MODE</span>
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រងប្រព័ន្ធ
              </h2>
            </div>

            {/* Notice Message Box */}
            <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 mb-4 text-left space-y-3 shadow-2xl">
              <div>
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider mb-1.5">
                  មូលហេតុបិទប្រព័ន្ធ Server Maintenance Notice
                </span>
                <p className="text-sm sm:text-base font-sans text-slate-100 font-semibold leading-relaxed whitespace-pre-wrap break-words">
                  {editMaintenanceReason.trim() || systemState.maintenanceReason || 'ប្រព័ន្ធកំពុងសម្រាកបណ្ដោះអាសន្ន'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                អ្នកគ្រប់គ្រងកំពុងរៀបចំសម្រួលប្រព័ន្ធឱ្យស្រួលបួលឡើងវិញ បន្តិចទៀតរួចរាល់ហើយ។
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 w-full pt-1">
              <span className="text-[11px] text-amber-400 font-sans">Mode សាកល្បងមើលផ្ទាំង Maintenance Full Screen</span>
              <button
                type="button"
                onClick={() => setShowMaintenancePreview(false)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-amber-600/30 transition-all"
              >
                យល់ព្រម និងបិទផ្ទាំងសាកល្បង
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Toast Notification */}
      {statusMessage.text && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl flex items-center gap-3 backdrop-blur-md text-white text-xs sm:text-sm font-medium animate-fade-in max-w-[90vw]">
          <i
            className={`fa-solid ${
              statusMessage.type === 'success'
                ? 'fa-circle-check text-emerald-400'
                : statusMessage.type === 'error'
                ? 'fa-triangle-exclamation text-rose-400'
                : 'fa-circle-info text-sky-400'
            }`}
          />
          <span className="truncate">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage({ text: '', type: '' })}
            className="text-slate-400 hover:text-white ml-2 p-1 cursor-pointer shrink-0"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        SETEC Neural Core &bull; Supreme Master Command &bull; Engineered by Rotana NOB &bull; {new Date().getFullYear()}
      </footer>

      {/* ========================================================= */}
      {/* BOT PAUSE CONFIRMATION & CONTENT NOTICE MODAL             */}
      {/* Prompts Admin to enter Custom Notice text before pausing  */}
      {/* ========================================================= */}
      {pauseBotTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white animate-in fade-in duration-150"
          onClick={() => setPauseBotTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl relative text-white font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                  <i className="fa-solid fa-pause text-lg" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>ផ្អាកដំណើរការ {pauseBotTarget === 'konbong' ? 'បងកូនច្បង (KonBong)' : 'ចែកូនពៅ (KonPov)'}</span>
                  </h2>
                  <p className="text-xs text-rose-300 font-sans">
                    សរសេរសារ Content Notice ដែលនឹងលោត Real-time Popup លើអេក្រង់សិស្ស
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPauseBotTarget(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="បិទ"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                ជ្រើសរើសសាររហ័ស (Quick Presets):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  `កំពុង Update កូដប្រព័ន្ធ និងពង្រឹងមុខងារឆ្លើយតប... សូមទៅលេងជាមួយ ${pauseBotTarget === 'konbong' ? 'ចែកូនពៅ' : 'បងកូនច្បង'} សិនណា៎!`,
                  `ម៉ោងសម្រាកកូតា API បណ្ដោះអាសន្ន! សូមអញ្ជើញទៅជជែកជាមួយ ${pauseBotTarget === 'konbong' ? 'ចែកូនពៅ' : 'បងកូនច្បង'} ជំនួសវិញ!`,
                  `កំពុងត្រួតពិនិត្យសុវត្ថិភាព Server និងប្រព័ន្ធទិន្នន័យ... តិចទៀតបើកដំណើរការវិញហើយ!`,
                  `សូមសម្រាកមួយភ្លែតណា៎ Chill ផឹកទឹកសិន! តិចទៀតត្រឡប់មកវិញហើយ!`
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPauseModalNotice(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors text-left line-clamp-1 cursor-pointer"
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>ខ្លឹមសារជូនដំណឹង (Content Notice Text):</span>
                <span className="text-slate-400 text-[10px]">{pauseModalNotice.length} តួអក្សរ</span>
              </label>
              <textarea
                rows={3}
                value={pauseModalNotice}
                onChange={(e) => setPauseModalNotice(e.target.value)}
                placeholder="បញ្ចូលសារប្រាប់សិស្ស... សារនេះនឹងលោតជា Real-time Popup ភ្លាមៗនៅលើទូរស័ព្ទ និងកុំព្យូទ័ររបស់សិស្ស!"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 transition-colors leading-relaxed font-sans"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPauseBotTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleConfirmPauseBot}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-bullhorn text-xs" />
                <span>ផ្អាកភ្លាម & ផ្សាយ Real-time Popup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {renderPwaGuideModal()}
    </main>
  );
}
