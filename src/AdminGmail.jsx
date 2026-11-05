import { useEffect, useState } from 'react';
import { LoaderCircle, Mail, Plus, RefreshCw } from 'lucide-react';
import { api } from './api.js';
import { gmailError } from './gmail-errors.js';

const empty = { label: '', address: '', appPassword: '' };

export function AdminGmail({ adminKey }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true);
    try { const result = await api.adminGmailAccounts(adminKey); setAccounts(result.accounts); }
    catch (e) { setError(gmailError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [adminKey]);
  const update = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  const reset = () => { setForm(empty); setEditing(null); };

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        ...form,
        accessKey: Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('')
      };
      await api.saveGmailAccount(adminKey, payload, editing?.id);
      setNotice(editing ? 'Pengaturan Gmail diperbarui.' : 'Koneksi berhasil. Akun Gmail siap digunakan.');
      reset(); await load();
    } catch (e) { setError(gmailError(e)); }
    finally { setBusy(false); }
  }
  async function toggle(account) {
    setBusy(true); setError(''); setNotice('');
    try { await api.saveGmailAccount(adminKey, { active: !account.active }, account.id); await load(); }
    catch (e) { setError(gmailError(e)); }
    finally { setBusy(false); }
  }

  return <>
    {error && <div role="alert" className="gmail-notice error">{error}</div>}
    {notice && <div role="status" className="gmail-notice">{notice}</div>}
    <div className="admin-grid-layout">
      <div className="admin-form-panel">
        <div className="panel-heading"><Mail size={22} /><div><h2>{editing ? 'Edit akun Gmail' : 'Tambah akun Gmail'}</h2><p>Hubungkan Gmail menggunakan App Password Google.</p></div></div>
        <form className="gmail-form" onSubmit={save}>
          <label className="field">Label publik<input value={form.label} onChange={(e) => update('label', e.target.value)} required maxLength={60} placeholder="Contoh: Gmail Utama" /></label>
          <label className="field">Alamat Gmail asli<input type="email" value={form.address} onChange={(e) => update('address', e.target.value)} required disabled={Boolean(editing)} placeholder="nama@gmail.com" autoComplete="off" /></label>
          <label className="field">App Password Google {editing && '(isi jika ingin mengganti)'}<input type="password" value={form.appPassword} onChange={(e) => update('appPassword', e.target.value)} required={!editing} autoComplete="new-password" maxLength={32} placeholder="16 huruf dari Google (contoh: abcd efgh ijkl mnop)" /></label>
          <button type="submit" className="primary-action" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{busy ? 'Memeriksa & menyimpan...' : editing ? 'Simpan perubahan' : 'Tes koneksi & simpan'}</button>
          {editing && <button className="secondary-action" type="button" disabled={busy} onClick={reset}>Batal edit</button>}
        </form>
        <p className="gmail-hint">Aktifkan Verifikasi 2 Langkah di akun Google Anda, lalu buat <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">App Password Google</a>. Izin buka inbox Gmail asli diatur melalui centang di tab <strong>Token Temp Mail</strong>.</p>
      </div>
      <div className="admin-list-panel">
        <div className="panel-heading list-header"><div><h2>Akun Gmail</h2><p>{accounts.length} akun terdaftar</p></div><button type="button" className="icon-button" title="Muat ulang akun" disabled={loading || busy} onClick={load}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></div>
        {!accounts.length && <div className="admin-empty-tokens"><Mail size={36} /><p>{loading ? 'Memuat akun...' : 'Tambahkan akun Gmail pertama di form ini.'}</p></div>}
        <div className="gmail-account-list">
          {accounts.map((account) => (
            <div key={account.id} className="gmail-account-card">
              <div className="gmail-card-info">
                <div className="gmail-card-header">
                  <strong>{account.label}</strong>
                  <span className={`status-pill ${account.active ? 'active' : 'inactive'}`}>
                    {account.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="gmail-card-address">{account.address}</p>
              </div>
              <div className="gmail-account-actions">
                <button
                  className="token-btn-secondary"
                  disabled={busy}
                  type="button"
                  onClick={() => {
                    setEditing(account);
                    setForm({ label: account.label, address: account.address, appPassword: '' });
                    setError('');
                    setNotice('');
                  }}
                >
                  Edit
                </button>
                <button
                  className="token-btn-secondary"
                  disabled={busy}
                  type="button"
                  onClick={() => toggle(account)}
                >
                  {account.active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="gmail-hint">Menonaktifkan akun memblokir akses inbox asli dan semua aliasnya. Riwayat alokasi tetap disimpan agar alamat tidak digunakan ulang.</p>
      </div>
    </div>
  </>;
}
