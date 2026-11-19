import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeContentSignature,
  stripUndefinedDeep,
  toSafeFirestoreDocId,
} from './firestorePayload';
import {
  RECOMMENDED_RTDB_RULES_JSON,
  isAuthorizedRtdbAdmin,
} from './rtdb';

function isRtdbPermissionDeniedMessage(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return msg.includes('permission_denied') || msg.includes('permission denied');
}

test('toSafeFirestoreDocId / RTDB key strips forbidden RTDB characters (. # $ [ ] /)', () => {
  assert.equal(toSafeFirestoreDocId('ord.#1354/[test]$1', 'ord'), 'ord-1354-test-1');
  assert.equal(toSafeFirestoreDocId('  #1354  ', 'ord'), '1354');
  assert.match(toSafeFirestoreDocId('///...', 'ord'), /^ord-\d+$/);
});

test('computeContentSignature is deterministic regardless of object key order', () => {
  const a = { z: 1, a: { c: 3, b: 2 }, list: [{ y: 9, x: 8 }] };
  const b = { a: { b: 2, c: 3 }, list: [{ x: 8, y: 9 }], z: 1 };
  assert.equal(computeContentSignature(a), computeContentSignature(b));
});

test('stripUndefinedDeep removes undefined keys recursively while preserving null and arrays', () => {
  const input = {
    id: 'ord-1',
    note: undefined,
    nested: { keep: null, drop: undefined, count: 0 },
    tags: ['confirm', undefined, 'cod'],
  };
  assert.deepEqual(stripUndefinedDeep(input), {
    id: 'ord-1',
    nested: { keep: null, count: 0 },
    tags: ['confirm', 'cod'],
  });
});

test('RTDB permission denied matcher detects locked-mode errors cleanly', () => {
  assert.equal(isRtdbPermissionDeniedMessage(new Error('PERMISSION_DENIED: Permission denied')), true);
  assert.equal(isRtdbPermissionDeniedMessage('Client does not have permission denied at /orderpulse'), true);
  assert.equal(isRtdbPermissionDeniedMessage(new Error('network timeout')), false);
});

test('isAuthorizedRtdbAdmin allows any verified Gmail account and blocks unverified/null users', () => {
  assert.equal(
    isAuthorizedRtdbAdmin({ email: 'trdsafarr@gmail.com', emailVerified: true }),
    true
  );
  assert.equal(
    isAuthorizedRtdbAdmin({ email: 'rollinpinbakes@gmail.com', emailVerified: true }),
    true
  );
  assert.equal(
    isAuthorizedRtdbAdmin({ email: 'team@gmail.com', emailVerified: true }),
    true
  );
  // Unverified email or null user MUST be rejected
  assert.equal(
    isAuthorizedRtdbAdmin({ email: 'rollinpinbakes@gmail.com', emailVerified: false }),
    false
  );
  assert.equal(isAuthorizedRtdbAdmin({ email: '', emailVerified: true }), false);
  assert.equal(isAuthorizedRtdbAdmin(null), false);
  assert.equal(isAuthorizedRtdbAdmin(undefined), false);
});

test('RECOMMENDED_RTDB_RULES_JSON blocks unauthenticated root access and allows any verified Google login on /orderpulse', () => {
  const parsed = JSON.parse(RECOMMENDED_RTDB_RULES_JSON) as {
    rules: {
      '.read': boolean;
      '.write': boolean;
      orderpulse: { '.read': string; '.write': string };
      orderpulse_server: { '.read': boolean; '.write': boolean };
    };
  };
  assert.equal(parsed.rules['.read'], false);
  assert.equal(parsed.rules['.write'], false);
  assert.equal(parsed.rules.orderpulse_server['.read'], false);
  assert.equal(parsed.rules.orderpulse_server['.write'], false);
  assert.equal(
    parsed.rules.orderpulse['.read'],
    'auth != null && auth.token.email_verified === true'
  );
  assert.equal(parsed.rules.orderpulse['.read'], parsed.rules.orderpulse['.write']);
});
