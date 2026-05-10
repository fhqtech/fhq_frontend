# Generated API types

`api.gen.ts` is **auto-generated** from the FastAPI backend's OpenAPI spec.
Do not hand-edit it — your changes will be wiped on the next codegen run.

## How to regenerate

### Option A — backend running locally

```bash
# Terminal 1: backend
cd ../recruiter-assist-backend
.venv/bin/uvicorn funnelhq_api.main:app --port 8082

# Terminal 2: frontend
npm run gen:api
```

### Option B — from snapshot file (no backend needed)

The committed snapshot at `../recruiter-assist-backend/openapi-snapshot.json`
is updated whenever the backend's API surface changes (FastAPI native
routers only — Flask blueprints don't appear in OpenAPI):

```bash
npm run gen:api:from-file
```

To refresh the snapshot, boot the backend and run:

```bash
curl -s http://127.0.0.1:8082/openapi.json | python3 -m json.tool \
  > ../recruiter-assist-backend/openapi-snapshot.json
```

## What's covered

Currently generates types for the 4 ported FastAPI routers:

- `auth` — 9 routes (`/api/auth/*`)
- `scores` — 3 routes (`/api/scores/*`)
- `candidate-profile` — 7 routes
- `credits` — 3 routes
- `health` — 2 routes (`/`, `/health`)

= **22 native API endpoints with end-to-end type safety**

The remaining ~140 endpoints serve via the legacy Flask WSGI mount and
are NOT in OpenAPI. Hand-rolled types in `src/services/*.ts` still
cover those.

## How to use the generated types

```typescript
import type { paths, components } from "@/types/api.gen";

// Path operations
type LoginBody = paths["/api/auth/login"]["post"]["requestBody"]["content"]["application/json"];
type LoginResponse = paths["/api/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];

// Schema components
type UserPayload = components["schemas"]["UserPayload"];
type ScoreRow = components["schemas"]["ScoreRow"];
```

For a typed fetch client, consider adding `openapi-fetch` later:

```bash
npm install openapi-fetch
```

```typescript
import createClient from "openapi-fetch";
import type { paths } from "@/types/api.gen";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8082",
});

// Now: apiClient.GET("/api/scores/all", { ... }) is fully typed
```
