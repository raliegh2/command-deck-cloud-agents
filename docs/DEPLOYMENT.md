# Deployment and activation

The owner chose `ENABLE_PAID_AI=false` and reviewed fixes only. Preserve those settings across releases.

## Vercel and storage

Deploy to the new `command-deck-cloud-agents` project using `eve deploy --non-interactive --yes`. Node 24 is required. Let Vercel build the source; do not publish a Windows prebuilt bundle to Linux. The installed eve docs are the version-specific implementation reference.

Upstash Marketplace setup uses Free, primary region iad1, eviction=false, autoUpgrade=false and prodPack=false. The owner accepted marketplace terms. Missing credentials make operational requests fail closed, even though liveness remains available.

Required environment variable names are `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or their `UPSTASH_REDIS_REST_*` equivalents), `OPS_ADMIN_TOKEN`, `CRON_SECRET`, `DECK_BRIDGE_SECRET` and `ENABLE_PAID_AI=false`. Generate three independent random secrets of at least 32 characters. The configuration script keeps a gitignored local handoff and passes values only inside the CLI process memory; it never prints them or puts them in OS process arguments.

Preview/development state uses a different Redis namespace from production.

## Scheduling

The eve schedule runs daily at 14:17 UTC (09:17 America/Bogota). To activate the separate 15-minute GitHub trigger, set repository variable `CLOUD_OPS_URL` to the verified production alias and repository secret `CRON_SECRET`. No owner token belongs in that workflow. GitHub schedules can be delayed; inspect freshness rather than assuming execution.

## Notion

Create a dedicated internal integration and share only the report-parent page with it. Set `NOTION_REPORT_TOKEN` and `NOTION_REPORT_PARENT_ID` in Vercel's secret environment. Never paste the token into chat or a public issue. The coding session's Notion connector does not grant deployed-app access.

Each report becomes a child page. Sending is persisted before the request. An ambiguous result becomes `needs_reconciliation`; search for its UUID in the parent before resolving it. Do not blindly retry ambiguous creates.

The installed optional eve MCP template is disabled and restricted to search/fetch. A separately authorized Vercel Connect app grant is needed to enable that context connection. It is distinct from deterministic report publishing.

## Obsidian and local relay

The cloud queues reports while a device is offline. Set device variables `CLOUD_OPS_URL`, `OPS_ADMIN_TOKEN`, `OBSIDIAN_VAULT`, then run `npm run obsidian:sync`. Output goes under `07 Cloud Operations`. Cursor and hashes prevent duplicate downloads and conflicting local overwrites.

For local-project visibility also configure `COMMAND_DECK_URL`, `COMMAND_DECK_TOKEN` and `DECK_BRIDGE_SECRET`, then run `npm run deck:relay`. A device scheduler can run these after secrets are configured; this repository does not install startup services by default.

## Later model activation

Before enabling AI, configure a supported provider, review data routing and set account-level spending controls. Session cost limits are post-call soft limits, not absolute billing caps; infrastructure has separate costs. The root plus 14 subagents expose only bounded source/context reads and proposal recording.

If adopting OpenAI's managed Codex harness, use the official Agents API and an isolated environment. This release does not enable or invoke that adapter. Preserve the role instructions, allowlists and review policy.

## Activation checks

Verify deployment revision, anonymous rejection, disabled model execution, a successful monitoring cycle and persisted results. Confirm cron registration and GitHub workflow separately. After authorizing Notion, verify a page receipt; then pull the same report to Obsidian and compare its UUID. Test the relay and confirm stale local projects remain unobserved.
