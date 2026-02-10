// src/pages/users/UserDashboard.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { getUser } from "../../utils/auth";
import api from "../../api"; // use same axios instance as admin

/**
 * Single notification item
 */
const NotificationItem = ({ n, onMark }) => {
  return (
    <div
      style={{
        background: n.is_read ? "#fff" : "#f0f9ff",
        padding: 12,
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        border: "1px solid #eef2ff",
      }}
    >
      <div style={{ flex: 1 }}>
        {n.title && <div style={{ fontWeight: 700 }}>{n.title}</div>}
        {n.message && (
          <div style={{ marginTop: 6, color: "#475569" }}>{n.message}</div>
        )}

        {n.link && (
          <div style={{ marginTop: 8 }}>
            {/* For now plain anchor; later we can switch to react-router navigate if needed */}
            <a
              href={n.link}
              style={{
                color: "#0f172a",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Open
            </a>
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
          {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
        </div>
      </div>

      <div
        style={{
          marginLeft: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {!n.is_read && (
          <button
            onClick={() => onMark(n.id)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: "#10b981",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Floating chat button + popup for user ↔ admin
 */
const FloatingChat = ({ currentUser }) => {
  // your admin user id
  const ADMIN_ID = 2;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // 🔔 unread count
  const [unreadCount, setUnreadCount] = useState(0);

  // Position (draggable)
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Initial position: bottom-right
  useEffect(() => {
    if (typeof window !== "undefined") {
      const size = 60; // button size
      setPosition({
        x: window.innerWidth - size - 20,
        y: window.innerHeight - size - 20,
      });
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/messages/conversation/${ADMIN_ID}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [ADMIN_ID]);

  // ✅ load unread count (even when popup closed)
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/messages/unread-count");
      const count = res.data?.count || 0;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load unread count", err);
    }
  }, []);

  // poll unread count every 15s
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // mark messages from admin as read
  const markConversationRead = useCallback(async () => {
    try {
      await api.put(`/messages/conversation/${ADMIN_ID}/mark-read`);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark messages as read", err);
    }
  }, [ADMIN_ID]);

  // When chat opens, load messages + mark read + start polling messages
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      markConversationRead(); // clear unread for this conversation
      const interval = setInterval(() => {
        loadMessages();
        markConversationRead();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadMessages, markConversationRead]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content) return;

    setSending(true);
    try {
      await api.post("/messages", {
        receiverId: ADMIN_ID,
        content,
      });
      setNewMessage("");
      loadMessages();
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Touch drag handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffsetRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffsetRef.current.x,
        y: touch.clientY - dragOffsetRef.current.y,
      });
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging]);

  // position of popup
  const popupStyle = {
    position: "fixed",
    width: 320,
    maxHeight: 400,
    left: Math.max(10, position.x - 260),
    top: Math.max(10, position.y - 360),
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1000,
  };

  const badgeText =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : "";

  return (
    <>
      {/* Chat popup */}
      {isOpen && (
        <div style={popupStyle}>
          <div
            style={{
              padding: "10px 12px",
              background: "#0f172a",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14 }}>
              Chat with Admin
              {currentUser?.name ? ` – ${currentUser.name}` : ""}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#fff",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: 10,
              flex: 1,
              overflowY: "auto",
              background: "#f8fafc",
              fontSize: 13,
            }}
          >
            {loadingMessages && (
              <div style={{ textAlign: "center", padding: 10 }}>Loading...</div>
            )}

            {!loadingMessages && messages.length === 0 && (
              <div
                style={{ textAlign: "center", padding: 10, color: "#64748b" }}
              >
                No messages yet. Say hi to admin 👋
              </div>
            )}

            {messages.map((m) => {
              const isMe = m.sender_id === currentUser?.id;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "6px 8px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: isMe ? "#0f172a" : "#e5f2ff",
                      color: isMe ? "#fff" : "#0f172a",
                    }}
                  >
                    <div>{m.content}</div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        opacity: 0.7,
                        textAlign: "right",
                      }}
                    >
                      {m.created_at
                        ? new Date(m.created_at).toLocaleTimeString()
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSend}
            style={{
              padding: 8,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: 6,
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                outline: "none",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={sending}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating draggable circle button + unread badge */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => {
          if (!isDragging) {
            setIsOpen((prev) => !prev);
          }
        }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          cursor: "pointer",
          boxShadow: "0 10px 20px rgba(15,23,42,0.35)",
          zIndex: 999,
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span>💬</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 8,
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                boxShadow: "0 0 0 2px #0f172a",
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

const UserDashboard = () => {
  const user = getUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load notifications for the logged-in user (backend uses token to know user_id)
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/user/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    const prev = notifications.slice();
    setNotifications((p) =>
      p.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
    );
    try {
      await api.put(`/user/notifications/${id}/read`);
    } catch (err) {
      console.error("Mark read failed", err);
      setNotifications(prev);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.put("/user/notifications/mark-all-read");
      setNotifications((p) => p.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error("Mark all failed", err);
      loadNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 10 }}>
        Welcome{user?.name ? `, ${user.name}` : ""}!
      </h3>

      {/* Notifications section */}
      <div style={{ marginTop: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4 style={{ margin: 0 }}>
            Notifications{" "}
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  color: "#ef4444",
                  fontWeight: 700,
                }}
              >
                ({unreadCount})
              </span>
            )}
          </h4>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={loadNotifications}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #e6eef7",
                background: "#fff",
              }}
            >
              Refresh
            </button>

            <button
              onClick={handleMarkAll}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: "#0f172a",
                color: "#fff",
              }}
            >
              Mark all read
            </button>
          </div>
        </div>

        {loading && <div style={{ marginTop: 12 }}>Loading...</div>}

        {!loading && notifications.length === 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fff",
              borderRadius: 8,
            }}
          >
            No notifications
          </div>
        )}

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {notifications.map((n) => (
            <NotificationItem key={n.id} n={n} onMark={handleMarkRead} />
          ))}
        </div>
      </div>

      {/* Floating chat button (draggable) */}
      <FloatingChat currentUser={user} />
    </div>
  );
};

export default UserDashboard;
