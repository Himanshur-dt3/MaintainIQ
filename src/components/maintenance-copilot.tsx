"use client";

import { FormEvent, useState } from "react";

type CopilotResult = {
  answer: string;
  evidence: Array<{
    label: string;
    value: string;
  }>;
};

const suggestedQuestions = [
  "Which assets need attention first?",
  "What should we inspect this week?",
  "Which assets have the highest maintenance risk?",
  "Which assets have open critical tickets?",
  "Which technicians have the highest workload?",
  "Which assets have insufficient maintenance history?",
  "Are there any recurring failure patterns?",
  "What should management prioritize?",
];

export function MaintenanceCopilot() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion(value = question) {
    const trimmed = value.trim();

    if (!trimmed || loading) {
      return;
    }

    setQuestion(trimmed);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/maintenance-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = (await response.json()) as
        | CopilotResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Unable to get a Copilot response.",
        );
      }

      setResult(data as CopilotResult);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to get a Copilot response.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion();
  }

  return (
    <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
      <div className="flex flex-col justify-between gap-3 border-b border-[#2d3033] pb-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Maintenance Copilot
          </p>

          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Ask your maintenance data
          </h2>

          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[#686d68]">
            Get evidence-based operational recommendations from your current
            asset and ticket history.
          </p>
        </div>

        <span className="shrink-0 rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#aeb3ae]">
          AI Copilot
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="Ask a maintenance question..."
            className="min-w-0 flex-1 rounded-md border border-[#35393c] bg-[#111416] px-3 py-2.5 text-xs text-[#e6e7e2] outline-none placeholder:text-[#686d68] focus:border-[#70756f]"
          />

          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="rounded-md border border-[#4a4e4b] bg-[#e6e7e2] px-5 py-2.5 text-xs font-bold text-[#151819] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Ask Copilot"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={loading}
            onClick={() => void askQuestion(suggestion)}
            className="rounded-md border border-[#303438] bg-[#202326] px-2.5 py-1.5 text-[10px] text-[#929792] transition hover:border-[#505552] hover:text-[#d8d9d4] disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-lg border border-[#303438] bg-[#151819] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
              Copilot Response
            </p>

            <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-[#d8d9d4]">
              {result.answer}
            </p>
          </div>

          {result.evidence.length > 0 ? (
            <div className="rounded-lg border border-[#303438] bg-[#151819] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#686d68]">
                Supporting Signals
              </p>

              <div className="mt-3 space-y-2">
                {result.evidence.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 border-b border-[#292d2f] pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-[10px] text-[#777c77]">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold text-[#d8d9d4]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
