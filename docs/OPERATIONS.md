# Operations and recovery

## Order exceptions

1. Locate the order by merchant and inspect `/api/orders/{id}/history`. Verify the event hash chain and provider checksums before changing external systems.
2. Run the merchant-admin reconciliation endpoint for payment, shipping, inventory, and partner providers.
3. A mismatch places the order in `exception`. Resolve the external discrepancy, reconcile again, then apply `recover` with an explicit allowed `recoveryState` and a new idempotency key.
4. Never update order events. PostgreSQL rejects updates/deletes, and application code signs each event against its predecessor.

## Failed webhooks

Inspect `webhook_receipts` by provider and event ID. Confirm the stored payload hash matches the provider replay. A receipt marked `failed` may be retried with the identical signed payload; altered reuse returns conflict. `processing` receipts require checking the order audit before any manual replay.

## Backup and restore

Run `backup.sh` to a new, access-controlled path and test restores in an isolated environment. `restore.sh` refuses to run without the explicit empty-database confirmation. After restore, validate migration journal state, order-event immutability, row counts by merchant, webhook receipt uniqueness, and provider reconciliation before admitting traffic.

## Legacy data

The migration runner refuses an existing unversioned schema. Such records lack trustworthy tenant and idempotency provenance. Keep the legacy database read-only, export it, assign merchant ownership through a reviewed mapping, import into a disposable migrated database, reconcile every open order, and obtain approval before cutover.

## External launch gates

Production launch still requires contracted tax/payment/carrier/inventory/partner providers, merchant onboarding and tenant mapping, jurisdictional tax review, PCI responsibility confirmation, production secret rotation, load and failover tests, backup-restore evidence, accessibility review, and an incident-response owner.
