
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./AdminDashboard.css";

function errorText(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return error?.message || "Request failed. Please try again.";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function statusClass(value) {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [audits, setAudits] = useState([]);

  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatus, setAuditStatus] = useState("");

  const [userPage, setUserPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 20;

  const loadOverview = useCallback(async () => {
    const response = await api.get("/admin/overview");
    setOverview(response.data);
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await api.get("/admin/users", {
      params: {
        search: userSearch.trim() || undefined,
        role: userRole || undefined,
        skip: userPage * pageSize,
        limit: pageSize,
      },
    });

    setUsers(response.data.items || []);
    setUserTotal(response.data.total || 0);
  }, [userSearch, userRole, userPage]);

  const loadAudits = useCallback(async () => {
    const response = await api.get("/admin/audits", {
      params: {
        search: auditSearch.trim() || undefined,
        status: auditStatus || undefined,
        skip: auditPage * pageSize,
        limit: pageSize,
      },
    });

    setAudits(response.data.items || []);
    setAuditTotal(response.data.total || 0);
  }, [auditSearch, auditStatus, auditPage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "overview") {
        await Promise.all([loadOverview(), loadUsers(), loadAudits()]);
      } else if (activeTab === "users") {
        await loadUsers();
      } else {
        await loadAudits();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadOverview, loadUsers, loadAudits]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setUserPage(0);
  }, [userSearch, userRole]);

  useEffect(() => {
    setAuditPage(0);
  }, [auditSearch, auditStatus]);

  const statusCounts = overview?.status_counts || {};
  const statusTotal = Object.values(statusCounts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const completed = Object.entries(statusCounts).reduce(
    (sum, [key, value]) =>
      ["completed", "success", "finished"].includes(key.toLowerCase())
        ? sum + Number(value || 0)
        : sum,
    0
  );

  const failed = Object.entries(statusCounts).reduce(
    (sum, [key, value]) =>
      ["failed", "error"].includes(key.toLowerCase())
        ? sum + Number(value || 0)
        : sum,
    0
  );

  const navItems = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "users", label: "Users", icon: "♙" },
    { id: "audits", label: "Audit Jobs", icon: "◷" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">A</span>
          <div>
            <strong>AuditAI</strong>
            <small>ADMIN CONSOLE</small>
          </div>
        </div>

        <div className="admin-nav-label">WORKSPACE</div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activeTab === item.id
                  ? "admin-nav-item active"
                  : "admin-nav-item"
              }
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-online-dot" />
          API console
          <small>Protected</small>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-breadcrumb">Workspace / Admin</div>
            <h1>
              {activeTab === "overview"
                ? "Overview"
                : activeTab === "users"
                  ? "User Management"
                  : "Audit Jobs"}
            </h1>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </header>

        {error && (
          <div className="admin-error" role="alert">
            <div>
              <strong>Unable to load admin data</strong>
              <p>{error}</p>
              {error.includes("403") ||
              error.toLowerCase().includes("admin access") ? (
                <p>
                  Aapke account ka admin role verify karein aur dobara
                  login karein.
                </p>
              ) : null}
            </div>
            <button type="button" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {activeTab === "overview" && (
          <>
            <section className="admin-welcome">
              <div>
                <span className="admin-eyebrow">SYSTEM OVERVIEW</span>
                <h2>Welcome to your control center</h2>
                <p>
                  Monitor registered users and website audit activity
                  from one place.
                </p>
              </div>
              <div className="admin-welcome-symbol">✳</div>
            </section>

            <section className="admin-stats-grid">
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Total Users</span>
                  <span className="admin-stat-icon purple">♙</span>
                </div>
                <strong>{overview?.total_users ?? "—"}</strong>
                <small>Registered accounts</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Total Audits</span>
                  <span className="admin-stat-icon blue">◷</span>
                </div>
                <strong>{overview?.total_audits ?? "—"}</strong>
                <small>All recorded audit jobs</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Completed</span>
                  <span className="admin-stat-icon green">✓</span>
                </div>
                <strong>{completed}</strong>
                <small>Completed audit jobs</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Failed</span>
                  <span className="admin-stat-icon red">!</span>
                </div>
                <strong>{failed}</strong>
                <small>Jobs requiring investigation</small>
              </article>
            </section>

            <section className="admin-content-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Audit Job Status</h2>
                  <p>Counts returned by the backend</p>
                </div>
                <span className="admin-total-pill">
                  {statusTotal} jobs with a status
                </span>
              </div>

              {Object.keys(statusCounts).length === 0 ? (
                <p className="admin-muted">
                  No status data available yet.
                </p>
              ) : (
                <div className="admin-status-grid">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div className="admin-status-item" key={status}>
                      <span
                        className={`admin-status-dot ${statusClass(status)}`}
                      />
                      <span className="admin-status-name">
                        {status.replaceAll("_", " ")}
                      </span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-content-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Recent Users</h2>
                  <p>Latest registered accounts</p>
                </div>
                <button
                  className="admin-text-button"
                  type="button"
                  onClick={() => setActiveTab("users")}
                >
                  View all →
                </button>
              </div>

              <UserTable users={users.slice(0, 5)} />
            </section>
          </>
        )}

        {activeTab === "users" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>All Users</h2>
                <p>{userTotal} matching accounts</p>
              </div>
            </div>

            <div className="admin-toolbar">
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search name or email..."
                aria-label="Search users"
              />

              <select
                value={userRole}
                onChange={(event) => setUserRole(event.target.value)}
                aria-label="Filter users by role"
              >
                <option value="">All roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <UserTable users={users} />

            <Pagination
              page={userPage}
              total={userTotal}
              pageSize={pageSize}
              onChange={setUserPage}
            />
          </section>
        )}

        {activeTab === "audits" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Audit Jobs</h2>
                <p>{auditTotal} matching jobs</p>
              </div>
            </div>

            <div className="admin-toolbar">
              <input
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
                placeholder="Search available audit fields..."
                aria-label="Search audit jobs"
              />

              <select
                value={auditStatus}
                onChange={(event) => setAuditStatus(event.target.value)}
                aria-label="Filter audits by status"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="queued">Queued</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <AuditTable audits={audits} />

            <Pagination
              page={auditPage}
              total={auditTotal}
              pageSize={pageSize}
              onChange={setAuditPage}
            />
          </section>
        )}

        <footer className="admin-footer">
          <span>AI Website Audit Platform</span>
          <span>Admin console · Access controlled by API</span>
        </footer>
      </main>
    </div>
  );
}

function UserTable({ users }) {
  if (!users.length) {
    return <p className="admin-muted">No users found.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="admin-user-cell">
                  <span className="admin-avatar">
                    {(user.name || user.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <span>{user.name || "Unnamed user"}</span>
                </div>
              </td>
              <td>{user.email}</td>
              <td>
                <span className={`admin-role ${statusClass(user.role)}`}>
                  {user.role || "user"}
                </span>
              </td>
              <td>{formatDate(user.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ audits }) {
  if (!audits.length) {
    return <p className="admin-muted">No audit jobs found.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Audit ID</th>
            <th>Website / URL</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit, index) => {
            const id = audit.id ?? audit.audit_id ?? index;
            const status = audit.status ?? audit.state ?? "unknown";
            const url =
              audit.website_url ??
              audit.url ??
              audit.website_id ??
              "—";
            const created =
              audit.created_at ?? audit.started_at ?? audit.updated_at;

            return (
              <tr key={id}>
                <td>#{id}</td>
                <td className="admin-url-cell">{url}</td>
                <td>
                  <span
                    className={`admin-status-badge ${statusClass(status)}`}
                  >
                    {String(status).replaceAll("_", " ")}
                  </span>
                </td>
                <td>{formatDate(created)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-pagination">
      <span>
        {total === 0
          ? "No results"
          : `Showing ${page * pageSize + 1}–${Math.min(
              (page + 1) * pageSize,
              total
            )} of ${total}`}
      </span>

      <div>
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onChange((current) => current - 1)}
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= pages}
          onClick={() => onChange((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
