"""Freeport seller API: prove a key and read the orders waiting for you.

Python 3.9 or later, standard library only.

    FREEPORT_KEY=fp_test_your_key_here python quickstart.py

Points at the sandbox by default. For production, set
FREEPORT_API=https://api.freeport.gg/v1 and use an fp_live_ key.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("FREEPORT_API", "https://sandbox-api.freeport.gg/v1")
KEY = os.environ.get("FREEPORT_KEY")
if not KEY:
    sys.exit("Set FREEPORT_KEY to your fp_test_ or fp_live_ key.")


def api(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(f"{BASE}{path}", data=data, method=method)
    request.add_header("Authorization", f"Bearer {KEY}")
    if body is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as failure:
        # Every error is {"error": {"code", "message", "requestId"}}.
        error = json.load(failure).get("error", {})
        sys.exit(f"{method} {path} answered {failure.code}: {error.get('code')} {error.get('message')}")


# 1. Who is this key, and what may it do?
ping = api("GET", "/ping")
print("environment:", ping["environment"], "scopes:", ", ".join(ping["key"]["scopes"]))

# 2. Paid orders waiting to be accepted, one page at a time.
cursor = None
while True:
    page = api("GET", "/orders?state=paid&limit=50" + (f"&cursor={urllib.parse.quote(cursor)}" if cursor else ""))
    for order in page["data"]:
        print(order["id"], order["state"], order["quantity"], order["unit_label"], order["subtotal"], order["currency"])
    cursor = page.get("next_cursor")
    if not cursor:
        break
