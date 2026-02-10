import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api';

const API_BASE = (api.defaults?.baseURL && api.defaults.baseURL.replace(/\/$/, '')) || window.location.origin;

const getFileExt = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

const prettyExt = (ext) => {
  if (!ext) return '';
  return ext.toUpperCase();
};

const AdminExperimentFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc | date_asc | exp_asc

  const truncate = (name, max = 32) => (name?.length > max ? name.slice(0, max) + '...' : name);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const res = await api.get('/experiments/admin/approved-files');
        setFiles(res.data || []);
      } catch (err) {
        console.error('Load failed:', err);
        setError('Failed to load approved experiment files');
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, []);

  // ---------- filter + sort ----------
  const displayedFiles = useMemo(() => {
    let data = [...files];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((f) => {
        return f.experiment_title?.toLowerCase().includes(q) || f.uploaded_by_name?.toLowerCase().includes(q) || f.original_name?.toLowerCase().includes(q);
      });
    }

    data.sort((a, b) => {
      if (sortBy === 'date_asc' || sortBy === 'date_desc') {
        const da = new Date(a.uploaded_at).getTime();
        const db = new Date(b.uploaded_at).getTime();
        return sortBy === 'date_asc' ? da - db : db - da;
      }

      if (sortBy === 'exp_asc') {
        const ea = (a.experiment_title || '').toLowerCase();
        const eb = (b.experiment_title || '').toLowerCase();
        if (ea < eb) return -1;
        if (ea > eb) return 1;
        return 0;
      }

      return 0;
    });

    return data;
  }, [files, search, sortBy]);

  return (
    <AdminLayout>
      <div className="admin-page-container">
        <h2 style={{ marginBottom: 4 }}>Approved Experiment Files</h2>
        <p style={{ color: '#6b7280', marginBottom: 18 }}>Safe library of files from experiments that are approved.</p>

        {/* Summary & controls */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: '#4b5563',
            }}
          >
            Total approved files:{' '}
            <span
              style={{
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#e5f2ff',
                color: '#1d4ed8',
                fontSize: 13,
              }}
            >
              {files.length}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <input
              type="text"
              placeholder="Search (experiment, user, file)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                minWidth: 220,
                outline: 'none',
              }}
            />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                outline: 'none',
              }}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="exp_asc">Experiment A → Z</option>
            </select>
          </div>
        </div>

        {/* Card wrapper */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          }}
        >
          {loading && <p>Loading...</p>}
          {!loading && error && <p style={{ color: 'red' }}>{error}</p>}

          {!loading && !error && displayedFiles.length === 0 && (
            <p style={{ color: '#6b7280' }}>No files match your filter. Try clearing search or changing sort.</p>
          )}

          {!loading && !error && displayedFiles.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Experiment</th>
                    <th style={thStyle}>Uploaded By</th>
                    <th style={thStyle}>Filename</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Uploaded At</th>
                    <th style={thStyle}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFiles.map((file, index) => {
                    const fileUrl = `${API_BASE}${file.path}`;
                    const ext = getFileExt(file.original_name);
                    const isEven = index % 2 === 0;

                    return (
                      <tr
                        key={file.id}
                        style={{
                          backgroundColor: isEven ? '#f9fafb' : '#ffffff',
                        }}
                      >
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={{ ...tdStyle, minWidth: 140 }}>{file.experiment_title || `#${file.experiment_id}`}</td>
                        <td style={{ ...tdStyle, minWidth: 160 }}>{file.uploaded_by_name || 'N/A'}</td>
                        <td style={{ ...tdStyle, maxWidth: 220 }} title={file.original_name}>
                          {truncate(file.original_name)}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{prettyExt(ext)}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{new Date(file.uploaded_at).toLocaleString()}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontWeight: 500,
                              textDecoration: 'none',
                              color: '#2563eb',
                            }}
                          >
                            View / Download
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

// small style helpers
const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #e5e7eb',
};

export default AdminExperimentFiles;
