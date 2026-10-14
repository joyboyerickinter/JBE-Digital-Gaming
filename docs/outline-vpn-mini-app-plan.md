# Outline VPN Telegram Mini App — Implementation Plan

## Goal
Extend the existing JBE Digital + Gaming Next.js 15 app with a Telegram Mini App for selling Outline VPN access across three Outline servers. Preserve the existing product catalog, orders, reseller portal, and admin features.

## Customer flow
1. Open the JBE Outline Mini App from Telegram.
2. See a branded welcome screen and browse active VPN packages/prices.
3. Select a package and a supported payment method.
4. See the configured KBZPay/AYA Pay recipient details and upload a payment screenshot.
5. Create a pending order and receive a Telegram confirmation.
6. Admin receives an order notification with screenshot and Approve/Reject actions.
7. On approval, server-side code creates an Outline access key on the assigned Outline server, saves key metadata, and notifies the customer.
8. Customer can reopen the Mini App and view their own order history and approved keys.

## Admin capabilities
- Create/edit/disable packages, descriptions, duration, price, and server assignment.
- Configure displayed payment recipient details.
- Review pending orders and payment screenshots.
- Approve or reject orders; rejection should accept a reason.
- View customer orders and key status.
- Revoke keys where supported by the Outline management API.

## Architecture
- Existing Next.js App Router app deployed on Vercel.
- Supabase Postgres for packages, payment settings, order metadata, and access-key metadata.
- Private Supabase Storage bucket for payment screenshots.
- Telegram Mini App signed init data validated server-side before treating Telegram user data as trusted.
- Telegram Bot API webhook for admin notifications and approval/rejection callbacks.
- Outline management API called only from server-side routes.
- Three Outline API URLs configured as Vercel server-only environment variables. Never store or expose their secret API paths in client code.

## Proposed server-only configuration
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_USER_ID
- TELEGRAM_WEBHOOK_SECRET
- OUTLINE_SERVER_1_API_URL
- OUTLINE_SERVER_2_API_URL
- OUTLINE_SERVER_3_API_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- Existing public Supabase URL and publishable key as already required by the app.

## Security requirements
- Never trust Telegram initDataUnsafe; validate the raw initData on the server.
- Never expose Telegram bot token, Supabase service-role key, or Outline API URLs to browser code.
- Store payment screenshots in a private bucket and issue short-lived signed URLs for admin review.
- Enforce admin authorization on every admin API route and callback.
- Prevent duplicate key creation on repeated approvals.
- Customers can retrieve only orders and keys associated with their validated Telegram user ID.
- Keep the new workflow isolated from existing gaming/reseller order logic.

## Rollout
1. Confirm exact package names/prices/durations, payment recipients, Telegram bot/admin identity, and server assignment.
2. Add database migration and private storage policies.
3. Implement Telegram init-data verification, customer UI, package management, order submission, and private screenshot upload.
4. Implement Telegram webhook and idempotent approval/rejection handling.
5. Integrate Outline access-key creation/revocation.
6. Add required Vercel environment variables, set the Telegram webhook, and test end-to-end before production.
