import { useEffect, useState } from 'react';
import { Key, LoaderCircle, Mail, Plus, RefreshCw } from 'lucide-react';
import { api } from './api.js';
import { gmailError } from './gmail-errors.js';

const empty = { label: '', address: '', appPassword: '', accessKey: '' };

export function AdminGmail({ adminKey }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generatedKey, setGeneratedKey] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const result = await api.adminGmailAccounts(adminKey); setAccounts(result.accounts); }
    catch (e) { setError(gmailError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [adminKey]);
  const update = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  const reset = () => { setForm(empty); setEditing(null); setGeneratedKey(false); };

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api.saveGmailAccount(adminKey, form, editing?.id);
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
        <div className="panel-heading"><Mail size={22} /><div><h2>{editing ? 'Edit akun Gmail' : 'Tambah akun Gmail'}</h2><p>Hubungkan Gmail dengan App Password.</p></div></div>
        <form className="gmail-form" onSubmit={save}>
          <label className="field">Label publik<input value={form.label} onChange={(e) => update('label', e.target.value)} required maxLength={60} placeholder="Contoh: Gmail Utama" /></label>
          <label className="field">Alamat Gmail asli<input type="email" value={form.address} onChange={(e) => update('address', e.target.value)} required disabled={Boolean(editing)} placeholder="nama@gmail.com" autoComplete="off" /></label>
          <label className="field">App Password Google {editing && '(isi untuk mengganti)'}<input type="password" value={form.appPassword} onChange={(e) => update('appPassword', e.target.value)} required={!editing} autoComplete="new-password" maxLength={32} placeholder="16 huruf dari Google" /></label>
          <label className="field">Password / API key inbox asli {editing && '(isi untuk mengganti)'}<input type={generatedKey ? 'text' : 'password'} value={form.accessKey} onChange={(e) => update('accessKey', e.target.value)} required={!editing} minLength={16} maxLength={256} autoComplete="new-password" placeholder="Minimal 16 karakter" /></label>
          <button className="token-btn-secondary" type="button" onClick={() => { update('accessKey', Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('')); setGeneratedKey(true); }}><Key size={16} /> Buat kunci acak</button>
          <p className="gmail-hint">Salin dan berikan kunci inbox asli hanya kepada pengguna yang berhak. Kunci yang tersimpan tidak dapat ditampilkan kembali.</p>
          <button type="submit" className="primary-action" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{busy ? 'Memeriksa & menyimpan...' : editing ? 'Simpan perubahan' : 'Tes koneksi & simpan'}</button>
          {editing && <button className="secondary-action" type="button" disabled={busy} onClick={reset}>Batal edit</button>}
        </form>
        <p className="gmail-hint">Aktifkan Verifikasi 2 Langkah, lalu buat <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">App Password Google</a>. Gunakan akun pribadi @gmail.com. Label publik sebaiknya tidak berisi alamat asli.</p>
      </div>
      <div className="admin-list-panel">
        <div className="panel-heading list-header"><div><h2>Akun Gmail</h2><p>{accounts.length} akun terdaftar</p></div><button type="button" className="icon-button" title="Muat ulang akun" disabled={loading || busy} onClick={load}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></div>
        {!accounts.length && <div className="admin-empty-tokens"><Mail size={36} /><p>{loading ? 'Memuat akun...' : 'Tambahkan akun Gmail pertama di form ini.'}</p></div>}
        <div className="gmail-account-list">{accounts.map((account) => <div key={account.id} className="gmail-account-card"><div><strong>{account.label}</strong><p>{account.address}</p><span className={`status-pill ${account.active ? 'active' : 'inactive'}`}>{account.active ? 'Aktif' : 'Nonaktif'}</span></div><div className="gmail-account-actions"><button className="token-btn-secondary" disabled={busy} type="button" onClick={() => { setEditing(account); setForm({ ...empty, label: account.label, address: account.address }); setGeneratedKey(false); setError(''); setNotice(''); }}>Edit</button><button className="token-btn-secondary" disabled={busy} type="button" onClick={() => toggle(account)}>{account.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></div>)}</div>
        <p className="gmail-hint">Menonaktifkan akun memblokir akses inbox asli dan semua aliasnya. Riwayat alokasi tetap disimpan agar alamat tidak digunakan ulang.</p>
      </div>
    </div>
  </>;
}
