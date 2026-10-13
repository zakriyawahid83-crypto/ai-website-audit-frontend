import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { getAuditHistory } from "../services/auditService";
import { getApiErrorMessage } from "../services/errorMessage";
import "./Dashboard.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatus = (status) =>
  String(status || "unknown").toLowerCase();

const getScore = (score) => {
  const value = Number(score);
  return Number.isFinite(value) ? value : null;
};

const getScoreLabel = (score) => {
  if (score === null) return "Not scored";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs work";
  return "Needs attention";
};

function StatCard({ label, value, description, icon, accent }) {
  return (
    <article className={`dash-stat-card ${accent}`}>
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="dash-stat-value">{value}</div>
      <p className="dash-stat-description">{description}</p>
    </article>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="dash-empty">
      <div className="dash-empty-icon" aria-hidden="true">
        ◇
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default function Dashboard({
  onLogout,
  onOpenAudit,
  onOpenReport,
}) {
  const [websites, setWebsites] = useState([]);
  const [history, setHistory] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoadingData(true);

    setError("");

    try {
      const [websiteResponse, historyResponse] = await Promise.all([
        api.get("/websites/"),
        getAuditHistory(),
      ]);

      const websiteData = websiteResponse.data;
      const auditData = historyResponse?.data ?? historyResponse;

      setWebsites(
        Array.isArray(websiteData)
          ? websiteData
          : Array.isArray(websiteData?.websites)
            ? websiteData.websites
            : []
      );

      setHistory(
        Array.isArray(auditData)
          ? auditData
          : Array.isArray(auditData?.items)
            ? auditData.items
            : Array.isArray(auditData?.audits)
              ? auditData.audits
              : []
      );
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Dashboard data load nahi hua. Backend connection check karo."
        )
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completedAudits = useMemo(
    () => history.filter((item) => getStatus(item.status) === "completed"),
    [history]
  );

  const averageScore = useMemo(() => {
    const scores = completedAudits
      .map((item) => getScore(item.overall_score))
      .filter((score) => score !== null);

    if (!scores.length) return null;

    return Math.round(
      scores.reduce((total, score) => total + score, 0) / scores.length
    );
  }, [completedAudits]);

  const criticalIssues = useMemo(
    () =>
      history.reduce((total, audit) => {
        const value = Number(
          audit.critical_issues ?? audit.critical_count ?? 0
        );

        return total + (Number.isFinite(value) ? value : 0);
      }, 0),
    [history]
  );

  const filteredWebsites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return websites.filter((site) => {
      const siteName = String(site.name || "").toLowerCase();
      const siteUrl = String(site.url || "").toLowerCase();

      return !query || siteName.includes(query) || siteUrl.includes(query);
    });
  }, [websites, search]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((audit) => {
      const status = getStatus(audit.status);
      const website = websites.find(
        (site) => String(site.id) === String(audit.website_id)
      );

      const searchableText = [
        audit.audit_id,
        audit.id,
        audit.website_id,
        website?.name,
        website?.url,
        status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [history, websites, search, statusFilter]);

  async function addWebsite(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName || !trimmedUrl) {
      setError("Website name aur URL dono enter karo.");
      return;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setError("Website URL http:// ya https:// se shuru hona chahiye.");
        return;
      }
    } catch {
      setError("Valid website URL enter karo, jaise https://example.com");
      return;
    }

    setLoading(true);

    try {
      await api.post("/websites/", {
        name: trimmedName,
        url: trimmedUrl,
      });

      setName("");
      setUrl("");
      setSuccess("Website successfully add ho gayi.");

      await loadData(false);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Website add nahi hui. API request schema check karo."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function openWebsiteAudit(site) {
    if (site?.id == null) {
      setError("Website ID available nahi hai.");
      return;
    }

    onOpenAudit?.(site.id);
  }

  function openAuditReport(audit) {
    const auditId = audit.audit_id ?? audit.id;

    if (auditId == null || audit.website_id == null) {
      setError("Is audit ki report details incomplete hain.");
      return;
    }

    onOpenReport?.(audit.website_id, auditId);
  }

  return (
    <div className="dashboard-page">
      <header className="dash-topbar">
        <div className="dash-breadcrumb">
          <span className="dash-breadcrumb-muted">Workspace</span>
          <span aria-hidden="true">/</span>
          <strong>Overview</strong>
        </div>

        <div className="dash-topbar-actions">
          <button
            type="button"
            className="dash-icon-button"
            onClick={() => loadData()}
            disabled={loadingData}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
          >
            <span className={loadingData ? "dash-spinning" : ""}>↻</span>
          </button>

          <div className="dash-user-avatar" title="Your account">
            A
          </div>

          <button
            type="button"
            className="dash-logout-button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="dash-content">
        <section className="dash-welcome">
          <div>
            <div className="dash-eyebrow">
              <span className="dash-live-dot" />
              WEBSITE INTELLIGENCE
            </div>

            <h1>Your website command center</h1>

            <p>
              Monitor website health, discover issues, and turn audit insights
              into actionable improvements.
            </p>
          </div>

          <button
            type="button"
            className="dash-primary-button"
            onClick={() => onOpenAudit?.()}
          >
            <span aria-hidden="true">＋</span>
            Start new audit
            <span aria-hidden="true">→</span>
          </button>
        </section>

        {error && (
          <div className="dash-alert dash-alert-error" role="alert">
            <span>{String(error)}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="dash-alert dash-alert-success" role="status">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        <section
          className="dash-stats-grid"
          aria-label="Website audit statistics"
          aria-busy={loadingData}
        >
          <StatCard
            label="Total websites"
            value={loadingData ? "…" : websites.length}
            description="Websites in your workspace"
            icon="◎"
            accent="dash-accent-blue"
          />

          <StatCard
            label="Total audits"
            value={loadingData ? "…" : history.length}
            description="All recorded audit runs"
            icon="⌁"
            accent="dash-accent-purple"
          />

          <StatCard
            label="Completed audits"
            value={loadingData ? "…" : completedAudits.length}
            description="Successfully completed"
            icon="✓"
            accent="dash-accent-green"
          />

          <StatCard
            label="Average score"
            value={
              loadingData
                ? "…"
                : averageScore === null
                  ? "—"
                  : `${averageScore}/100`
            }
            description={
              loadingData
                ? "Calculating score"
                : getScoreLabel(averageScore)
            }
            icon="↗"
            accent="dash-accent-orange"
          />
        </section>

        <section className="dash-main-grid">
          <article className="dash-panel dash-add-panel">
            <div className="dash-panel-heading">
              <div>
                <span className="dash-section-kicker">GET STARTED</span>
                <h2>Add a website</h2>
                <p>Connect a website to begin analyzing its health.</p>
              </div>

              <span className="dash-panel-icon" aria-hidden="true">
                ＋
              </span>
            </div>

            <form className="dash-website-form" onSubmit={addWebsite}>
              <div className="dash-field">
                <label htmlFor="website-name">Website name</label>
                <input
                  id="website-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="My business website"
                  maxLength={150}
                  required
                />
              </div>

              <div className="dash-field">
                <label htmlFor="website-url">Website URL</label>
                <input
                  id="website-url"
                  type="url"
                  autoComplete="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="dash-primary-button dash-add-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="dash-button-spinner" />
                    Adding website…
                  </>
                ) : (
                  <>Add website <span aria-hidden="true">→</span></>
                )}
              </button>
            </form>
          </article>

          <article className="dash-panel dash-score-panel">
            <div className="dash-panel-heading">
              <div>
                <span className="dash-section-kicker">PERFORMANCE SNAPSHOT</span>
                <h2>Audit health</h2>
                <p>Based on your completed audit scores.</p>
              </div>
            </div>

            <div className="dash-score-content">
              <div
                className="dash-score-ring"
                style={{
                  "--score-angle": `${(averageScore ?? 0) * 3.6}deg`,
                }}
                role="img"
                aria-label={
                  averageScore === null
                    ? "No audit score available"
                    : `Average score ${averageScore} out of 100`
                }
              >
                <div className="dash-score-ring-inner">
                  <strong>{averageScore ?? "—"}</strong>
                  <span>out of 100</span>
                </div>
              </div>

              <div className="dash-score-details">
                <strong>
                  {averageScore === null
                    ? "Awaiting your first score"
                    : getScoreLabel(averageScore)}
                </strong>
                <p>
                  {averageScore === null
                    ? "Run an audit to see your website score here."
                    : "Average score across completed audits."}
                </p>

                <div className="dash-score-legend">
                  <span>
                    <i className="legend-good" /> 90–100 Excellent
                  </span>
                  <span>
                    <i className="legend-medium" /> 50–89 Improve
                  </span>
                  <span>
                    <i className="legend-low" /> 0–49 Attention
                  </span>
                </div>
              </div>
            </div>

            <div className="dash-score-footer">
              <span>Completed audits</span>
              <strong>{loadingData ? "…" : completedAudits.length}</strong>
            </div>
          </article>
        </section>

        <section className="dash-panel dash-websites-panel">
          <div className="dash-panel-heading dash-list-heading">
            <div>
              <span className="dash-section-kicker">YOUR WORKSPACE</span>
              <h2>Your websites</h2>
              <p>Manage your websites and launch a new audit.</p>
            </div>

            <span className="dash-count-badge">
              {loadingData ? "…" : websites.length} websites
            </span>
          </div>

          <div className="dash-toolbar">
            <label className="dash-search" htmlFor="dashboard-search">
              <span aria-hidden="true">⌕</span>
              <input
                id="dashboard-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search websites, URLs or audit IDs..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>
          </div>

          {loadingData ? (
            <div className="dash-loading" role="status">
              <span className="dash-loading-spinner" />
              Loading your workspace…
            </div>
          ) : filteredWebsites.length === 0 ? (
            <EmptyState
              title={websites.length ? "No matching websites" : "Your workspace is ready"}
              description={
                websites.length
                  ? "Try another search term."
                  : "Add your first website above to start your SEO and performance audits."
              }
              action={
                !websites.length ? (
                  <button
                    type="button"
                    className="dash-secondary-button"
                    onClick={() =>
                      document
                        .getElementById("website-name")
                        ?.focus()
                    }
                  >
                    Add your first website
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Website</th>
                    <th>Website ID</th>
                    <th>Latest audit</th>
                    <th>Score</th>
                    <th className="dash-actions-heading">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWebsites.map((site) => {
                    const siteAudits = history.filter(
                      (audit) =>
                        String(audit.website_id) === String(site.id)
                    );

                    const latestAudit = siteAudits[0];
                    const score = getScore(latestAudit?.overall_score);

                    return (
                      <tr key={site.id}>
                        <td data-label="Website">
                          <div className="dash-website-cell">
                            <div className="dash-website-favicon">
                              {(site.name || site.url || "W")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="dash-website-info">
                              <strong>{site.name || site.url}</strong>
                              <span>{site.url}</span>
                            </div>
                          </div>
                        </td>

                        <td data-label="Website ID">
                          <span className="dash-id">#{site.id}</span>
                        </td>

                        <td data-label="Latest audit">
                          {latestAudit ? (
                            <span
                              className={`dash-status dash-status-${getStatus(
                                latestAudit.status
                              )}`}
                            >
                              {getStatus(latestAudit.status).replaceAll("_", " ")}
                            </span>
                          ) : (
                            <span className="dash-muted">Not audited</span>
                          )}
                        </td>

                        <td data-label="Score">
                          <span className="dash-score-value">
                            {score === null ? "—" : `${score}/100`}
                          </span>
                        </td>

                        <td data-label="Action">
                          <button
                            type="button"
                            className="dash-table-action"
                            onClick={() => openWebsiteAudit(site)}
                          >
                            Run audit <span aria-hidden="true">→</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dash-panel dash-history-panel">
          <div className="dash-panel-heading dash-list-heading">
            <div>
              <span className="dash-section-kicker">ACTIVITY</span>
              <h2>Recent audit history</h2>
              <p>Track audit runs and revisit completed reports.</p>
            </div>

            <label className="dash-filter">
              <span className="dash-sr-only">Filter by audit status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>

          {loadingData ? (
            <div className="dash-loading" role="status">
              <span className="dash-loading-spinner" />
              Loading audit history…
            </div>
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              title={history.length ? "No audits match these filters" : "No audits yet"}
              description={
                history.length
                  ? "Change your search or select another status."
                  : "Run an audit on one of your websites. Your results will appear here."
              }
              action={
                !history.length ? (
                  <button
                    type="button"
                    className="dash-secondary-button"
                    onClick={() => onOpenAudit?.()}
                  >
                    Start your first audit
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Audit</th>
                    <th>Website</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th className="dash-actions-heading">Report</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHistory.map((audit) => {
                    const auditId = audit.audit_id ?? audit.id;
                    const site = websites.find(
                      (item) =>
                        String(item.id) === String(audit.website_id)
                    );
                    const status = getStatus(audit.status);
                    const score = getScore(audit.overall_score);
                    const isCompleted = status === "completed";

                    return (
                      <tr key={auditId}>
                        <td data-label="Audit">
                          <strong className="dash-audit-id">
                            #{auditId}
                          </strong>
                        </td>

                        <td data-label="Website">
                          <span className="dash-history-website">
                            {site?.name || site?.url || `Website #${audit.website_id ?? "—"}`}
                          </span>
                        </td>

                        <td data-label="Date">
                          <span className="dash-muted">
                            {formatDate(
                              audit.created_at ||
                              audit.started_at ||
                              audit.completed_at
                            )}
                          </span>
                        </td>

                        <td data-label="Status">
                          <span
                            className={`dash-status dash-status-${status}`}
                          >
                            {status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td data-label="Score">
                          <span className="dash-score-value">
                            {score === null ? "—" : `${score}/100`}
                          </span>
                        </td>

                        <td data-label="Report">
                          {isCompleted ? (
                            <button
                              type="button"
                              className="dash-table-action"
                              onClick={() => openAuditReport(audit)}
                            >
                              View report <span aria-hidden="true">↗</span>
                            </button>
                          ) : (
                            <span className="dash-muted">Unavailable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dash-footer">
          <span>AuditAI · Website intelligence workspace</span>
          <button type="button" onClick={() => loadData()}>
            Refresh data ↻
          </button>
        </footer>
      </div>
    </div>
  );
}