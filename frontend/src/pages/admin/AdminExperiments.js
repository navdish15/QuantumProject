// src/pages/admin/AdminExperiments.js
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";

const API_BASE =
  (api.defaults?.baseURL && api.defaults.baseURL.replace(/\/$/, "")) ||
  window.location.origin;

const AdminExperiments = () => {
  const [users, setUsers] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // for files viewer (now below, full-width)
  const [selectedExp, setSelectedExp] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [reportDetails, setReportDetails] = useState(null); // report from user
  const [showReportModal, setShowReportModal] = useState(false); // modal

  // NEW: edit popup state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", title: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);
  useEffect(() => {
    fetchUsers();
    fetchExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto hide success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      const nonAdminUsers = res.data.filter((u) => u.role !== "admin");
      setUsers(nonAdminUsers);
    } catch (err) {
      console.error("Load users error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to load users");
    }
  };

  const fetchExperiments = async () => {
    try {
      const res = await api.get("/admin/experiments");
      setExperiments(res.data);
    } catch (err) {
      console.error("Load experiments error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to load experiments");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/experiments", {title: form.title,description: form.description,assigned_to: form.assigned_to || null,});
      setSuccess("Experiment created successfully");
      setForm({ title: "", description: "", assigned_to: "" });
      fetchExperiments();
    } catch (err) {
      console.error("Create experiment error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to create experiment");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (!newStatus) return;
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/experiments/${id}/status`, {status: newStatus,});
      setSuccess("Status updated");
      fetchExperiments();
    } catch (err) {
      console.error("Update status error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleAssignUpdate = async (id, assignedTo) => {
    setError("");
    setSuccess("");
    try {
    await api.put(`/admin/experiments/${id}/assign`, {assigned_to: assignedTo || null,});
      setSuccess("Assignment updated");
      fetchExperiments();
    } catch (err) {
      console.error("Update assign error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to update assignment");
    }
  };

  const getStatusStyles = (status) => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      textTransform: "capitalize",
    };

    switch (status) {
      case "pending":
        return { ...base, background: "#fef3c7", color: "#92400e" };
      case "active":
        return { ...base, background: "#dbeafe", color: "#1d4ed8" };
      case "done":
        return { ...base, background: "#dcfce7", color: "#166534" };
      case "approved":
        return { ...base, background: "#e0f2fe", color: "#0369a1" };
      default:
        return { ...base, background: "#e5e7eb", color: "#374151" };
    }
  };

  const statusOptions = ["pending", "active", "done", "approved"];

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  // load files + report when admin clicks "View files"
  const handleViewFiles = async (exp) => {
    setSelectedExp(exp);
    setFiles([]);
    setFilesError("");
    setFilesLoading(true);
    setPreviewFile(null);
    setReportDetails(null);
    setShowReportModal(false);

    try {
      const [filesRes, reportRes] = await Promise.all([
      api.get(`/experiments/${exp.id}/files`),
      api.get(`/experiments/${exp.id}/report`),
      ]);
      setFiles(filesRes.data);
      setReportDetails(reportRes.data); // can be null
    } catch (err) {
      console.error("Admin load files/report error:", err.response?.data || err);
      setFilesError(err.response?.data?.message || "Failed to load files or report");
    } finally {
      setFilesLoading(false);
    }
  };

  const handleCloseFiles = () => {
    setSelectedExp(null);
    setFiles([]);
    setFilesError("");
    setFilesLoading(false);
    setPreviewFile(null);
    setReportDetails(null);
    setShowReportModal(false);
  };

  // flag for approved status in files viewer
  const isSelectedApproved = selectedExp && selectedExp.status === "approved";

  // NEW: approve directly from the files/report area
  const handleApproveFromViewer = async () => {
    if (!selectedExp || isSelectedApproved) return;
    await handleStatusUpdate(selectedExp.id, "approved");
    // update local selectedExp so the banner changes immediately
    setSelectedExp((prev) => (prev ? { ...prev, status: "approved" } : prev));
  };

  // ---------- NEW: EDIT POPUP + DELETE LOGIC ----------

  const openEditModal = (exp) => {
    setEditForm({
      id: exp.id,
      title: exp.title || "",
      description: exp.description || "",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editLoading) return;
    setShowEditModal(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      setError("Title is required");
      return;
    }

    setError("");
    setSuccess("");
    setEditLoading(true);

    try {
    await api.put(`/admin/experiments/${editForm.id}`, {title: editForm.title,description: editForm.description,});
      setSuccess("Experiment updated");
      setShowEditModal(false);
      fetchExperiments();
      // if currently selected in viewer, update its title/description locally
      setSelectedExp((prev) =>
        prev && prev.id === editForm.id
          ? { ...prev, title: editForm.title, description: editForm.description }
          : prev
      );
    } catch (err) {
      console.error("Edit experiment error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to update experiment");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteExperiment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this experiment? This action cannot be undone.")) return;

    setError("");
    setSuccess("");

    try {
    await api.delete(`/admin/experiments/${id}`);
      setSuccess("Experiment deleted");
      // if this experiment is open in viewer, close it
      setSelectedExp((prev) => (prev && prev.id === id ? null : prev));
      fetchExperiments();
    } catch (err) {
      console.error("Delete experiment error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to delete experiment");
    }
  };

  // ===== DOWNLOAD URL (correct way) =====
const getDownloadUrl = (file) =>
  `${API_BASE}/uploads/experiments/${file.experiment_id}/${file.stored_name}`;

  // ---------------------------------------------------

  return (
    <AdminLayout>
      <div style={{padding: 24,background: "#f3f4f6",minHeight: "100vh",boxSizing: "border-box",}}>
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#111827" }}>
            Experiments
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            Create experiments, assign them to users, track status and view submitted reports.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div style={{marginBottom: 12,padding: 10,borderRadius: 6,background: "#fee2e2",color: "#991b1b",fontSize: 13,border: "1px solid #fecaca",}}>
            {error}
          </div>
        )}
        {success && (
          <div style={{marginBottom: 12,padding: 10,borderRadius: 6,background: "#dcfce7",color: "#166534",fontSize: 13,border: "1px solid #bbf7d0",}}>
            {success}
          </div>
        )}

        {/* Form + experiments list, now vertical (table below form) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Create / Assign Form */}
          <div style={{padding: 18,borderRadius: 12,border: "1px solid #e5e7eb",background: "#ffffff",boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",}}>
            <div style={{display: "flex",justifyContent: "space-between",alignItems: "center",marginBottom: 10,}}>
              <h3 style={{margin: 0,fontSize: 16,fontWeight: 600,color: "#111827",}}>
                Create &amp; Assign Experiment
              </h3>
              <span style={{fontSize: 11,color: "#6b7280",background: "#f9fafb",padding: "2px 8px",borderRadius: 999,border: "1px solid #e5e7eb",}}>
                Admin action
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                  }}
                >
                  Title <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="Enter experiment title"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                  }}
                >
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    resize: "vertical",
                    outline: "none",
                  }}
                  placeholder="Add instructions or details for the user"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                  }}
                >
                  Assign to User
                </label>
                <select
                  name="assigned_to"
                  value={form.assigned_to}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  <option value="">-- Not assigned --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9ca3af" }}>
                  You can leave this empty and assign later.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: loading ? "#818cf8" : "#4f46e5",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.15)",
                }}
              >
                {loading ? "Saving..." : "Create Experiment"}
              </button>
            </form>
          </div>

          {/* Experiments List - now below the form */}
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                All Experiments
              </h3>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Latest first</span>
            </div>

            {experiments.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
                No experiments yet. Start by creating one above.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        ID
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Title
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                          width: "30%",
                        }}
                      >
                        Description
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Assigned To
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Files
                      </th>
                      {/* NEW Actions column */}
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Actions
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          padding: 8,
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiments.map((exp) => {
                      const assignedUser = users.find(
                        (u) => String(u.id) === String(exp.assigned_to)
                      );
                      const status = exp.status || "pending";
                      const isLockedStatus = status === "done" || status === "approved";

                      return (
                        <tr
                          key={exp.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.12s ease",
                          }}
                        >
                          <td style={{ padding: 8, color: "#4b5563" }}>{exp.id}</td>
                          <td style={{ padding: 8, color: "#111827", fontWeight: 500 }}>
                            {exp.title}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: "#4b5563",
                              maxWidth: 260,
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                            }}
                            title={exp.description || ""}
                          >
                            {exp.description || "-"}
                          </td>
                          <td style={{ padding: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={getStatusStyles(status)}>{status}</span>
                              {!isLockedStatus && (
                                <select
                                  value={status}
                                  onChange={(e) => handleStatusUpdate(exp.id, e.target.value)}
                                  style={{
                                    padding: "4px 6px",
                                    borderRadius: 999,
                                    border: "1px solid #d1d5db",
                                    fontSize: 11,
                                    background: "#ffffff",
                                    outline: "none",
                                  }}
                                >
                                  {statusOptions.map((st) => (
                                    <option key={st} value={st}>
                                      {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          {/* Assigned To column */}
                          <td style={{ padding: 8, color: "#4b5563" }}>
                            {exp.assigned_to ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span
                                  style={{
                                    fontWeight: 500,
                                    color: "#111827",
                                  }}
                                >
                                  {assignedUser
                                    ? `${assignedUser.name} (${assignedUser.email})`
                                    : `User ID: ${exp.assigned_to}`}
                                </span>
                                <span style={{ fontSize: 11, color: "#9ca3af" }}>Assigned</span>
                              </div>
                            ) : (
                              <select
                                value={exp.assigned_to || ""}
                                onChange={(e) =>
                                  handleAssignUpdate(exp.id, e.target.value)
                                }
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #d1d5db",
                                  fontSize: 12,
                                  background: "#ffffff",
                                  outline: "none",
                                  minWidth: 180,
                                }}
                              >
                                <option value="">Not assigned</option>
                                {users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          <td style={{ padding: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleViewFiles(exp)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "none",
                                background: "#e5e7eb",
                                color: "#374151",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              View files
                            </button>
                          </td>

                          {/* NEW Actions buttons with lock condition */}
                          <td style={{ padding: 8 }}>
                            {isLockedStatus ? (
                              <span style={{ fontSize: 11, color: "#9ca3af" }}>Locked</span>
                            ) : (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(exp)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    border: "none",
                                    background: "#4f46e5",
                                    color: "#ffffff",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExperiment(exp.id)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    border: "none",
                                    background: "#ef4444",
                                    color: "#ffffff",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              padding: 8,
                              color: "#4b5563",
                              fontSize: 12,
                            }}
                          >
                            {exp.created_at
                              ? new Date(exp.created_at).toLocaleString()
                              : "-"}
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

        {/* Full-width files viewer BELOW the grid */}
        {selectedExp && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Files for: {selectedExp.title}
                </h4>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Uploaded by assigned user when they completed the experiment.
                </p>
                {isSelectedApproved && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    Status: <b>Approved</b> – user can no longer upload/delete files or edit
                    the report.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseFiles}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: "#e5e7eb",
                  color: "#374151",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {/* Small info text only */}
            {!filesLoading && reportDetails && (
              <p
                style={{
                  marginTop: 4,
                  marginBottom: 8,
                  fontSize: 12,
                  color: "#374151",
                }}
              >
                Experiment details form submitted by user.
              </p>
            )}
            {!filesLoading && !reportDetails && (
              <p
                style={{
                  marginTop: 4,
                  marginBottom: 8,
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No experiment details form submitted yet.
              </p>
            )}

            {filesError && (
              <div
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 6,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 12,
                  border: "1px solid #fecaca",
                }}
              >
                {filesError}
              </div>
            )}

            {filesLoading ? (
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                Loading files...
              </p>
            ) : files.length === 0 ? (
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                No files uploaded for this experiment yet.
              </p>
            ) : (
              <>
                <div style={{ overflowX: "auto", marginTop: 4 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          File
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Size
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Uploaded At
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Preview
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Download
                        </th>
                        <th
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: 6,
                            textAlign: "left",
                            fontWeight: 500,
                            color: "#6b7280",
                          }}
                        >
                          Report
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file, index) => {
                        const downloadUrl = getDownloadUrl(file);
                        const ext = (file.original_name.split(".").pop() || "").toLowerCase();
                        const canInlinePreview = [
                          "pdf",
                          "png",
                          "jpg",
                          "jpeg",
                          "gif",
                          "webp",
                        ].includes(ext);

                        return (
                          <tr key={file.id}>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#111827",
                              }}
                            >
                              {file.original_name}
                            </td>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#4b5563",
                              }}
                            >
                              {formatSize(file.size)}
                            </td>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#4b5563",
                              }}
                            >
                              {file.uploaded_at
                                ? new Date(file.uploaded_at).toLocaleString()
                                : "-"}
                            </td>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#4b5563",
                              }}
                            >
                              {canInlinePreview ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewFile({
                                      url: downloadUrl,
                                      name: file.original_name,
                                      ext,
                                    })
                                  }
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    border: "1px solid #d1d5db",
                                    background: "#f9fafb",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  View
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#9ca3af",
                                  }}
                                >
                                  Preview not supported, use Download
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#4b5563",
                              }}
                            >
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 12,
                                  textDecoration: "none",
                                  color: "#2563eb",
                                }}
                              >
                                Download
                              </a>
                            </td>
                            <td
                              style={{
                                padding: 6,
                                borderBottom: "1px solid #f3f4f6",
                                color: "#4b5563",
                              }}
                            >
                              {reportDetails && (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowReportModal(true)}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      border: "none",
                                      background: "#4f46e5",
                                      color: "#ffffff",
                                      fontSize: 11,
                                      cursor: "pointer",
                                    }}
                                  >
                                    View full report
                                  </button>
                                  {!isSelectedApproved && (
                                    <button
                                      type="button"
                                      onClick={handleApproveFromViewer}
                                      style={{
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        border: "none",
                                        background: "#16a34a",
                                        color: "#ffffff",
                                        fontSize: 11,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Preview panel */}
                {previewFile && (
                  <div
                    style={{
                      marginTop: 16,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: 12,
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          Preview: {previewFile.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          You can review the file here before downloading.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(null)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "none",
                          background: "#e5e7eb",
                          color: "#374151",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Close preview
                      </button>
                    </div>

                    {previewFile.ext === "pdf" ? (
                      <iframe
                        src={previewFile.url}
                        title={previewFile.name}
                        style={{
                          width: "100%",
                          height: 500,
                          border: "none",
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <img
                        src={previewFile.url}
                        alt={previewFile.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 500,
                          borderRadius: 6,
                          display: "block",
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* Report modal */}
            {showReportModal && reportDetails && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,23,42,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 12,
                    maxWidth: 700,
                    width: "90%",
                    maxHeight: "80vh",
                    overflowY: "auto",
                    padding: 16,
                    boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      Experiment report – {selectedExp.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "none",
                        background: "#e5e7eb",
                        color: "#374151",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: "#374151" }}>
                    {reportDetails.tools_used && (
                      <p style={{ margin: "4px 0" }}>
                        <strong>Tools used:</strong>
                        <br />
                        {reportDetails.tools_used}
                      </p>
                    )}
                    {reportDetails.procedure_text && (
                      <p style={{ margin: "8px 0" }}>
                        <strong>Procedure:</strong>
                        <br />
                        {reportDetails.procedure_text}
                      </p>
                    )}
                    {reportDetails.result && (
                      <p style={{ margin: "8px 0" }}>
                        <strong>Result:</strong>
                        <br />
                        {reportDetails.result}
                      </p>
                    )}
                    {reportDetails.updated_at && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      >
                        Submitted on{" "}
                        {new Date(reportDetails.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW: Edit experiment modal (independent of files viewer) */}
        {showEditModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                maxWidth: 480,
                width: "90%",
                padding: 16,
                boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Edit Experiment
                </h4>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editLoading}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "none",
                    background: "#e5e7eb",
                    color: "#374151",
                    fontSize: 11,
                    cursor: editLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    disabled={editLoading}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 13,
                      outline: "none",
                    }}
                    placeholder="Enter experiment title"
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    disabled={editLoading}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 13,
                      resize: "vertical",
                      outline: "none",
                    }}
                    placeholder="Add instructions or details for the user"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={editLoading}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "none",
                      background: "#e5e7eb",
                      color: "#374151",
                      fontSize: 12,
                      cursor: editLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: "none",
                      background: "#4f46e5",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: editLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {editLoading ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminExperiments;
