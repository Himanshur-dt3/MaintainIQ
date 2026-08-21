import { requireRole } from "@/src/server/auth/guards";
import { listTechnicianReviews } from "@/src/server/services/reviews";

export default async function TechnicianReviewsPage() {
  const session = await requireRole("TECHNICIAN");

  const reviews = await listTechnicianReviews(session.user.id);

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 ring-1 ring-amber-500/30">
            Reporter Feedback
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold text-white">
            My Reviews
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Feedback from reporters about your completed maintenance work.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Reviews Received
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {reviews.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Average Rating
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {average.toFixed(1)} / 5
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-display text-xl font-bold text-white">
          Reporter Feedback
        </h2>

        <div className="mt-5 space-y-4">
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              No reporter reviews yet.
            </p>
          ) : (
            reviews.map((review) => (
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
                      From: {review.reporter.name}
                    </p>

                    <p className="text-xs text-slate-600">
                      {review.ticket.location}
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
