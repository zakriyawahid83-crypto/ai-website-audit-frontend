
import { useEffect, useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/errorMessage";
import {
  runAudit,
  getAuditReport,
  getAIRecommendations,
  downloadCsvReport,
  downloadPdfReport,
} from "../services/auditService";
import "./AuditDashboard.css";

function getErrorDetails(err) {
  return JSON.stringify(
    {
      status: err?.status ?? err?.response?.status ?? null,
      response: err?.responseData ?? err?.response?.data ?? null,
      message: err?.message ?? null,
    },
    null,
    2
  );
}

function getReportId(report) {
  return report?.audit_id ?? report?.id ?? report?.audit?.id ?? null;
}

function formatScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Math.max(0, Math.min(100, Number(value)));
}

function severityClass(value) {
  const normalized = String(value || "low").toLowerCase();

  if (["critical", "high", "medium", "low"].includes(normalized)) {
    return normalized;
  }

  return "low";
}

function getCategoryScore(report, key) {
  const value = report?.category_scores?.[key];

  if (value == null || !Number.isFinite(Number(value))) {
    return null;
  }

  return Math.max(0, Math.min(100, Number(value)));
}

function scoreLabel(score) {
  if (score === null) return "Not measured";
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs improvement";
  return "Needs attention";
}

export default function AuditDashboard({
  initialWebsiteId = null,
  initialReportId = null,
}) {
  const [websites, setWebsites] = useState([]);
  const [websiteId, setWebsiteId] = useState(
    initialWebsiteId == null ? "" : String(initialWebsiteId)
  );

  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [report, setReport] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [activeTab, setActiveTab] = useState("issues");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadWebsites() {
      setLoadingWebsites(true);

      try {
        const { data } = await api.get("/websites/");

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!active) return;

        setWebsites(list);

        setWebsiteId((current) => {
          const preferred =
            current ||
            (initialWebsiteId != null
              ? String(initialWebsiteId)
              : "");

          if (list.some((item) => String(item.id) === preferred)) {
            return preferred;
          }

          return list.length ? String(list[0].id) : "";
        });
      } catch (err) {
        console.error("Loading websites failed:", err);

        if (active) {
          setError(
            getApiErrorMessage(
              err,
              "Could not load your registered websites."
            )
          );
          setErrorDetails(getErrorDetails(err));
        }
      } finally {
        if (active) setLoadingWebsites(false);
      }
    }

    loadWebsites();

    return () => {
      active = false;
    };
  }, [initialWebsiteId]);

  useEffect(() => {
    if (initialWebsiteId == null) return;
    setWebsiteId(String(initialWebsiteId));
  }, [initialWebsiteId]);

  useEffect(() => {
    if (!initialReportId) return undefined;

    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");
      setErrorDetails("");
      setReport(null);
      setAiData(null);

      try {
        const data = await getAuditReport(initialReportId);

        if (!active) return;

        setReport(data);

        if (data?.website_id != null) {
          setWebsiteId(String(data.website_id));
        }
      } catch (err) {
        console.error("Loading report failed:", err);

        if (active) {
          setError(
            getApiErrorMessage(err, "Could not load this audit report.")
          );
          setErrorDetails(getErrorDetails(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [initialReportId]);

  async function handleAudit(event) {
    event.preventDefault();

    setError("");
    setErrorDetails("");
    setAiData(null);

    if (
      !/^[1-9]\d*$/.test(String(websiteId)) ||
      !Number.isSafeInteger(Number(websiteId))
    ) {
      setError("Please select a valid registered website.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setReport(null);
    setSeverityFilter("all");

    try {
      const result = await runAudit(Number(websiteId));

      const auditId =
        result?.audit_id ?? result?.id ?? result?.audit?.id;

      if (!auditId) {
        throw new Error("The server did not return an audit ID.");
      }

      const data = await getAuditReport(auditId);

      setReport(data);
      setActiveTab("issues");
    } catch (err) {
      console.error("Run audit failed:", err);

      const detail =
        err?.responseData?.detail ?? err?.response?.data?.detail;

      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg || JSON.stringify(item)).join(", ")
        : typeof detail === "string"
          ? detail
          : getApiErrorMessage(err, "The website audit failed.");

      setError(message);
      setErrorDetails(getErrorDetails(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadAI() {
    const auditId = getReportId(report);

    if (!auditId) {
      setError("Open or run an audit before requesting recommendations.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError("");
    setErrorDetails("");

    try {
      const data = await getAIRecommendations(auditId);

      setAiData(data);
      setActiveTab("ai");
    } catch (err) {
      console.error("AI recommendations failed:", err);

      setError(
        getApiErrorMessage(err, "Could not generate AI recommendations.")
      );
      setErrorDetails(getErrorDetails(err));
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    const auditId = getReportId(report);

    if (!auditId) {
      setError("No audit report is available to download.");
      return;
    }

    setError("");
    setErrorDetails("");

    try {
      await downloadCsvReport(auditId);
    } catch (err) {
      console.error("CSV download failed:", err);

      setError(getApiErrorMessage(err, "CSV download failed."));
      setErrorDetails(getErrorDetails(err));
    }
  }

  async function exportPdf() {
    const auditId = getReportId(report);

    if (!auditId) {
      setError("No audit report is available to download.");
      return;
    }

    setError("");
    setErrorDetails("");

    try {
      await downloadPdfReport(auditId);
    } catch (err) {
      console.error("PDF download failed:", err);

      setError(getApiErrorMessage(err, "PDF download failed."));
      setErrorDetails(getErrorDetails(err));
    }
  }

  const issues = Array.isArray(report?.issues) ? report.issues : [];

  const recommendations = Array.isArray(aiData?.recommendations)
    ? aiData.recommendations
    : [];

  const score = formatScore(report?.overall_score);
  const scoreNumber = typeof score === "number" ? score : 0;

  const counts = {
    critical: issues.filter(
      (item) => severityClass(item.severity) === "critical"
    ).length,
    high: issues.filter(
      (item) => severityClass(item.severity) === "high"
    ).length,
    medium: issues.filter(
      (item) => severityClass(item.severity) === "medium"
    ).length,
    low: issues.filter(
      (item) => severityClass(item.severity) === "low"
    ).length,
  };

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter === "all") return true;

    return (
      String(issue.severity || "low").toLowerCase() === severityFilter
    );
  });

  const categories = [
    { key: "seo", label: "SEO", icon: "⌕" },
    { key: "accessibility", label: "Accessibility", icon: "◎" },
    { key: "content", label: "Content", icon: "▤" },
    { key: "performance", label: "Performance", icon: "↗" },
  ];

  const status = String(report?.status || "not started").toLowerCase();
  const completed = status === "completed";

  return (
    <div className="audit-workspace">
      <header className="audit-page-heading">
        <div>
          <div className="audit-eyebrow">
            <span className="audit-live-dot" />
            WEBSITE ANALYSIS WORKSPACE
          </div>

          <h1>Website Audits</h1>

          <p>
            Discover website issues, measure quality, and get actionable
            recommendations to improve your site.
          </p>
        </div>

        {report && (
          <div className="audit-export-actions">
            <button
              type="button"
              className="audit-button audit-button-secondary"
              onClick={exportCsv}
              disabled={loading}
            >
              ↓ Export CSV
            </button>

            <button
              type="button"
              className="audit-button audit-button-primary"
              onClick={exportPdf}
              disabled={loading}
            >
              ↓ Download PDF
            </button>
          </div>
        )}
      </header>

      <section className="audit-launch-card">
        <div className="audit-launch-copy">
          <div className="audit-launch-icon" aria-hidden="true">
            ↗
          </div>

          <div>
            <h2>Start a new audit</h2>
            <p>Select one of your registered websites to begin analysis.</p>
          </div>
        </div>

        <form className="audit-launch-form" onSubmit={handleAudit}>
          <div className="audit-field">
            <label htmlFor="audit-website">Select website</label>

            <select
              id="audit-website"
              value={websiteId}
              onChange={(event) => {
                setWebsiteId(event.target.value);
                setError("");
                setErrorDetails("");
              }}
              disabled={
                loadingWebsites || loading || websites.length === 0
              }
              required
            >
              <option value="">
                {loadingWebsites
                  ? "Loading websites..."
                  : websites.length
                    ? "Choose a website"
                    : "No websites registered"}
              </option>

              {websites.map((website) => (
                <option key={website.id} value={String(website.id)}>
                  {website.name || website.url || `Website ${website.id}`}
                  {website.url && website.name ? ` — ${website.url}` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="audit-button audit-button-primary"
            disabled={
              loading ||
              loadingWebsites ||
              websites.length === 0 ||
              !websiteId
            }
          >
            {loading ? (
              <>
                <span className="audit-spinner" />
                Auditing...
              </>
            ) : (
              <>
                <span aria-hidden="true">⌕</span> Run audit
              </>
            )}
          </button>
        </form>

        <div className="audit-launch-footer">
          <span className="audit-security-icon" aria-hidden="true">
            ✓
          </span>

          Your existing website data stays connected to your account.

          {loading && (
            <span className="audit-running-message" role="status">
              Audit in progress. Please wait...
            </span>
          )}
        </div>
      </section>

      {error && (
        <section className="audit-error" role="alert">
          <div className="audit-error-icon">!</div>

          <div className="audit-error-content">
            <strong>Something went wrong</strong>
            <p>{String(error)}</p>

            {errorDetails && (
              <details>
                <summary>Technical details</summary>
                <pre>{errorDetails}</pre>
              </details>
            )}
          </div>

          <button
            type="button"
            className="audit-dismiss"
            onClick={() => {
              setError("");
              setErrorDetails("");
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </section>
      )}

      {!loadingWebsites && websites.length === 0 && (
        <section className="audit-empty-websites">
          <div className="audit-empty-icon">⌘</div>
          <h2>No websites yet</h2>
          <p>Add a website from your dashboard before starting an audit.</p>
        </section>
      )}

      {loading && !report && (
        <section className="audit-loading-card" role="status">
          <span className="audit-spinner audit-spinner-large" />

          <div>
            <strong>Analyzing your website</strong>
            <p>Collecting audit data. This may take a little time.</p>
          </div>
        </section>
      )}

      {report && (
        <>
          <section className="audit-results-heading">
            <div>
              <span className="audit-section-kicker">LATEST RESULTS</span>
              <h2>Audit overview</h2>

              <p>
                {report.website_url ||
                  websites.find(
                    (site) => String(site.id) === String(websiteId)
                  )?.url ||
                  "Website report"}
              </p>
            </div>

            <span
              className={`audit-status-badge ${status.replace(/\s+/g, "-")}`}
            >
              <span />
              {status}
            </span>
          </section>

          {status === "failed" && (
            <section className="audit-error" role="alert">
              <div className="audit-error-icon">!</div>

              <div className="audit-error-content">
                <strong>Audit did not complete</strong>
                <p>
                  {report.error_message ||
                    "Check the website URL and backend logs, then try again."}
                </p>
              </div>
            </section>
          )}

          <section className="audit-metrics-grid">
            <article className="audit-metric-card audit-score-card">
              <div className="audit-metric-top">
                <span>Overall score</span>
                <span className="audit-metric-icon purple">◉</span>
              </div>

              <div className="audit-score-row">
                <div
                  className="audit-score-ring"
                  style={{ "--score": `${scoreNumber}%` }}
                  role="img"
                  aria-label={`Overall score ${score} out of 100`}
                >
                  <div>
                    <strong>{score === "—" ? "—" : score}</strong>
                    {score !== "—" && <small>/100</small>}
                  </div>
                </div>

                <div className="audit-score-description">
                  <strong>
                    {score === "—"
                      ? "Score unavailable"
                      : scoreNumber >= 90
                        ? "Excellent"
                        : scoreNumber >= 70
                          ? "Good"
                          : scoreNumber >= 50
                            ? "Needs improvement"
                            : "Needs attention"}
                  </strong>

                  <p>Based on the results returned by your audit.</p>
                </div>
              </div>
            </article>

            <article className="audit-metric-card">
              <div className="audit-metric-top">
                <span>Total issues</span>
                <span className="audit-metric-icon orange">!</span>
              </div>

              <div className="audit-metric-value">
                {report.issues_found ?? issues.length}
              </div>

              <p className="audit-metric-foot">
                Issues detected in this report
              </p>

              <div className="audit-mini-bar">
                <span
                  style={{
                    width: `${Math.min(100, issues.length * 5)}%`,
                  }}
                />
              </div>
            </article>

            <article className="audit-metric-card">
              <div className="audit-metric-top">
                <span>Critical issues</span>
                <span className="audit-metric-icon red">⚠</span>
              </div>

              <div className="audit-metric-value">{counts.critical}</div>

              <p className="audit-metric-foot">
                Issues to prioritize first
              </p>

              <div className="audit-mini-bar red-bar">
                <span
                  style={{
                    width: `${
                      issues.length
                        ? (counts.critical / issues.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </article>

            <article className="audit-metric-card">
              <div className="audit-metric-top">
                <span>Recommendations</span>
                <span className="audit-metric-icon green">✦</span>
              </div>

              <div className="audit-metric-value">
                {recommendations.length}
              </div>

              <p className="audit-metric-foot">
                {aiData
                  ? "AI recommendations available"
                  : "Generate AI suggestions below"}
              </p>

              <div className="audit-mini-bar green-bar">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      recommendations.length * 10
                    )}%`,
                  }}
                />
              </div>
            </article>
          </section>

          <section className="audit-category-panel">
            <div className="audit-category-heading">
              <div>
                <span className="audit-section-kicker">
                  QUALITY BREAKDOWN
                </span>
                <h2>Category scores</h2>
                <p>
                  Scores are estimates based on detected issues, not
                  independent Lighthouse measurements.
                </p>
              </div>
            </div>

            <div className="audit-category-grid">
              {categories.map((category) => {
                const value = getCategoryScore(report, category.key);

                return (
                  <article
                    className="audit-category-card"
                    key={category.key}
                  >
                    <div className="audit-category-card-top">
                      <span className="audit-category-icon">
                        {category.icon}
                      </span>

                      <span className="audit-category-name">
                        {category.label}
                      </span>

                      <strong>
                        {value === null ? "N/A" : `${value}/100`}
                      </strong>
                    </div>

                    <div
                      className="audit-category-track"
                      role="progressbar"
                      aria-label={`${category.label} score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value ?? undefined}
                    >
                      <span
                        style={{
                          width: `${value ?? 0}%`,
                        }}
                      />
                    </div>

                    <div className="audit-category-card-footer">
                      <span>
                        {category.key === "performance" && value === null
                          ? "Dedicated metric not measured"
                          : value === null
                            ? "Score unavailable"
                            : scoreLabel(value)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="audit-panel">
            <div className="audit-panel-header">
              <div>
                <h2>Audit details</h2>
                <p>
                  Review detected issues and suggested improvements.
                </p>
              </div>

              <button
                type="button"
                className="audit-button audit-button-secondary"
                onClick={exportCsv}
                disabled={loading}
              >
                ↓ Download CSV
              </button>
            </div>

            <div
              className="audit-tabs"
              role="tablist"
              aria-label="Audit details"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "issues"}
                className={activeTab === "issues" ? "active" : ""}
                onClick={() => setActiveTab("issues")}
              >
                Detected issues <span>{issues.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ai"}
                className={activeTab === "ai" ? "active" : ""}
                onClick={() => setActiveTab("ai")}
              >
                AI recommendations <span>{recommendations.length}</span>
              </button>
            </div>

            {activeTab === "issues" && (
              <div className="audit-issues">
                {issues.length === 0 ? (
                  <div className="audit-no-results">
                    <div>✓</div>
                    <h3>No issues to display</h3>
                    <p>
                      {completed
                        ? "Your audit did not return any issues."
                        : "Issues will appear here when available in the report."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="audit-severity-summary">
                      {["critical", "high", "medium", "low"].map((level) => (
                        <button
                          type="button"
                          key={level}
                          className={`audit-severity-filter ${
                            severityFilter === level ? "selected" : ""
                          }`}
                          onClick={() =>
                            setSeverityFilter(
                              severityFilter === level ? "all" : level
                            )
                          }
                          aria-pressed={severityFilter === level}
                        >
                          <span
                            className={`audit-severity-dot ${level}`}
                          />
                          <span>{level}</span>
                          <strong>{counts[level]}</strong>
                        </button>
                      ))}
                    </div>

                    <div className="audit-filter-row">
                      <label htmlFor="audit-severity-filter">
                        Filter by severity
                      </label>

                      <select
                        id="audit-severity-filter"
                        value={severityFilter}
                        onChange={(event) =>
                          setSeverityFilter(event.target.value)
                        }
                      >
                        <option value="all">All severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <span>
                        {filteredIssues.length} of {issues.length} issues
                      </span>
                    </div>

                    {filteredIssues.length === 0 ? (
                      <div className="audit-no-results">
                        <h3>No matching issues</h3>
                        <p>Try selecting another severity level.</p>
                      </div>
                    ) : (
                      filteredIssues.map((issue, index) => {
                        const severity = severityClass(issue.severity);

                        return (
                          <article
                            className="audit-issue"
                            key={issue.id ?? `${issue.title}-${index}`}
                          >
                            <div
                              className={`audit-issue-marker ${severity}`}
                            />

                            <div className="audit-issue-main">
                              <div className="audit-issue-title-row">
                                <h3>{issue.title || "Untitled issue"}</h3>

                                <span
                                  className={`audit-severity-badge ${severity}`}
                                >
                                  {issue.severity || "Low"}
                                </span>
                              </div>

                              <p>
                                {issue.description ||
                                  "No additional description was provided."}
                              </p>

                              {issue.page_url && (
                                <div className="audit-issue-url">
                                  <span aria-hidden="true">↗</span>
                                  {issue.page_url}
                                </div>
                              )}

                              {issue.recommendation && (
                                <div className="audit-suggested-fix">
                                  <strong>Suggested fix</strong>
                                  <p>{issue.recommendation}</p>
                                </div>
                              )}

                              <div className="audit-issue-meta">
                                <span>{issue.category || "General"}</span>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "ai" && (
              <div className="audit-ai-content">
                {!aiData ? (
                  <div className="audit-ai-empty">
                    <div className="audit-ai-sparkle">✦</div>

                    <h3>Turn audit results into an action plan</h3>

                    <p>
                      Generate AI recommendations to understand what to fix
                      first and how to improve your website.
                    </p>

                    <button
                      type="button"
                      className="audit-button audit-button-primary"
                      onClick={loadAI}
                      disabled={loading || !completed}
                    >
                      {loading
                        ? "Generating..."
                        : "Generate recommendations"}
                    </button>

                    {!completed && (
                      <small>
                        Recommendations are available after a completed audit.
                      </small>
                    )}
                  </div>
                ) : (
                  <>
                    {aiData.summary && (
                      <div className="audit-ai-summary">
                        <strong>Summary</strong>
                        <p>{aiData.summary}</p>
                      </div>
                    )}

                    {recommendations.length === 0 ? (
                      <p className="audit-empty-message">
                        No recommendations were returned.
                      </p>
                    ) : (
                      recommendations.map((item, index) => (
                        <article
                          className="audit-recommendation"
                          key={
                            item.issue_id ??
                            `${item.action_title}-${index}`
                          }
                        >
                          <div className="audit-recommendation-header">
                            <span className="audit-recommendation-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <div>
                              <h3>
                                {item.action_title || "Recommended action"}
                              </h3>

                              {item.priority && (
                                <span
                                  className={`audit-severity-badge ${severityClass(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          </div>

                          {item.explanation && <p>{item.explanation}</p>}

                          {Array.isArray(item.steps) &&
                            item.steps.length > 0 && (
                              <ol>
                                {item.steps.map((step, stepIndex) => (
                                  <li key={stepIndex}>{step}</li>
                                ))}
                              </ol>
                            )}

                          {item.example_fix && (
                            <div className="audit-example-fix">
                              <strong>Example fix</strong>
                              <pre>{item.example_fix}</pre>
                            </div>
                          )}
                        </article>
                      ))
                    )}
                  </>
                )}
              </div>
            )}

            <div className="audit-panel-footer">
              <span>
                Report ID: {getReportId(report) ?? "Unavailable"}
              </span>

              <span>Results are based on the latest report data.</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
