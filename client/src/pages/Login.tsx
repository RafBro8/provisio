import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link, type Location } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { AuthCard } from "../components/AuthCard";
import { ErrorNote } from "../components/ui";
import { FIELD_CLASS, SOLID_BUTTON } from "../lib/styles";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      intro="Log in to see your bookings and book your next session."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-ink underline underline-offset-2 dark:text-ink-dark">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={isSubmitting} className={`mt-1 ${SOLID_BUTTON}`}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
