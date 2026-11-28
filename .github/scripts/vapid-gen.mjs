// Prints a new P-256 VAPID private key as a JWK (stdout only, piped straight into `wrangler secret put`).
const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const j = await crypto.subtle.exportKey('jwk', k.privateKey);
process.stdout.write(JSON.stringify({ kty: 'EC', crv: 'P-256', x: j.x, y: j.y, d: j.d }));
