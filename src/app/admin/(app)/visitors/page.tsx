import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";
import { Select } from "@/app/admin/(app)/_components/ui/Select";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const formatDate = (value: Date) =>
  value.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatLocation = ({
  country,
  region,
  city,
  network,
}: {
  country: string | null;
  region: string | null;
  city: string | null;
  network: string;
}) => {
  if (network === "tor-hidden-service") {
    return "Unavailable on .onion";
  }

  const parts = [city, region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
};

const formatPage = (page: string, pageData: string | null) =>
  pageData ? `${page} (${pageData})` : page;

const formatSession = (sessionId: string | null) =>
  sessionId ? `${sessionId.slice(0, 8)}...` : "Unknown";

const buildTopList = (values: string[], emptyLabel: string) => {
  const counts = values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))
    .concat(counts.size === 0 ? [{ label: emptyLabel, count: 0 }] : []);
};

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams?: { network?: string } | Promise<{ network?: string }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const db = prisma;
  const resolvedSearchParams = (await searchParams) ?? {};
  const networkFilter = resolvedSearchParams.network ?? "all";
  const where: Prisma.VisitorLogWhereInput =
    networkFilter === "all"
      ? {}
      : {
          network: networkFilter,
        };

  const [visits, totalVisits, uniqueSessions, uniqueIps, onionVisits] = await Promise.all([
    db.visitorLog.findMany({
      where,
      orderBy: { visitedAt: "desc" },
      take: 250,
    }),
    db.visitorLog.count({ where }),
    db.visitorLog.findMany({
      where: {
        ...where,
        sessionId: { not: null },
      },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
    db.visitorLog.findMany({
      where: {
        ...where,
        ipAddress: { not: null },
      },
      select: { ipAddress: true },
      distinct: ["ipAddress"],
    }),
    db.visitorLog.count({
      where: {
        ...where,
        network: "tor-hidden-service",
      },
    }),
  ]);
  const topPages = buildTopList(
    visits.map((visit) => formatPage(visit.page, visit.pageData)),
    "No page data yet"
  );
  const topHosts = buildTopList(
    visits.map((visit) => visit.host ?? "Unknown"),
    "No host data yet"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          VISITORS
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/60">
          Tracks storefront page views. On the onion site, Tor hides the
          visitor&apos;s real IP address and real-world location from your
          server, so those fields will stay unavailable.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-4 rounded-xl border border-white/10 bg-[#121214] p-5 lg:grid-cols-[1fr_auto]"
      >
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">
            NETWORK FILTER
          </label>
          <Select name="network" defaultValue={networkFilter}>
            <option value="all">All traffic</option>
            <option value="tor-hidden-service">Tor hidden service</option>
            <option value="forwarded-ip">Trackable IP</option>
            <option value="unknown">Unknown</option>
          </Select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-white/70 transition-colors hover:border-white/60 hover:text-white"
          >
            APPLY FILTER
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">TOTAL VIEWS</p>
          <p className="mt-3 text-2xl">{totalVisits}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">
            UNIQUE SESSIONS
          </p>
          <p className="mt-3 text-2xl">{uniqueSessions.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">
            TRACKABLE IPS
          </p>
          <p className="mt-3 text-2xl">{uniqueIps.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">
            TOR HIDDEN SERVICE
          </p>
          <p className="mt-3 text-2xl">{onionVisits}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <h2 className="text-sm tracking-[0.2em] text-white/70">
            HOT PAGES
          </h2>
          <div className="mt-4 space-y-3">
            {topPages.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-b-0"
              >
                <span className="truncate text-white/80">{entry.label}</span>
                <span className="text-white/50">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <h2 className="text-sm tracking-[0.2em] text-white/70">
            ACTIVE HOSTS
          </h2>
          <div className="mt-4 space-y-3">
            {topHosts.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-b-0"
              >
                <span className="truncate text-white/80">{entry.label}</span>
                <span className="text-white/50">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Page</TH>
              <TH>Path</TH>
              <TH>Session</TH>
              <TH>Network</TH>
              <TH>IP</TH>
              <TH>Location</TH>
              <TH>Referrer</TH>
              <TH>Host</TH>
            </TR>
          </THead>
          <TBody>
            {visits.map((visit) => (
              <TR key={visit.id}>
                <TD className="text-xs text-white/50">
                  {formatDate(visit.visitedAt)}
                </TD>
                <TD>{formatPage(visit.page, visit.pageData)}</TD>
                <TD className="max-w-xs truncate text-xs text-white/50">
                  {visit.path ?? "/"}
                </TD>
                <TD className="font-mono text-xs text-white/70">
                  {formatSession(visit.sessionId)}
                </TD>
                <TD className="uppercase text-white/70">{visit.network}</TD>
                <TD className="font-mono text-xs text-white/70">
                  {visit.ipAddress ?? "Hidden / Unknown"}
                </TD>
                <TD className="text-sm text-white/70">
                  {formatLocation(visit)}
                </TD>
                <TD className="max-w-xs truncate text-xs text-white/50">
                  {visit.referrer ?? "Direct / Unknown"}
                </TD>
                <TD className="max-w-xs truncate text-xs text-white/50">
                  {visit.host ?? "Unknown"}
                </TD>
              </TR>
            ))}
            {visits.length === 0 && (
              <TR>
                <TD colSpan={9} className="py-6 text-center text-white/40">
                  No visitor logs yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
