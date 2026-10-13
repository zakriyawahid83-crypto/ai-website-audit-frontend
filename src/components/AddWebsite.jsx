
import { useState } from "react";
import { addWebsite } from "../services/websiteService";

export default function AddWebsite({ onAdded }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanUrl = url.trim();

    if (!/^https?:\/\/.+\..+/.test(cleanUrl)) {
      setError("Valid URL enter karein, jaise https://example.com");
      return;
    }

    setLoading(true);

    try {
      await addWebsite({
        name: name.trim() || cleanUrl,
        url: cleanUrl,
      });

      setName("");
      setUrl("");
      setSuccess("Website successfully add ho gayi!");

      if (onAdded) await onAdded();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Website add nahi ho saki. Login aur backend check karein."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.card}>
      <h2>Add Website</h2>
      <p style={styles.muted}>
        Website register karein, phir uska SEO audit run karein.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="website-name">Website name</label>
        <input
          id="website-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My Business Website"
          style={styles.input}
        />

        <label htmlFor="website-url">Website URL</label>
        <input
          id="website-url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          style={styles.input}
        />

        <button disabled={loading} style={styles.button}>
          {loading ? "Adding..." : "Add Website"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
    </section>
  );
}

const styles = {
  card: {
    padding: "24px",
    marginBottom: "22px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#fff",
  },
  muted: { color: "#64748b", lineHeight: 1.6 },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    margin: "8px 0 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
  },
  button: {
    padding: "12px 18px",
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: "8px",
    cursor: "pointer",
  },
  error: { color: "#b91c1c" },
  success: { color: "#15803d" },
};