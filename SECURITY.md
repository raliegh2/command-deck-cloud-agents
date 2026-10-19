# Security boundaries

This public repository contains application code and public project metadata only. Operational state, reports, tokens, local paths, customer records, raw source snapshots and personal knowledge exports do not belong in Git.

- Operational HTTP routes require independent owner or scheduler secrets. The signed relay cannot override production endpoint observations.
- Model session routes additionally require `ENABLE_PAID_AI=true`. No model is called by probes, report delivery or cron handlers.
- Default agent tools are disabled. There is no arbitrary URL, shell, SQL, deploy, merge, broker-order or production mutation tool.
- Source reads use registered GitHub repository paths and reject traversal and credential files. Treat allowed source content as untrusted; allowlisting does not make file contents secret-free.
- The optional Notion MCP connection is disabled by default and restricted to search/fetch. Deterministic publishing uses a separate report-parent integration.
- Relay signatures include timestamp, nonce, route and exact body. Redis enforces nonce reuse prevention. Raw Command Deck tokens never leave the local relay.
- Upstash Redis is mandatory for operational writes; missing storage fails closed. State leases use owner-checked atomic commits. No in-memory production fallback exists.
- Reports are immutable cloud records. Notion sends with missing receipts are held for reconciliation. The Obsidian pull refuses to overwrite conflicting local edits.
- An explicit disabled sandbox provider rejects attempts to open execution environments. No native execution tools are exposed and builds provision no hosted VMs.

Report vulnerabilities privately to the repository owner. Do not put credentials or customer information in public issues.
