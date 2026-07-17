import type {
  BenchmarkPayload,
  BenchmarkResponse,
  BenchmarkResult,
  DnsRecord,
  DnsServer,
  ResolvePayload,
  ResolveResponse,
  SystemInfo,
} from '../types';

export const DEFAULT_SERVERS: DnsServer[] = [
  { id: 'system', name: 'System DNS', address: 'system', region: 'Local' },
  { id: 'alidns', name: 'AliDNS', address: '223.5.5.5', region: 'CN' },
  { id: 'dnspod', name: 'DNSPod', address: '119.29.29.29', region: 'CN' },
  { id: 'cloudflare', name: 'Cloudflare', address: '1.1.1.1', region: 'Global' },
  { id: 'google', name: 'Google DNS', address: '8.8.8.8', region: 'Global' },
  { id: 'quad9', name: 'Quad9', address: '9.9.9.9', region: 'Global' },
];

const DEMO_LATENCIES: Record<string, number> = {
  system: 18.6,
  alidns: 12.4,
  dnspod: 15.8,
  cloudflare: 38.2,
  google: 46.7,
  quad9: 52.3,
};

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

function hashDomain(domain: string) {
  return [...domain].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 17);
}

function demoRecords(domain: string): { ipv4: DnsRecord[]; ipv6: DnsRecord[] } {
  const hash = hashDomain(domain);
  return {
    ipv4: [
      { address: `104.18.${hash % 200}.${(hash * 7) % 250}`, ttl: 300 },
      { address: `104.18.${(hash + 1) % 200}.${(hash * 11) % 250}`, ttl: 300 },
    ],
    ipv6: [
      { address: `2606:4700:3030::6812:${(hash + 4096).toString(16)}`, ttl: 300 },
    ],
  };
}

function demoResult(server: DnsServer, domain: string, index: number): BenchmarkResult {
  const baseline = DEMO_LATENCIES[server.id] ?? 27 + index * 5;
  const domainOffset = (hashDomain(domain) % 13) / 10;
  const averageMs = Math.round((baseline + domainOffset) * 10) / 10;
  const records = demoRecords(domain);

  return {
    ...server,
    status: 'online',
    protocol: 'UDP/53',
    recordType: 'A',
    averageMs,
    medianMs: averageMs - 0.3,
    minMs: Math.max(1, averageMs - 2.1),
    maxMs: averageMs + 2.8,
    jitterMs: 4.9,
    successRate: 100,
    samples: [averageMs - 2.1, averageMs - 0.3, averageMs + 2.8],
    ...records,
    cname: [],
    error: null,
  };
}

async function mockBenchmark(payload: BenchmarkPayload): Promise<BenchmarkResponse> {
  await wait(760);
  const now = new Date().toISOString();
  const results = payload.servers
    .map((server, index) => ({
      ...demoResult(server, payload.domain, index),
      recordType: payload.recordType,
    }))
    .sort((a, b) => (a.averageMs ?? 9999) - (b.averageMs ?? 9999));

  return {
    domain: payload.domain,
    recordType: payload.recordType,
    attempts: payload.attempts,
    startedAt: now,
    completedAt: new Date().toISOString(),
    results,
  };
}

async function mockResolve(payload: ResolvePayload): Promise<ResolveResponse> {
  await wait(260);
  return {
    domain: payload.domain,
    server: payload.server,
    queriedAt: new Date().toISOString(),
    ...demoRecords(payload.domain),
    cname: [],
  };
}

async function mockSystemInfo(): Promise<SystemInfo> {
  return {
    platform: 'web-preview',
    release: 'Preview mode',
    hostname: 'DNScope Preview',
    systemDnsServers: ['192.168.1.1'],
    hasIpv4: true,
    hasIpv6: true,
    addresses: [
      { interface: 'Ethernet', address: '192.168.1.24', family: 'IPv4' },
      { interface: 'Ethernet', address: '240e:0000:0000::24', family: 'IPv6' },
    ],
  };
}

export const api = {
  isDesktop: Boolean(window.dnscope),
  benchmark(payload: BenchmarkPayload) {
    return window.dnscope?.benchmark(payload) ?? mockBenchmark(payload);
  },
  resolveRecords(payload: ResolvePayload) {
    return window.dnscope?.resolveRecords(payload) ?? mockResolve(payload);
  },
  getSystemInfo() {
    return window.dnscope?.getSystemInfo() ?? mockSystemInfo();
  },
  getAppVersion() {
    return window.dnscope?.getAppVersion() ?? Promise.resolve('0.1.0 Preview');
  },
};
