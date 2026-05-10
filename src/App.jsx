import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  CheckCircle2,
  Copy,
  Inbox,
  Mail,
  Moon,
  Power,
  RefreshCw,
  Sun,
  Wand2
} from 'lucide-react';
import { api } from './api.js';

const savedMailboxKey = 'ryudev-temp-mailbox-id';

export function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customName, setCustomName] = useState('');
  const [mailbox, setMailbox] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    api.domains().then(({ domains }) => {
      setDomains(domains);
      setSelectedDomain(domains[0]?.name || '');
    }).catch(() => setStatus('Backend belum tersedia'));

    const savedMailboxId = localStorage.getItem(savedMailboxKey);
    if (savedMailboxId) {
      api.mailbox(savedMailboxId)
        .then(({ mailbox }) => {
          setMailbox(mailbox);
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

  const saveMailbox = (nextMailbox) => {
    setMailbox(nextMailbox);
    localStorage.setItem(savedMailboxKey, nextMailbox.id);
    setEmails([]);
    setSelectedEmail(null);
  };

  const createRandom = async () => {
    setStatus('Membuat alamat random...');
    const { mailbox } = await api.randomMailbox(selectedDomain);
    saveMailbox(mailbox);
    setStatus('Alamat random siap dipakai');
  };

  const createCustom = async (event) => {
    event.preventDefault();
    if (!customName.trim()) {
      setStatus('Isi nama depan email dulu');
      return;
    }

    setStatus('Membuat alamat custom...');
    const { mailbox } = await api.customMailbox(customName, selectedDomain);
    saveMailbox(mailbox);
    setStatus('Alamat custom siap dipakai');
  };

  const toggleActive = async () => {
    if (!mailbox) return;
    const { mailbox: updated } = await api.setActive(mailbox.id, Number(mailbox.active) !== 1);
    setMailbox(updated);
    setStatus(Number(updated.active) === 1 ? 'Mailbox aktif' : 'Mailbox dinonaktifkan');
  };

  const refreshInbox = async () => {
    if (!mailbox) return;
    const { emails } = await api.emails(mailbox.id);
    setEmails(emails);
    setStatus('Inbox diperbarui');
  };

  const copyAddress = async () => {
    if (!mailbox?.address) return;
    await navigator.clipboard.writeText(mailbox.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="app-shell">
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

          <button className="primary-action" onClick={createRandom} disabled={!selectedDomain}>
            <Wand2 size={18} />
            Random Email
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
            <button className="secondary-action" type="submit" disabled={!selectedDomain}>
              Buat Custom
            </button>
          </form>

          <div className="current-address">
            <span>Alamat aktif</span>
            <strong>{mailbox?.address || 'Belum dibuat'}</strong>
            <div className="address-actions">
              <button className="icon-text-button" onClick={copyAddress} disabled={!mailbox}>
                {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className="icon-text-button" onClick={toggleActive} disabled={!mailbox}>
                <Power size={17} />
                {Number(mailbox?.active) === 1 ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </aside>

        <section className="inbox-panel">
          <div className="inbox-toolbar">
            <div>
              <h2>Inbox</h2>
              <p>{emails.length} email, {unreadCount} unread</p>
            </div>
            <button className="icon-button" onClick={refreshInbox} disabled={!mailbox} title="Refresh inbox">
              <RefreshCw size={19} />
            </button>
          </div>

          <div className="mail-layout">
            <div className="mail-list">
              {emails.length === 0 ? (
                <div className="empty-state">
                  <Inbox size={36} />
                  <strong>Belum ada email</strong>
                  <span>Inbox akan update realtime saat email masuk.</span>
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
