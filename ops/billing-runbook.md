# Billing runbook — skeleton (A7; fills in at R3)

**Status:** pre-R3 skeleton. Payments land Jun 28–Jul 10 (`api/billing.js`
= Vercel function #12, the LAST slot). Until then, the only grant path is
manual: `?_action=grant-entitlement` with `PICKEM_ADMIN_TOKEN`.

## Providers

| Currency | Provider | Status |
|---|---|---|
| USD | Stripe Checkout | keys pending (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| IDR | Midtrans Snap (QRIS/GoPay/OVO/Dana/VA) | **KYB application — Ade, blocking** |

Stopgap if KYB slips past Jun 28: bank-transfer + manual grant (admin
token), logged in this file's ledger section.

## Invariants (never break)

1. **No real-money pools.** Revenue is SaaS hosting fees only — never a
   cut of stakes, no pots, no "main duit" copy (judi online line).
2. Webhooks are signature-verified and **idempotent on
   `(provider, provider_ref)`** — the unique index in migration 0019
   enforces replay-safety at the DB.
3. We never touch card/QRIS data — provider-hosted pages only.
4. Entitlement writes happen ONLY in webhooks + the admin grant path
   (service role); the client only reads `my-entitlements`.
5. Legal note (`FLegalNote`) present on every payment surface.

## Refund / void path (to be detailed at R3)

- Stripe: refund in dashboard → webhook `charge.refunded` → expire the
  entitlement row (`expires_at = now()`), flip `leagues.tier` back if no
  other live pass covers it.
- Midtrans: same shape via Snap notification.
- Manual grants: delete the row + tier flip by hand; log below.

## Manual grant ledger

| Date | User | Product | Reason | Ref |
|---|---|---|---|---|
| — | — | — | — | — |
