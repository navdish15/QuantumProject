// src/components/UserNavbar.js
import React from "react";
import { logout, getUser } from "../utils/auth";

const UserNavbar = () => {
  const user = getUser();

  return (
    <header style={{
      background: "#0f172a",
      color: "#fff",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      justifyContent: "space-between"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Quantum Neuton</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 14 }}>{user?.name}</div>
        <button onClick={logout} style={{ background: "#ef4444", color: "#fff", padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer" }}>Logout</button>
      </div>
    </header>
  );
};

export default UserNavbar;
