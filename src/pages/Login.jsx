import { useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/errorMessage";

export default function Login({
  onLogin,
  onRegister,
  registrationSuccess = false,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const body = new URLSearchParams();
      body.append("username", email.trim());
      body.append("password", password);

      const { data } = await api.post("/auth/login", body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const token = data?.access_token || data?.token;

      if (!token) {
        throw new Error(
          "Login response mein access token nahi mila. Backend login endpoint check karo."
        );
      }

      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;

      const authKeys = [
        "access_token",
        "token",
        "token_type",
        "user_id",
        "role",
        "refresh_token",
      ];

      authKeys.forEach((key) => {
        otherStorage.removeItem(key);
      });

      // Dono token key names support karte hain.
      storage.setItem("access_token", token);
      storage.setItem("token", token);

      storage.setItem("token_type", data?.token_type || "bearer");

      if (data?.user_id != null) {
        storage.setItem("user_id", String(data.user_id));
      } else if (data?.user?.id != null) {
        storage.setItem("user_id", String(data.user.id));
      }

      if (data?.role) {
        storage.setItem("role", data.role);
      } else if (data?.user?.role) {
        storage.setItem("role", data.user.role);
      }

      if (typeof onLogin === "function") {
        onLogin();
      } else {
        setError("Login successful, lekin App.jsx ka onLogin callback missing hai.");
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Login failed. Email aur password check karo.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark">WA</div>

        <p className="eyebrow">WEBSITE INTELLIGENCE</p>

        <h1>Welcome back</h1>

        <p className="muted">
          Sign in to manage your website audits.
        </p>

        {registrationSuccess && (
          <div className="success-alert" role="status">
            Account created successfully! Please sign in.
          </div>
        )}

        {error && (
          <div className="alert" role="alert">
            {String(error)}
          </div>
        )}

        <label htmlFor="login-email">Email</label>

        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label htmlFor="login-password">Password</label>

        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>

        <button
          type="submit"
          className="btn btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="auth-footer">
          Don't have an account?{" "}
          <button
            type="button"
            className="text-button"
            onClick={onRegister}
          >
            Create account
          </button>
        </p>
      </form>
    </main>
  );
}
