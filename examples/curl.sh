#!/usr/bin/env sh
# Freeport seller API: first calls with curl.
#
#   export FREEPORT_KEY=fp_test_your_key_here
#   sh curl.sh
#
# Points at the sandbox by default. For production, set
# FREEPORT_API=https://api.freeport.gg/v1 and use an fp_live_ key.
# A test key never works on production and a live key never works on the sandbox.

set -eu

BASE="${FREEPORT_API:-https://sandbox-api.freeport.gg/v1}"
KEY="${FREEPORT_KEY:?set FREEPORT_KEY to your fp_test_ or fp_live_ key}"

# 1. Is the key alive, what can it do, where are its limits?
curl -sS "$BASE/ping" \
  -H "Authorization: Bearer $KEY"
echo

# 2. The catalog: every active game, then one game's lanes, realms and packages.
curl -sS "$BASE/catalog/games" \
  -H "Authorization: Bearer $KEY"
echo
curl -sS "$BASE/catalog/games/wow-classic-era" \
  -H "Authorization: Bearer $KEY"
echo

# 3. Create a listing as a draft (nothing goes on sale until you set status to active).
#    Placement is named by slug; the delivery methods are the game's own words,
#    as GET /v1/catalog/games/{slug} gives them. With the Idempotency-Key, a retry never runs the write twice.
curl -sS -X POST "$BASE/listings" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-whitemane-horde-gold-1" \
  -d '{
    "game": "wow-classic-era",
    "category": "gold",
    "server": "whitemane-horde",
    "price": "0.42",
    "price_per_qty": 1000,
    "min_qty": 5000,
    "stock_qty": 2400000,
    "delivery_eta_minutes": 30,
    "attributes": { "deliveryMethods": "Mail trade, Auction house" },
    "external_id": "whitemane-horde-gold",
    "status": "draft"
  }'
echo

# 4. Your listings, newest page first, filtered to drafts.
curl -sS "$BASE/listings?status=draft&limit=20" \
  -H "Authorization: Bearer $KEY"
echo

# 5. Paid orders waiting for you to accept them.
curl -sS "$BASE/orders?state=paid" \
  -H "Authorization: Bearer $KEY"
echo
