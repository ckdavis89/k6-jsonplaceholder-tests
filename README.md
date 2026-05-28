# k6 JSONPlaceholder Performance Tests

A performance test suite for the [JSONPlaceholder](https://jsonplaceholder.typicode.com) REST API built with [k6](https://k6.io).

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) v0.46+
- Node.js (optional — only needed for `npm run` shortcuts)

## Running tests

```bash
npm run smoke    # 1 VU, ~30s  — sanity check before anything else
npm run load     # up to 20 VUs, ~2m  — normal traffic
npm run stress   # up to 60 VUs, ~8m  — find the breaking point
npm run spike    # up to 100 VUs, ~1m — sudden burst
npm run soak     # 20 VUs, ~40m — sustained endurance run
```

Or directly with k6:

```bash
k6 run tests/smoke.js
```

To run against a different environment, pass the base URL as an environment variable:

```bash
k6 run -e BASE_URL=https://staging.myapi.com tests/load.js
```

If omitted, tests default to `https://jsonplaceholder.typicode.com`.

## Test types

| Test | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 1 | ~30s | Verify the scripts work and the API is reachable before committing time to longer runs |
| Load | up to 20 | ~2m | Validate correctness and performance under normal expected traffic using weighted read/write scenarios |
| Stress | up to 60 | ~8m | Incrementally increase load to find where response times degrade or errors appear |
| Spike | up to 100 | ~1m | Simulate a sudden traffic burst and verify the API recovers cleanly once load drops |
| Soak | 20 | ~40m | Hold steady load over time to surface issues that only emerge gradually, such as memory leaks or connection pool exhaustion |

## Project structure

```
k6-jsonplaceholder-tests/
├── tests/
│   ├── smoke.js       # 1 VU sanity check
│   ├── load.js        # weighted read/write scenarios (75% readers, 25% writers)
│   ├── stress.js      # escalating load staircase
│   ├── spike.js       # sudden traffic burst
│   └── soak.js        # 40-minute endurance run
├── utils/
│   └── helpers.js     # shared base URL, headers, payload builders, and summary handler
├── results/           # JSON result files written here after each run (git-ignored)
├── .gitignore
└── .github/
    └── workflows/
        └── tests.yml  # CI pipeline
```

## Understanding the output

After each run k6 prints a summary. The key sections:

**Thresholds** — your pass/fail rules. A `✓` means the rule was met; `✗` means it was breached and the run exits with a non-zero code.

```
✓ http_req_duration  p(95)<500   — 95% of requests finished in under 500ms
✓ errors             rate<0.01   — fewer than 1% of requests triggered a failed check
```

**Checks** — per-request assertions (correct status code, expected response shape). Reported as a pass rate out of total checks.

**Custom metrics** — named metrics defined in individual test files (e.g. `post_list_duration`, `response_trend`) that let you track specific endpoints independently of overall request duration.

**HTTP** — raw request stats including `http_req_duration` percentiles and `http_req_failed` rate.

**Execution** — virtual user count and iteration throughput over the run.

## Thresholds reference

| Test | Threshold | Rationale |
|------|-----------|-----------|
| Smoke | `http_req_failed rate==0` | Zero tolerance — if anything fails during a 1-VU check the script is broken |
| Load | `p(95)<500ms`, `errors<1%` | Normal traffic should be fast and reliable |
| Stress | `p(99)<1500ms`, `errors<5%` | Some degradation under heavy load is acceptable |
| Spike | `p(95)<2000ms`, `errors<10%` | Survival matters more than speed during a burst |
| Soak | `p(95)<500ms`, `errors<1%` | Performance should not drift over time |

## CI/CD

Tests run automatically via GitHub Actions (see [.github/workflows/tests.yml](.github/workflows/tests.yml)).

**On every push and pull request to `main`** (fast feedback, ~5 minutes total):
1. Smoke test — confirms scripts are not broken
2. Load test — validates normal traffic behavior
3. Spike test — checks burst recovery

**Nightly at 2am UTC** (thorough, ~50 minutes total):
1. Stress test — escalating load to find the breaking point
2. Soak test — 40-minute endurance run

The stress and soak tests are excluded from the push/PR pipeline because their duration would make every merge slow. Running them nightly ensures they still catch regressions without blocking development.

After each run, results are saved as JSON to `results/` and uploaded as a GitHub Actions artifact. Artifacts are accessible from the workflow run's summary page and are retained for 90 days, giving you a history of every CI run to compare against.