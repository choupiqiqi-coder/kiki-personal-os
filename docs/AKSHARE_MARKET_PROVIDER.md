# AKShare Market Provider

Phase 6.6 uses a read-only Python function in `api/market.py`. The browser never calls AKShare directly. Next.js calls the function through `AKShareMarketDataProvider`, validates the payload, and stores successful responses in `finance_market_snapshots`.

## Local development

Use Python 3.12 for parity with deployment, install `requirements.txt`, and run the two processes:

```text
python api/market.py
npm run dev
```

Required server-only environment variables:

```text
MARKET_DATA_PROVIDER=akshare
MARKET_DATA_BASE_URL=http://127.0.0.1:8765
MARKET_DATA_API_KEY=<shared-random-secret>
MARKET_CACHE_TTL_MINUTES=30
```

The Python process and Next.js must receive the same `MARKET_DATA_API_KEY`.

## Vercel

Vercel builds `api/market.py` as a Python Function using `.python-version` and `requirements.txt`. Set `MARKET_DATA_BASE_URL` to the full deployed function URL, for example `https://<deployment-host>/api/market`. Keep the API key server-only.

No scheduled refresh is required. The page reads a valid Supabase snapshot first and only refreshes after TTL expiry or an explicit user action. If AKShare fails, the last successful snapshot is shown with its original market and fetch times.
