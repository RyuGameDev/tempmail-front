import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  Key,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2
} from 'lucide-react';
import { api } from './api.js';
import { AdminGmail } from './AdminGmail.jsx';
import { gmailError } from './gmail-errors.js';

const ADMIN_STORAGE_KEY = 'ryudev_admin_portal_key';

export function AdminPage({ onBackToMail }) {
  const [adminTab, setAdminTab] = useState('gmail');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_STORAGE_KEY) || '');
  const [keyInput, setKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard states
  const [tokens, setTokens] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Form states for creating/updating token
  const [formToken, setFormToken] = useState('');
  const [formQuota, setFormQuota] = useState(500);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [disallowedDomains, setDisallowedDomains] = useState([]);
  const [formAllowGmailDot, setFormAllowGmailDot] = useState(false);
  const [formAllowGmailOriginal, setFormAllowGmailOriginal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch domains on load
  useEffect(() => {
    api.domains()
      .then(({ domains: fetched }) => setDomains(fetched || []))
      .catch(() => {});
  }, []);

  // Fetch tokens if adminKey is present
  const fetchTokens = async (keyToUse = adminKey) => {
    if (!keyToUse) return;
    setLoadingTokens(true);
    try {
      const res = await api.adminGetTokens(keyToUse);
      if (res.ok) {
        setTokens(res.tokens || []);
      }
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        setLoginError('Sesi berakhir atau Admin Key tidak valid.');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memuat Token',
          text: err.message || 'Terjadi kesalahan pada server'
        });
      }
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (adminKey && adminTab === 'tokens') {
      fetchTokens(adminKey);
    }
  }, [adminKey, adminTab]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) {
      setLoginError('Admin Key wajib diisi!');
      return;
    }

    setIsVerifying(true);
    setLoginError('');

    try {
      const res = await api.adminSession(key);
      if (res.ok) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, key);
        setAdminKey(key);
        setKeyInput('');
        Swal.fire({
          icon: 'success',
          title: 'Login Berhasil!',
          text: 'Selamat datang di Admin Portal Ryudev',
          timer: 1600,
          showConfirmButton: false
        });
      }
    } catch (err) {
      setLoginError(err.message === 'Admin API Key tidak valid' || err.status === 401
        ? 'Admin Key salah! Pastikan memasukkan key yang benar.'
        : `Gagal terhubung ke backend: ${gmailError(err)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminKey('');
    setTokens([]);
  };

  // Toggle domain in disallowed list
  const toggleDomain = (domainName) => {
    const d = domainName.toLowerCase();
    setDisallowedDomains((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  // Quick preset: Disallow .site and .id (allowing only .cloud)
  const applyPresetCloudOnly = () => {
    const targets = domains
      .map((d) => d.name.toLowerCase())
      .filter((name) => name.endsWith('.site') || name.endsWith('.id'));
    setDisallowedDomains(targets);
  };

  // Quick preset: Allow all domains (clear disallowed)
  const applyPresetAllowAll = () => {
    setDisallowedDomains([]);
  };

  // Submit create / update token
  const handleSaveToken = async (e) => {
    e.preventDefault();
    const tokenVal = formToken.trim();
    if (!tokenVal) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Nama Token wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    try {
      const quotaVal = isUnlimited ? -1 : Number(formQuota);
      const res = await api.adminSaveToken(adminKey, {
        token: tokenVal,
        quota: quotaVal,
        disallowedDomains: disallowedDomains,
        allowGmailDot: formAllowGmailDot,
        allowGmailOriginal: formAllowGmailOriginal
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Token Tersimpan!',
          text: `Token "${tokenVal}" berhasil dibuat/diperbarui.`,
          timer: 2000,
          showConfirmButton: false
        });
        setFormToken('');
        setFormQuota(500);
        setIsUnlimited(false);
        setDisallowedDomains([]);
        setFormAllowGmailDot(false);
        setFormAllowGmailOriginal(false);
        await fetchTokens(adminKey);
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Token',
        text: err.message || 'Terjadi kesalahan'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditToken = (t) => {
    setFormToken(t.token);
    if (t.quota === -1) {
      setIsUnlimited(true);
      setFormQuota(500);
    } else {
      setIsUnlimited(false);
      setFormQuota(t.quota);
    }
    setDisallowedDomains(t.disallowedDomains || []);
    setFormAllowGmailDot(Boolean(t.allowGmailDot));
    setFormAllowGmailOriginal(Boolean(t.allowGmailOriginal));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Delete token
  const handleDeleteToken = async (targetToken) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Token Ini?',
      text: `Apakah Anda yakin ingin menghapus token "${targetToken}"?`,
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await api.adminDeleteToken(adminKey, targetToken);
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Terhapus',
            text: `Token "${targetToken}" telah dihapus.`,
            timer: 1600,
            showConfirmButton: false
          });
          await fetchTokens(adminKey);
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message || 'Terjadi kesalahan'
        });
      }
    }
  };

  const copyText = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopiedToken(txt);
    setTimeout(() => setCopiedToken(''), 1500);
  };

  const filteredTokens = tokens.filter((t) =>
    t.token.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="admin-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="admin-brand">
          <p className="eyebrow">Ryudev Mail Gateway</p>
          <h1>Admin Portal</h1>
        </div>
        <div className="topbar-actions">
          <button className="token-btn-secondary" onClick={onBackToMail} type="button">
            <ArrowLeft size={16} />
            <span>Kembali ke Temp Mail</span>
          </button>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Ubah tema"
            type="button"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {adminKey && (
            <button className="icon-button text-danger" onClick={handleLogout} title="Logout Admin" type="button">
              <LogOut size={19} />
            </button>
          )}
        </div>
      </header>

      {/* If not logged in -> Show Login Card */}
      {!adminKey ? (
        <section className="admin-login-wrapper">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <div className="admin-lock-icon">
                <Lock size={28} />
              </div>
              <h2>Login Admin Gateway</h2>
              <p>Masukkan Secret Key Admin untuk mengelola token dan akun Gmail.</p>
            </div>

            {loginError && <div className="admin-error-box">{loginError}</div>}

            <form onSubmit={handleLogin} className="admin-login-form">
              <label className="field">
                Admin Secret Key
                <div className="admin-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Masukkan admin key..."
                    autoFocus
                  />
                  <button
                    type="button"
                    className="admin-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button className="primary-action admin-login-btn" type="submit" disabled={isVerifying}>
                {isVerifying ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
                <span>{isVerifying ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
              </button>
            </form>
          </div>
        </section>
      ) : (
        /* Authenticated Dashboard */
        <section className="admin-dashboard">
          <nav className="mail-tabs admin-nav-tabs" aria-label="Pengaturan admin">
            <button type="button" aria-pressed={adminTab === 'tokens'} onClick={() => setAdminTab('tokens')}><Key size={17} /> Token Temp Mail</button>
            <button type="button" aria-pressed={adminTab === 'gmail'} onClick={() => setAdminTab('gmail')}><Mail size={17} /> Akun Gmail</button>
          </nav>
          {adminTab === 'gmail' ? <AdminGmail adminKey={adminKey} /> : <>
          {/* Summary Cards */}
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Key size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Token Dibuat</span>
                <strong className="stat-value">{tokens.length}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <Database size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Domain Aktif</span>
                <strong className="stat-value">{domains.length} Domain</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon amber">
                <ShieldCheck size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Status Akses</span>
                <strong className="stat-value text-success">Admin Verified</strong>
              </div>
            </div>
          </div>

          <div className="admin-grid-layout">
            {/* Left Column: Create/Update Token Form */}
            <div className="admin-form-panel">
              <div className="panel-heading">
                <Plus size={20} />
                <div>
                  <h2>{formToken ? 'Edit Token' : 'Buat Token Baru'}</h2>
                  <p>Atur nama token, kuota, izin Gmail asli, dan domain</p>
                </div>
              </div>

              <form onSubmit={handleSaveToken} className="admin-token-form">
                <label className="field">
                  Nama Token / Key
                  <input
                    type="text"
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value)}
                    placeholder="Contoh: ryujinganz, paket500"
                    required
                  />
                </label>

                {/* Kuota Section */}
                <div className="quota-control-wrapper">
                  <div className="quota-input-row">
                    <label className="field">
                      Kuota Pembuatan Email
                      <input
                        type="number"
                        value={formQuota}
                        onChange={(e) => setFormQuota(e.target.value)}
                        disabled={isUnlimited}
                        min="1"
                      />
                    </label>
                    <div className="unlimited-switch-wrap">
                      <label className="theme-switch" title="Toggle VIP Unlimited">
                        <input
                          type="checkbox"
                          checked={isUnlimited}
                          onChange={(e) => setIsUnlimited(e.target.checked)}
                        />
                        <span className="theme-switch-slider" />
                      </label>
                      <span className="unlimited-switch-text">VIP Unlimited (-1)</span>
                    </div>
                  </div>

                  <div className="quick-quota-tags">
                    <button type="button" className={!isUnlimited && Number(formQuota) === 100 ? 'active' : ''} onClick={() => { setIsUnlimited(false); setFormQuota(100); }}>100</button>
                    <button type="button" className={!isUnlimited && Number(formQuota) === 500 ? 'active' : ''} onClick={() => { setIsUnlimited(false); setFormQuota(500); }}>500</button>
                    <button type="button" className={!isUnlimited && Number(formQuota) === 1000 ? 'active' : ''} onClick={() => { setIsUnlimited(false); setFormQuota(1000); }}>1.000</button>
                    <button type="button" className={isUnlimited ? 'active' : ''} onClick={() => { setIsUnlimited(true); }}>VIP Unlimited</button>
                  </div>
                </div>

                {/* DUA IZIN GMAIL: GMAIL DOT TRICK & GMAIL ASLI */}
                <div className="gmail-permissions-wrapper">
                  <div className="permissions-group-header">
                    <Mail size={15} />
                    <span>Izin Layanan Gmail</span>
                  </div>

                  {/* Toggle 1: Gmail Dot Trick */}
                  <div className={`permission-toggle-box ${formAllowGmailDot ? 'enabled' : ''}`}>
                    <div className="permission-toggle-info">
                      <div className="permission-title-row">
                        <div className="permission-icon-wrap">
                          <Mail size={15} />
                        </div>
                        <div className="permission-heading-wrap">
                          <strong>Izin Gmail Dot Trick</strong>
                          <span className={`status-pill ${formAllowGmailDot ? 'active' : 'inactive'}`}>
                            {formAllowGmailDot ? 'Diizinkan' : 'Dilarang'}
                          </span>
                        </div>
                      </div>
                      <p>
                        {formAllowGmailDot
                          ? '✓ Token ini berhak membuat alias dot trick Gmail.'
                          : '🚫 Token ini dilarang membuat alias dot trick Gmail.'}
                      </p>
                    </div>
                    <label className="theme-switch" title="Toggle Izin Gmail Dot Trick">
                      <input
                        type="checkbox"
                        checked={formAllowGmailDot}
                        onChange={(e) => setFormAllowGmailDot(e.target.checked)}
                      />
                      <span className="theme-switch-slider" />
                    </label>
                  </div>

                  {/* Toggle 2: Gmail Asli */}
                  <div className={`permission-toggle-box ${formAllowGmailOriginal ? 'enabled' : ''}`}>
                    <div className="permission-toggle-info">
                      <div className="permission-title-row">
                        <div className="permission-icon-wrap">
                          <Lock size={15} />
                        </div>
                        <div className="permission-heading-wrap">
                          <strong>Izin Akses Gmail Asli</strong>
                          <span className={`status-pill ${formAllowGmailOriginal ? 'active' : 'inactive'}`}>
                            {formAllowGmailOriginal ? 'Diizinkan' : 'Dilarang'}
                          </span>
                        </div>
                      </div>
                      <p>
                        {formAllowGmailOriginal
                          ? '✓ Token ini berhak membuka inbox akun Gmail asli di tab Gmail.'
                          : '🚫 Token ini dilarang membuka inbox akun Gmail asli.'}
                      </p>
                    </div>
                    <label className="theme-switch" title="Toggle Izin Gmail Asli">
                      <input
                        type="checkbox"
                        checked={formAllowGmailOriginal}
                        onChange={(e) => setFormAllowGmailOriginal(e.target.checked)}
                      />
                      <span className="theme-switch-slider" />
                    </label>
                  </div>
                </div>

                {/* Domain Restrictions */}
                <div className="domain-restriction-section">
                  <div className="restriction-header">
                    <span>Batasan Domain Temp Mail:</span>
                    <div className="preset-links">
                      <button type="button" onClick={applyPresetCloudOnly}>Larang .site & .id</button>
                      <button type="button" onClick={applyPresetAllowAll}>Bebaskan Semua</button>
                    </div>
                  </div>

                  <div className="domain-chip-grid">
                    {domains.map((dom) => {
                      const isDisallowed = disallowedDomains.includes(dom.name.toLowerCase());
                      return (
                        <button
                          key={dom.name}
                          type="button"
                          className={`domain-pill ${isDisallowed ? 'blocked' : 'allowed'}`}
                          onClick={() => toggleDomain(dom.name)}
                        >
                          <span className="domain-pill-status">
                            {isDisallowed ? '✕' : '✓'}
                          </span>
                          <span className="domain-pill-name">@{dom.name}</span>
                          <small className="domain-pill-label">
                            {isDisallowed ? 'Dilarang' : 'Boleh'}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-actions-row">
                  <button className="primary-action" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}
                    <span>{isSubmitting ? 'Menyimpan...' : formToken ? 'Simpan Perubahan' : 'Simpan & Aktifkan Token'}</span>
                  </button>
                  {formToken && (
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => {
                        setFormToken('');
                        setFormQuota(500);
                        setIsUnlimited(false);
                        setDisallowedDomains([]);
                        setFormAllowGmailDot(false);
                        setFormAllowGmailOriginal(false);
                      }}
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Tokens List Table */}
            <div className="admin-list-panel">
              <div className="panel-heading list-header">
                <div className="list-title-wrap">
                  <div className="title-with-badge">
                    <h2>Daftar Token Terdaftar</h2>
                    <span className="counter-badge">{tokens.length}</span>
                  </div>
                  <p>Token aktif yang tersimpan di database D1</p>
                </div>
                <div className="list-actions">
                  <input
                    type="search"
                    className="admin-search-input"
                    placeholder="Cari token..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                  <button
                    className="icon-button"
                    onClick={() => fetchTokens(adminKey)}
                    disabled={loadingTokens}
                    title="Refresh data"
                    type="button"
                  >
                    {loadingTokens ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
                  </button>
                </div>
              </div>

              <div className="tokens-table-wrap">
                {filteredTokens.length === 0 ? (
                  <div className="admin-empty-tokens">
                    <Key size={36} />
                    <p>{searchFilter ? 'Tidak ada token yang cocok dengan pencarian.' : 'Belum ada token yang dibuat. Buat token pertama Anda di form sebelah kiri.'}</p>
                  </div>
                ) : (
                  <div className="tokens-card-list">
                    {filteredTokens.map((t) => (
                      <div key={t.token} className="token-admin-row">
                        <div className="token-row-header">
                          <div className="token-name-group">
                            <strong className="token-row-name">{t.token}</strong>
                            <button
                              className="mini-copy-btn"
                              onClick={() => copyText(t.token)}
                              type="button"
                              title="Salin token"
                            >
                              {copiedToken === t.token ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                          </div>
                          <div className="token-row-actions">
                            <button
                              className="token-action-btn edit"
                              onClick={() => startEditToken(t)}
                              type="button"
                              title="Edit token ini"
                            >
                              Edit
                            </button>
                            <button
                              className="token-delete-btn"
                              onClick={() => handleDeleteToken(t.token)}
                              type="button"
                              title="Hapus token"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="token-badges-row">
                          <span className={`token-quota-pill ${t.quota === -1 ? 'vip' : t.quota === 0 ? 'exhausted' : ''}`}>
                            {t.quota === -1 ? 'VIP Unlimited' : `${t.quota} email tersisa`}
                          </span>

                          {t.allowGmailDot ? (
                            <span className="token-permission-badge allowed" title="Token ini boleh buat alias Gmail dot trick">
                              <CheckCircle2 size={13} />
                              <span>Dot Trick: Boleh</span>
                            </span>
                          ) : (
                            <span className="token-permission-badge blocked" title="Token ini dilarang buat alias Gmail dot trick">
                              <Lock size={13} />
                              <span>Dot Trick: Dilarang</span>
                            </span>
                          )}

                          {t.allowGmailOriginal ? (
                            <span className="token-permission-badge allowed" title="Token ini boleh akses Gmail asli">
                              <ShieldCheck size={13} />
                              <span>Gmail Asli: Boleh</span>
                            </span>
                          ) : (
                            <span className="token-permission-badge blocked" title="Token ini dilarang akses Gmail asli">
                              <Lock size={13} />
                              <span>Gmail Asli: Dilarang</span>
                            </span>
                          )}

                          {t.disallowedDomains?.length > 0 ? (
                            <span className="token-disallowed-tag" title="Domain yang dilarang">
                              <ShieldAlert size={12} />
                              <span>Dilarang: {t.disallowedDomains.map((d) => '@' + d).join(', ')}</span>
                            </span>
                          ) : (
                            <span className="token-allowed-all-tag">
                              ✓ Semua Domain Temp Mail
                            </span>
                          )}
                        </div>

                        <div className="token-row-footer">
                          <span className="token-row-date">
                            Dibuat: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </>}
        </section>
      )}
    </div>
  );
}
