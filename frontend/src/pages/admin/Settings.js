// src/pages/admin/Settings.js
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";
import "./Settings.css";

// Build a base URL from axios config or window location
const API_BASE =
  (api.defaults?.baseURL && api.defaults.baseURL.replace(/\/$/, "")) ||
  window.location.origin;

// Default avatar served by backend: backend/uploads/avatars/default-avatar.png
const MOCKUP_AVATAR = `${API_BASE}/uploads/avatars/default-avatar.png`;

const Settings = () => {
  const [profile, setProfile] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    avatar: "",
    avatar_url: "",
    prefs: {},
  });
  const [, setLoading] = useState(false);
  const [pw, setPw] = useState({ current: "", new: "", confirm: "" });
  const [notifPrefs, setNotifPrefs] = useState({ email: true, onsite: true });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const p = await api.get("/admin/profile");
        const pdata = p.data || {};

        // Normalize profile shape
        const newProfile = {
          id: pdata.id || null,
          name: pdata.name || "",
          email: pdata.email || "",
          phone: pdata.phone || "",
          avatar: pdata.avatar || "",
          avatar_url: pdata.avatar_url || "", // backend may provide full url
          prefs: pdata.prefs || (pdata.prefs === undefined ? {} : pdata.prefs),
        };

        setProfile(newProfile);

        // prefer prefs from profile; fallback to separate endpoint if empty
        if (newProfile.prefs && Object.keys(newProfile.prefs).length > 0) {
          setNotifPrefs(newProfile.prefs);
        } else {
          try {
            const prefsRes = await api.get("/admin/notifications/prefs");
            let prefs = prefsRes.data || {};
            if (typeof prefs === "string") {
              try {
                prefs = JSON.parse(prefs);
              } catch (e) {
                prefs = {};
              }
            }
            setNotifPrefs(prefs || {});
          } catch (prefsErr) {
            console.warn("Could not load preferences:", prefsErr);
            setNotifPrefs({ email: true, onsite: true });
          }
        }
      } catch (err) {
        console.warn("Could not load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      // send only fields we want to update
      const payload = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        // do not send avatar here; avatar is handled by upload endpoint
      };
      await api.put("/admin/profile", payload);
      alert("Profile updated");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Profile update failed");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) return alert("New passwords do not match");
    try {
      await api.put("/admin/change-password", {
        currentPassword: pw.current,
        newPassword: pw.new,
      });
      alert("Password changed");
      setPw({ current: "", new: "", confirm: "" });
    } catch (err) {
      console.error("Password change failed:", err);
      alert("Password change failed");
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file); // must match multer.single("avatar")

    try {
      const res = await api.post("/admin/avatar", form, {
        // override any default JSON header from the shared api instance
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res.data || {};
      console.log("Avatar upload response:", data);

      // backend sends `url` (full) and `path` (relative) — prefer full url
      const fullUrl =
        data.url || (data.path ? `${API_BASE}${data.path}` : null);

      setProfile((p) => ({
        ...p,
        avatar: data.path || p.avatar,
        avatar_url: fullUrl || p.avatar_url || p.avatar,
      }));

      alert("Avatar uploaded");
    } catch (err) {
      console.error("Upload failed:", err);
      console.error("Upload error response:", err.response?.data);
      alert(
        `Upload failed${
          err.response?.data?.message ? `: ${err.response.data.message}` : ""
        }`
      );
    }
  };

  const toggleNotifPref = async (key) => {
    const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(newPrefs);
    try {
      await api.put("/admin/notifications/prefs", newPrefs);
    } catch (err) {
      console.warn("Could not save prefs", err);
    }
  };

  // image source: prefer avatar_url (full), then avatar (relative/absolute), then MOCKUP_AVATAR
  const avatarSrc =
    profile.avatar_url ||
    (profile.avatar
      ? profile.avatar.startsWith("http")
        ? profile.avatar
        : `${API_BASE}${profile.avatar}`
      : MOCKUP_AVATAR) ||
    MOCKUP_AVATAR;

  return (
    <AdminLayout>
      <div className="settings-page">
        <h1 className="settings-title">Settings</h1>

        <div className="settings-grid">
          {/* LEFT: Avatar + Notification prefs */}
          <aside className="settings-left card">
            <div className="avatar-wrap">
              <img src={avatarSrc} alt="avatar" className="avatar-img" />
              <div className="avatar-upload">
                <label className="btn-upload">
                  Choose file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e.target.files[0])}
                    hidden
                  />
                </label>
                <div className="small-note">PNG / JPG, recommended 256×256</div>
              </div>
            </div>

            <hr className="divider" />

            <div className="prefs">
              <h3>Notification Preferences</h3>
              <label className="pref-row">
                <input
                  type="checkbox"
                  checked={!!notifPrefs.email}
                  onChange={() => toggleNotifPref("email")}
                />
                <span>Email notifications</span>
              </label>

              <label className="pref-row">
                <input
                  type="checkbox"
                  checked={!!notifPrefs.onsite}
                  onChange={() => toggleNotifPref("onsite")}
                />
                <span>On-site notifications</span>
              </label>
            </div>
          </aside>

          {/* RIGHT: Profile + Password */}
          <main className="settings-right">
            <section className="card">
              <h2>Profile</h2>
              <form onSubmit={handleProfileSave} className="form-grid">
                <div className="form-row">
                  <label>Name</label>
                  <input
                    value={profile.name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <label>Email</label>
                  <input
                    value={profile.email || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <label>Phone</label>
                  <input
                    value={profile.phone || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Save Profile
                  </button>
                </div>
              </form>
            </section>

            <section className="card mt">
              <h2>Change Password</h2>
              <form onSubmit={handlePasswordChange} className="form-grid">
                <div className="form-row">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={pw.current}
                    onChange={(e) =>
                      setPw({ ...pw, current: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={pw.new}
                    onChange={(e) => setPw({ ...pw, new: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={pw.confirm}
                    onChange={(e) =>
                      setPw({ ...pw, confirm: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-warning">
                    Change Password
                  </button>
                </div>
              </form>
            </section>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
