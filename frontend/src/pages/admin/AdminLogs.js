import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // FILTER STATES
  const [event, setEvent] = useState("");
  const [severity, setSeverity] = useState("");
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const limit = 20;

  // MODAL
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedLog(null);
  };

  // loadLogs using useCallback
  const loadLogs = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/admin/logs", {
        params: {
          page,
          limit,
          event: event || undefined,
          severity: severity || undefined,
          user_id: userId || undefined,
          q: search || undefined,
        },
      });

      // Expecting { data: [...], pages: N } from backend
      setLogs(res.data.data || []);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.log("Error fetching logs", err);
      setLogs([]);
      setPages(1);
    }

    setLoading(false);
  }, [page, event, severity, userId, search]);

  // useEffect — depends on loadLogs
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const applyFilters = () => {
  setPage(1);
};


  return (
    <AdminLayout>
      <div>
        <h2>System Logs</h2>

        {/* FILTER SECTION */}
        <div
          style={{
            marginTop: 20,
            marginBottom: 20,
            padding: 15,
            background: "#fff",
            borderRadius: 8,
            display: "flex",
            gap: 15,
            alignItems: "center",
          }}
        >
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={{ padding: 8, borderRadius: 6 }}
          >
            <option value="">All Events</option>
            <option value="user.create">user.create</option>
            <option value="user.status.update">user.status.update</option>
            <option value="experiment.create">experiment.create</option>
            <option value="experiment.status.update">experiment.status.update</option>
            <option value="notification.create">notification.create</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={{ padding: 8, borderRadius: 6 }}
          >
            <option value="">All Severity</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
            <option value="critical">critical</option>
          </select>

          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              width: 120,
            }}
          />

          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              flex: 1,
            }}
          />

          <button
            onClick={applyFilters}
            style={{
              padding: "8px 15px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Apply Filters
          </button>

          {/* CSV EXPORT BUTTON */}
          <button
            onClick={async () => {
  try {
    const res = await api.get("/admin/logs/export", {
      params: {
        event: event || undefined,
        severity: severity || undefined,
        user_id: userId || undefined,
        q: search || undefined,
      },
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed", err);
  }
}}

            style={{
              padding: "8px 15px",
              background: "#10b981",
              color: "#fff",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
        </div>

        {/* TABLE */}
        {loading ? (
          <p>Loading logs...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table table-bordered" style={{ background: "#fff" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: 20 }}>
                      No Logs Found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.user_name || "SYSTEM"}</td>
                      <td>{log.role || "-"}</td>
                      <td>{log.event}</td>
                      <td>{log.resource_type}/{log.resource_id}</td>
                      <td>{log.severity}</td>
                      <td>
                        <button
                          onClick={() => openModal(log)}
                          className="btn btn-primary btn-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-primary"
              >
                Previous
              </button>

              <span style={{ padding: 10, fontWeight: "bold" }}>
                Page {page} of {pages}
              </span>

              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="btn btn-primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FOR DETAILS */}
      {modalOpen && selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: 600,
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h4>Log Details</h4>
            <hr />

            <p><strong>ID:</strong> {selectedLog.id}</p>
            <p><strong>Time:</strong> {new Date(selectedLog.created_at).toLocaleString()}</p>
            <p><strong>User:</strong> {selectedLog.user_name || "SYSTEM"}</p>
            <p><strong>Role:</strong> {selectedLog.role || "-"}</p>
            <p><strong>Event:</strong> {selectedLog.event}</p>
            <p><strong>Resource:</strong> {selectedLog.resource_type}/{selectedLog.resource_id}</p>
            <p><strong>Severity:</strong> {selectedLog.severity}</p>

            <strong>Details:</strong>
            <pre
              style={{
                background: "#f5f5f5",
                padding: 10,
                borderRadius: 6,
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <button
              onClick={closeModal}
              className="btn btn-dark"
              style={{ marginTop: 15 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLogs;
