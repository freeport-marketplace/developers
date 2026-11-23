// Freeport seller API: prove a key, read the catalog, create a draft listing
// and read it back. Node 20 or later, no dependencies.
//
//   FREEPORT_KEY=fp_test_your_key_here node quickstart.mjs
//
// Points at the sandbox by default. For production, set
// FREEPORT_API=https://api.freeport.gg/v1 and use an fp_live_ key.

import { randomUUID } from 'node:crypto';

const BASE = process.env.FREEPORT_API ?? 'https://sandbox-api.freeport.gg/v1';
const KEY = process.env.FREEPORT_KEY;
if (!KEY) {
  console.error('Set FREEPORT_KEY to your fp_test_ or fp_live_ key.');
  process.exit(1);
}

async function api(method, path, body, headers = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    // Every error is { "error": { "code", "message", "requestId" } }.
    const { code, message, requestId } = json.error ?? {};
    throw new Error(`${method} ${path} answered ${response.status}: ${code} ${message} (${requestId})`);
  }
  return json;
}

// 1. Who is this key, and what may it do?
const ping = await api('GET', '/ping');
console.log('environment:', ping.environment, 'scopes:', ping.key.scopes.join(', '));

// 2. One game's lanes, realms and packages. Every route accepts the slug or the id.
const game = await api('GET', '/catalog/games/wow-classic-era');
console.log('game:', JSON.stringify(game).slice(0, 300), '...');

// 3. A draft listing. Nothing goes on sale until its status is active.
//    The Idempotency-Key means a retry after a network error never creates two.
const listing = await api(
  'POST',
  '/listings',
  {
    game: 'wow-classic-era',
    category: 'gold',
    server: 'whitemane-horde',
    price: '0.42',
    price_per_qty: 1000,
    min_qty: 5000,
    stock_qty: 2400000,
    delivery_eta_minutes: 30,
    attributes: { deliveryMethods: 'Mail trade, Auction house' },
    external_id: 'whitemane-horde-gold',
    status: 'draft',
  },
  { 'idempotency-key': randomUUID() },
);
console.log('created:', listing.id, listing.status, listing.title);

// 4. Read it back.
const again = await api('GET', `/listings/${listing.id}`);
console.log('read back:', again.id, again.price, again.currency, 'stock', again.stock_qty);
