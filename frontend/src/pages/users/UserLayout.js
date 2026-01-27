// src/pages/users/UserLayout.js
import React from "react";
import { Outlet } from "react-router-dom";
import UserNavbar from "../../components/UserNavbar";
import UserSidebar from "../../components/UserSidebar";

export default function UserLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* render navbar once */}
      <UserNavbar />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar area (fixed width) */}
        <div style={{ width: 260, borderRight: "1px solid #eef2ff", background: "#fff", overflow: "auto" }}>
          <UserSidebar />
        </div>

        {/* Main content (scrollable) */}
        <main style={{ flex: 1, padding: 20, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
