import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import type { UserRole } from "../api/types";
import { AuthCard } from "../components/AuthCard";
import { ErrorNote } from "../components/ui";
import { FIELD_CLASS, SOLID_BUTTON } from "../lib/styles";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    // The `minLength` attribute on the password input covers real browsers,
    // but isn't a substitute for an explicit check here — form-level
    // constraint validation can be bypassed (or, as discovered while adding
    // this component's tests, isn't enforced consistently in every
    // environment), so the same rule the backend enforces is checked here too.
    if (password.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password, role });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      intro="Book sessions with providers, or offer your own services."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2 dark:text-ink-dark">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} />
        </label>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-2 font-medium">I am a</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-rule px-3.5 py-3 text-muted transition-colors hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:text-ink dark:border-rule-dark dark:text-muted-dark dark:hover:border-ink-dark/40 dark:has-[:checked]:border-ink-dark dark:has-[:checked]:text-ink-dark">
            <input
              type="radio"
              name="role"
              value="customer"
              checked={role === "customer"}
              onChange={() => setRole("customer")}
              className="accent-brand"
            />
            Customer, looking to book appointments
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-rule px-3.5 py-3 text-muted transition-colors hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:text-ink dark:border-rule-dark dark:text-muted-dark dark:hover:border-ink-dark/40 dark:has-[:checked]:border-ink-dark dark:has-[:checked]:text-ink-dark">
            <input
              type="radio"
              name="role"
              value="provider"
              checked={role === "provider"}
              onChange={() => setRole("provider")}
              className="accent-brand"
            />
            Provider, offering services
          </label>
        </fieldset>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={isSubmitting} className={`mt-1 ${SOLID_BUTTON}`}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
