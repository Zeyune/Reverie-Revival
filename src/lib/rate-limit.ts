import { prisma } from "@/lib/prisma";

const ADMIN_LOGIN_ACTION = "admin-login";

type RateLimitRule = {
  key: string;
  limit: number;
};

type RateLimitStatus =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

type RateLimitWindow = {
  action: string;
  windowMs: number;
  blockMs: number;
};

export type RequestRateLimitContext = {
  host: string;
  ipAddress: string | null;
  isOnion: boolean;
};

type AdminLoginContext = {
  email: string;
  host: string;
  ipAddress: string | null;
};

const cleanKey = (value: string) => value.trim().toLowerCase();

/**
 * Single-value headers written by the edge itself. A client can set them, but
 * the platform overwrites them before we see the request, so they can't be
 * forged. Checked ahead of X-Forwarded-For.
 */
const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "fly-client-ip",
  "fastly-client-ip",
  "x-real-ip",
] as const;

/**
 * X-Forwarded-For is `client, proxy1, proxy2, ...` — each hop APPENDS the
 * address it saw the connection come from. Everything to the left of our own
 * edge's entry was supplied by the caller.
 *
 * Take the rightmost entry, never the leftmost. Trusting the leftmost lets a
 * client rotate `X-Forwarded-For: 1.2.3.4` per request so the `ip:` bucket
 * never accumulates, and lets them pin a *victim's* IP to burn that victim's
 * quota and lock them out.
 *
 * Rightmost is correct for exactly one trusted proxy in front of the app, which
 * is our deployment (Vercel). Behind N proxies this needs to be the Nth entry
 * from the right instead.
 */
const normalizeIp = (value: string | null) => {
  if (!value) {
    return null;
  }

  const hops = value
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  return hops.at(-1) ?? null;
};

const resolveClientIp = (request: Request) => {
  for (const header of TRUSTED_IP_HEADERS) {
    const value = request.headers.get(header);
    if (value?.trim()) {
      return normalizeIp(value);
    }
  }

  return normalizeIp(request.headers.get("x-forwarded-for"));
};

const summarizeResults = (results: RateLimitStatus[]) => {
  const blockedResults = results.filter(
    (result): result is Extract<RateLimitStatus, { allowed: false }> =>
      !result.allowed
  );

  if (blockedResults.length === 0) {
    return { allowed: true as const };
  }

  return {
    allowed: false as const,
    retryAfterMs: Math.max(
      ...blockedResults.map((result) => result.retryAfterMs)
    ),
  };
};

async function getBucketStatus(
  action: string,
  rule: RateLimitRule
): Promise<RateLimitStatus> {
  if (!prisma) {
    return { allowed: true };
  }

  const now = new Date();
  const existing = await prisma.rateLimitBucket.findUnique({
    where: {
      action_key: {
        action,
        key: rule.key,
      },
    },
  });

  if (!existing || !existing.blockedUntil || existing.blockedUntil <= now) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterMs: existing.blockedUntil.getTime() - now.getTime(),
  };
}

async function recordBucketHit(
  config: RateLimitWindow,
  rule: RateLimitRule
): Promise<RateLimitStatus> {
  if (!prisma) {
    return { allowed: true };
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimitBucket.findUnique({
      where: {
        action_key: {
          action: config.action,
          key: rule.key,
        },
      },
    });

    if (!existing) {
      await tx.rateLimitBucket.create({
        data: {
          action: config.action,
          key: rule.key,
          attempts: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
        },
      });
      return { allowed: true } as const;
    }

    if (existing.blockedUntil && existing.blockedUntil > now) {
      return {
        allowed: false as const,
        retryAfterMs: existing.blockedUntil.getTime() - now.getTime(),
      };
    }

    const windowExpired =
      now.getTime() - existing.windowStartedAt.getTime() >= config.windowMs;
    const attempts = windowExpired ? 1 : existing.attempts + 1;
    const blockedUntil =
      attempts > rule.limit ? new Date(now.getTime() + config.blockMs) : null;

    await tx.rateLimitBucket.update({
      where: { id: existing.id },
      data: {
        attempts,
        windowStartedAt: windowExpired ? now : existing.windowStartedAt,
        lastAttemptAt: now,
        blockedUntil,
      },
    });

    if (blockedUntil) {
      return {
        allowed: false as const,
        retryAfterMs: blockedUntil.getTime() - now.getTime(),
      };
    }

    return { allowed: true } as const;
  });
}

export function getRequestRateLimitContext(request: Request): RequestRateLimitContext {
  const host = request.headers.get("host")?.trim().toLowerCase() ?? "unknown";
  const isOnion = host.endsWith(".onion");

  const ipAddress = isOnion ? null : resolveClientIp(request);

  return {
    host,
    ipAddress,
    isOnion,
  };
}

/**
 * Fallback limits, used when a caller doesn't override them.
 *
 * These used to be Infinity, which made the whole limiter opt-in: a caller that
 * forgot to `.map()` an override got no limiting at all and no warning. The
 * defaults below fail closed instead.
 *
 * They're per-rule-type on purpose. A single global default can't work: every
 * request to the site shares the one `host:` key, so a default tight enough to
 * be useful for `ip:` would take the whole site down.
 */
const DEFAULT_LIMITS = {
  /** Coarse last-resort ceiling — every request shares this key. */
  host: 1000,
  /** Per-client. Callers doing anything expensive should lower this. */
  ip: 60,
  /** Caller-supplied keys (email, session, …) — usually the tightest. */
  extra: 30,
} as const;

export function buildNetworkRateLimitRules(
  context: RequestRateLimitContext,
  extraKeys: string[] = []
) {
  const rules: RateLimitRule[] = [
    { key: `host:${cleanKey(context.host)}`, limit: DEFAULT_LIMITS.host },
  ];

  if (context.ipAddress) {
    rules.push({ key: `ip:${context.ipAddress}`, limit: DEFAULT_LIMITS.ip });
  }

  for (const extraKey of extraKeys) {
    if (!extraKey) {
      continue;
    }

    rules.push({ key: cleanKey(extraKey), limit: DEFAULT_LIMITS.extra });
  }

  return rules;
}

export async function getRateLimitStatus(
  action: string,
  rules: RateLimitRule[]
) {
  const results = await Promise.all(
    rules.map((rule) => getBucketStatus(action, rule))
  );
  return summarizeResults(results);
}

export async function recordRateLimitHit(
  config: RateLimitWindow,
  rules: RateLimitRule[]
) {
  const results = await Promise.all(
    rules.map((rule) => recordBucketHit(config, rule))
  );
  return summarizeResults(results);
}

function withLimit(rule: RateLimitRule, limit: number): RateLimitRule {
  return {
    ...rule,
    limit,
  };
}

const buildLoginRules = ({
  email,
  host,
  ipAddress,
}: AdminLoginContext): RateLimitRule[] => {
  const normalizedEmail = cleanKey(email);
  const baseRules = buildNetworkRateLimitRules(
    { host, ipAddress, isOnion: host.endsWith(".onion") },
    [`email:${normalizedEmail}`, `host-email:${host}:${normalizedEmail}`]
  );

  return baseRules.map((rule) => {
    if (rule.key.startsWith("host-email:")) {
      return withLimit(rule, 5);
    }
    if (rule.key.startsWith("email:")) {
      return withLimit(rule, 5);
    }
    if (rule.key.startsWith("ip:")) {
      return withLimit(rule, 10);
    }
    return withLimit(rule, 30);
  });
};

export async function getAdminLoginRateLimitStatus(context: AdminLoginContext) {
  return getRateLimitStatus(ADMIN_LOGIN_ACTION, buildLoginRules(context));
}

export async function recordAdminLoginFailure(context: AdminLoginContext) {
  return recordRateLimitHit(
    {
      action: ADMIN_LOGIN_ACTION,
      windowMs: 15 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    },
    buildLoginRules(context)
  );
}

export async function clearAdminLoginRateLimit(context: AdminLoginContext) {
  if (!prisma) {
    return;
  }

  const rules = buildLoginRules(context);

  await prisma.rateLimitBucket.deleteMany({
    where: {
      action: ADMIN_LOGIN_ACTION,
      key: { in: rules.map((rule) => rule.key) },
    },
  });
}
