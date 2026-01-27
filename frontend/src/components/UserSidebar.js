// src/components/UserSidebar.js
import React from "react";
import { NavLink } from "react-router-dom";

const NavItem = ({ to, children }) => (
  // 'end' is applied on the NavLink below to force exact match
  <NavLink
    to={to}
    end
    style={({ isActive }) => ({
      display: "flex",
      padding: "10px 12px",
      borderRadius: 8,
      color: isActive ? "#0f172a" : "#475569",
      background: isActive ? "#e6eef7" : "transparent",
      textDecoration: "none",
      alignItems: "center",
      gap: 10,
      fontWeight: 600,
    })}
  >
    {children}
  </NavLink>
);

export default function UserSidebar() {
  return (
    <aside
      style={{
        width: 260,
        background: "#ffffff",
        borderRight: "1px solid #eef2ff",
        minHeight: "100vh",
        padding: "16px 12px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, flex: 1 }}>
        {/* exact matches only */}
        <NavItem to="/user">
          <span style={{ width: 18, textAlign: "center" }}>🏠</span>
          Dashboard
        </NavItem>

        <NavItem to="/user/experiments">
          <span style={{ width: 18, textAlign: "center" }}>🧪</span>
          Experiments
        </NavItem>

        <NavItem to="/user/files">
          <span style={{ width: 18, textAlign: "center" }}>📁</span>
          Files
        </NavItem>


        {/* <NavItem to="/user/profile">
          <span style={{ width: 18, textAlign: "center" }}>👤</span>
          Profile
        </NavItem> */}
      </nav>

      <small style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
        Version 1.0
      </small>
    </aside>
  );
}
