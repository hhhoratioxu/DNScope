'use strict';

const dns = require('node:dns');
const os = require('node:os');
const net = require('node:net');
const { domainToASCII } = require('node:url');
const { performance } = require('node:perf_hooks');

const { Resolver } = dns.promises;

const DEFAULT_DNS_SERVERS = Object.freeze([
  { id: 'system', name: 'System DNS', address: 'system', region: 'Local' },
  { id: 'alidns', name: 'AliDNS', address: '223.5.5.5', region: 'CN' },
  { id: 'dnspod', name: 'DNSPod', address: '119.29.29.29', region: 'CN' },
  { id: 'cloudflare', name: 'Cloudflare', address: '1.1.1.1', region: 'Global' },
  { id: 'google', name: 'Google DNS', address: '8.8.8.8', region: 'Global' },
  { id: 'quad9', name: 'Quad9', address: '9.9.9.9', region: 'Global' },
]);

const ERROR_MESSAGES = Object.freeze({
  ETIMEOUT: 'Query timed out',
  ENOTFOUND: 'Domain not found',
  ENODATA: 'No record returned',
  ESERVFAIL: 'Resolver failed to answer',
  EREFUSED: 'Query refused',
  ECONNREFUSED: 'Connection refused',
  ECANCELLED: 'Query cancelled',
});

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeDomain(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Domain must be a string');
  }

  const normalized = input.trim().replace(/\.+$/, '');
  const ascii = domainToASCII(normalized).toLowerCase();

  if (!ascii || ascii.length > 253 || net.isIP(ascii)) {
    throw new TypeError('Enter a valid domain name');
  }

  const labels = ascii.split('.');
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length < 1 ||
        label.length > 63 ||
        !/^[a-z0-9-]+$/.test(label) ||
        label.startsWith('-') ||
        label.endsWith('-'),
    )
  ) {
    throw new TypeError('Enter a valid domain name');
  }

  return ascii;
}

function sanitizeServer(input, index = 0) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('DNS server configuration is invalid');
  }

  const address = String(input.address || '').trim();
  const isSystem = address === 'system';
  if (!isSystem && net.isIP(address) === 0) {
    throw new TypeError(`Invalid DNS server address: ${address || '(empty)'}`);
  }

  const rawName = String(input.name || (isSystem ? 'System DNS' : address)).trim();
  const name = rawName.slice(0, 64) || `Resolver ${index + 1}`;
  const region = String(input.region || (isSystem ? 'Local' : 'Custom')).trim().slice(0, 24);

  return {
    id: String(input.id || `custom-${index}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64),
    name,
    address,
    region,
  };
}

function sanitizeServers(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new TypeError('Select at least one DNS server');
  }

  const seen = new Set();
  return input.slice(0, 12).map(sanitizeServer).filter((server) => {
    const key = server.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createResolver(server) {
  const resolver = new Resolver();
  if (server.address !== 'system') {
    resolver.setServers([server.address]);
  }
  return resolver;
}

function queryWithTimeout(resolver, queryPromise, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolver.cancel();
      const error = new Error('DNS query timed out');
      error.code = 'ETIMEOUT';
      reject(error);
    }, timeoutMs);

    queryPromise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function resolveFamily(domain, server, family, timeoutMs) {
  const resolver = createResolver(server);
  const startedAt = performance.now();
  const query =
    family === 6
      ? resolver.resolve6(domain, { ttl: true })
      : resolver.resolve4(domain, { ttl: true });
  const records = await queryWithTimeout(resolver, query, timeoutMs);

  return {
    elapsedMs: Math.max(0.1, performance.now() - startedAt),
    records: records.map((record) => ({
      address: typeof record === 'string' ? record : record.address,
      ttl: typeof record === 'string' ? null : record.ttl,
    })),
  };
}

async function resolveCname(domain, server, timeoutMs) {
  const resolver = createResolver(server);
  try {
    const records = await queryWithTimeout(resolver, resolver.resolveCname(domain), timeoutMs);
    return records;
  } catch (error) {
    if (error && ['ENODATA', 'ENOTFOUND'].includes(error.code)) return [];
    return [];
  }
}

function friendlyError(error) {
  const code = error && typeof error.code === 'string' ? error.code : 'UNKNOWN';
  return {
    code,
    message: ERROR_MESSAGES[code] || (error && error.message) || 'DNS query failed',
  };
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function inspectRecords(domain, server, timeoutMs = 2500) {
  const [ipv4Result, ipv6Result, cname] = await Promise.allSettled([
    resolveFamily(domain, server, 4, timeoutMs),
    resolveFamily(domain, server, 6, timeoutMs),
    resolveCname(domain, server, timeoutMs),
  ]);

  return {
    ipv4: ipv4Result.status === 'fulfilled' ? ipv4Result.value.records : [],
    ipv6: ipv6Result.status === 'fulfilled' ? ipv6Result.value.records : [],
    cname: cname.status === 'fulfilled' ? cname.value : [],
  };
}

async function benchmarkOne(domain, server, family, attempts, timeoutMs) {
  const samples = [];
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await resolveFamily(domain, server, family, timeoutMs);
      samples.push(result.elapsedMs);
    } catch (error) {
      lastError = friendlyError(error);
    }
  }

  const records = await inspectRecords(domain, server, timeoutMs);
  const successful = samples.length;
  const average = successful
    ? samples.reduce((total, sample) => total + sample, 0) / successful
    : null;

  return {
    ...server,
    status: successful > 0 ? 'online' : 'offline',
    protocol: 'UDP/53',
    recordType: family === 6 ? 'AAAA' : 'A',
    averageMs: average === null ? null : round(average),
    medianMs: successful ? round(median(samples)) : null,
    minMs: successful ? round(Math.min(...samples)) : null,
    maxMs: successful ? round(Math.max(...samples)) : null,
    jitterMs: successful > 1 ? round(Math.max(...samples) - Math.min(...samples)) : 0,
    successRate: round((successful / attempts) * 100, 0),
    samples: samples.map((sample) => round(sample)),
    ipv4: records.ipv4,
    ipv6: records.ipv6,
    cname: records.cname,
    error: successful > 0 ? null : lastError || { code: 'UNKNOWN', message: 'No response' },
  };
}

async function benchmarkDns(payload) {
  const domain = sanitizeDomain(payload && payload.domain);
  const servers = sanitizeServers(payload && payload.servers);
  const family = payload && payload.recordType === 'AAAA' ? 6 : 4;
  const attempts = clampInteger(payload && payload.attempts, 3, 1, 5);
  const timeoutMs = clampInteger(payload && payload.timeoutMs, 2500, 500, 5000);
  const startedAt = new Date().toISOString();

  const results = await Promise.all(
    servers.map((server) => benchmarkOne(domain, server, family, attempts, timeoutMs)),
  );

  results.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
    return (a.averageMs ?? Number.POSITIVE_INFINITY) - (b.averageMs ?? Number.POSITIVE_INFINITY);
  });

  return {
    domain,
    recordType: family === 6 ? 'AAAA' : 'A',
    attempts,
    startedAt,
    completedAt: new Date().toISOString(),
    results,
  };
}

async function resolveRecords(payload) {
  const domain = sanitizeDomain(payload && payload.domain);
  const server = sanitizeServer(
    (payload && payload.server) || DEFAULT_DNS_SERVERS[0],
  );
  const timeoutMs = clampInteger(payload && payload.timeoutMs, 2500, 500, 5000);
  const records = await inspectRecords(domain, server, timeoutMs);

  return {
    domain,
    server,
    queriedAt: new Date().toISOString(),
    ...records,
  };
}

function getSystemInfo() {
  let interfaces = {};
  let systemDnsServers = [];

  try {
    interfaces = os.networkInterfaces();
  } catch {
    // Some hardened containers deny interface enumeration. The desktop app can
    // still benchmark explicitly configured resolvers in that environment.
  }

  try {
    systemDnsServers = dns.getServers();
  } catch {
    // Return an empty list instead of preventing the interface from loading.
  }

  const addresses = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (entry.internal) continue;
      addresses.push({
        interface: name,
        address: entry.address,
        family: entry.family,
      });
    }
  }

  return {
    platform: process.platform,
    release: os.release(),
    hostname: os.hostname(),
    systemDnsServers,
    hasIpv4: addresses.some((entry) => entry.family === 'IPv4'),
    hasIpv6: addresses.some((entry) => entry.family === 'IPv6'),
    addresses: addresses.slice(0, 12),
  };
}

module.exports = {
  DEFAULT_DNS_SERVERS,
  benchmarkDns,
  resolveRecords,
  getSystemInfo,
  sanitizeDomain,
  sanitizeServer,
  friendlyError,
  median,
};
