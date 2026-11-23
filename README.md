# Freeport developer resources

Freeport Marketplace is a UK player-to-player marketplace for game currency, items, accounts and boosting, at [freeport.gg](https://freeport.gg). It is operated by FREEPORT MARKETPLACE LTD, company number 17472975.

This repository holds the public parts of two things Freeport offers its sellers:

- **The seller API**: one HTTP API that lets a seller's own software do what the seller console does.
- **The listing-import connector**: a remote MCP server that lets a seller's AI assistant bring their listings from another site into Freeport as drafts.

It contains the API contract, small runnable examples and the connector's entry for the MCP Registry. The full reference is at [docs.freeport.gg](https://docs.freeport.gg/).

| File | What it is |
| --- | --- |
| `openapi.json` | The seller API's contract, OpenAPI 3.1. The same document the reference at docs.freeport.gg is built from. |
| `examples/` | First calls with curl, Node and Python. |
| `server.json` | The connector's entry for the official MCP Registry. |
| `apis.json` | An APIs.json index of both. |
| `LICENSE` | The MIT licence these files are released under. |

## The seller API

The seller API lets you connect or build your own tools to create and manage listings. Anything you can do from Selling in your browser, your software can do with a key: put stock up, hear about orders when they are paid, accept and deliver them, talk to the buyer in the order chat, answer disputes, read your balance, and keep a sheet of up to a thousand lines in step with your own system in one call. It cannot automate in-game delivery of items, currency or boosting.

### Who can use it

The seller API is for approved Freeport sellers. To get access:

1. Open [Integrations](https://freeport.gg/dashboard/selling/integrations) in your seller console.
2. Apply for access with a sentence about what your software does. Staff at Freeport review the application.
3. Once approved, create your first keys.

Live keys need a second factor on the account. More in the help article [The seller API](https://freeport.gg/help/the-seller-api).

### Reference

- Reference and guides: [docs.freeport.gg](https://docs.freeport.gg/)
- The contract: [`openapi.json`](openapi.json), also at `https://docs.freeport.gg/openapi.json` and, for a key holder, `GET /v1/openapi.json`
- A Postman collection with a request for every route: `https://docs.freeport.gg/freeport-seller-api.postman_collection.json` (it holds no key)

### Authentication

Send your key as a bearer token on every request:

```
Authorization: Bearer fp_live_...
```

Each key carries scopes, chosen when it is created: `catalog:read`, `listings:read`, `listings:write`, `orders:read`, `orders:write`, `disputes:read`, `disputes:write`, `chat:read`, `chat:write`, `account:read`, `account:write`, `payouts:read` and `webhooks:manage`. A key is shown once, when it is created. Keep it out of code you share and out of any repository.

Conventions everywhere: money is a decimal string in the row's currency, ids are prefixed ULIDs, times are ISO 8601 in UTC, lists are paged by an opaque cursor, and every error is `{ "error": { "code", "message", "requestId" } }`. Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`, and a 429 carries `Retry-After`. Writes accept an `Idempotency-Key` header, so a retry never runs a write twice.

### The sandbox

| | Sandbox | Production |
| --- | --- | --- |
| Base URL | `https://sandbox-api.freeport.gg/v1` | `https://api.freeport.gg/v1` |
| Site | `https://sandbox.freeport.gg` | `https://freeport.gg` |
| Keys | `fp_test_...` | `fp_live_...`, after your application is approved |
| Money | A stand-in payment provider; a synthetic buyer pays | Real orders, paid by card |

A test key never works on production and a live key never works on the sandbox. The sandbox has a synthetic buyer you can order from yourself (`POST /v1/sandbox/orders`), confirm, cancel or dispute, so you can see every webhook before going live. The sandbox is switched on when a seller asks for API access: write to support@freeport.gg to have it started.

### Quick start

Each call below is a real route from [`openapi.json`](openapi.json). Set your key first:

```sh
export FREEPORT_KEY=fp_test_your_key_here
export FREEPORT_API=https://sandbox-api.freeport.gg/v1
```

Prove the key. The answer names the key, its scopes, its environment and its limits.

```sh
curl -sS "$FREEPORT_API/ping" -H "Authorization: Bearer $FREEPORT_KEY"
```

Read the catalog. Every route accepts a slug or an id.

```sh
curl -sS "$FREEPORT_API/catalog/games" -H "Authorization: Bearer $FREEPORT_KEY"
curl -sS "$FREEPORT_API/catalog/games/wow-classic-era" -H "Authorization: Bearer $FREEPORT_KEY"
```

Create a listing as a draft. Delivery methods are the game's own words, as the catalog gives them.

```sh
curl -sS -X POST "$FREEPORT_API/listings" \
  -H "Authorization: Bearer $FREEPORT_KEY" \
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
```

Put it on sale, change its price or stock:

```sh
curl -sS -X PATCH "$FREEPORT_API/listings/LISTING_ID" \
  -H "Authorization: Bearer $FREEPORT_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "active", "stock_qty": 2000000 }'
```

Follow orders, and accept and deliver one:

```sh
curl -sS "$FREEPORT_API/orders?state=paid" -H "Authorization: Bearer $FREEPORT_KEY"
curl -sS -X POST "$FREEPORT_API/orders/ORDER_ID/accept" -H "Authorization: Bearer $FREEPORT_KEY"
curl -sS -X POST "$FREEPORT_API/orders/ORDER_ID/deliver" -H "Authorization: Bearer $FREEPORT_KEY"
```

On the sandbox, buy from yourself to see the whole flow:

```sh
curl -sS -X POST "$FREEPORT_API/sandbox/orders" \
  -H "Authorization: Bearer $FREEPORT_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "listing_id": "LISTING_ID", "quantity": 5000 }'
```

Webhooks are signed, retried and logged. Add an endpoint from Integrations or with `POST /v1/webhooks`, and subscribe to events such as `order.paid`, `order.completed`, `order.disputed` and `listing.low_stock`. The [Webhooks and Signing guides](https://docs.freeport.gg/) explain how to check a signature.

The [`examples`](examples) folder has the same calls as runnable scripts:

- [`examples/curl.sh`](examples/curl.sh): ping, catalog, a draft listing, your listings, paid orders
- [`examples/node/quickstart.mjs`](examples/node/quickstart.mjs): Node 20 or later, no dependencies
- [`examples/python/quickstart.py`](examples/python/quickstart.py): Python 3.9 or later, standard library only

## The listing-import connector

A seller connects their own AI assistant to Freeport and asks it to bring over a listing they sell on another site. Their AI reads the other listing and maps it onto Freeport's fields. Freeport checks each line against the rules every new listing is held to and saves what passes as a draft. Nothing goes on sale until the seller has reviewed the draft on Freeport and published it.

### Who can use it

Any approved Freeport seller can connect an AI. No API application is needed. More in the help article [Importing listings with your AI](https://freeport.gg/help/importing-listings-with-ai).

### The address

```
https://api.freeport.gg/mcp
```

It is a remote MCP server on the Streamable HTTP transport. It is stateless: each call is an ordinary POST and the answer is JSON.

### Connecting an AI client

The connector signs your AI in with OAuth. The first time, your AI opens a Freeport page in your browser: sign in if asked, enter your two-factor code, read what the app may and may not do, and allow it. You can see and disconnect each connected app on Imports to review in your seller console.

The apps that can connect today are Claude (web, desktop and mobile), Claude Code and ChatGPT.

- **Claude**: open Customize, then Connectors, choose Add, then Add custom connector, and paste `https://api.freeport.gg/mcp`.
- **Claude Code**: in a terminal, run
  ```sh
  claude mcp add --transport http freeport https://api.freeport.gg/mcp
  claude mcp login freeport
  ```
  or, inside Claude Code, run `/mcp`, choose freeport and Authenticate.
- **ChatGPT**: turn on Developer mode under Settings, Apps, then create an app with the address.

Then ask, for example: "Bring my listings over from this page" with the address of the page, or paste the listing text.

### What it can and cannot do

The token's one scope is `listings:import`.

| Tool | Reads or writes | What it does |
| --- | --- | --- |
| `about_me` | Reads | Your shop name, the currency you price in, the lanes you sell in, whether payments are set up, how many imported drafts wait |
| `find_game` | Reads | Games matching a name, with their categories |
| `lane_guide` | Reads | How a game's category is listed on Freeport: its fields, limits and the words buyers filter by |
| `match_server` | Reads | The game's servers that match the words another listing uses |
| `check_listings` | Reads | Up to 50 lines, each answered with what would stop it and the warnings it would carry; saves nothing |
| `stage_listings` | Writes drafts | Up to 50 lines saved as drafts for you to review |
| `my_imports` | Reads | Your imported drafts still waiting, with their warnings |
| `fix_import` | Writes drafts | Changes an imported draft that is still waiting; never a published listing |

It cannot publish, change or remove a listing that is on sale, and it cannot see your orders, money, payouts, account logins or codes. An account's login and codes are added on Freeport, never through your AI. Freeport never fetches another site and never holds a login for one: your AI reads, and Freeport takes what it sends.

An imported listing that holds contact details cannot be published until they are removed. Buyers and sellers talk in the order's chat.

## Support

- Seller API and connector: support@freeport.gg. Never send a key itself.
- Security reports: security@freeport.gg
- Privacy: [freeport.gg/privacy](https://freeport.gg/privacy)
- Terms: [freeport.gg/terms](https://freeport.gg/terms)

## Licence

The files in this repository are released under the MIT licence: see [LICENSE](LICENSE). The licence covers these files only. It grants no right to Freeport's name or marks, and use of the seller API and the connector is under [Freeport's terms](https://freeport.gg/terms).

FREEPORT MARKETPLACE LTD, 27 Old Gloucester Street, London, England, WC1N 3AX. Company number 17472975.
