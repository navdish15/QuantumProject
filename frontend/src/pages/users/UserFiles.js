// src/pages/users/UserFiles.js
import React, { useEffect, useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

const UserFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

useEffect(() => {
    const fetchFiles = async () => {
      try {
        setError("");

        const res = await api.get("/experiments/user");
        setFiles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading files", err);
        setError("Failed to load files. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDownload = (file) => {
    const url = `${API_BASE}/uploads/experiments/${file.experiment_id}/${file.stored_name}`;
    window.open(url, "_blank");
  };

  const handleViewExperiment = (file) => {
    if (!file.experiment_id) return;
    navigate(`/user/experiments/${file.experiment_id}`);
  };

  const filteredFiles = files.filter((file) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const expTitle = (file.experiment_title || "").toLowerCase();
    const fileName = (file.filename || "").toLowerCase();

    return expTitle.includes(term) || fileName.includes(term);
  });

  return (
    <div
      style={{
        padding: 24,
        background: "#f8fafc",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ marginBottom: 6, color: "#0f172a" }}>Files</h2>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              All documents for your assigned experiments.
            </p>
          </div>

          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by experiment or file name..."
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5f5",
                minWidth: 260,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        </div>

        {loading && (
          <div
            style={{
              padding: 16,
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            Loading files...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: 16,
              background: "#fef2f2",
              borderRadius: 8,
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filteredFiles.length === 0 && files.length > 0 && (
          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            No files match your search.
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            No files available yet.
          </div>
        )}

        {!loading && !error && filteredFiles.length > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead style={{ background: "#f1f5f9" }}>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Experiment
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    File Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Size
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Uploaded On
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "10px 12px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr key={file.id}>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "#0f172a",
                      }}
                    >
                      {file.experiment_title || "-"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "#1e293b",
                      }}
                    >
                      {file.filename}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "#64748b",
                      }}
                    >
                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "-"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "#64748b",
                      }}
                    >
                      {file.uploaded_at
                        ? new Date(file.uploaded_at).toLocaleString()
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "center",
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => handleViewExperiment(file)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          color: "#1e293b",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        View Experiment
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "none",
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFiles;
