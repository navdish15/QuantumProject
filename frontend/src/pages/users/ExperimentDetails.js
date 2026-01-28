// src/pages/users/ExperimentDetails.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = "https://quantumproject-wbu2.onrender.com";

const ExperimentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // files state
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);

  // report details (tools/procedure/result) state
  const [showReportForm, setShowReportForm] = useState(false);
  const [report, setReport] = useState({ tools_used: "", procedure_text: "", result: "" });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState("");
  const [reportError, setReportError] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  // helper to load files for this experiment
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/experiments/${id}/files`, { headers: authHeaders });
      setFiles(res.data);
    } catch (err) {
      console.error("Files load error:", err.response?.data || err);
      // no setFileError here → user won’t see error just by opening the page
    }
  };

  const fetchExperiment = async () => {
    setError("");
    setSuccess("");
    setFileError("");
    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/user/experiments/${id}`, { headers: authHeaders });
      setExperiment(res.data);
      await fetchFiles();
    } catch (err) {
      console.error("Experiment details error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to load experiment");
      setExperiment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // auto hide success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const getStatusStyles = (status) => {
    const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "2px 8px", borderRadius: 999, fontSize: 12, textTransform: "capitalize" };

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

  const handleMarkDone = async () => {
    setError("");
    setSuccess("");
    setUpdating(true);
    try {
      await axios.put(
        `${API_BASE}/user/experiments/${id}/status`,
        { status: "done" },
        { headers: authHeaders }
      );
      setSuccess("Experiment marked as done");
      setExperiment((prev) => (prev ? { ...prev, status: "done" } : prev));
    } catch (err) {
      console.error("Mark done error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // upload file (any format, max 50MB)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileError("");
    setSuccess("");

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setFileError("File is too large. Max size is 50MB.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await axios.post(`${API_BASE}/experiments/${id}/files`, formData, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      setSuccess("File uploaded successfully");
      await fetchFiles();
    } catch (err) {
      console.error("File upload error:", err.response?.data || err);
      setFileError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const handleDeleteFile = async (fileId) => {
    setFileError("");
    setSuccess("");
    setDeletingFileId(fileId);

    try {
      await axios.delete(`${API_BASE}/experiments/${id}/files/${fileId}`, { headers: authHeaders });
      setSuccess("File deleted");
      await fetchFiles();
    } catch (err) {
      console.error("File delete error:", err.response?.data || err);
      setFileError(err.response?.data?.message || "Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  // report form handlers
  const handleReportChange = (e) => {
    const { name, value } = e.target;
    setReport((prev) => ({ ...prev, [name]: value }));
  };

  const submitReportDetails = async () => {
    setReportLoading(true);
    setReportError("");
    setReportSuccess("");

    try {
      await axios.post(
        `${API_BASE}/experiments/${id}/report`,
        report,
        { headers: authHeaders }
      );
      setReportSuccess("Experiment details submitted successfully");
      // optional: close form after submit
      setShowReportForm(false);
    } catch (err) {
      console.error("Report submit error:", err.response?.data || err);
      setReportError(err.response?.data?.message || "Failed to submit details");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  // if experiment failed to load
  if (!experiment) {
    return (
      <div style={{ padding: 24, background: "#f3f4f6", minHeight: "100vh", boxSizing: "border-box" }}>
        <button
          onClick={() => navigate("/user/experiments")}
          style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 999, border: "none", background: "#e5e7eb", color: "#374151", fontSize: 12, cursor: "pointer" }}
        >
          ← Back to My Experiments
        </button>

        <div style={{ maxWidth: 700, padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
          {error ? (
            <div style={{ marginBottom: 10, padding: 10, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 13, border: "1px solid #fecaca" }}>{error}</div>
          ) : (
            <p style={{ fontSize: 13, color: "#6b7280" }}>Experiment not found.</p>
          )}
        </div>
      </div>
    );
  }

  // 🔒 approved flag for UI locking
  const isApproved = experiment.status === "approved";

  return (
    <div style={{ padding: 24, background: "#f3f4f6", minHeight: "100vh", boxSizing: "border-box" }}>
      <button
        onClick={() => navigate("/user/experiments")}
        style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 999, border: "none", background: "#e5e7eb", color: "#374151", fontSize: 12, cursor: "pointer" }}
      >
        ← Back to My Experiments
      </button>

      <div style={{ maxWidth: 800, padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#111827" }}>{experiment.title}</h2>
          <span style={getStatusStyles(experiment.status)}>{experiment.status || "pending"}</span>
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: 10, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 13, border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 10, padding: 10, borderRadius: 6, background: "#dcfce7", color: "#166534", fontSize: 13, border: "1px solid #bbf7d0" }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500, color: "#374151" }}>Description</h4>
          <p style={{ margin: 0, fontSize: 13, color: "#4b5563", whiteSpace: "pre-wrap" }}>{experiment.description || "No description provided."}</p>
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 500 }}>Created At</div>
            <div>{experiment.created_at ? new Date(experiment.created_at).toLocaleString() : "-"}</div>
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>Last Updated</div>
            <div>{experiment.updated_at ? new Date(experiment.updated_at).toLocaleString() : "-"}</div>
          </div>
        </div>

        {/* Files section */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #e5e7eb" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: "#374151" }}>Uploaded Reports / Files</h4>

          {fileError && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 12, border: "1px solid #fecaca" }}>
              {fileError}
            </div>
          )}

          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px dashed #9ca3af",
                fontSize: 12,
                cursor: uploading || isApproved ? "not-allowed" : "pointer",
                background: "#f9fafb",
                opacity: isApproved ? 0.6 : 1,
              }}
            >
              <input type="file" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading || isApproved} />
              {uploading ? "Uploading..." : isApproved ? "Experiment approved (upload disabled)" : "Upload report / file"}
            </label>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Any format allowed (PDF, DOCX, PPT, images, etc.). Max 50MB.</span>
          </div>

          {isApproved && (
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>
              This experiment has been <b>approved</b>. You can no longer upload or delete files or edit the details form.
            </p>
          )}

          {files.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>No files uploaded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ borderBottom: "1px solid #e5e7eb", padding: 6, textAlign: "left", fontWeight: 500, color: "#6b7280" }}>File</th>
                    <th style={{ borderBottom: "1px solid #e5e7eb", padding: 6, textAlign: "left", fontWeight: 500, color: "#6b7280" }}>Size</th>
                    <th style={{ borderBottom: "1px solid #e5e7eb", padding: 6, textAlign: "left", fontWeight: 500, color: "#6b7280" }}>Uploaded At</th>
                    <th style={{ borderBottom: "1px solid #e5e7eb", padding: 6, textAlign: "left", fontWeight: 500, color: "#6b7280" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const sizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : "-";
                    const downloadUrl = `${API_BASE}/uploads/experiments/${file.experiment_id}/${file.stored_name}`;

                    return (
                      <tr key={file.id}>
                        <td style={{ padding: 6, borderBottom: "1px solid #f3f4f6", color: "#111827" }}>{file.original_name}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f3f4f6", color: "#4b5563" }}>{sizeMB === "-" ? "-" : `${sizeMB} MB`}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f3f4f6", color: "#4b5563" }}>
                          {file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : "-"}
                        </td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f3f4f6", color: "#4b5563" }}>
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginRight: 8, fontSize: 12, textDecoration: "none", color: "#2563eb" }}
                          >
                            Download
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingFileId === file.id || isApproved}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "none",
                              background: isApproved ? "#e5e7eb" : "#fee2e2",
                              color: isApproved ? "#6b7280" : "#b91c1c",
                              fontSize: 11,
                              cursor: deletingFileId === file.id || isApproved ? "not-allowed" : "pointer",
                            }}
                          >
                            {deletingFileId === file.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action area */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px dashed #e5e7eb",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
              When you finish this experiment and upload your report, mark it as <b>Done</b> so the admin can review it.
            </p>

            <button
              disabled={updating || experiment.status === "done" || experiment.status === "approved"}
              onClick={handleMarkDone}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: experiment.status === "done" || experiment.status === "approved" ? "#9ca3af" : "#16a34a",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                cursor: experiment.status === "done" || experiment.status === "approved" ? "default" : "pointer",
              }}
            >
              {experiment.status === "done" || experiment.status === "approved"
                ? "Already marked Done"
                : updating
                ? "Updating..."
                : "Mark as Done"}
            </button>
          </div>

          {/* Fill experiment details form button + form – only when status is done */}
          {experiment.status === "done" && (
            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowReportForm((prev) => !prev)}
                style={{ padding: "6px 12px", borderRadius: 999, border: "none", background: "#4f46e5", color: "#ffffff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                {showReportForm ? "Close Experiment Details Form" : "Fill Experiment Details Form"}
              </button>

              {showReportForm && (
                <div style={{ marginTop: 10, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#111827" }}>Experiment Details</h4>

                  {reportError && (
                    <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: "#fee2e2", color: "#991b1b", fontSize: 12, border: "1px solid #fecaca" }}>
                      {reportError}
                    </div>
                  )}
                  {reportSuccess && (
                    <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: "#dcfce7", color: "#166534", fontSize: 12, border: "1px solid #bbf7d0" }}>
                      {reportSuccess}
                    </div>
                  )}

                  <textarea
                    name="tools_used"
                    placeholder="Tools / software used (Example: Python, VirtualBox, Wireshark, Cisco Packet Tracer)"
                    value={report.tools_used}
                    onChange={handleReportChange}
                    rows={2}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12, marginBottom: 8 }}
                  />

                  <textarea
                    name="procedure_text"
                    placeholder="Briefly describe the steps you followed to complete this experiment."
                    value={report.procedure_text}
                    onChange={handleReportChange}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12, marginBottom: 8 }}
                  />

                  <textarea
                    name="result"
                    placeholder="What was the outcome / observation of this experiment?"
                    value={report.result}
                    onChange={handleReportChange}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12, marginBottom: 10 }}
                  />

                  <button
                    type="button"
                    disabled={reportLoading}
                    onClick={submitReportDetails}
                    style={{ padding: "6px 12px", borderRadius: 999, border: "none", background: "#10b981", color: "#ffffff", fontSize: 12, fontWeight: 500, cursor: reportLoading ? "not-allowed" : "pointer" }}
                  >
                    {reportLoading ? "Saving..." : "Submit Details"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperimentDetails;
