// src/pages/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import FloatingChatAdmin from '../../components/FloatingChatAdmin'; // ✅ ADDED

const COLORS = ['#2563eb', '#10b981', '#facc15', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [expByStatus, setExpByStatus] = useState([]);
  const [usersByRole, setUsersByRole] = useState([]);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/dashboard-stats');
      setStats(res.data.counts || {});
      setExpByStatus(res.data.experimentsByStatus || []);
      setUsersByRole(res.data.usersByRole || []);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statusList = ['pending', 'active', 'done', 'approved'];
  const barData = statusList.map((s) => {
    const row = expByStatus.find((r) => r.status === s);
    return { status: s, count: row ? Number(row.cnt) : 0 };
  });

  const pieData = usersByRole.map((u) => ({
    name: u.role,
    value: Number(u.cnt),
  }));

  return (
    <AdminLayout>
      <h2 style={{ marginBottom: 20 }}>Admin Dashboard</h2>

      {/* === TOP CARDS GRID === */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        <div className="card">
          Total Users
          <p>{stats ? stats.totalUsers : '—'}</p>
        </div>

        <div className="card">
          Active Users
          <p>{stats ? stats.activeUsers : '—'}</p>
        </div>

        <div className="card">
          Total Experiments
          <p>{stats ? stats.totalExperiments : '—'}</p>
        </div>

        <div className="card">
          Pending Experiments
          <p>{stats ? stats.pendingCount : '—'}</p>
        </div>

        <div className="card">
          Completed Experiments
          <p>{stats ? stats.doneCount : '—'}</p>
        </div>
      </div>

      {/* === CHARTS GRID (2 columns) === */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
        }}
      >
        {/* Bar Chart */}
        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h4>Experiments by Status</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h4>User Roles</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} label dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✅ Floating Chat Button for Admin */}
      <FloatingChatAdmin />
    </AdminLayout>
  );
};

export default AdminDashboard;
