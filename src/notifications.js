// Web Browser Notifications Helper for Ryudev Temp Mail & Gmail

const NOTIF_PREFIX = 'ryudev_notif_mailbox_';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

export function isMailboxNotificationEnabled(address) {
  if (!address) return false;
  const stored = localStorage.getItem(NOTIF_PREFIX + address.toLowerCase());
  if (stored !== null) {
    return stored === '1';
  }
  return false;
}

export function setMailboxNotificationEnabled(address, enabled) {
  if (!address) return;
  localStorage.setItem(NOTIF_PREFIX + address.toLowerCase(), enabled ? '1' : '0');
}

export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // First tone (pleasant chime: 880Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second tone (higher chime: 1318.5Hz / E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.16, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore audio restrictions
  }
}

export function extractEmailSnippet(email, maxLength = 120) {
  let text = (email.textBody || '').trim();
  if (!text && email.htmlBody) {
    try {
      const doc = new DOMParser().parseFromString(email.htmlBody, 'text/html');
      text = (doc.body.textContent || doc.body.innerText || '').trim();
    } catch {
      text = email.htmlBody.replace(/<[^>]*>/g, ' ').trim();
    }
  }
  text = text.replace(/\s+/g, ' ');
  if (text.length > maxLength) {
    return text.slice(0, maxLength - 3) + '...';
  }
  return text || '(Isi email kosong)';
}

export function sendEmailNotification({ email, mailboxAddress, onClick }) {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;
  if (!isMailboxNotificationEnabled(mailboxAddress)) return null;

  try {
    playNotificationSound();

    const sender = email.fromAddress || 'Pengirim Tidak Dikenal';
    const subject = email.subject ? email.subject.trim() : '(Tanpa Subjek)';
    const snippet = extractEmailSnippet(email);

    const title = `📩 Email Baru untuk ${mailboxAddress}`;
    const body = `Dari: ${sender}\nSubjek: ${subject}\n\n${snippet}`;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `email-${email.id || email.messageId || Date.now()}`,
      requireInteraction: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (typeof onClick === 'function') {
        onClick();
      }
    };

    return notification;
  } catch (error) {
    console.error('Failed to trigger desktop notification:', error);
    return null;
  }
}

