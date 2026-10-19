# Command Deck integration contract

Preserve the existing loopback, origin, filesystem and human APPLY controls. The new service does not publicly expose the local API.

The relay reads only `/api/dashboard` on loopback. It projects registered project IDs, time and the existing `health` enum into a signed snapshot. No roots, file paths, source code, work-item text, customer data or Command Deck token leave the relay.

HMAC input is `timestamp.nonce.route.exactBody`. A five-minute time window and ten-minute Redis nonce reservation reject stale/repeated requests. Schema checks reject unknown projects and production-health overrides. Duplicate observation times are ignored.

Run `npm run deck:relay` with the documented local environment. It opens no inbound port or tunnel. Cloud task/report state remains independent of the laptop. Local source changes and APPLY review are outside this relay's capabilities.
