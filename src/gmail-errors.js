export function gmailError(error) {
  const messages = {
    GMAIL_ACCESS_DENIED: 'Kunci akses Gmail asli salah atau akun tidak aktif.',
    GMAIL_ACCESS_RATE_LIMITED: 'Terlalu banyak kunci yang salah. Coba lagi dalam 5 menit.',
    GMAIL_ALIAS_UNAUTHORIZED: 'Kunci alias tidak valid. Pilih alias dari riwayat perangkat ini.',
    GMAIL_ACCOUNT_UNAVAILABLE: 'Akun Gmail ini tidak aktif atau tidak tersedia.',
    GMAIL_ACCOUNT_EXISTS: 'Akun Gmail ini sudah terdaftar, termasuk variasi titiknya. Edit akun yang ada.',
    GMAIL_ADDRESS_INVALID: 'Gunakan alamat pribadi @gmail.com yang valid, tanpa +tag.',
    GMAIL_SETTINGS_INVALID: 'Periksa label, App Password 16 huruf, dan kunci akses minimal 16 karakter.',
    GMAIL_LOGIN_FAILED: 'Gmail menolak koneksi. Periksa alamat dan App Password akun.',
    GMAIL_TIMEOUT: 'Koneksi Gmail melewati batas waktu. Silakan coba lagi.',
    GMAIL_CONNECTION_FAILED: 'Gagal menghubungi Gmail. Periksa koneksi server dan izin IMAP akun.',
    GMAIL_CONNECTION_CLOSED: 'Koneksi Gmail terputus. Silakan muat ulang.',
    GMAIL_IMAP_FAILED: 'Gmail belum bisa membaca inbox. Silakan coba lagi.',
    GMAIL_ENCRYPTION_KEY_NOT_CONFIGURED: 'Server belum memiliki GMAIL_ENCRYPTION_KEY yang valid.',
    GMAIL_CREDENTIAL_UNAVAILABLE: 'Kredensial tidak bisa dibuka. Admin perlu memeriksa kunci enkripsi server.',
    GMAIL_STORAGE_UNAVAILABLE: 'Penyimpanan Gmail belum siap. Periksa migrasi database di server.',
    GMAIL_ALIASES_EXHAUSTED: 'Semua kombinasi titik akun ini sudah dialokasikan. Pilih akun lain.',
    GMAIL_ALIAS_MAILBOX_CHANGED: 'Identitas inbox di Gmail berubah. Alias ini dikunci untuk mencegah pesan yang salah tampil. Buat alias baru.',
    GMAIL_MESSAGE_TOO_LARGE: 'Pesan melebihi batas 2 MB. Buka pesan melalui Gmail.',
    GMAIL_MESSAGE_NOT_FOUND: 'Pesan tidak tersedia untuk inbox ini atau sudah dipindahkan di Gmail.',
    GMAIL_BUSY: 'Akun sedang sibuk. Coba buat alias lagi.',
    ADMIN_KEY_NOT_CONFIGURED: 'Server belum memiliki ADMIN_KEY. Atur secret ini sebelum masuk admin.',
    INVALID_TOKEN: 'Masukkan token akses Temp Mail yang valid untuk membuat alias.',
    QUOTA_EXHAUSTED: 'Kuota token habis. Ganti token untuk membuat alias baru.',
    DOMAIN_DISALLOWED: 'Token ini tidak diizinkan membuat alias @gmail.com.'
  };
  return messages[error.code || error.message] || error.message || 'Terjadi kesalahan. Coba lagi.';
}
