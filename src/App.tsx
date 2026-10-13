
import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
} from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AuditDashboard from "./pages/AuditDashboard";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";

import "./App.css";

type Page =
  | "login"
  | "register"
  | "dashboard"
  | "audit"
  | "admin";

type EntityId = number | string | null;

type AuditDashboardProps = {
  initialWebsiteId?: EntityId;
  initialReportId?: EntityId;
};

const TypedAuditDashboard =
  AuditDashboard as ComponentType<AuditDashboardProps>;

function hasToken(): boolean {
  return Boolean(
    localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("token")
  );
}

function getInitialPage(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "");

  if (
    hash === "login" ||
    hash === "register" ||
    hash === "dashboard" ||
    hash === "audit" ||
    hash === "admin"
  ) {
    return hash;
  }

  return hasToken() ? "dashboard" : "login";
}

function clearAuthData(): void {
  const keys = [
    "access_token",
    "token",
    "token_type",
    "user_id",
    "role",
    "refresh_token",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function getStoredRole(): string {
  return (
    localStorage.getItem("role") ||
    sessionStorage.getItem("role") ||
    ""
  ).trim().toLowerCase();
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => hasToken());

  const [page, setPage] = useState<Page>(() => getInitialPage());

  const [auditWebsiteId, setAuditWebsiteId] =
    useState<EntityId>(null);

  const [auditReportId, setAuditReportId] =
    useState<EntityId>(null);

  const [registrationSuccess, setRegistrationSuccess] =
    useState(false);

  const updatePage = useCallback((nextPage: Page) => {
    setPage(nextPage);

    const nextHash = `#/${nextPage}`;

    if (window.location.hash !== nextHash) {
      window.history.pushState({ page: nextPage }, "", nextHash);
    }
  }, []);

  const returnToDashboard = useCallback(() => {
    setAuditWebsiteId(null);
    setAuditReportId(null);
    updatePage("dashboard");
  }, [updatePage]);

  const handleLogin = useCallback(() => {
    setLoggedIn(true);
    setRegistrationSuccess(false);
    setAuditWebsiteId(null);
    setAuditReportId(null);

    // Always open the normal dashboard after login.
    updatePage("dashboard");
  }, [updatePage]);

  const handleLogout = useCallback(() => {
    clearAuthData();

    setLoggedIn(false);
    setAuditWebsiteId(null);
    setAuditReportId(null);
    setRegistrationSuccess(false);

    updatePage("login");
  }, [updatePage]);

  const openAudit = useCallback(
    (websiteId: EntityId = null) => {
      setAuditWebsiteId(websiteId);
      setAuditReportId(null);
      updatePage("audit");
    },
    [updatePage]
  );

  const openReport = useCallback(
    (websiteId: number | string, reportId: number | string) => {
      setAuditWebsiteId(websiteId);
      setAuditReportId(reportId);
      updatePage("audit");
    },
    [updatePage]
  );

  const goToRegister = useCallback(() => {
    setRegistrationSuccess(false);
    updatePage("register");
  }, [updatePage]);

  const goToLogin = useCallback(() => {
    updatePage("login");
  }, [updatePage]);

  const handleRegistered = useCallback(() => {
    setRegistrationSuccess(true);
    updatePage("login");
  }, [updatePage]);

  const openAdmin = useCallback(() => {
    if (getStoredRole() !== "admin") {
      updatePage("dashboard");
      return;
    }

    updatePage("admin");
  }, [updatePage]);

  useEffect(() => {
    function syncPage() {
      const authenticated = hasToken();
      const requestedPage = getInitialPage();

      setLoggedIn(authenticated);

      if (!authenticated) {
        setPage(
          requestedPage === "register" ? "register" : "login"
        );
        return;
      }

      if (
        requestedPage === "login" ||
        requestedPage === "register"
      ) {
        setPage("dashboard");
        return;
      }

      if (
        requestedPage === "admin" &&
        getStoredRole() !== "admin"
      ) {
        setPage("dashboard");

        window.history.replaceState(
          { page: "dashboard" },
          "",
          "#/dashboard"
        );

        return;
      }

      setPage(requestedPage);
    }

    function handleAuthExpired() {
      handleLogout();
    }

    window.addEventListener("popstate", syncPage);
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("auth:expired", handleAuthExpired);

    return () => {
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener(
        "auth:expired",
        handleAuthExpired
      );
    };
  }, [handleLogout]);

  if (!loggedIn) {
    if (page === "register") {
      return (
        <div className="auth-page">
          <Register
            onRegister={handleRegistered}
            onLogin={goToLogin}
          />
        </div>
      );
    }

    return (
      <div className="auth-page">
        <Login
          onLogin={handleLogin}
          onRegister={goToRegister}
          registrationSuccess={registrationSuccess}
        />
      </div>
    );
  }

  const isAdmin = getStoredRole() === "admin";

  const safePage: Page =
    page === "admin" && !isAdmin ? "dashboard" : page;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={safePage}
        onDashboard={returnToDashboard}
        onNewAudit={() => openAudit()}
        onAdmin={openAdmin}
        onLogout={handleLogout}
      />

      <main className="app-main">
        {safePage === "admin" && isAdmin ? (
          <AdminDashboard />
        ) : safePage === "audit" ? (
          <div className="audit-page">
            <header className="page-topbar">
              <button
                type="button"
                className="back-button"
                onClick={returnToDashboard}
              >
                <span aria-hidden="true">←</span>
                Back to Dashboard
              </button>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </header>

            <TypedAuditDashboard
              initialWebsiteId={auditWebsiteId}
              initialReportId={auditReportId}
            />
          </div>
        ) : (
          <Dashboard
            onLogout={handleLogout}
            onOpenAudit={openAudit}
            onOpenReport={openReport}
          />
        )}
      </main>
    </div>
  );
}
