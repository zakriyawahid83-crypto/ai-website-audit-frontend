
import { useState } from "react";

export default function Sidebar({
  activePage,
  onDashboard,
  onNewAudit,
  onAdmin,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Read the saved role from the current browser session.
  const role = (
    localStorage.getItem("role") ||
    sessionStorage.getItem("role") ||
    ""
  ).toLowerCase();

  const isAdmin = role === "admin";

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⌂",
      action: onDashboard,
    },
    {
      id: "audit",
      label: "Website Audit",
      icon: "◎",
      action: onNewAudit,
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin Dashboard",
            icon: "⚙",
            action: onAdmin,
          },
        ]
      : []),
  ];

  function handleNavigation(action) {
    setMenuOpen(false);
    action?.();
  }

  return (
    <>
      <header className="mobile-sidebar-header">
        <div className="sidebar-brand mobile-brand">
          <div className="sidebar-logo">A</div>

          <div className="sidebar-brand-text">
            <h2>AuditAI</h2>
            <p>Website Optimization</p>
          </div>
        </div>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="audit-sidebar-navigation"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${
          menuOpen ? "sidebar-mobile-open" : ""
        }`}
        id="audit-sidebar-navigation"
      >
        <div className="sidebar-brand desktop-brand">
          <div className="sidebar-logo">A</div>

          <div className="sidebar-brand-text">
            <h2>AuditAI</h2>
            <p>Website Optimization</p>
          </div>
        </div>

        <div className="sidebar-section-title">
          WORKSPACE
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Main navigation"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${
                activePage === item.id ? "sidebar-item-active" : ""
              }`}
              onClick={() => handleNavigation(item.action)}
              aria-current={
                activePage === item.id ? "page" : undefined
              }
            >
              <span
                className="sidebar-item-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>

              {activePage === item.id && (
                <span className="sidebar-active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-help">
          <div className="sidebar-help-icon" aria-hidden="true">
            ✦
          </div>

          <h3>Improve your website</h3>

          <p>
            Find website issues and get optimization recommendations.
          </p>

          <button
            type="button"
            className="sidebar-audit-button"
            onClick={() => handleNavigation(onNewAudit)}
          >
            Start an audit <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="sidebar-status-dot" />
            <span>
              {isAdmin ? "Administrator workspace" : "Audit workspace"}
            </span>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={() => handleNavigation(onLogout)}
          >
            <span aria-hidden="true">↪</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
