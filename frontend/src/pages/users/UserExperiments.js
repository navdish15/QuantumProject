import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "https://quantumproject-wbu2.onrender.com";

const UserExperiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/user/experiments`, {
          headers: authHeaders,
        });
        setExperiments(res.data);
      } catch (err) {
        console.error("User experiments load error:", err.response?.data || err);
        setError(err.response?.data?.message || "Failed to load experiments");
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div
      style={{
        padding: 24,
        background: "#f3f4f6",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          My Experiments
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
          Experiments that are assigned to you by the admin.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 13,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>
      ) : experiments.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          No experiments have been assigned to you yet.
        </p>
      ) : (
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
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
              Assigned Experiments
            </h3>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              Latest first
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
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
                    Created At
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      transition: "background 0.12s ease",
                    }}
                  >
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
                      <span style={getStatusStyles(exp.status)}>
                        {exp.status || "pending"}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: "#4b5563", fontSize: 12 }}>
                      {exp.created_at
                        ? new Date(exp.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => navigate(`/user/experiments/${exp.id}`)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "none",
                          background: "#4f46e5",
                          color: "#ffffff",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserExperiments;
