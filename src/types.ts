export type RecordType = 'A' | 'AAAA';
export type ResolverStatus = 'online' | 'offline';

export interface DnsServer {
  id: string;
  name: string;
  address: string;
  region: string;
}

export interface DnsRecord {
  address: string;
  ttl: number | null;
}

export interface ResolverError {
  code: string;
  message: string;
}

export interface BenchmarkResult extends DnsServer {
  status: ResolverStatus;
  protocol: string;
  recordType: RecordType;
  averageMs: number | null;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  jitterMs: number;
  successRate: number;
  samples: number[];
  ipv4: DnsRecord[];
  ipv6: DnsRecord[];
  cname: string[];
  error: ResolverError | null;
}

export interface BenchmarkPayload {
  domain: string;
  recordType: RecordType;
  attempts: number;
  timeoutMs: number;
  servers: DnsServer[];
}

export interface BenchmarkResponse {
  domain: string;
  recordType: RecordType;
  attempts: number;
  startedAt: string;
  completedAt: string;
  results: BenchmarkResult[];
}

export interface ResolvePayload {
  domain: string;
  server: DnsServer;
  timeoutMs?: number;
}

export interface ResolveResponse {
  domain: string;
  server: DnsServer;
  queriedAt: string;
  ipv4: DnsRecord[];
  ipv6: DnsRecord[];
  cname: string[];
}

export interface NetworkAddress {
  interface: string;
  address: string;
  family: 'IPv4' | 'IPv6';
}

export interface SystemInfo {
  platform: string;
  release: string;
  hostname: string;
  systemDnsServers: string[];
  hasIpv4: boolean;
  hasIpv6: boolean;
  addresses: NetworkAddress[];
}

export interface DnscopeBridge {
  benchmark: (payload: BenchmarkPayload) => Promise<BenchmarkResponse>;
  resolveRecords: (payload: ResolvePayload) => Promise<ResolveResponse>;
  getSystemInfo: () => Promise<SystemInfo>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    dnscope?: DnscopeBridge;
  }
}
