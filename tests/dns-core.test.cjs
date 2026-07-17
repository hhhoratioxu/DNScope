'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  friendlyError,
  getSystemInfo,
  median,
  sanitizeDomain,
  sanitizeServer,
} = require('../electron/dns-core.cjs');

test('sanitizeDomain normalizes common domains', () => {
  assert.equal(sanitizeDomain('  GitHub.COM.  '), 'github.com');
  assert.equal(sanitizeDomain('sub.example.co.uk'), 'sub.example.co.uk');
});

test('sanitizeDomain converts internationalized domain names', () => {
  assert.equal(sanitizeDomain('例子.测试'), 'xn--fsqu00a.xn--0zwm56d');
});

test('sanitizeDomain rejects malformed input and IP addresses', () => {
  assert.throws(() => sanitizeDomain('localhost'), /valid domain/i);
  assert.throws(() => sanitizeDomain('192.168.1.1'), /valid domain/i);
  assert.throws(() => sanitizeDomain('-invalid.example'), /valid domain/i);
  assert.throws(() => sanitizeDomain(''), /valid domain/i);
});

test('sanitizeServer accepts system, IPv4, and IPv6 resolvers', () => {
  assert.deepEqual(sanitizeServer({ id: 'system', address: 'system' }), {
    id: 'system',
    name: 'System DNS',
    address: 'system',
    region: 'Local',
  });
  assert.equal(sanitizeServer({ name: 'Cloudflare', address: '1.1.1.1' }).address, '1.1.1.1');
  assert.equal(sanitizeServer({ name: 'IPv6', address: '2606:4700:4700::1111' }).address, '2606:4700:4700::1111');
});

test('sanitizeServer rejects hostnames and unsafe identifiers', () => {
  assert.throws(() => sanitizeServer({ address: 'dns.example.com' }), /invalid dns server/i);
  assert.equal(
    sanitizeServer({ id: '../custom resolver', name: 'Test', address: '9.9.9.9' }).id,
    'customresolver',
  );
});

test('median supports odd and even sample counts', () => {
  assert.equal(median([9, 1, 4]), 4);
  assert.equal(median([10, 2, 4, 8]), 6);
  assert.equal(median([]), null);
});

test('friendlyError maps DNS error codes without leaking internals', () => {
  assert.deepEqual(friendlyError({ code: 'ETIMEOUT', message: 'raw message' }), {
    code: 'ETIMEOUT',
    message: 'Query timed out',
  });
});

test('getSystemInfo returns a serializable network summary', () => {
  const info = getSystemInfo();
  assert.equal(typeof info.platform, 'string');
  assert.ok(Array.isArray(info.systemDnsServers));
  assert.ok(Array.isArray(info.addresses));
  assert.equal(typeof info.hasIpv4, 'boolean');
  assert.doesNotThrow(() => JSON.stringify(info));
});
