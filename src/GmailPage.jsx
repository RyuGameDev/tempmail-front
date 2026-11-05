import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  History,
  Inbox,
  LoaderCircle,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { api } from './api.js';
import { gmailError } from './gmail-errors.js';

const HISTORY_KEY = 'ryudev-gmail-aliases-v1';
function savedAliases() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter((a) => a.id && a.address && a.key).slice(0, 100); }
  catch { return []; }
}

export function GmailPage({ token, onInputToken, onAliasCreated }) {
  const [mode, setMode] = useState('aliases');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [history, setHistory] = useState(savedAliases);
  const [inbox, setInbox] = useState(null);
  const [password, setPassword] = useState('');
  const [emails, setEmails] = useState([]);
  const [messageId, setMessageId] = useState('');
  const [message, setMessage] = useState(null);
  const [cursor, setCursor] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [copied, setCopied] = useState(false);
  const actionVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.gmailAccounts().then(({ accounts: rows }) => {
      if (!cancelled) { setAccounts(rows); setAccountId(rows[0]?.id || ''); }
    }).catch((e) => { if (!cancelled) setError(gmailError(e)); })
      .finally(() => { if (!cancelled) setLoadingAccounts(false); });
    return () => { cancelled = true; actionVersion.current++; };
  }, []);

  function selectInbox(next) {
    actionVersion.current++;
    setInbox(next); setEmails([]); setMessageId(''); setMessage(null); setCursor(''); setNextCursor(null); setError(''); setPassword(''); setCopied(false); setLoading(false); setReading(false);
  }
  function switchMode(next) {
    selectInbox(null); setMode(next); setBusy(false);
    if (next === 'aliases') setHistory(savedAliases());
  }

  useEffect(() => {
    if (!inbox) return;
    const controller = new AbortController();
    let timer;
    async function load() {
      setLoading(true);
      try {
        const result = await api.gmailEmails(inbox, cursor, controller.signal);
        if (controller.signal.aborted) return;
        setEmails(result.emails); setNextCursor(result.nextCursor); setError('');
        if (result.address) setInbox((current) => current?.id === inbox.id && current?.key === inbox.key ? { ...current, address: result.address } : current);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(gmailError(e));
        if (e.status === 401 || e.status === 429 || e.status === 404) {
          setEmails([]); setMessage(null); setMessageId(''); setInbox(null); return;
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
      if (!controller.signal.aborted && !cursor) timer = setTimeout(() => {
        if (document.visibilityState === 'visible') load();
        else timer = setTimeout(load, 30000);
      }, 30000);
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [inbox?.id, inbox?.key, cursor, refresh]);

  useEffect(() => {
    setMessage(null);
    if (!inbox || !messageId) return;
    const controller = new AbortController();
    setReading(true);
    api.gmailEmail(inbox, messageId, controller.signal).then(({ email }) => {
      if (!controller.signal.aborted) setMessage(email);
    }).catch((e) => {
      if (!controller.signal.aborted) {
        setError(gmailError(e));
        if (e.status === 401 || e.status === 429) { setInbox(null); setEmails([]); setMessageId(''); }
      }
    }).finally(() => { if (!controller.signal.aborted) setReading(false); });
    return () => controller.abort();
  }, [inbox?.id, inbox?.key, messageId]);

  async function createAlias() {
    if (!token) { onInputToken(); return; }
    const version = ++actionVersion.current;
    setBusy(true); setError('');
    try {
      const result = await api.createGmailAlias(accountId, token);
      onAliasCreated?.();
      const entry = { ...result.alias, key: result.accessKey, kind: 'aliases' };
      // Save completed allocations even if the view changes during the request.
      const updated = [entry, ...savedAliases()].slice(0, 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      if (actionVersion.current !== version) return;
      setHistory(updated); setBusy(false); selectInbox(entry);
    } catch (e) { if (actionVersion.current === version) setError(gmailError(e)); }
    finally { if (actionVersion.current === version) setBusy(false); }
  }

  async function unlock(event) {
    event.preventDefault();
    const version = ++actionVersion.current;
    setBusy(true); setError('');
    const next = { kind: 'accounts', id: accountId, key: password };
    try {
      const result = await api.gmailEmails(next);
      if (version !== actionVersion.current) return;
      setBusy(false); selectInbox({ ...next, address: result.address });
    } catch (e) { if (version === actionVersion.current) setError(gmailError(e)); }
    finally { if (actionVersion.current === version) setBusy(false); }
  }

  return <section className="gmail-view">
    <nav className="mail-tabs gmail-subtabs" aria-label="Mode Gmail">
      <button type="button" aria-pressed={mode === 'aliases'} onClick={() => switchMode('aliases')}><Mail size={17} /> Alias dot trick</button>
      <button type="button" aria-pressed={mode === 'accounts'} onClick={() => switchMode('accounts')}><Lock size={17} /> Gmail asli</button>
    </nav>
    {error && <div className="gmail-notice error" role="alert">{error}</div>}
    <div className="workspace">
      <aside className="control-panel gmail-controls">
        <div className="panel-heading"><Mail size={22} /><div><h2>{mode === 'aliases' ? 'Alias Gmail baru' : 'Akses Gmail asli'}</h2><p>{mode === 'aliases' ? 'Satu alamat untuk satu inbox terfilter.' : 'Hanya untuk pemegang kunci khusus.'}</p></div></div>
        <label className="field">Akun sumber
          <select value={accountId} onChange={(e) => { setAccountId(e.target.value); if (mode === 'accounts') selectInbox(null); }} disabled={busy || loadingAccounts}>
            {!accounts.length && <option value="">{loadingAccounts ? 'Memuat akun...' : 'Belum ada akun Gmail aktif'}</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        {mode === 'aliases' ? <>
          <button className="primary-action" disabled={!accountId || busy} onClick={createAlias} type="button">
            {busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />} Buat alias unik
          </button>
          {history.length > 0 && (
            <div className="history-panel">
              <div className="section-title">
                <div>
                  <History size={17} />
                  <span>Riwayat alias</span>
                </div>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(HISTORY_KEY);
                    setHistory([]);
                  }}
                >
                  Bersihkan
                </button>
              </div>
              <div className="history-list">
                {history.map((a) => (
                  <div className={`history-item ${inbox?.id === a.id ? 'selected' : ''}`} key={a.id}>
                    <button type="button" disabled={busy} onClick={() => selectInbox(a)}>
                      <span>{a.address}</span>
                    </button>
                    <button
                      className="history-delete"
                      type="button"
                      title="Hapus dari riwayat"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = history.filter((h) => h.id !== a.id);
                        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                        setHistory(next);
                        if (inbox?.id === a.id) selectInbox(null);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </> : inbox ? <>
          <div className="gmail-notice"><Lock size={16} /> Inbox terbuka pada tab ini.</div>
          <button className="secondary-action" type="button" onClick={() => selectInbox(null)}>
            <Lock size={16} /> Kunci kembali
          </button>
        </> : <form className="gmail-form" onSubmit={unlock}>
          <label className="field">
            Password / API key khusus Gmail
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={256}
              autoComplete="off"
              placeholder="Kunci akses khusus dari admin"
            />
          </label>
          <button className="primary-action" disabled={!accountId || busy || !password} type="submit">
            {busy ? <LoaderCircle className="spin" size={18} /> : <Lock size={18} />} Buka Gmail asli
          </button>
        </form>}
        {inbox?.address && (
          <div className="current-address">
            <div className="address-meta">
              <span>Alamat aktif</span>
              <small className="status-pill active">
                {mode === 'aliases' ? 'Alias dot trick' : 'Gmail asli'}
              </small>
            </div>
            <strong>{inbox.address}</strong>
            <div className="address-actions">
              <button
                className="icon-text-button"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inbox.address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setError('Tidak dapat menyalin alamat. Silakan salin manual.');
                  }
                }}
              >
                {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </aside>
      <section className="inbox-panel">
        <div className="inbox-toolbar"><div><h2>{mode === 'aliases' ? 'Inbox alias' : 'Inbox Gmail asli'}</h2><p>{inbox ? 'Folder INBOX · diperbarui setiap 30 detik' : 'Pilih alias atau buka akses untuk membaca pesan'}</p></div><button className="icon-button" title="Muat ulang inbox" disabled={!inbox || loading} onClick={() => { setCursor(''); setMessageId(''); setRefresh((n) => n + 1); }} type="button"><RefreshCw size={19} className={loading ? 'spin' : ''} /></button></div>
        <div className={`mail-layout ${messageId ? 'has-reader' : ''}`}>
          <div className="mail-list">
            {loading && !emails.length ? <div className="empty-state"><LoaderCircle className="spin" size={28} /><p>Memuat Gmail...</p></div> : !emails.length ? <div className="empty-state"><Inbox size={36} /><strong>{inbox ? 'Belum ada pesan yang cocok' : 'Inbox belum dibuka'}</strong><span>{inbox ? 'Pesan untuk alamat ini akan tampil di sini.' : 'Mulai dari panel di samping.'}</span></div> : emails.map((email) => <button type="button" className={`mail-item ${messageId === email.id ? 'selected' : ''}`} key={email.id} onClick={() => setMessageId(email.id)}><span>{email.fromAddress}</span><strong>{email.subject || '(Tanpa subjek)'}</strong><small>{email.receivedAt ? new Date(email.receivedAt).toLocaleString('id-ID') : ''}</small></button>)}
            {(nextCursor || cursor) && <div className="gmail-pagination">{cursor && <button type="button" className="token-btn-secondary" disabled={loading} onClick={() => { setCursor(''); setMessageId(''); }}>Terbaru</button>}{nextCursor && <button type="button" className="token-btn-secondary" disabled={loading} onClick={() => { setCursor(nextCursor); setMessageId(''); }}>Pesan lebih lama</button>}</div>}
          </div>
          <article className="mail-reader">
            {messageId && <button className="icon-text-button gmail-reader-back" onClick={() => setMessageId('')} type="button">Kembali ke daftar pesan</button>}
            {messageId && reading ? <div className="reader-placeholder"><LoaderCircle className="spin" size={28} /><p>Membuka pesan...</p></div> : message ? <><div className="reader-header"><span>{message.fromAddress}</span><h3>{message.subject || '(Tanpa subjek)'}</h3><p>Kepada: {message.toAddress}</p></div><div className="reader-body">{message.htmlBody ? <iframe title="Isi pesan Gmail" sandbox="" referrerPolicy="no-referrer" srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width">${message.htmlBody}`} /> : <pre>{message.textBody || 'Pesan kosong.'}</pre>}</div></> : <div className="reader-placeholder"><Mail size={38} /><strong>Pilih pesan untuk membaca isinya</strong></div>}
          </article>
        </div>
      </section>
    </div>
  </section>;
}
