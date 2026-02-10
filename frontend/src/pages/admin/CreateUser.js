// src/pages/admin/CreateUser.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";
import "./CreateUser.css";

const CreateUser = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "", // ✅ added
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // form now includes phone as well
      const res = await api.post("/admin/create-user", form);
      alert(res.data.message || "User created");
      navigate("/admin/users");
    } catch (err) {
      console.error("Create user error:", err);
      const msg = err?.response?.data?.message || "Error creating user";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="create-user-container">
        <h2>Create New User</h2>

        <form onSubmit={handleSubmit} className="create-user-form">
          <label>Name</label>
          <input
            type="text"
            name="name"
            onChange={handleChange}
            required
            value={form.name}
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            onChange={handleChange}
            required
            value={form.email}
          />

          {/* ✅ Phone number */}
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            onChange={handleChange}
            value={form.phone}
            placeholder="Optional"
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            onChange={handleChange}
            required
            value={form.password}
          />

          <label>Role</label>
          <select name="role" onChange={handleChange} value={form.role}>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create User"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default CreateUser;
