// src/components/AdminLayout.js
import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../api"; // shared axios instance

// Build base URL from axios or window
const API_BASE =
  (api.defaults?.baseURL && api.defaults.baseURL.replace(/\/$/, "")) ||
  window.location.origin;

// Real default avatar served by backend: backend/uploads/avatars/default-avatar.png
const DEFAULT_AVATAR = `${API_BASE}/uploads/avatars/default-avatar.png`;

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();

  // modal state
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // notification data
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // profile data
  const [profile, setProfile] = useState({
    id: null,
    name: "Admin",
    email: "",
    role: "admin",
    avatar: "",
    avatar_url: "",
  });
  const [, setLoadingProfile] = useState(false);

  // --------------------------------------------------
  // Notifications helpers
  // --------------------------------------------------
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.get("/admin/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("Could not load notifications.", err);
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const openNotifications = async () => {
    setProfileOpen(false);
    setNotifOpen(true);
    await fetchNotifications();
  };

  const closeNotifications = () => setNotifOpen(false);

  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
      await api.put(`/admin/notifications/${id}/read`);
    } catch (err) {
      console.warn("Could not mark notification as read", err);
    }
  };

  const openNotificationLink = (link) => {
    if (!link) return;
    setNotifOpen(false);
    navigate(link);
  };

  // --------------------------------------------------
  // Profile helpers
  // --------------------------------------------------
  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      // Always hit /admin/profile (same as Settings page)
      const res = await api.get("/admin/profile");
      const u = res.data || {};

      setProfile({
        id: u.id || null,
        name: u.name || "Admin",
        email: u.email || "",
        role: u.role || "admin",
        avatar: u.avatar || "",
        avatar_url: u.avatar_url || "",
      });

      // Optionally cache minimal user data in localStorage
      try {
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
            avatar_url: u.avatar_url,
          }),
        );
      } catch (e) {}
    } catch (err) {
      console.warn("Could not load /admin/profile.", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const openProfile = async () => {
    setNotifOpen(false);
    setProfileOpen(true);
    await loadProfile();
  };

  const closeProfile = () => setProfileOpen(false);

  // Logout — clear token and redirect to login
  const onLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (e) {}
    setProfileOpen(false);
    setNotifOpen(false);
    navigate("/");
  };

  // --------------------------------------------------
  // Effects
  // --------------------------------------------------

  // Fetch profile once on mount so popup has data immediately
  useEffect(() => {
    loadProfile();
  }, []);

  // click outside to close panels
  useEffect(() => {
    const handleClick = (e) => {
      const notifPanel = document.getElementById("notif-panel");
      const profilePanel = document.getElementById("profile-panel");

      if (
        notifPanel &&
        !notifPanel.contains(e.target) &&
        e.target.closest(".nav-icon")?.getAttribute("data-role") !== "notif"
      ) {
        setNotifOpen(false);
      }

      if (
        profilePanel &&
        !profilePanel.contains(e.target) &&
        e.target.closest(".nav-icon")?.getAttribute("data-role") !== "profile"
      ) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Polling: refresh notifications every 10s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 10000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // compute avatar src: prefer avatar_url, then avatar, then default
  const avatarSrc =
    profile.avatar_url ||
    (profile.avatar
      ? profile.avatar.startsWith("http")
        ? profile.avatar
        : `${API_BASE}/${profile.avatar.replace(/^\/+/, "")}`
      : DEFAULT_AVATAR);

  return (
    <div className="dashboard-container">
      {/* TOP NAVBAR */}
      <div className="top-navbar">
        <div className="nav-left">
          <h2>Quantum Neuton</h2>
        </div>

        <div
          className="nav-right"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Notification bell */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <FaBell
              className="nav-icon"
              data-role="notif"
              onClick={(e) => {
                e.stopPropagation();
                notifOpen ? closeNotifications() : openNotifications();
              }}
              title="Notifications"
              style={{ marginRight: 12 }}
            />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: 2,
                  background: "red",
                  color: "#fff",
                  padding: "2px 6px",
                  fontSize: 11,
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          {/* Profile icon */}
          <FaUserCircle
            className="nav-icon"
            data-role="profile"
            onClick={(e) => {
              e.stopPropagation();
              profileOpen ? closeProfile() : openProfile();
            }}
            title="Profile"
            style={{ marginRight: 12 }}
          />

          {/* Logout icon */}
          <FaSignOutAlt
            className="nav-icon"
            onClick={onLogout}
            title="Logout"
          />
        </div>
      </div>

      {/* BODY */}
      <div className="dashboard-body">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="menu-title">MENU</div>
          <ul>
            <li onClick={() => navigate("/admin-dashboard")}>Dashboard</li>
            <li onClick={() => navigate("/create-user")}>Create User</li>
            <li onClick={() => navigate("/admin/users")}>Manage Users</li>
            <li onClick={() => navigate("/admin-experiments")}>Experiments</li>
            <li onClick={() => navigate("/admin/logs")}>Logs</li>

            {/* ✅ goes to /admin/experiment-files/1 which matches route /admin/experiment-files/:id */}
            <li onClick={() => navigate("/admin/experiment-files/1")}>
              Experiment Files
            </li>

            <li onClick={() => navigate("/settings")}>Settings</li>
          </ul>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">{children}</div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        © {new Date().getFullYear()} Quantum Neuton. All Rights Reserved.
      </div>

      {/* ===== NOTIFICATIONS PANEL (popover) ===== */}
      {notifOpen && (
        <div
          id="notif-panel"
          style={{
            position: "fixed",
            top: 64,
            right: 80,
            width: 360,
            maxHeight: "60vh",
            overflowY: "auto",
            background: "#fff",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            borderRadius: 8,
            zIndex: 12000,
            padding: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <strong>Notifications</strong>
            <button
              onClick={closeNotifications}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {loadingNotifs ? (
            <div>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 12, color: "#666" }}>No notifications</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: n.is_read ? "#f9fafb" : "#eef6ff",
                  marginBottom: 8,
                  cursor: n.link ? "pointer" : "default",
                }}
                onClick={() => {
                  if (n.link) openNotificationLink(n.link);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString()
                      : ""}
                  </div>
                </div>

                {n.message && (
                  <div style={{ marginTop: 6, fontSize: 14 }}>{n.message}</div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {n.link && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNotificationLink(n.link);
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      Open
                    </button>
                  )}
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="btn btn-sm btn-outline-secondary"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== PROFILE PANEL (popover) ===== */}
      {profileOpen && (
        <div
          id="profile-panel"
          style={{
            position: "fixed",
            top: 64,
            right: 20,
            width: 320,
            background: "#fff",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            borderRadius: 8,
            zIndex: 12000,
            padding: 16,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Profile</strong>
            <button
              onClick={closeProfile}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <img
              src={avatarSrc}
              alt="avatar"
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{profile.name}</div>
              <div style={{ color: "#666", fontSize: 13 }}>{profile.email}</div>
              <div style={{ color: "#666", fontSize: 12 }}>{profile.role}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                closeProfile();
                navigate("/settings");
              }}
              className="btn btn-sm btn-primary"
            >
              Settings
            </button>
            <button
              onClick={onLogout}
              className="btn btn-sm btn-outline-danger"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
