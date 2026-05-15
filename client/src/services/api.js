import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

const getFilename = (contentDisposition, fallback) => {
  const utfMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);

  const plainMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];

  return fallback;
};

const saveBlobResponse = (response, fallbackName) => {
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getFilename(response.headers['content-disposition'], fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const downloadFile = async (url, fallbackName) => {
  const response = await api.get(url, { responseType: 'blob' });
  saveBlobResponse(response, fallbackName);
  return response;
};

// ── CO Endpoints ────────────────────────────────────────────────────────────
export const coApi = {
  generate: (formData) => api.post('/co/generate', formData),
  feedback: (data) => api.post('/co/feedback', data),
  confirm: (sessionId) => api.post('/co/confirm', { session_id: sessionId }),
  getSession: (id) => api.get(`/co/session/${id}`),
};

// ── Mapping Endpoints ────────────────────────────────────────────────────────
export const mappingApi = {
  generate: (sessionId) => api.post('/mapping/generate', { session_id: sessionId }),
  get: (sessionId) => api.get(`/mapping/${sessionId}`),
};

// ── Attainment Endpoints ─────────────────────────────────────────────────────
export const attainmentApi = {
  calculate: (formData) => api.post('/attainment/calculate', formData),
  history: () => api.get('/attainment/history'),
  get: (course, year) => api.get(`/attainment/${course}/${year}`),
  downloadPdf: (course, year) =>
    downloadFile(`/attainment/download/pdf/${course}/${year}`, `${course}_report.pdf`),
  downloadExcel: (course, year) =>
    downloadFile(`/attainment/download/excel/${course}/${year}`, `${course}_report.xlsx`),
};

// ── Template ─────────────────────────────────────────────────────────────────
export const templateApi = {
  downloadMarks: (sessionId) => downloadFile(`/template/marks/${sessionId}`, 'marks_template.xlsx'),
};

export default api;
