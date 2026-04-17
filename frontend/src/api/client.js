const API_BASE = '/api/v1';

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { detail: 'Request failed' } }));
    throw { status: response.status, ...error.error };
  }

  return response.json();
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path, body) => request('DELETE', path, body);

export const authApi = {
  login: () => get('/auth/google'),
  devLogin: (username, password) => post('/auth/dev-login', { username, password }),
  me: () => get('/auth/me'),
  logout: () => post('/auth/logout'),
};

export const personApi = {
  getAll: (params = '') => get(`/persons${params}`),
  getById: (id) => get(`/persons/${id}`),
  create: (data) => post('/persons', data),
  update: (id, data) => put(`/persons/${id}`, data),
  updateVisibility: (id, data) => put(`/persons/${id}/visibility`, data),
  getLifeEvents: (id) => get(`/persons/${id}/life-events`),
  bulkSaveLifeEvents: (id, events) => put(`/persons/${id}/life-events/bulk`, events),
  quarantine: (id, data) => put(`/persons/${id}/quarantine`, data),
  restore: (id) => put(`/persons/${id}/restore`),
  getQuarantined: () => get('/persons/quarantined'),
  softDelete: (id, data) => put(`/persons/${id}/soft-delete`, data),
};

export const relationshipApi = {
  create: (data) => post('/relationships', data),
  getById: (id) => get(`/relationships/${id}`),
  update: (id, data) => put(`/relationships/${id}`, data),
  getMarriagesFor: (personId) => get(`/relationships/marriages/${personId}`),
  getParentsFor: (childId) => get(`/relationships/parents/${childId}`),
  deleteRelationship: (id, data) => put(`/relationships/${id}/delete`, data),
};

export const contributionApi = {
  submitFieldEdit: (data) => post('/contributions/field-edit', data),
  submitPersonAdd: (data) => post('/contributions/person-add', data),
  submitRelationshipAdd: (data) => post('/contributions/relationship-add', data),
  submitMessage: (data) => post('/contributions/message', data),
  getMyContributions: () => get('/contributions/mine'),
  getPending: (params = '') => get(`/contributions/pending${params}`),
  getDrafts: (params = '') => get(`/contributions/drafts${params}`),
  review: (id, data) => put(`/contributions/${id}/review`, data),
};

export const calculatorApi = {
  findPath: (fromId, toId) => get(`/calculator/path?from_id=${fromId}&to_id=${toId}`),
  getStep: (fromId, relation) => get(`/calculator/step?from_id=${fromId}&relation=${relation}`),
};

export const userApi = {
  getAll: () => get('/users'),
  invite: (data) => post('/users', data),
  update: (id, data) => put(`/users/${id}`, data),
  remove: (id) => del(`/users/${id}`),
};

export const graphApi = {
  getFullGraph: () => get('/graph'),
};

export const contributionRequestApi = {
  submit: (data) => post('/contribution-requests', data),
  getMine: () => get('/contribution-requests/mine'),
  getPending: () => get('/contribution-requests/pending'),
  review: (id, data) => put(`/contribution-requests/${id}/review`, data),
};

export const adminLogApi = {
  getAll: (limit = 100) => get(`/admin-logs?limit=${limit}`),
};

export const analyticsApi = {
  get: () => get('/analytics'),
};

export const platformApi = {
  clearDatabase: () => post('/platform/clear-database'),
  loadSeed: () => post('/platform/load-seed'),
  syncSeed: () => post('/platform/sync-seed'),
};

export const backupApi = {
  exportData: (format) => post('/backup/export', { format }),
};
