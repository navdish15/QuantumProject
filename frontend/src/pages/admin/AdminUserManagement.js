// src/pages/AdminUserManagements.js
import React, { useEffect, useState } from "react";
import api from "../../api";

const AdminUserManagement = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });

  const [users, setUsers] = useState([]);

  // Load all users
  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.warn("Could not load users:", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Create user
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/create-user", form);
      alert("User Created!");
      setForm({ name: "", email: "", password: "", role: "employee" });
      loadUsers();
    } catch (err) {
      console.error("Create user failed:", err);
      alert("Failed to create user");
    }
  };

  // Toggle status
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await api.put(`/admin/toggle-status/${id}`, { status: newStatus });
      loadUsers();
    } catch (err) {
      console.error("Toggle status failed:", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin — User Management</h2>

      {/* CREATE USER FORM */}
      <form onSubmit={handleCreate} style={{ marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <br />

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <br />

        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
        <br />
        <br />

        <button type="submit">Create User</button>
      </form>

      {/* USERS TABLE */}
      <h3>All Users</h3>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Toggle</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.status}</td>
              <td>
                <button onClick={() => toggleStatus(u.id, u.status)}>
                  {u.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUserManagement;
