# Dropship Manager

A tenant-scoped commerce operations application with an idempotent order state machine, transactional inventory reservation, provider-backed tax/payment/shipping operations, signed webhooks, reconciliation, and append-only order audit history.

## Safe local setup

1. Copy `.env.example` to `.env` and replace every required value. Use different 32+ character values for `JWT_SECRET`, `ORDER_AUDIT_SIGNING_KEY`, and each webhook secret.
2. Install exactly the locked dependencies with `npm ci`.
3. Provision an empty PostgreSQL database and run `./migrate.sh`. Migration refuses to mutate an unversioned legacy schema.
4. Set the `BOOTSTRAP_*` variables only in your process environment and run `npm run account:create`. Remove the bootstrap password from the environment immediately afterward.
5. Run `./start.sh`. Startup never installs packages, migrates, seeds, resets data, kills processes, or frees ports.

There are no demo credentials or simulated provider responses. Order creation fails closed until the tax contract is configured, and payment, refund, shipment, inventory, and partner operations use configured provider adapters.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

Integration tests require a disposable PostgreSQL database whose `DATABASE_URL` has already received `npm run db:migrate`. They cover duplicate actions and webhooks, concurrent oversell prevention, payment failure recovery, partial fulfillment, reconciliation exceptions, and audit immutability.

## Operations

- `migrate.sh` applies only reviewed, versioned migrations.
- `backup.sh /explicit/new/file.dump` creates a PostgreSQL custom-format backup and refuses overwrite.
- `restore.sh /explicit/file.dump` requires `CONFIRM_RESTORE=RESTORE_TO_EMPTY_DATABASE`.
- `compose.yaml` runs migration as a one-shot dependency and the application as non-root with a read-only filesystem.
- Provider contracts and incident/recovery steps are in `docs/`.

The former generic AI and generated gap/demo routes were removed from executable product paths; operational decisions now use deterministic rules and provider evidence.
