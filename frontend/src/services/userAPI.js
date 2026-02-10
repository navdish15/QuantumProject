// src/services/userAPI.js
import axios from 'axios';

// Backend base: server.js mounts all main APIs under /api
// Example final URLs:
//   http://localhost:5000/api/experiments/assigned/:userId
//   http://localhost:5000/api/experiments/:id/upload
const API_BASE = process.env.REACT_APP_API_URL || 'https://quantumproject-wbu2.onrender.com';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach token to every request if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

//
// ─── EXPERIMENT APIS (USER SIDE) ────────────────────────────────────────────────
//

// Get experiments assigned to a specific user
// -> GET /api/experiments/assigned/:userId
export const getAssignedExperiments = (userId) => api.get(`/experiments/assigned/${userId}`);

// Get a single experiment by id
// -> GET /api/experiments/:id
export const getExperiment = (experimentId) => api.get(`/experiments/${experimentId}`);

// Update an experiment (if your backend supports PATCH)
// -> PATCH /api/experiments/:id
export const updateExperiment = (experimentId, payload) => api.patch(`/experiments/${experimentId}`, payload);

//
// ─── NOTIFICATIONS (ADJUST IF YOUR BACKEND DIFFERS) ────────────────────────────
//

// These assume you have /api/notifications/... routes.
// If notifications are only under /admin/notifications,
// keep these for admin use only or adjust paths accordingly.

export const getNotifications = (userId) => api.get(`/notifications/${userId}`);

export const markNotificationRead = (notificationId) => api.put(`/notifications/${notificationId}/read`);

export const markAllNotificationsRead = (userId) => api.put(`/notifications/mark-all-read/${userId}`);

//
// ─── EXPERIMENT FILE UPLOAD / LIST / DELETE ────────────────────────────────────
//

// Upload file for a given experiment.
// Backend route: POST /api/experiments/:id/upload
// Multer field name MUST be "file".
export const uploadExperimentFile = (experimentId, file, onUploadProgress) => {
  const form = new FormData();
  form.append('file', file); // important: field name "file" (matches upload.single("file"))

  return api
    .post(`/experiments/${experimentId}/upload`, form, {
      // Don't set Content-Type manually; axios handles the multipart boundary.
      onUploadProgress: (e) => {
        if (typeof onUploadProgress === 'function' && e.total) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onUploadProgress(pct);
        }
      },
    })
    .catch((err) => {
      // Normalize error message a bit for nicer UI
      const msg = err?.response?.data?.message || err.message || 'Upload failed';
      const wrapped = new Error(msg);
      wrapped.status = err?.response?.status;
      wrapped.responseData = err?.response?.data;
      throw wrapped;
    });
};

// Get all files for an experiment.
// Backend route: GET /api/experiments/:id/files
// Returns: [{ id, filename, path, size, created_at, url }, ...]
export const getExperimentFiles = (experimentId) => api.get(`/experiments/${experimentId}/files`);

// Delete a file (admin only in backend logic).
// Backend route: DELETE /api/experiments/:id/files/:fileId
export const deleteExperimentFile = (experimentId, fileId) => api.delete(`/experiments/${experimentId}/files/${fileId}`);

//
// ─── RAW API INSTANCE EXPORT ───────────────────────────────────────────────────
//

export default api;

/*
DEV NOTE:
With the updated backend, experimentFiles.js now stores a web path
like "/uploads/experiments/<filename>" in the `path` column and also
returns it as `url`.

Frontend should use `file.url` (or fall back to `file.path`) directly
for <a href> and <img src>:

  const fileUrl = latest ? (latest.url || latest.path) : fallbackPreview;

This matches what UserExperiments.js already does.
*/
