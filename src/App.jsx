import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  History,
  Inbox,
  LoaderCircle,
  Mail,
  Music2,
  Moon,
  Power,
  RefreshCw,
  Sun,
  Trash2,
  Wand2
} from 'lucide-react';
import { api } from './api.js';

const savedMailboxKey = 'ryudev-temp-mailbox-id';
const savedMailboxHistoryKey = 'ryudev-temp-mailbox-history';
const savedMusicKey = 'ryudev-temp-music-enabled';
const musicTracks = import.meta.glob('./assets/music/*.{mp3,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default'
});
const musicPlaylist = Object.values(musicTracks);

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
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem(savedMusicKey) === 'true');
  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef(null);

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
      playRandomTrack().catch(() => setMusicEnabled(false));
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

    const startAfterInteraction = () => {
      playRandomTrack()
        .then(() => setMusicStarted(true))
        .catch(() => setMusicEnabled(false));
    };
    const options = { once: true, passive: true };

    window.addEventListener('click', startAfterInteraction, options);
    window.addEventListener('touchstart', startAfterInteraction, options);
    window.addEventListener('wheel', startAfterInteraction, options);
    window.addEventListener('keydown', startAfterInteraction, { once: true });

    return () => {
      window.removeEventListener('click', startAfterInteraction);
      window.removeEventListener('touchstart', startAfterInteraction);
      window.removeEventListener('wheel', startAfterInteraction);
      window.removeEventListener('keydown', startAfterInteraction);
    };
  }, [musicEnabled, musicStarted]);

  useEffect(() => {
    api.domains().then(({ domains }) => {
      setDomains(domains);
      setSelectedDomain(domains[0]?.name || '');
    }).catch(() => setStatus(getErrorMessage(new Error('BACKEND_UNAVAILABLE'))));

    const savedMailboxId = localStorage.getItem(savedMailboxKey);
    if (savedMailboxId) {
      api.mailbox(savedMailboxId)
        .then(({ mailbox }) => {
          setMailbox(mailbox);
          rememberMailbox(mailbox);
          return api.emails(mailbox.id);
        })
        .then(({ emails }) => setEmails(emails))
        .catch(() => localStorage.removeItem(savedMailboxKey));
    }
  }, []);

  useEffect(() => {
    if (!mailbox?.id) {
      return undefined;
    }

    const socket = io(api.baseUrl);
    socket.emit('mailbox:join', { mailboxId: mailbox.id });
    socket.on('email:new', (email) => {
      setEmails((current) => [email, ...current]);
      setSelectedEmail(email);
      setStatus('Email baru diterima');
    });

    return () => socket.disconnect();
  }, [mailbox?.id]);

  const unreadCount = useMemo(() => emails.filter((email) => !email.readAt).length, [emails]);

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
    const { emails } = await api.emails(nextMailbox.id);
    setEmails(emails);
    setStatus(nextStatus);
  };

  const createRandom = async () => {
    setLoadingAction('random');
    setStatus('Membuat alamat random...');

    try {
      const { mailbox } = await api.randomMailbox(selectedDomain);
      await loadMailboxEmails(mailbox, 'Alamat random siap dipakai');
    } catch (error) {
      setStatus(getErrorMessage(error));
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

    setLoadingAction('custom');
    setStatus('Membuka atau membuat alamat custom...');

    try {
      const { mailbox } = await api.customMailbox(customName, selectedDomain);
      await loadMailboxEmails(mailbox, 'Alamat custom siap dipakai');
    } catch (error) {
      setStatus(getErrorMessage(error));
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
      const { emails } = await api.emails(mailbox.id);
      setEmails(emails);
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
      const { mailbox } = await api.mailbox(nextMailbox.id);
      await loadMailboxEmails(mailbox, `${mailbox.address} dibuka`);
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
        setMusicEnabled(false);
      });
  };

  return (
    <main className="app-shell">
      <audio ref={audioRef} preload="none" />
      <button
        className={`music-toggle ${musicEnabled ? 'on' : 'off'}`}
        onClick={toggleMusic}
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
        <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Ubah tema">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
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
              <p>{emails.length} email, {unreadCount} unread</p>
            </div>
            <button className="icon-button" onClick={refreshInbox} disabled={!mailbox || Boolean(loadingAction)} title="Refresh inbox">
              <RefreshCw className={loadingAction === 'refresh' ? 'spin' : ''} size={19} />
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
    </main>
  );
}
