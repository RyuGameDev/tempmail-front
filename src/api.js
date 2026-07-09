const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'REQUEST_FAILED');
  }

  return data;
}

export const api = {
  baseUrl: API_URL,
  domains: () => request('/api/domains'),
  randomMailbox: (domain) =>
    request('/api/mailboxes/random', {
      method: 'POST',
      body: JSON.stringify({ domain })
    }),
  customMailbox: (localPart, domain) =>
    request('/api/mailboxes/custom', {
      method: 'POST',
      body: JSON.stringify({ localPart, domain })
    }),
  mailbox: (id) => request(`/api/mailboxes/${id}`),
  mailboxByAddress: (address) => request(`/api/mailboxes/by-address/${encodeURIComponent(address)}`),
  setActive: (id, active) =>
    request(`/api/mailboxes/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    }),
  deleteMailbox: (id) =>
    request(`/api/mailboxes/${id}`, {
      method: 'DELETE'
    }),
  emails: (mailboxId) => request(`/api/mailboxes/${mailboxId}/emails`),
  email: (mailboxId, emailId) => request(`/api/mailboxes/${mailboxId}/emails/${emailId}`),
  markEmailRead: (mailboxId, emailId, read = true) =>
    request(`/api/mailboxes/${mailboxId}/emails/${emailId}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ read })
    }),
  deleteEmail: (mailboxId, emailId) =>
    request(`/api/mailboxes/${mailboxId}/emails/${emailId}`, {
      method: 'DELETE'
    })
};
