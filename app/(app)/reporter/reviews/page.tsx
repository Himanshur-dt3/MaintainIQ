import { requireRole } from "@/src/server/auth/guards";
import { listReporterReviews } from "@/src/server/services/reviews";
import { listTicketsForActor } from "@/src/server/services/tickets";
import { ReporterReviewForm } from "@/src/components/reporter-review-form";

export default async function ReporterReviewsPage() {
  const session = await requireRole("REPORTER");

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const [tickets, reviews] = await Promise.all([
    listTicketsForActor(actor),
    listReporterReviews(session.user.id),
  ]);

  const reviewedTicketIds = new Set(reviews.map((review) => review.ticketId));

  const reviewableTickets = tickets.filter(
    (ticket) =>
      ticket.status === "RESOLVED" &&
      ticket.technician &&
      !reviewedTicketIds.has(ticket.id),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10">
          <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 ring-1 ring-amber-500/30">
            Technician Feedback
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold text-white">
            Reviews
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Rate the technician who resolved your maintenance issue and share
            feedback about the service you received.
          </p>
        </div>
      </section>

      {reviewableTickets.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Awaiting Your Feedback
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              Rate a Technician
            </h2>
          </div>

          <div className="space-y-4">
            {reviewableTickets.map((ticket) => (
              <ReporterReviewForm
                key={ticket.id}
                ticketId={ticket.id}
                ticketTitle={ticket.title}
                location={ticket.location}
                technicianName={ticket.technician?.name ?? "Technician"}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            Your Feedback
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">
            Submitted Reviews
          </h2>
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-500">
            You have not submitted any technician reviews yet.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-white">
                      {review.ticket.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Technician: {review.technician.name} · {review.ticket.location}
                    </p>
                  </div>

                  <div className="text-lg tracking-widest text-amber-400">
                    {"★".repeat(review.rating)}
                    <span className="text-slate-700">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </div>
                </div>

                {review.comment ? (
                  <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
                    “{review.comment}”
                  </p>
                ) : null}

                <p className="mt-3 text-[10px] text-slate-600">
                  {new Date(review.createdAt).toLocaleString("en-US")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
