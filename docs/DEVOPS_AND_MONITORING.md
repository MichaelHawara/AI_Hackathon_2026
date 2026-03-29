# DevOps, Monitoring, and Responsible AI Lifecycle

This document describes how **CareerPath AI** can be operated post-deployment in line with **NIST AI RMF** lifecycle thinking (Map, Measure, Manage, Govern) and the hackathon’s **Dev + Ops** expectation—not only model training.

## 1. Map (context and risks)

| Asset | Notes |
|--------|--------|
| Job feeds | Indeed RSS, LinkedIn RSS, Google Careers API — third-party availability, rate limits, geographic skew. |
| O*NET-derived clusters | Static JSON subset; versioning in `onetSkillClusters.json`. |
| Gemini | Google AI Studio / Vertex; API keys rotated; prompts logged for audit. |
| User data | Firebase Auth + Firestore; PII minimized in logs. |

**Risks:** stale listings, biased geographic coverage, proxy bias in fit scores, LLM hallucinations in resume parsing or chat.

## 2. Measure (metrics)

| Metric | Purpose |
|--------|---------|
| **API health** | `GET /api/health` — uptime, latency. |
| **Feed freshness** | Timestamp of last successful `/api/jobs` aggregation; alert if older than N hours. |
| **LLM error rate** | Count of Gemini failures / total calls; spike may indicate quota or model deprecation. |
| **Fit score distribution** | Track mean and variance by `job.source`; large drift may indicate feed change. |
| **Fairness (subgroup)** | Compare score distributions across regions or job sources (optional cohort labels only with consent). |
| **User feedback** | Thumbs up/down on Role coach replies; “report incorrect parse” on resume import. |

## 3. Manage (response)

- **Model/version pinning:** `VITE_GEMINI_MODEL` documented; monitor release notes for retirement (404 handling exists in client).
- **Fallbacks:** Model fallback chain in `gemini.ts`; jobs fall back to mock data if feeds fail.
- **Rollback:** Deploy previous static `dist/` build; feature flags for “show alignment score” if needed.
- **Incident response:** Disable resume parsing or Role coach via env if API abuse detected.

## 4. Govern (accountability)

- **Documentation:** `CHALLENGE_COMPLIANCE.txt`, this file, in-app disclaimers on fit scores.
- **Data retention:** Define Firestore TTL or export policy for old documents.
- **Access control:** Firebase rules restrict user data to `uid`.
- **Review:** Periodic review of O*NET cluster definitions vs. latest SOC updates.

## 5. Drift and data quality

- **Concept drift:** Job titles evolve; refresh keyword clusters quarterly.
- **Data quality:** Empty or truncated descriptions reduce fit reliability — show lower confidence (implemented).
- **Feedback loop:** Use reported bad parses to tune resume prompt or add validation rules.

## 6. Optional production stack

- **Observability:** OpenTelemetry traces for API routes; log aggregation (e.g. Cloud Logging).
- **Dashboards:** Grafana for job feed success rate, Gemini latency, error ratio.
- **Alerts:** Pager/on-call when `/api/health` fails or error rate &gt; threshold.

---

*This is a design document for the hackathon codebase; wire specific tools (Sentry, Datadog, etc.) as your deployment environment requires.*
