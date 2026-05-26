import { prisma } from "@/lib/prisma";

type ReverieRecord = {
  id: string;
  title: string;
  mood: string | null;
  reflection: string;
  createdAt: Date;
};

async function loadReveries() {
  if (!prisma) {
    return { ready: false, entries: [] as ReverieRecord[] };
  }

  try {
    const entries = await prisma.reverie.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return { ready: true, entries };
  } catch (error) {
    console.error("Failed to load reveries from the database.", error);
    return { ready: false, entries: [] as ReverieRecord[] };
  }
}

const setupSteps = [
  {
    title: "1) Add your Supabase connection string",
    detail:
      "Copy the URI from Supabase (Settings -> Database -> Connection string -> URI) into .env. Keep DIRECT_URL the same value for migration speed.",
    code: `DATABASE_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"`,
  },
  {
    title: "2) Sync the Prisma schema",
    detail: "Push the schema to Postgres and generate the Prisma Client.",
    code: "npm run prisma:push && npm run prisma:generate",
  },
  {
    title: "3) Explore your data",
    detail: "Open Prisma Studio to view and edit reveries without SQL.",
    code: "npm run prisma:studio",
  },
];

export default async function StarterPage() {
  const { ready, entries } = await loadReveries();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 md:px-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Reverie Revival
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            A Next.js + Prisma starter tuned for Supabase Postgres.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Wire up your database, ship your first model, and start capturing
            the moments worth reviving. Everything below walks you through the
            initial handoff.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="col-span-2 space-y-4 rounded-2xl bg-slate-900/60 p-6 ring-1 ring-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reveries</h2>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {ready ? "Connected" : "Waiting for DATABASE_URL"}
              </span>
            </div>
            {ready && entries.length === 0 && (
              <p className="text-slate-400">
                Connected! Add your first entry via Prisma Studio or an API
                route.
              </p>
            )}
            {!ready && (
              <p className="text-slate-400">
                No database connection yet. Drop your Supabase connection string
                into <span className="font-mono">.env</span> and push the schema
                to see live data here.
              </p>
            )}
            {entries.length > 0 && (
              <ul className="space-y-4">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/5 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{entry.title}</div>
                      {entry.mood && (
                        <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-200">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {entry.reflection}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="space-y-4 rounded-2xl bg-emerald-500/10 p-6 ring-1 ring-emerald-500/30">
            <h2 className="text-xl font-semibold text-emerald-100">
              Quick status
            </h2>
            <ul className="space-y-3 text-sm text-emerald-50">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Next.js App Router with Tailwind ready
              </li>
              <li className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    ready ? "bg-emerald-400" : "bg-amber-300"
                  }`}
                />
                Prisma client {ready ? "connected" : "awaiting configuration"}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Supabase-ready Postgres schema for Reveries
              </li>
            </ul>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-sm text-emerald-50">
              Need a first interaction? After pushing the schema, open{" "}
              <span className="font-mono">npm run prisma:studio</span> and add a
              few reveries to watch them render here.
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {setupSteps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/5"
            >
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{step.detail}</p>
              <pre className="mt-3 overflow-auto rounded-lg bg-black/60 p-3 text-xs text-slate-100">
                <code>{step.code}</code>
              </pre>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
