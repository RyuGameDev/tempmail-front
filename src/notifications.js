// Web Browser & Web Push Notifications Helper for Ryudev Temp Mail & Gmail
import { api } from './api.js';

const NOTIF_PREFIX = 'ryudev_notif_mailbox_';
const GLOBAL_NOTIF_KEY = 'ryudev_push_enabled';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
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
  if (typeof window === 'undefined') return false;
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const addrKey = address ? address.trim().toLowerCase() : '';
  if (addrKey) {
    const stored = localStorage.getItem(NOTIF_PREFIX + addrKey);
    if (stored !== null) {
      return stored === '1';
    }
  }

  // Fallback to global preference if set
  const globalSetting = localStorage.getItem(GLOBAL_NOTIF_KEY);
  if (globalSetting !== null) {
    return globalSetting === '1';
  }

  return false;
}

export function setMailboxNotificationEnabled(address, enabled) {
  if (typeof window === 'undefined') return;
  const val = enabled ? '1' : '0';
  localStorage.setItem(GLOBAL_NOTIF_KEY, val);
  if (address) {
    localStorage.setItem(NOTIF_PREFIX + address.trim().toLowerCase(), val);
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
}

export async function subscribeUserToPush(address) {
  if (!address) return false;

  // Persist synchronously to localStorage so reloads immediately show switch as ON
  setMailboxNotificationEnabled(address, true);

  // 1. Ensure permission is granted
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      setMailboxNotificationEnabled(address, false);
      return false;
    }
  }

  // 2. Register Service Worker & get Push Subscription
  try {
    const reg = await registerServiceWorker();
    if (!reg || !('pushManager' in reg)) {
      return true;
    }

    const { publicKey } = await api.getVapidPublicKey();
    if (!publicKey) {
      return true;
    }

    let sub = await reg.pushManager.getSubscription();
    // Validate existing subscription key:
    if (sub) {
      try {
        const rawKey = sub.options?.applicationServerKey;
        if (rawKey) {
          const currentKeyB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const cleanPublic = publicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          if (currentKeyB64 && currentKeyB64 !== cleanPublic) {
            console.warn('[WebPush] VAPID key mismatch, renewing push subscription...');
            await sub.unsubscribe();
            sub = null;
          }
        }
      } catch (err) {
        console.warn('[WebPush] Error inspecting existing subscription, renewing:', err);
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    const subJson = sub.toJSON();
    await api.pushSubscribe({
      address: address.trim().toLowerCase(),
      subscription: {
        endpoint: sub.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || ''
        }
      }
    });

    setMailboxNotificationEnabled(address, true);
    return true;
  } catch (err) {
    console.error('Failed to subscribe to Web Push:', err);
    // Keep local flag enabled so in-tab notifications still work
    setMailboxNotificationEnabled(address, true);
    return true;
  }
}

export async function unsubscribeUserFromPush(address) {
  setMailboxNotificationEnabled(address, false);

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.pushUnsubscribe({
            address: address ? address.trim().toLowerCase() : '',
            endpoint: sub.endpoint
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to unsubscribe from Web Push:', err);
  }
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
