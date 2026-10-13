
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./AuditReport.css";

const API_URL = "http://127.0.0.1:8000";

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token");

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const severityLabel = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function StatCard({ label, value, description }) {
  return (
    <div className="audit-stat-card">
      <p className="audit-muted">{label}</p>
      <h2>{value}</h2>
      <span>{description}</span>
    </div>
  );
}

export default function AuditReport() {
  const { auditId } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!auditId || !/^\d+$/.test(auditId)) {
      setError("Invalid audit ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/audits/${auditId}/report`
      );

      setReport(response.data);
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        setError("Please log in again to view this report.");
      } else if (status === 404) {
        setError(
          "Audit not found. Check the audit ID and your account."
        );
      } else {
        setError(
          err.response?.data?.detail ||
          "Unable to load the audit report."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const filteredIssues = useMemo(() => {
    if (!report?.issues) return [];

    return report.issues.filter((issue) => {
      const categoryMatches =
        category === "all" || issue.category === category;

      const severityMatches =
        severity === "all" || issue.severity === severity;

      return categoryMatches && severityMatches;
    });
  }, [report, category, severity]);

  async function generateAIRecommendations() {
    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const response = await api.post(
        `/audits/${auditId}/ai-recommendations`
      );

      setAiResult(response.data);
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
        "Could not generate AI recommendations. Please try again."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadCSV() {
    setDownloadLoading(true);

    try {
      const response = await api.get(
        `/audits/${auditId}/report.csv`,
        { responseType: "blob" }
      );

      const blobUrl = URL.createObjectURL(
        new Blob([response.data], { type: "text/csv;charset=utf-8;" })
      );

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `audit_report_${auditId}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "CSV download failed. Please try again."
      );
    } finally {
      setDownloadLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="audit-page">
        <div className="audit-message">
          Loading audit report...
        </div>
      </main>
    );
  }

  if (error && !report) {
    return (
      <main className="audit-page">
        <div className="audit-error">
          <h2>Unable to load report</h2>
          <p>{error}</p>
          <button onClick={loadReport}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!report) return null;

  const score = Number(report.overall_score ?? 0);
  const severityCounts = report.severity_counts || {};
  const categoryCounts = report.category_counts || {};

  return (
    <main className="audit-page">
      <header className="audit-header">
        <div>
          <p className="audit-eyebrow">WEBSITE ANALYTICS</p>
          <h1>Audit Report</h1>
          <p className="audit-muted">
            Review your website's SEO, content and technical issues.
          </p>
        </div>

        <div className="audit-header-actions">
          <button
            className="audit-button audit-button-secondary"
            onClick={loadReport}
          >
            Refresh
          </button>

          <button
            className="audit-button audit-button-primary"
            onClick={downloadCSV}
            disabled={downloadLoading}
          >
            {downloadLoading ? "Downloading..." : "Download CSV"}
          </button>
        </div>
      </header>

      {error && (
        <div className="audit-inline-error" role="alert">
          {error}
        </div>
      )}

      <section className="audit-website-card">
        <div>
          <p className="audit-muted">Audited website</p>
          <a
            href={report.website_url}
            target="_blank"
            rel="noreferrer"
          >
            {report.website_url}
          </a>
        </div>

        <span
          className={`audit-status audit-status-${report.status}`}
        >
          {report.status}
        </span>
      </section>

      <section className="audit-overview">
        <div className="audit-score-card">
          <p className="audit-muted">Overall score</p>

          <div
            className="audit-score-circle"
            style={{
              "--score-angle": `${Math.max(0, Math.min(100, score)) * 3.6}deg`,
            }}
            role="img"
            aria-label={`Overall score ${score} out of 100`}
          >
            <div className="audit-score-inner">
              <strong>{report.overall_score ?? "—"}</strong>
              <span>/ 100</span>
            </div>
          </div>

          <h3>
            {score >= 80
              ? "Good performance"
              : score >= 60
              ? "Needs improvement"
              : "Needs attention"}
          </h3>

          <p className="audit-muted">
            Report created: {formatDate(report.created_at)}
          </p>
        </div>

        <div className="audit-stats-grid">
          <StatCard
            label="Total issues"
            value={report.issues_found ?? 0}
            description="Issues detected"
          />

          <StatCard
            label="High severity"
            value={severityCounts.high ?? 0}
            description="Review first"
          />

          <StatCard
            label="Medium severity"
            value={severityCounts.medium ?? 0}
            description="Needs attention"
          />

          <StatCard
            label="Low severity"
            value={severityCounts.low ?? 0}
            description="Improvement opportunities"
          />
        </div>
      </section>

      <section className="audit-section">
        <div className="audit-section-heading">
          <div>
            <h2>Issues by category</h2>
            <p className="audit-muted">
              Understand which areas need the most work.
            </p>
          </div>
        </div>

        <div className="audit-category-grid">
          {Object.entries(categoryCounts).length === 0 ? (
            <p>No category issues found.</p>
          ) : (
            Object.entries(categoryCounts).map(([name, count]) => (
              <button
                key={name}
                className={`audit-category-card ${
                  category === name ? "selected" : ""
                }`}
                onClick={() =>
                  setCategory(category === name ? "all" : name)
                }
              >
                <span>{name.replaceAll("_", " ")}</span>
                <strong>{count}</strong>
                <small>issues</small>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="audit-section">
        <div className="audit-section-heading">
          <div>
            <h2>Detected issues</h2>
            <p className="audit-muted">
              Review each issue and its recommended fix.
            </p>
          </div>

          <span className="audit-issue-count">
            {filteredIssues.length} issues
          </span>
        </div>

        <div className="audit-filters">
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {Object.keys(categoryCounts).map((name) => (
                <option key={name} value={name}>
                  {name.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option value="all">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <button
            className="audit-button audit-button-secondary"
            onClick={() => {
              setCategory("all");
              setSeverity("all");
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="audit-issues-list">
          {filteredIssues.length === 0 ? (
            <div className="audit-empty">
              No issues match these filters.
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <article className="audit-issue-card" key={issue.id}>
                <div className="audit-issue-top">
                  <div>
                    <span className="audit-issue-category">
                      {(issue.category || "other").replaceAll("_", " ")}
                    </span>
                    <h3>{issue.title}</h3>
                  </div>

                  <span
                    className={`audit-severity audit-severity-${issue.severity}`}
                  >
                    {severityLabel[issue.severity] || issue.severity}
                  </span>
                </div>

                <p>{issue.description}</p>

                {issue.evidence && (
                  <div className="audit-evidence">
                    <strong>Evidence:</strong> {issue.evidence}
                  </div>
                )}

                <div className="audit-recommendation">
                  <strong>Recommended fix</strong>
                  <p>{issue.recommendation}</p>
                </div>

                {issue.page_url && (
                  <a
                    className="audit-page-link"
                    href={issue.page_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View audited page ↗
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="audit-ai-section">
        <div>
          <p className="audit-eyebrow">AI-POWERED OPTIMIZATION</p>
          <h2>Get AI recommendations</h2>
          <p>
            Generate actionable suggestions based on the issues found
            in this audit.
          </p>
        </div>

        <button
          className="audit-button audit-button-primary"
          onClick={generateAIRecommendations}
          disabled={aiLoading || report.status !== "completed"}
        >
          {aiLoading ? "Generating..." : "Generate recommendations"}
        </button>

        {aiError && (
          <div className="audit-inline-error" role="alert">
            {aiError}
          </div>
        )}

        {aiResult && (
          <div className="audit-ai-result">
            <h3>AI recommendations</h3>
            <pre>{JSON.stringify(aiResult, null, 2)}</pre>
          </div>
        )}
      </section>

      <footer className="audit-footer">
        Audit ID: {report.audit_id} · Completed:{" "}
        {formatDate(report.completed_at)}
      </footer>
    </main>
  );
}