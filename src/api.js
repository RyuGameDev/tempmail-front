const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'REQUEST_FAILED');
    error.code = data.error;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  baseUrl: API_URL,
  adminSession: (adminKey) => request('/api/admin/session', { headers: { 'x-admin-key': adminKey } }),
  gmailAccounts: () => request('/api/gmail/accounts'),
  adminGmailAccounts: (adminKey) => request('/api/admin/gmail/accounts', { headers: { 'x-admin-key': adminKey } }),
  saveGmailAccount: (adminKey, payload, id) => request(`/api/admin/gmail/accounts${id ? `/${id}` : ''}`, {
    method: id ? 'PATCH' : 'POST', headers: { 'x-admin-key': adminKey }, body: JSON.stringify(payload)
  }),
  createGmailAlias: (accountId, token) => request('/api/gmail/aliases', {
    method: 'POST', headers: { 'x-api-key': token }, body: JSON.stringify({ accountId })
  }),
  gmailEmails: (inbox, before = '', signal) => request(`/api/gmail/${inbox.kind}/${inbox.id}/emails${before ? `?before=${encodeURIComponent(before)}` : ''}`, {
    headers: { [inbox.kind === 'aliases' ? 'x-gmail-alias-key' : 'x-gmail-key']: inbox.key }, signal
  }),
  gmailEmail: (inbox, id, signal) => request(`/api/gmail/${inbox.kind}/${inbox.id}/emails/${encodeURIComponent(id)}`, {
    headers: { [inbox.kind === 'aliases' ? 'x-gmail-alias-key' : 'x-gmail-key']: inbox.key }, signal
  }),
  domains: () => request('/api/domains'),
  checkToken: (token) => request('/api/tokens/check', { headers: { 'x-api-key': token } }),
  randomMailbox: (domain, token) =>
    request('/api/mailboxes/random', {
      method: 'POST',
      headers: token ? { 'x-api-key': token } : {},
      body: JSON.stringify({ domain })
    }),
  customMailbox: (localPart, domain, token) =>
    request('/api/mailboxes/custom', {
      method: 'POST',
      headers: token ? { 'x-api-key': token } : {},
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
    }),
  adminGetTokens: (adminKey) =>
    request('/api/admin/tokens', {
      headers: { 'x-admin-key': adminKey }
    }),
  adminSaveToken: (adminKey, payload) =>
    request('/api/admin/tokens', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify(payload)
    }),
  adminDeleteToken: (adminKey, token) =>
    request(`/api/admin/tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey }
    })
};
