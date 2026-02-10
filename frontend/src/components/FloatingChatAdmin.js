import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { getUser } from '../utils/auth';

const FloatingChatAdmin = () => {
  const admin = getUser();

  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesRef = useRef(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');

      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.users) ? res.data.users : [];

      const filtered = list.filter((u) => u.role !== 'admin');
      setUsers(filtered);

      if (!selectedUserId && filtered.length > 0) {
        setSelectedUserId(filtered[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedUserId]);

  const loadMessages = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const res = await api.get(`/messages/conversation/${selectedUserId}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, [selectedUserId]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread-count');
      setUnreadCount(res.data?.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadUnreadCount();
    }
  }, [isOpen, loadUsers, loadUnreadCount]);

  useEffect(() => {
    if (!isOpen || !selectedUserId) return;

    loadMessages();

    const i = setInterval(loadMessages, 10000);
    return () => clearInterval(i);
  }, [isOpen, selectedUserId, loadMessages]);

  useEffect(() => {
    const t = setTimeout(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
    return () => clearTimeout(t);
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    setSending(true);
    try {
      await api.post('/messages', {
        receiverId: selectedUserId,
        content: newMessage.trim(),
      });
      setNewMessage('');
      loadMessages();
    } finally {
      setSending(false);
    }
  };

  const badgeText = unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : '';

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 90,
            width: 360,
            height: 420,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          <div style={{ padding: 10, background: '#0f172a', color: '#fff' }}>Admin Chat {admin?.name ? `– ${admin.name}` : ''}</div>

          <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(Number(e.target.value))} style={{ width: '100%' }}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>

          <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {messages.map((m) => {
              const isAdmin = m.sender_id === admin?.id;
              return (
                <div key={m.id} style={{ textAlign: isAdmin ? 'right' : 'left', marginBottom: 6 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: isAdmin ? '#0f172a' : '#e5f2ff',
                      color: isAdmin ? '#fff' : '#000',
                      fontSize: 13,
                      maxWidth: '70%',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', padding: 8, gap: 6 }}>
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" disabled={sending}>
              Send
            </button>
          </form>
        </div>
      )}

      <div
        onClick={() => setIsOpen((p) => !p)}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: '#0f172a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          cursor: 'pointer',
        }}
      >
        💬 {badgeText}
      </div>
    </>
  );
};

export default FloatingChatAdmin;
