// src/components/FloatingChatAdmin.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { getUser } from "../utils/auth";

const FloatingChatAdmin = () => {
  const admin = getUser(); // logged-in admin (id = 2 in your DB)

  const [isOpen, setIsOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState("");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 🔔 total unread messages for admin
  const [unreadCount, setUnreadCount] = useState(0);

  // draggable position
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // initial bottom-right
  useEffect(() => {
    if (typeof window !== "undefined") {
      const size = 60;
      setPosition({
        x: window.innerWidth - size - 20,
        y: window.innerHeight - size - 20,
      });
    }
  }, []);

  // load list of users for admin to chat with
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/admin/users"); // existing route
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.users)
        ? res.data.users
        : [];
      const filtered = list.filter((u) => u.role !== "admin");
      setUsers(filtered);

      if (!selectedUserId && filtered.length > 0) {
        setSelectedUserId(filtered[0].id);
        setSelectedUserName(filtered[0].name || filtered[0].email);
      }
    } catch (err) {
      console.error("Failed to load users for chat", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserId]);

  // load messages with selected user
  const loadMessages = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/messages/conversation/${selectedUserId}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedUserId]);

  // ✅ load unread count for admin
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/messages/unread-count");
      const count = res.data?.count || 0;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load unread count (admin)", err);
    }
  }, []);

  // ✅ mark messages from selectedUser -> admin as read
  const markConversationRead = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      await api.put(`/messages/conversation/${selectedUserId}/mark-read`);
      // reload unread count after marking
      loadUnreadCount();
    } catch (err) {
      console.error("Failed to mark admin messages as read", err);
    }
  }, [selectedUserId, loadUnreadCount]);

  // when popup opens, load users & unread count
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadUnreadCount();
    }
  }, [isOpen, loadUsers, loadUnreadCount]);

  // poll unread count globally (even if popup closed)
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // when selected user changes & popup is open, load that conversation + poll
  useEffect(() => {
    if (!isOpen || !selectedUserId) return;
    loadMessages();
    markConversationRead(); // mark that conversation as read when viewing

    const interval = setInterval(() => {
      loadMessages();
      markConversationRead();
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, selectedUserId, loadMessages, markConversationRead]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !selectedUserId) return;

    setSending(true);
    try {
      await api.post("/messages", {
        receiverId: selectedUserId,
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

  // drag handlers (mouse)
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
      if (isDragging) setIsDragging(false);
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

  // drag handlers (touch)
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
      if (isDragging) setIsDragging(false);
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

  // popup position
  const popupStyle = {
    position: "fixed",
    width: 360,
    maxHeight: 420,
    left: Math.max(10, position.x - 300),
    top: Math.max(10, position.y - 380),
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
              Admin Chat
              {admin?.name ? ` – ${admin.name}` : ""}
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

          {/* user selection bar */}
          <div
            style={{
              padding: 8,
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#6b7280" }}>User:</span>
            {loadingUsers ? (
              <span style={{ fontSize: 12 }}>Loading users...</span>
            ) : users.length === 0 ? (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                No users found
              </span>
            ) : (
              <select
                value={selectedUserId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedUserId(id || null);
                  const u = users.find((user) => user.id === id);
                  setSelectedUserName(
                    u ? u.name || u.email || `User #${u.id}` : ""
                  );
                }}
                style={{
                  flex: 1,
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} (#{u.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* messages */}
          <div
            style={{
              padding: 10,
              flex: 1,
              overflowY: "auto",
              background: "#f8fafc",
              fontSize: 13,
            }}
          >
            {(!selectedUserId || users.length === 0) && (
              <div
                style={{
                  textAlign: "center",
                  padding: 10,
                  color: "#6b7280",
                }}
              >
                Select a user to view conversation
              </div>
            )}

            {selectedUserId && loadingMessages && (
              <div style={{ textAlign: "center", padding: 10 }}>
                Loading messages...
              </div>
            )}

            {selectedUserId &&
              !loadingMessages &&
              messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 10,
                    color: "#64748b",
                  }}
                >
                  No messages with{" "}
                  <strong>
                    {selectedUserName || `User #${selectedUserId}`}
                  </strong>{" "}
                  yet.
                </div>
              )}

            {selectedUserId &&
              messages.map((m) => {
                const isAdmin = m.sender_id === admin?.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: isAdmin ? "flex-end" : "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "6px 8px",
                        borderRadius: 8,
                        fontSize: 13,
                        background: isAdmin ? "#0f172a" : "#e5f2ff",
                        color: isAdmin ? "#fff" : "#0f172a",
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

          {/* input */}
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
              placeholder={
                selectedUserId ? "Type a message..." : "Select a user first"
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!selectedUserId}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                outline: "none",
                fontSize: 13,
                backgroundColor: selectedUserId ? "#ffffff" : "#f3f4f6",
              }}
            />
            <button
              type="submit"
              disabled={sending || !selectedUserId}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: 13,
                cursor: sending || !selectedUserId ? "not-allowed" : "pointer",
                opacity: sending || !selectedUserId ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* floating circle + unread badge */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => {
          if (!isDragging) setIsOpen((prev) => !prev);
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

export default FloatingChatAdmin;
