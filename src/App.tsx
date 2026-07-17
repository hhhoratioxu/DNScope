import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  DashboardIcon,
  DownloadIcon,
  GaugeIcon,
  GlobeIcon,
  HistoryIcon,
  LogoMark,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ZapIcon,
} from './components/Icons';
import { api, DEFAULT_SERVERS } from './lib/api';
import type {
  BenchmarkResponse,
  BenchmarkResult,
  DnsServer,
  RecordType,
  SystemInfo,
} from './types';
import './styles.css';

interface HistoryEntry {
  id: string;
  domain: string;
  testedAt: string;
  bestName: string;
  bestLatency: number | null;
  recordType: RecordType;
}

const HISTORY_KEY = 'dnscope.history.v1';

function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? (JSON.parse(stored) as HistoryEntry[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function formatLatency(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1)} ms`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function platformLabel(platform?: string) {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  if (platform === 'web-preview') return 'Web preview';
  return platform || 'Detecting';
}

function resolverInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function latencyTone(latency: number | null) {
  if (latency === null) return 'muted';
  if (latency < 25) return 'great';
  if (latency < 55) return 'good';
  return 'slow';
}

function App() {
  const [domain, setDomain] = useState('github.com');
  const [recordType, setRecordType] = useState<RecordType>('A');
  const [attempts, setAttempts] = useState(3);
  const [timeoutMs, setTimeoutMs] = useState(2500);
  const [servers, setServers] = useState<DnsServer[]>(DEFAULT_SERVERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(DEFAULT_SERVERS.map((server) => server.id)),
  );
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [version, setVersion] = useState('0.1.0');
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [activeNav, setActiveNav] = useState('overview');

  useEffect(() => {
    void Promise.all([api.getSystemInfo(), api.getAppVersion()]).then(([info, appVersion]) => {
      setSystemInfo(info);
      setVersion(appVersion);
    });

    if (!api.isDesktop) {
      void api
        .benchmark({
          domain: 'github.com',
          recordType: 'A',
          attempts: 3,
          timeoutMs: 2500,
          servers: DEFAULT_SERVERS,
        })
        .then((response) => {
          setBenchmark(response);
          setSelectedResultId(response.results[0]?.id ?? null);
        });
    }
  }, []);

  const selectedServers = useMemo(
    () => servers.filter((server) => selectedIds.has(server.id)),
    [selectedIds, servers],
  );

  const onlineResults = useMemo(
    () => benchmark?.results.filter((result) => result.status === 'online') ?? [],
    [benchmark],
  );

  const bestResult = onlineResults[0] ?? null;
  const selectedResult =
    benchmark?.results.find((result) => result.id === selectedResultId) ?? bestResult;
  const averageLatency = onlineResults.length
    ? onlineResults.reduce((sum, result) => sum + (result.averageMs ?? 0), 0) /
      onlineResults.length
    : null;
  const averageSuccess = onlineResults.length
    ? onlineResults.reduce((sum, result) => sum + result.successRate, 0) / onlineResults.length
    : null;
  const maxLatency = Math.max(
    60,
    ...onlineResults.map((result) => result.averageMs ?? 0),
  );

  async function runBenchmark(event?: FormEvent) {
    event?.preventDefault();
    const cleanedDomain = domain.trim().replace(/\.+$/, '');

    if (!cleanedDomain || !cleanedDomain.includes('.')) {
      setError('Enter a valid domain, for example github.com.');
      return;
    }
    if (selectedServers.length === 0) {
      setError('Select at least one DNS resolver.');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const response = await api.benchmark({
        domain: cleanedDomain,
        recordType,
        attempts,
        timeoutMs,
        servers: selectedServers,
      });
      setBenchmark(response);
      setSelectedResultId(response.results[0]?.id ?? null);

      const best = response.results.find((result) => result.status === 'online');
      const entry: HistoryEntry = {
        id: `${Date.now()}-${cleanedDomain}`,
        domain: response.domain,
        testedAt: response.completedAt,
        bestName: best?.name ?? 'No response',
        bestLatency: best?.averageMs ?? null,
        recordType: response.recordType,
      };
      const nextHistory = [entry, ...history].slice(0, 8);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'DNS benchmark failed.');
    } finally {
      setIsRunning(false);
    }
  }

  function toggleServer(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomServer(event: FormEvent) {
    event.preventDefault();
    const address = customAddress.trim();
    const name = customName.trim() || address;

    if (!address || (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address) && !address.includes(':'))) {
      setError('Enter a valid IPv4 or IPv6 DNS server address.');
      return;
    }
    if (servers.some((server) => server.address === address)) {
      setError('That DNS server is already in the list.');
      return;
    }

    const server: DnsServer = {
      id: `custom-${Date.now()}`,
      name,
      address,
      region: 'Custom',
    };
    setServers((current) => [...current, server]);
    setSelectedIds((current) => new Set([...current, server.id]));
    setCustomName('');
    setCustomAddress('');
    setCustomOpen(false);
    setError(null);
  }

  function exportReport() {
    if (!benchmark) return;
    const report = {
      generatedBy: `DNScope ${version}`,
      system: systemInfo,
      benchmark,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dnscope-${benchmark.domain}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function navigateTo(id: string) {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark />
          <div>
            <div className="brand-name">DNScope</div>
            <div className="brand-version">v{version.replace(' Preview', '')}</div>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeNav === 'overview' ? 'active' : ''} onClick={() => navigateTo('overview')}>
            <DashboardIcon />
            Overview
          </button>
          <button className={activeNav === 'benchmark' ? 'active' : ''} onClick={() => navigateTo('benchmark')}>
            <GaugeIcon />
            Benchmark
          </button>
          <button className={activeNav === 'records' ? 'active' : ''} onClick={() => navigateTo('records')}>
            <SearchIcon />
            DNS records
          </button>
          <button className={activeNav === 'history' ? 'active' : ''} onClick={() => navigateTo('history')}>
            <HistoryIcon />
            History
          </button>
        </nav>

        <div className="sidebar-label">SYSTEM</div>
        <button className="settings-link" onClick={() => navigateTo('settings')}>
          <SettingsIcon />
          Test settings
        </button>

        <div className="sidebar-status">
          <div className="status-pulse"><span /></div>
          <div>
            <strong>Local processing</strong>
            <span>No analytics or uploads</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <span>Open source</span>
          <span className="footer-dot">•</span>
          <span>MIT License</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>DNS workspace</h1>
            <p>Measure resolver performance and inspect live DNS records.</p>
          </div>
          <div className="topbar-meta">
            <div className="connection-chip">
              <span className="online-dot" />
              {platformLabel(systemInfo?.platform)}
            </div>
            <div className="system-dns">
              <span>System DNS</span>
              <strong>{systemInfo?.systemDnsServers[0] || 'Detecting…'}</strong>
            </div>
          </div>
        </header>

        <div className="workspace">
          <section className="hero-section" id="overview">
            <div className="section-kicker"><ZapIcon size={15} /> LIVE DNS TEST</div>
            <div className="hero-row">
              <div>
                <h2>Find the fastest resolver<br />for your network.</h2>
                <p>Real queries from your device. No cloud relay, no account, no tracking.</p>
              </div>
              <div className="network-badges">
                <span className={systemInfo?.hasIpv4 ? 'available' : ''}>IPv4 <CheckIcon size={14} /></span>
                <span className={systemInfo?.hasIpv6 ? 'available' : ''}>IPv6 <CheckIcon size={14} /></span>
              </div>
            </div>

            <form className="query-panel" onSubmit={runBenchmark}>
              <label className="domain-field">
                <GlobeIcon size={20} />
                <span>
                  <small>DOMAIN TO TEST</small>
                  <input
                    aria-label="Domain to test"
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={(event) => setDomain(event.target.value)}
                    spellCheck={false}
                    value={domain}
                  />
                </span>
              </label>

              <div className="query-divider" />

              <label className="record-select">
                <small>RECORD</small>
                <select value={recordType} onChange={(event) => setRecordType(event.target.value as RecordType)}>
                  <option value="A">A · IPv4</option>
                  <option value="AAAA">AAAA · IPv6</option>
                </select>
                <ChevronIcon size={15} />
              </label>

              <div className="resolver-picker-wrap">
                <button className="resolver-picker" onClick={() => setServerMenuOpen((open) => !open)} type="button">
                  <span><ServerIcon size={17} /> {selectedServers.length} resolvers</span>
                  <ChevronIcon size={15} />
                </button>
                {serverMenuOpen && (
                  <div className="resolver-menu">
                    <div className="resolver-menu-head">
                      <strong>Select resolvers</strong>
                      <button onClick={() => setServerMenuOpen(false)} type="button"><CloseIcon size={16} /></button>
                    </div>
                    {servers.map((server) => (
                      <label key={server.id}>
                        <input
                          checked={selectedIds.has(server.id)}
                          onChange={() => toggleServer(server.id)}
                          type="checkbox"
                        />
                        <span className="custom-check"><CheckIcon size={13} /></span>
                        <span className="menu-server-name">{server.name}<small>{server.address}</small></span>
                        <span className="menu-region">{server.region}</span>
                      </label>
                    ))}
                    <button className="add-server-link" onClick={() => { setCustomOpen(true); setServerMenuOpen(false); }} type="button">
                      <PlusIcon size={15} /> Add custom resolver
                    </button>
                  </div>
                )}
              </div>

              <button className="run-button" disabled={isRunning} type="submit">
                {isRunning ? <span className="spinner" /> : <RefreshIcon size={18} />}
                {isRunning ? 'Testing…' : 'Run test'}
              </button>
            </form>

            {error && <div className="error-banner"><span>!</span>{error}</div>}

            {customOpen && (
              <form className="custom-server-form" onSubmit={addCustomServer}>
                <div>
                  <strong>Add a custom resolver</strong>
                  <span>UDP port 53 is used in v0.1.</span>
                </div>
                <label>
                  <span>Name</span>
                  <input onChange={(event) => setCustomName(event.target.value)} placeholder="Home DNS" value={customName} />
                </label>
                <label>
                  <span>IP address</span>
                  <input onChange={(event) => setCustomAddress(event.target.value)} placeholder="192.168.1.1" value={customAddress} />
                </label>
                <button className="secondary-button" onClick={() => setCustomOpen(false)} type="button">Cancel</button>
                <button className="small-primary" type="submit">Add resolver</button>
              </form>
            )}
          </section>

          <section className="metrics-grid" aria-label="Benchmark summary">
            <article className="metric-card accent-card">
              <div className="metric-icon"><ZapIcon size={19} /></div>
              <div>
                <span>FASTEST RESOLVER</span>
                <strong>{bestResult?.name ?? 'Run a test'}</strong>
                <small>{bestResult?.address === 'system' ? 'Your system default' : bestResult?.address ?? 'Waiting for results'}</small>
              </div>
              <div className="metric-value">{bestResult ? formatLatency(bestResult.averageMs) : '—'}</div>
            </article>
            <article className="metric-card">
              <div className="metric-icon neutral"><GaugeIcon size={19} /></div>
              <div>
                <span>AVERAGE RESPONSE</span>
                <strong>{averageLatency === null ? 'No data' : `${averageLatency.toFixed(1)} ms`}</strong>
                <small>Across responding resolvers</small>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-icon neutral"><CheckIcon size={19} /></div>
              <div>
                <span>SUCCESS RATE</span>
                <strong>{averageSuccess === null ? 'No data' : `${Math.round(averageSuccess)}%`}</strong>
                <small>{onlineResults.length} of {benchmark?.results.length ?? selectedServers.length} resolvers online</small>
              </div>
            </article>
          </section>

          <section className="content-card benchmark-card" id="benchmark">
            <div className="card-heading">
              <div>
                <span className="eyebrow">PERFORMANCE</span>
                <h3>Resolver benchmark</h3>
                <p>{benchmark ? `${benchmark.domain} · ${benchmark.attempts} queries per resolver` : 'Run a test to compare your selected resolvers.'}</p>
              </div>
              <button className="export-button" disabled={!benchmark} onClick={exportReport}>
                <DownloadIcon size={16} /> Export JSON
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>RESOLVER</th>
                    <th>PROTOCOL</th>
                    <th>RESPONSE</th>
                    <th className="bar-column">RELATIVE LATENCY</th>
                    <th>SUCCESS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark?.results.map((result, index) => (
                    <tr
                      className={selectedResult?.id === result.id ? 'selected-row' : ''}
                      key={result.id}
                      onClick={() => setSelectedResultId(result.id)}
                    >
                      <td>
                        <div className="resolver-cell">
                          <span className={`resolver-avatar avatar-${index % 5}`}>{resolverInitials(result.name)}</span>
                          <span><strong>{result.name}</strong><small>{result.address === 'system' ? systemInfo?.systemDnsServers[0] || 'System default' : result.address}</small></span>
                        </div>
                      </td>
                      <td><span className="protocol-pill">{result.protocol}</span></td>
                      <td><strong className={`latency latency-${latencyTone(result.averageMs)}`}>{formatLatency(result.averageMs)}</strong></td>
                      <td className="bar-column">
                        <div className="latency-track">
                          <span
                            className={`latency-bar latency-bar-${latencyTone(result.averageMs)}`}
                            style={{ width: `${Math.max(3, ((result.averageMs ?? 0) / maxLatency) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td>{result.successRate}%</td>
                      <td>
                        <span className={`status-pill ${result.status}`}><span />{result.status}</span>
                      </td>
                    </tr>
                  ))}
                  {!benchmark && (
                    <tr className="empty-row">
                      <td colSpan={6}>
                        <div><GaugeIcon size={24} /><strong>No benchmark yet</strong><span>Enter a domain and run your first local DNS test.</span></div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="lower-grid">
            <section className="content-card records-card" id="records">
              <div className="card-heading compact">
                <div>
                  <span className="eyebrow">RECORD INSPECTOR</span>
                  <h3>{benchmark?.domain ?? 'DNS records'}</h3>
                  <p>{selectedResult ? `Answered by ${selectedResult.name}` : 'The fastest resolver response appears here.'}</p>
                </div>
                {selectedResult && <span className="ttl-badge">TTL {selectedResult.ipv4[0]?.ttl ?? selectedResult.ipv6[0]?.ttl ?? '—'}s</span>}
              </div>

              <div className="record-list">
                <div className="record-group">
                  <div><span className="record-type a-record">A</span><span>IPv4 addresses</span></div>
                  <div className="record-values">
                    {selectedResult?.ipv4.length
                      ? selectedResult.ipv4.map((record) => <code key={record.address}>{record.address}</code>)
                      : <span className="no-records">No A records</span>}
                  </div>
                </div>
                <div className="record-group">
                  <div><span className="record-type aaaa-record">AAAA</span><span>IPv6 addresses</span></div>
                  <div className="record-values">
                    {selectedResult?.ipv6.length
                      ? selectedResult.ipv6.map((record) => <code key={record.address}>{record.address}</code>)
                      : <span className="no-records">No AAAA records</span>}
                  </div>
                </div>
                {selectedResult?.cname.length ? (
                  <div className="record-group">
                    <div><span className="record-type cname-record">CNAME</span><span>Canonical name</span></div>
                    <div className="record-values">{selectedResult.cname.map((record) => <code key={record}>{record}</code>)}</div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="content-card history-card" id="history">
              <div className="card-heading compact">
                <div>
                  <span className="eyebrow">LOCAL HISTORY</span>
                  <h3>Recent tests</h3>
                  <p>Stored only on this device.</p>
                </div>
                {history.length > 0 && (
                  <button className="clear-button" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}>Clear</button>
                )}
              </div>
              <div className="history-list">
                {history.map((entry) => (
                  <button key={entry.id} onClick={() => setDomain(entry.domain)}>
                    <span className="history-domain"><GlobeIcon size={15} /><span><strong>{entry.domain}</strong><small>{entry.recordType} query · {formatTime(entry.testedAt)}</small></span></span>
                    <span className="history-best"><small>{entry.bestName}</small><strong>{formatLatency(entry.bestLatency)}</strong></span>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="history-empty"><HistoryIcon size={22} /><span>Your completed tests will appear here.</span></div>
                )}
              </div>
            </section>
          </div>

          <section className="settings-panel" id="settings">
            <div>
              <span className="eyebrow">TEST SETTINGS</span>
              <h3>Query behaviour</h3>
              <p>More attempts improve confidence but take longer when a resolver is unreachable.</p>
            </div>
            <label>
              <span>Queries per resolver</span>
              <select value={attempts} onChange={(event) => setAttempts(Number(event.target.value))}>
                <option value={1}>1 query</option>
                <option value={3}>3 queries</option>
                <option value={5}>5 queries</option>
              </select>
            </label>
            <label>
              <span>Query timeout</span>
              <select value={timeoutMs} onChange={(event) => setTimeoutMs(Number(event.target.value))}>
                <option value={1000}>1 second</option>
                <option value={2500}>2.5 seconds</option>
                <option value={5000}>5 seconds</option>
              </select>
            </label>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
