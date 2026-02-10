import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // FETCH ALL USERS
  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data || []);
    } catch (err) {
      console.log("Error fetching users", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // TOGGLE USER STATUS
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      await api.put(`/admin/users/${id}/status`, {
        status: newStatus,
      });

      await loadUsers(); // refresh user list
    } catch (err) {
      console.log("Error updating status", err);
      alert(err?.response?.data?.message || "Could not update status");
    }
  };

  // DELETE USER
  const deleteUser = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers(); // refresh list after delete
    } catch (err) {
      console.log("Error deleting user", err);
      alert(err?.response?.data?.message || "Could not delete user");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <AdminLayout>
      <div style={{ padding: "20px" }}>
        <h2>All Users</h2>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="table table-bordered" style={{ marginTop: "20px" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    No Users Found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "-"}</td>
                    <td>{user.role}</td>
                    <td>{user.status === "active" ? "Active" : "Inactive"}</td>

                    <td>
                      {/* Toggle status button */}
                      <button
                        className={`btn ${
                          user.status === "active"
                            ? "btn-danger"
                            : "btn-success"
                        } btn-sm`}
                        onClick={() => toggleStatus(user.id, user.status)}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>

                      {/* Delete user button */}
                      <button
                        className="btn btn-outline-danger btn-sm ms-2"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
