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
const del = (path) => request('DELETE', path);

export const authApi = {
  login: () => get('/auth/google'),
  me: () => get('/auth/me'),
};

export const personApi = {
  getAll: (params = '') => get(`/persons${params}`),
  getById: (id) => get(`/persons/${id}`),
  create: (data) => post('/persons', data),
  update: (id, data) => put(`/persons/${id}`, data),
  updateVisibility: (id, data) => put(`/persons/${id}/visibility`, data),
};

export const relationshipApi = {
  create: (data) => post('/relationships', data),
  update: (id, data) => put(`/relationships/${id}`, data),
  getMarriagesFor: (personId) => get(`/relationships/marriages/${personId}`),
};

export const contributionApi = {
  submit: (data) => post('/contributions', data),
  getMyContributions: () => get('/contributions/mine'),
  getPending: (params = '') => get(`/contributions/pending${params}`),
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

export const backupApi = {
  exportData: (format) => post('/backup/export', { format }),
};
