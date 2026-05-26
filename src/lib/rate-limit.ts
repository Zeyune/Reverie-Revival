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

const normalizeIp = (value: string | null) => {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();
  return first || null;
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

  const ipAddress = isOnion
    ? null
    : normalizeIp(
        [
          request.headers.get("x-forwarded-for"),
          request.headers.get("x-real-ip"),
          request.headers.get("cf-connecting-ip"),
          request.headers.get("fly-client-ip"),
          request.headers.get("fastly-client-ip"),
        ].find(Boolean) ?? null
      );

  return {
    host,
    ipAddress,
    isOnion,
  };
}

export function buildNetworkRateLimitRules(
  context: RequestRateLimitContext,
  extraKeys: string[] = []
) {
  const rules: RateLimitRule[] = [
    { key: `host:${cleanKey(context.host)}`, limit: Infinity },
  ];

  if (context.ipAddress) {
    rules.push({ key: `ip:${context.ipAddress}`, limit: Infinity });
  }

  for (const extraKey of extraKeys) {
    if (!extraKey) {
      continue;
    }

    rules.push({ key: cleanKey(extraKey), limit: Infinity });
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
