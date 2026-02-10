import React, { useState } from "react";
import api from "../../api"; // make sure you have src/api.js exporting an axios instance with baseURL
import "./AddUser.css";

const AddUser = () => {
  const [formData, setFormData] = useState({
    employee_id: "",
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // POST to admin create-user route
      const res = await api.post("/admin/create-user", formData);
      alert(res.data.message || "User created");

      if (res.status >= 200 && res.status < 300) {
        setFormData({
          employee_id: "",
          name: "",
          email: "",
          password: "",
          role: "user",
        });
      }
    } catch (error) {
      console.error("Create user error:", error);
      const msg = error?.response?.data?.message || "Something went wrong!";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-container">
      <h2>Create New User</h2>

      <form className="user-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="employee_id"
          placeholder="Employee ID"
          value={formData.employee_id}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create User"}
        </button>
      </form>
    </div>
  );
};

export default AddUser;
