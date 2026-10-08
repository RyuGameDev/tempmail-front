import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  History,
  Inbox,
  Key,
  LoaderCircle,
  Mail,
  MessageCircle,
  Music2,
  Moon,
  Power,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  Wand2,
  X
} from 'lucide-react';
import { api } from './api.js';

const savedMailboxKey = 'ryudev-temp-mailbox-id';
const savedMailboxHistoryKey = 'ryudev-temp-mailbox-history';
const savedMusicKey = 'ryudev-temp-music-enabled-v2';
const savedTokenKey = 'ryudev-tempmail-token';
const savedTokenVipKey = 'ryudev-tempmail-is-vip';

const pricingPackages = [
  {
    id: 'starter',
    name: 'Paket Starter',
    tag: '100 Email',
    price: 'Rp 5.000',
    rate: 'Rp 50 / email',
    features: [
      '100 Kuota Pembuatan Email',
      'Bebas Custom & Random Alamat',
      'Akses Semua Domain Aktif',
      'Masa Aktif Selamanya (Tanpa Expired)',
      'Inbox Realtime Otomatis'
    ],
    isPopular: false
  },
  {
    id: 'popular',
    name: 'Paket Populer',
    tag: '500 Email',
    price: 'Rp 25.000',
    rate: 'Rp 50 / email',
    features: [
      '500 Kuota Pembuatan Email',
      'Paling Banyak Dipilih',
      'Cocok untuk Bot & Script Otomasi',
      'Dukungan Penuh REST API',
      'Masa Aktif Selamanya'
    ],
    isPopular: true
  },
  {
    id: 'pro',
    name: 'Paket Developer',
    tag: '1.000 Email',
    price: 'Rp 50.000',
    rate: 'Rp 50 / email',
    features: [
      '1.000 Kuota Pembuatan Email',
      'Bebas Integrasi API',
      'Opsi Request Filter Domain',
      'Prioritas Dukungan Teknis',
      'Masa Aktif Selamanya'
    ],
    isPopular: false
  },
  {
    id: 'custom',
    name: 'Paket Sultan / Custom',
    tag: '2.000+ Email',
    price: 'Hubungi Admin',
    rate: 'Diskon Khusus Skala Besar',
    features: [
      'Kuota Ribuan hingga Puluhan Ribu Email',
      'Whitelist / Blacklist Domain Khusus',
      'Dukungan Setup Custom Script / Bot',
      'Layanan Prioritas Langsung Admin'
    ],
    isPopular: false
  }
];

const musicTracks = import.meta.glob('./assets/music/*.{mp3,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default'
});
const musicPlaylist = Object.values(musicTracks);

function getMailboxAddressFromPath() {
  const path = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '');
  return path.includes('@') ? path : '';
}

function splitMailboxAddress(address) {
  const atIndex = address.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === address.length - 1) {
    return null;
  }

  return {
    localPart: address.slice(0, atIndex),
    domain: address.slice(atIndex + 1)
  };
}

function getSavedMailboxHistory() {
  try {
    return JSON.parse(localStorage.getItem(savedMailboxHistoryKey) || '[]')
      .filter((mailbox) => mailbox?.id && mailbox?.address);
  } catch {
    return [];
  }
}

function getErrorMessage(error) {
  const message = error?.message || 'REQUEST_FAILED';
  const messages = {
    BACKEND_UNAVAILABLE: 'Backend belum tersedia',
    DOMAIN_NOT_FOUND: 'Domain tidak tersedia',
    MAILBOX_CREATE_FAILED: 'Alamat gagal dibuat',
    REQUEST_FAILED: 'Request gagal, coba lagi',
    VALIDATION_ERROR: 'Nama email hanya boleh huruf, angka, titik, underscore, dan strip'
  };

  return messages[message] || message;
}

export function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customName, setCustomName] = useState('');
  const [mailbox, setMailbox] = useState(null);
  const [mailboxHistory, setMailboxHistory] = useState(getSavedMailboxHistory);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [copiedAddress, setCopiedAddress] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem(savedMusicKey) !== 'false');
  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef(null);

  // Token management states
  const [token, setToken] = useState(() => localStorage.getItem(savedTokenKey) || '');
  const [isVipToken, setIsVipToken] = useState(() => localStorage.getItem(savedTokenVipKey) === 'true');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingSlide, setPricingSlide] = useState(0);

  const isVip = Boolean(isVipToken || tokenInfo?.isUnlimited);

  const playRandomTrack = () => {
    const audio = audioRef.current;
    if (!audio || musicPlaylist.length === 0) {
      return Promise.reject(new Error('NO_MUSIC_TRACKS'));
    }

    const nextTrack = musicPlaylist[Math.floor(Math.random() * musicPlaylist.length)];
    audio.src = nextTrack;
    audio.volume = 0.36;
    return audio.play();
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(savedMusicKey, String(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicEnabled || !musicStarted || musicPlaylist.length === 0) {
      return undefined;
    }

    const playNextTrack = () => {
      playRandomTrack().catch(() => setMusicStarted(false));
    };

    audio.addEventListener('ended', playNextTrack);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', playNextTrack);
    };
  }, [musicEnabled, musicStarted]);

  useEffect(() => {
    if (!musicEnabled || musicStarted) {
      return undefined;
    }

    const startAfterInteraction = (event) => {
      if (event.target?.closest?.('.music-toggle')) {
        return;
      }

      playRandomTrack()
        .then(() => setMusicStarted(true))
        .catch(() => setMusicStarted(false));
    };
    const options = { once: true, passive: true };

    window.addEventListener('pointerdown', startAfterInteraction, options);
    window.addEventListener('click', startAfterInteraction, options);
    window.addEventListener('touchstart', startAfterInteraction, options);
    window.addEventListener('wheel', startAfterInteraction, options);
    window.addEventListener('keydown', startAfterInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', startAfterInteraction);
      window.removeEventListener('click', startAfterInteraction);
      window.removeEventListener('touchstart', startAfterInteraction);
      window.removeEventListener('wheel', startAfterInteraction);
      window.removeEventListener('keydown', startAfterInteraction);
    };
  }, [musicEnabled, musicStarted]);

  // Fetch / refresh token details
  const refreshUserToken = async (targetToken) => {
    const t = (targetToken || token || '').trim();
    if (!t) {
      setTokenInfo(null);
      setIsVipToken(false);
      localStorage.removeItem(savedTokenVipKey);
      return null;
    }
    try {
      const info = await api.checkToken(t);
      if (info.valid) {
        setTokenInfo(info);
        const vip = Boolean(info.isUnlimited);
        setIsVipToken(vip);
        if (vip) {
          localStorage.setItem(savedTokenVipKey, 'true');
        } else {
          localStorage.removeItem(savedTokenVipKey);
        }
        return info;
      }
    } catch {
      setTokenInfo(null);
    }
    return null;
  };

  useEffect(() => {
    if (token) {
      refreshUserToken(token);
    }
  }, [token]);

  useEffect(() => {
    const pathMailbox = splitMailboxAddress(getMailboxAddressFromPath());

    api.domains().then(({ domains: fetchedDomains }) => {
      setDomains(fetchedDomains);
      setSelectedDomain(pathMailbox?.domain || fetchedDomains[0]?.name || '');
    }).catch(() => setStatus(getErrorMessage(new Error('BACKEND_UNAVAILABLE'))));

    if (pathMailbox) {
      setCustomName(pathMailbox.localPart);
      setLoadingAction('direct');
      setStatus(`Membuka ${pathMailbox.localPart}@${pathMailbox.domain}...`);

      api.customMailbox(pathMailbox.localPart, pathMailbox.domain, token)
        .then(({ mailbox: mb }) => loadMailboxEmails(mb, `${mb.address} dibuka`))
        .catch((error) => setStatus(getErrorMessage(error)))
        .finally(() => setLoadingAction(''));
      return;
    }

    const savedMailboxId = localStorage.getItem(savedMailboxKey);
    if (savedMailboxId) {
      api.mailbox(savedMailboxId)
        .then(({ mailbox: mb }) => {
          setMailbox(mb);
          rememberMailbox(mb);
          return api.emails(mb.id);
        })
        .then(({ emails: ems }) => setEmails(ems))
        .catch(() => localStorage.removeItem(savedMailboxKey));
    }
  }, []);

  // Hybrid Realtime (Socket.IO + Smart Polling for Cloudflare Worker)
  useEffect(() => {
    if (!mailbox?.id) {
      return undefined;
    }

    // 1. Socket.IO connection (for Node.js backend if active)
    let socket = null;
    try {
      socket = io(api.baseUrl, {
        transports: ['websocket', 'polling'],
        timeout: 4000,
        reconnectionAttempts: 2
      });
      socket.emit('mailbox:join', { mailboxId: mailbox.id });
      socket.on('email:new', (newEmail) => {
        setEmails((current) => {
          if (current.some((e) => e.id === newEmail.id)) return current;
          return [newEmail, ...current];
        });
        setSelectedEmail(newEmail);
        setStatus('Email baru diterima');
      });
    } catch {
      // socket.io disabled / unavailable
    }

    // 2. Smart Polling (Works seamlessly with Cloudflare Worker / Serverless)
    let isPolling = false;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible' || isPolling) {
        return;
      }
      try {
        isPolling = true;
        const { emails: latestEmails } = await api.emails(mailbox.id);
        if (!latestEmails) return;

        setEmails((current) => {
          const currentIds = new Set(current.map((e) => e.id));
          const newEmails = latestEmails.filter((e) => !currentIds.has(e.id));
          if (newEmails.length > 0) {
            setSelectedEmail((prev) => prev || newEmails[0]);
            setStatus(`Email baru diterima (${newEmails.length})`);
            return latestEmails;
          }
          return current;
        });
      } catch {
        // silently ignore transient network errors
      } finally {
        isPolling = false;
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [mailbox?.id]);

  const unreadCount = useMemo(() => emails.filter((email) => !email.readAt).length, [emails]);
  const displayTokenInDocs = useMemo(() => (!token || isVip ? 'token kamu' : token), [token, isVip]);

  const apiReference = [
    ['GET', '/api/health', 'Cek status backend.'],
    ['GET', '/api/domains', 'Ambil domain aktif untuk mailbox.'],
    ['POST', '/api/mailboxes/random', 'Buat mailbox random. Header: x-api-key, Body: { "domain": "example.com" }.'],
    ['POST', '/api/mailboxes/custom', 'Buat atau buka mailbox custom. Header: x-api-key, Body: { "localPart": "nama", "domain": "example.com" }.'],
    ['GET', '/api/mailboxes/by-address/:address', 'Cari mailbox dari alamat email lengkap.'],
    ['GET', '/api/mailboxes/:id', 'Ambil detail mailbox dan perbarui lastSeenAt.'],
    ['PATCH', '/api/mailboxes/:id/active', 'Aktif/nonaktifkan mailbox. Body: { "active": true }.'],
    ['DELETE', '/api/mailboxes/:id', 'Hapus mailbox beserta emailnya.'],
    ['GET', '/api/mailboxes/:id/emails', 'Ambil daftar email mailbox.'],
    ['GET', '/api/mailboxes/:id/emails/:emailId', 'Ambil detail satu email.'],
    ['PATCH', '/api/mailboxes/:id/emails/:emailId/read', 'Tandai read/unread. Body: { "read": true }.'],
    ['DELETE', '/api/mailboxes/:id/emails/:emailId', 'Hapus satu email dari mailbox.']
  ];

  const rememberMailbox = (nextMailbox) => {
    localStorage.setItem(savedMailboxKey, nextMailbox.id);
    setMailboxHistory((current) => {
      const nextHistory = [
        nextMailbox,
        ...current.filter((item) => item.id !== nextMailbox.id)
      ].slice(0, 6);

      localStorage.setItem(savedMailboxHistoryKey, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const saveMailbox = (nextMailbox) => {
    setMailbox(nextMailbox);
    rememberMailbox(nextMailbox);
    setEmails([]);
    setSelectedEmail(null);
  };

  const loadMailboxEmails = async (nextMailbox, nextStatus = 'Mailbox siap dipakai') => {
    saveMailbox(nextMailbox);
    const { emails: loadedEmails } = await api.emails(nextMailbox.id);
    setEmails(loadedEmails);
    setStatus(nextStatus);
  };

  // SweetAlert modal for token input
  const promptInputToken = async (initialError = null) => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const { value: inputResult, isDenied } = await Swal.fire({
      title: '🔑 Masukkan Token Akses',
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.5; color: ${isDark ? '#cbd5e1' : '#475569'}; margin-bottom: 8px;">
          ${initialError ? `<div style="background: ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'}; color: ${isDark ? '#fca5a5' : '#b91c1c'}; padding: 8px 12px; border-radius: 8px; font-weight: 600; margin-bottom: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">${initialError}</div>` : ''}
          <p style="margin: 0 0 8px;">Pembuatan email memerlukan <strong>Token Akses</strong> (Tarif hemat: <strong>Rp 50 / email</strong>).</p>
          <p style="margin: 0; font-size: 0.85rem; opacity: 0.85;">Token akan disimpan di browser Anda sehingga tidak perlu diisi ulang setiap saat.</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Tempel token Anda di sini...',
      inputValue: token || '',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Verifikasi Token',
      denyButtonText: '💎 Beli Token',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      denyButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      preConfirm: async (val) => {
        const trimmed = (val || '').trim();
        if (!trimmed) {
          Swal.showValidationMessage('Token wajib diisi!');
          return false;
        }
        try {
          const res = await api.checkToken(trimmed);
          if (!res.valid) {
            Swal.showValidationMessage(res.message || 'Token tidak valid');
            return false;
          }
          if (!res.isUnlimited && res.quota <= 0) {
            Swal.showValidationMessage('Kuota token ini sudah habis (0). Silakan beli token baru.');
            return false;
          }
          return { ...res, rawInput: trimmed };
        } catch (err) {
          Swal.showValidationMessage(err.message || 'Token tidak ditemukan atau tidak aktif');
          return false;
        }
      }
    });

    if (isDenied) {
      setShowPricingModal(true);
      return null;
    }

    if (inputResult) {
      const activeTokenKey = inputResult.rawInput || inputResult.token;
      localStorage.setItem(savedTokenKey, activeTokenKey);
      setToken(activeTokenKey);
      setTokenInfo(inputResult);
      const vip = Boolean(inputResult.isUnlimited);
      setIsVipToken(vip);
      if (vip) {
        localStorage.setItem(savedTokenVipKey, 'true');
      } else {
        localStorage.removeItem(savedTokenVipKey);
      }
      Swal.fire({
        icon: 'success',
        title: 'Token Berhasil Disimpan!',
        text: `Sisa kuota: ${vip ? 'Unlimited (VIP)' : `${inputResult.quota} email`}`,
        timer: 2000,
        showConfirmButton: false,
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
      return activeTokenKey;
    }

    return null;
  };

  const handleRemoveToken = () => {
    localStorage.removeItem(savedTokenKey);
    localStorage.removeItem(savedTokenVipKey);
    setToken('');
    setIsVipToken(false);
    setTokenInfo(null);
    setStatus('Token akses dihapus dari browser');
  };

  const ensureTokenBeforeAction = async () => {
    let currentToken = token;
    if (!currentToken) {
      currentToken = await promptInputToken();
      if (!currentToken) return null;
    }

    if (tokenInfo && !tokenInfo.isUnlimited) {
      if (tokenInfo.quota <= 0) {
        localStorage.removeItem(savedTokenKey);
        setToken('');
        setTokenInfo(null);
        return await promptInputToken('Kuota token Anda sudah habis (0). Silakan masukkan token baru atau beli paket token.');
      }

      if (tokenInfo.disallowedDomains?.includes(selectedDomain.toLowerCase())) {
        const isDark = document.documentElement.dataset.theme === 'dark';
        await Swal.fire({
          icon: 'warning',
          title: 'Domain Dibatasi',
          text: `Domain @${selectedDomain} tidak dapat digunakan dengan token Anda. Silakan pilih domain lain yang diizinkan.`,
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a'
        });
        return null;
      }
    }

    return currentToken;
  };

  const handleApiErrorWithSwal = async (error) => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (error.code === 'QUOTA_EXHAUSTED') {
      localStorage.removeItem(savedTokenKey);
      setToken('');
      setTokenInfo(null);
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Kuota Token Habis!',
        text: 'Kuota token Anda sudah habis (0). Masukkan token baru atau beli paket token.',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Input Token Baru',
        denyButtonText: '💎 Beli Token',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#2563eb',
        denyButtonColor: '#10b981',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
      if (res.isConfirmed) {
        promptInputToken();
      } else if (res.isDenied) {
        setShowPricingModal(true);
      }
    } else if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_REQUIRED') {
      localStorage.removeItem(savedTokenKey);
      setToken('');
      setTokenInfo(null);
      promptInputToken(error.message || 'Token tidak valid');
    } else if (error.code === 'DOMAIN_DISALLOWED') {
      Swal.fire({
        icon: 'error',
        title: 'Domain Dibatasi',
        text: error.message || 'Domain ini tidak dapat digunakan dengan token Anda.',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a'
      });
    } else {
      setStatus(getErrorMessage(error));
    }
  };

  const createRandom = async () => {
    const activeToken = await ensureTokenBeforeAction();
    if (!activeToken) return;

    setLoadingAction('random');
    setStatus('Membuat alamat random...');

    try {
      const res = await api.randomMailbox(selectedDomain, activeToken);
      if (res.token?.remainingQuota !== undefined) {
        setTokenInfo((prev) => (prev ? { ...prev, quota: res.token.remainingQuota } : null));
      }
      await loadMailboxEmails(res.mailbox, 'Alamat random siap dipakai');
    } catch (error) {
      handleApiErrorWithSwal(error);
    } finally {
      setLoadingAction('');
    }
  };

  const createCustom = async (event) => {
    event.preventDefault();
    if (!customName.trim()) {
      setStatus('Isi nama depan email dulu');
      return;
    }

    const activeToken = await ensureTokenBeforeAction();
    if (!activeToken) return;

    setLoadingAction('custom');
    setStatus('Membuka atau membuat alamat custom...');

    try {
      const res = await api.customMailbox(customName, selectedDomain, activeToken);
      if (res.token?.remainingQuota !== undefined) {
        setTokenInfo((prev) => (prev ? { ...prev, quota: res.token.remainingQuota } : null));
      }
      await loadMailboxEmails(res.mailbox, 'Alamat custom siap dipakai');
    } catch (error) {
      handleApiErrorWithSwal(error);
    } finally {
      setLoadingAction('');
    }
  };

  const toggleActive = async () => {
    if (!mailbox) return;
    setLoadingAction('active');

    try {
      const { mailbox: updated } = await api.setActive(mailbox.id, Number(mailbox.active) !== 1);
      setMailbox(updated);
      rememberMailbox(updated);
      setStatus(updated.active ? 'Mailbox menerima email' : 'Mailbox tidak menerima email');
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoadingAction('');
    }
  };

  const refreshInbox = async () => {
    if (!mailbox) return;
    setLoadingAction('refresh');

    try {
      const { emails: refreshed } = await api.emails(mailbox.id);
      setEmails(refreshed);
      setStatus('Inbox diperbarui');
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoadingAction('');
    }
  };

  const selectMailbox = async (nextMailbox) => {
    setLoadingAction(`history:${nextMailbox.id}`);
    setStatus(`Membuka ${nextMailbox.address}...`);

    try {
      const { mailbox: mb } = await api.mailbox(nextMailbox.id);
      await loadMailboxEmails(mb, `${mb.address} dibuka`);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoadingAction('');
    }
  };

  const removeHistoryItem = (event, mailboxId) => {
    event.stopPropagation();
    setMailboxHistory((current) => {
      const nextHistory = current.filter((item) => item.id !== mailboxId);
      localStorage.setItem(savedMailboxHistoryKey, JSON.stringify(nextHistory));
      return nextHistory;
    });
    setStatus('Riwayat alamat dihapus');
  };

  const clearHistory = () => {
    setMailboxHistory([]);
    localStorage.removeItem(savedMailboxHistoryKey);
    setStatus('Riwayat alamat dibersihkan');
  };

  const copyAddress = async (address = mailbox?.address) => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 1400);
  };

  const toggleMusic = () => {
    if (musicEnabled) {
      audioRef.current?.pause();
      setMusicStarted(false);
      setMusicEnabled(false);
      return;
    }

    setMusicEnabled(true);
    playRandomTrack()
      .then(() => setMusicStarted(true))
      .catch(() => {
        setMusicStarted(false);
      });
  };

  return (
    <main className="app-shell">
      <audio ref={audioRef} preload="none" />
      <button
        className={`music-toggle ${musicEnabled ? 'on' : 'off'}`}
        onClick={toggleMusic}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
        title={musicEnabled ? 'Matikan musik' : 'Nyalakan musik setelah interaksi'}
      >
        <span className="music-led" />
        <Music2 size={17} />
        <strong>{musicEnabled ? 'ON' : 'OFF'}</strong>
      </button>

      <header className="topbar">
        <div>
          <p className="eyebrow">Ryudev Mail Gateway</p>
          <h1>Temporary Mail</h1>
        </div>
        <div className="topbar-actions">
          <button className="buy-token-header-btn" onClick={() => setShowPricingModal(true)} type="button">
            <Sparkles size={16} />
            <span>Beli Token</span>
          </button>
          <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Ubah tema" type="button">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <Mail size={22} />
            <div>
              <h2>Alamat Email</h2>
              <p>{status}</p>
            </div>
          </div>

          {/* Token Card */}
          <div className="token-status-box">
            <div className="token-status-header">
              <div className="token-status-title">
                <Key size={15} />
                <span>Token Akses</span>
              </div>
              <button className="token-buy-link" type="button" onClick={() => setShowPricingModal(true)}>
                <Sparkles size={13} /> Beli
              </button>
            </div>
            {token ? (
              <div className="token-status-body">
                <div className="token-status-row">
                  <code className="token-code-text" title={isVip ? 'VIP Unlimited' : token}>
                    {isVip
                      ? 'VIP-PASS (Aktif)'
                      : token.length > 15
                      ? `${token.slice(0, 6)}...${token.slice(-4)}`
                      : token}
                  </code>
                  <span className={`token-quota-pill ${isVip ? 'vip' : ''}`}>
                    {isVip ? 'VIP Unlimited' : tokenInfo?.quota !== undefined ? `${tokenInfo.quota} email` : 'Tersimpan'}
                  </span>
                </div>
                {tokenInfo?.disallowedDomains?.length > 0 && (
                  <div className="token-disallowed-badge">
                    <ShieldAlert size={13} />
                    <span>Dilarang: {tokenInfo.disallowedDomains.map((d) => '@' + d).join(', ')}</span>
                  </div>
                )}
                <div className="token-status-actions">
                  <button className="token-btn-secondary" type="button" onClick={() => promptInputToken()}>
                    Ganti
                  </button>
                  <button className="token-btn-secondary text-danger" type="button" onClick={handleRemoveToken}>
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="token-status-empty">
                <span>Belum ada token tersimpan.</span>
                <button className="token-input-btn" type="button" onClick={() => promptInputToken()}>
                  <Key size={14} /> Masukkan Token
                </button>
              </div>
            )}
          </div>

          <label className="field">
            Domain
            <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value)}>
              {domains.map((domain) => (
                <option key={domain.name} value={domain.name}>{domain.name}</option>
              ))}
            </select>
          </label>

          <button className="primary-action" onClick={createRandom} disabled={!selectedDomain || Boolean(loadingAction)}>
            {loadingAction === 'random' ? <LoaderCircle className="spin" size={18} /> : <Wand2 size={18} />}
            {loadingAction === 'random' ? 'Membuat...' : 'Random Email'}
          </button>

          <form className="custom-form" onSubmit={createCustom}>
            <label className="field">
              Custom name
              <div className="address-input">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="name"
                  maxLength={48}
                />
                <span>@{selectedDomain || 'domain'}</span>
              </div>
            </label>
            <button className="secondary-action" type="submit" disabled={!selectedDomain || Boolean(loadingAction)}>
              {loadingAction === 'custom' ? <LoaderCircle className="spin" size={18} /> : null}
              Gunakan / Buat
            </button>
          </form>

          <div className="current-address">
            <div className="address-meta">
              <span>Alamat aktif</span>
              {mailbox ? (
                <small className={`status-pill ${mailbox.active ? 'active' : 'inactive'}`}>
                  {mailbox.active ? 'Menerima email' : 'Tidak menerima'}
                </small>
              ) : null}
            </div>
            <strong>{mailbox?.address || 'Belum dibuat'}</strong>
            <div className="address-actions">
              <button className="icon-text-button" onClick={() => copyAddress()} disabled={!mailbox}>
                {copiedAddress === mailbox?.address ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                {copiedAddress === mailbox?.address ? 'Copied' : 'Copy'}
              </button>
              <button className="icon-text-button" onClick={toggleActive} disabled={!mailbox || Boolean(loadingAction)}>
                {loadingAction === 'active' ? <LoaderCircle className="spin" size={17} /> : <Power size={17} />}
                {mailbox?.active ? 'Stop' : 'Aktifkan'}
              </button>
            </div>
          </div>

          {mailboxHistory.length > 0 ? (
            <div className="history-panel">
              <div className="section-title">
                <div>
                  <History size={17} />
                  <span>Riwayat alamat</span>
                </div>
                <button className="text-action" type="button" onClick={clearHistory}>
                  Bersihkan
                </button>
              </div>
              <div className="history-list">
                {mailboxHistory.map((item) => (
                  <div className={`history-item ${item.id === mailbox?.id ? 'selected' : ''}`} key={item.id}>
                    <button type="button" onClick={() => selectMailbox(item)} disabled={Boolean(loadingAction)}>
                      <span>{item.address}</span>
                      {loadingAction === `history:${item.id}` ? <LoaderCircle className="spin" size={16} /> : null}
                    </button>
                    <button
                      className="history-delete"
                      type="button"
                      title="Hapus dari riwayat"
                      onClick={(event) => removeHistoryItem(event, item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="inbox-panel">
          <div className="inbox-toolbar">
            <div>
              <h2>Inbox</h2>
              <p>{emails.length} email, {unreadCount} belum dibaca</p>
            </div>
            <button className="icon-button" onClick={refreshInbox} disabled={!mailbox || Boolean(loadingAction)} title="Refresh inbox">
              {loadingAction === 'refresh' ? <LoaderCircle className="spin" size={19} /> : <RefreshCw size={19} />}
            </button>
          </div>

          <div className={`mail-layout ${selectedEmail ? 'has-reader' : ''}`}>
            <div className="mail-list">
              {emails.length === 0 ? (
                <div className="empty-state">
                  <Inbox size={36} />
                  <strong>Belum ada email</strong>
                  <span>{mailbox?.address ? `Pakai ${mailbox.address} untuk menerima pesan.` : 'Buat alamat dulu untuk mulai menerima email.'}</span>
                  <button className="icon-text-button" onClick={() => copyAddress()} disabled={!mailbox}>
                    {copiedAddress === mailbox?.address ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                    {copiedAddress === mailbox?.address ? 'Copied' : 'Copy alamat'}
                  </button>
                </div>
              ) : emails.map((email) => (
                <button
                  className={`mail-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                >
                  <span>{email.fromAddress}</span>
                  <strong>{email.subject || '(Tanpa subject)'}</strong>
                  <small>{new Date(email.receivedAt).toLocaleString('id-ID')}</small>
                </button>
              ))}
            </div>

            <article className="mail-reader">
              {selectedEmail ? (
                <>
                  <button className="reader-back" onClick={() => setSelectedEmail(null)}>
                    <ArrowLeft size={17} />
                    Inbox
                  </button>
                  <div className="reader-header">
                    <span>{selectedEmail.fromAddress}</span>
                    <h3>{selectedEmail.subject || '(Tanpa subject)'}</h3>
                    <p>To: {selectedEmail.toAddress}</p>
                  </div>
                  <div className="reader-body">
                    {selectedEmail.htmlBody ? (
                      <iframe title="email-body" srcDoc={selectedEmail.htmlBody} sandbox="" />
                    ) : (
                      <pre>{selectedEmail.textBody || 'Email kosong.'}</pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="reader-placeholder">
                  <Mail size={38} />
                  <strong>Pilih email untuk membaca isi pesan</strong>
                </div>
              )}
            </article>
          </div>
        </section>
      </section>

      {/* Pricing Carousel Modal */}
      {showPricingModal && (
        <div className="pricing-modal-overlay" onClick={() => setShowPricingModal(false)}>
          <div className="pricing-modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="pricing-modal-header">
              <div>
                <span className="pricing-pill">Tarif: Rp 50 / Email</span>
                <h2>Pricelist Paket Token</h2>
              </div>
              <button className="pricing-close-btn" onClick={() => setShowPricingModal(false)} type="button" title="Tutup">
                <X size={20} />
              </button>
            </div>

            <div className="carousel-wrapper">
              <button
                className="carousel-arrow prev"
                onClick={() => setPricingSlide((prev) => (prev > 0 ? prev - 1 : pricingPackages.length - 1))}
                type="button"
                aria-label="Previous slide"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="carousel-card-container">
                {pricingPackages.map((pkg, idx) => (
                  <div
                    key={pkg.id}
                    className={`pricing-card-slide ${idx === pricingSlide ? 'active' : ''}`}
                    style={{ display: idx === pricingSlide ? 'block' : 'none' }}
                  >
                    <div className="pricing-card">
                      {pkg.isPopular && <div className="popular-badge">⭐ Paling Laris</div>}
                      <p className="package-tag">{pkg.tag}</p>
                      <h3 className="package-name">{pkg.name}</h3>
                      <div className="package-price-wrap">
                        <span className="package-price">{pkg.price}</span>
                        <span className="package-rate">{pkg.rate}</span>
                      </div>
                      <ul className="package-features">
                        {pkg.features.map((feat, fIdx) => (
                          <li key={fIdx}>
                            <CheckCircle2 size={16} className="feature-check" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="package-cta-group">
                        <a
                          href={`https://t.me/yonkounoryu?text=${encodeURIComponent(`Halo admin, saya mau beli Token Temp Mail ${pkg.name} (${pkg.price})`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="buy-now-btn telegram"
                        >
                          <MessageCircle size={17} /> Pesan via Telegram
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="carousel-arrow next"
                onClick={() => setPricingSlide((prev) => (prev < pricingPackages.length - 1 ? prev + 1 : 0))}
                type="button"
                aria-label="Next slide"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            <div className="carousel-dots">
              {pricingPackages.map((_, idx) => (
                <button
                  key={idx}
                  className={`carousel-dot ${idx === pricingSlide ? 'active' : ''}`}
                  onClick={() => setPricingSlide(idx)}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="pricing-modal-footer">
              <p>
                💡 Pembayaran via <strong>QRIS, Dana, GoPay, atau Transfer Bank</strong>. Token langsung dikirim dan aktif seketika setelah pembayaran.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Developer API Documentation */}
      <section className="api-docs" id="api-docs">
        <div className="api-docs-heading">
          <div>
            <p className="eyebrow">Developer API</p>
            <h2>Dokumentasi API Lengkap</h2>
          </div>
          <code>{api.baseUrl}</code>
        </div>

        <div className="api-docs-grid">
          {apiReference.map(([method, path, description]) => (
            <article className="api-endpoint" key={`${method}-${path}`}>
              <div>
                <span className={`api-method method-${method.toLowerCase()}`}>{method}</span>
                <code>{path}</code>
              </div>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="api-notes">
          <strong>Response utama:</strong>
          <span>Mailbox dikembalikan sebagai <code>{'{ mailbox }'}</code>, daftar email sebagai <code>{'{ emails }'}</code>, dan error sebagai <code>{'{ error }'}</code>.</span>
        </div>

        <div className="api-notes api-key-note">
          <strong>Autentikasi Header API:</strong>
          <span>
            Sertakan header <code>x-api-key: {displayTokenInDocs}</code> pada setiap request pembuatan mailbox (<code>/api/mailboxes/random</code> dan <code>/api/mailboxes/custom</code>). Token Anda akan otomatis terisi di atas jika sudah tersimpan di browser.
          </span>
        </div>

        <div className="api-sample-code">
          <p className="sample-code-title">Contoh Request cURL:</p>
          <pre>
            {`curl -X POST ${api.baseUrl}/api/mailboxes/random \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayTokenInDocs}" \\
  -d '{"domain": "${selectedDomain || 'ryudev.site'}"}'`}
          </pre>
        </div>
      </section>
    </main>
  );
}
