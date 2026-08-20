"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

interface LoginFormProps {
  callbackUrl: string;
}

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@maintainiq.demo", roleColor: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30" },
  { label: "Technician", email: "technician@maintainiq.demo", roleColor: "from-indigo-500/20 to-sky-500/20 text-indigo-300 border-indigo-500/30" },
  { label: "Reporter", email: "reporter@maintainiq.demo", roleColor: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30" },
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="email">
          Email address
        </label>
        <div className="relative">
          <input
            autoComplete="email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@maintainiq.demo"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            required
            type="password"
            value={password}
          />
        </div>
      </div>

      {errorMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-300 backdrop-blur-md"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        className="flex w-full min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition duration-300 hover:shadow-sky-500/40 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </span>
        ) : (
          "Sign in to Dashboard"
        )}
      </button>

      <div className="pt-2">
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-800" />
          <span className="absolute bg-slate-900 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Demo Login
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword("MaintainIQDemo!2026");
                setErrorMessage(null);
              }}
              className={`group flex items-center justify-between rounded-xl border bg-gradient-to-r px-4 py-2.5 text-left text-xs font-semibold transition duration-200 hover:scale-[1.01] hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${account.roleColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-current" />
                <span>{account.label}</span>
              </div>
              <span className="text-[11px] opacity-70 group-hover:opacity-100">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
