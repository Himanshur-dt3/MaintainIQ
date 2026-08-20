"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

interface LoginFormProps {
  callbackUrl: string;
}

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@maintainiq.demo" },
  { label: "Technician", email: "technician@maintainiq.demo" },
  { label: "Reporter", email: "reporter@maintainiq.demo" },
] as const;

/**
 * Provides the accessible interactive credentials form for MaintainIQ.
 *
 * @param callbackUrl - Safe in-app route to open after a successful sign-in.
 * @returns A credentials form with meaningful error and loading feedback.
 */
export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMessage("The email address or password is incorrect.");
        return;
      }

      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setErrorMessage(
        "We could not sign you in right now. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage ? (
        <p
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className="flex w-full justify-center rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sky-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <aside className="rounded-md border border-sky-100 bg-sky-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Development demo accounts</p>
        <ul className="mt-2 space-y-1">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <span className="font-medium">{account.label}:</span> {account.email}
            </li>
          ))}
        </ul>
        <p className="mt-2">Password: <code>MaintainIQDemo!2026</code></p>
      </aside>
    </form>
  );
}
