import { useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/errorMessage";

export default function Register({ onLogin, onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: cleanName,
        email: cleanEmail,
        password,
      });

      setSuccess("Account created successfully. You can now sign in.");

      // App.jsx ke callback ke mutabiq Login page par wapas jao.
      if (typeof onRegister === "function") {
        onRegister();
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark">WA</div>

        <p className="eyebrow">GET STARTED</p>

        <h1>Create account</h1>

        <p className="muted">
          Start analyzing and optimizing your website.
        </p>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-alert" role="status">
            {success}
          </div>
        )}

        <label htmlFor="register-name">Full name</label>

        <input
          id="register-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          required
        />

        <label htmlFor="register-email">Email</label>

        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label htmlFor="register-password">Password</label>

        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <button
          type="submit"
          className="btn btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="auth-footer">
          Already have an account?{" "}
          <button
            type="button"
            className="text-button"
            onClick={onLogin}
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </form>
    </main>
  );
}
