# SafeWork website integration

Routes: /health-and-safety, /safework, /safework/order.
Reuses local SafeWork knowledge, generation instructions and A4 HTML renderer. The original local app is unchanged.

Sales default OFF. £14.99 is a test-only suggested amount, not an approved live price.
Required Cloudflare Worker secrets: STRIPE_TEST_SECRET_KEY for test checkout, STRIPE_SECRET_KEY for live checkout, OPENAI_API_KEY for generation. Never put values in Git or browser code. Existing webhook secrets remain in place.
Non-secret configuration: SAFEWORK_MODE=test or live; SAFEWORK_SALES_ENABLED=true only after verification; SAFEWORK_PRICE_PENCE must explicitly specify the confirmed total for live sales. SAFEWORK_MODEL optionally overrides the imported generator's model.
Apply migrations/0003_safework.sql to FULFILMENT_DB before enabling checkout.
Stripe checkout.session.completed goes to the existing /api/stripe/webhook endpoint. Test events require STRIPE_TEST_WEBHOOK_SECRET; live events require STRIPE_WEBHOOK_SECRET. Returning to an order also verifies payment directly with Stripe.

Orders use 256-bit private recovery links with only a hash stored in D1. Input and document are private, retained for repeat access. A lost recovery link currently needs manual support; there is no customer login or automatic recovery email. Checkout recovery link is shown before Stripe. Customer must keep it private. Card details remain in Stripe.
Generation uses an atomic 4-minute lease, a 3-attempt support threshold and a 3-minute API timeout. Completed documents are reused. Network failures require refreshing order status before retrying. Payment and generation are separate; visiting the saved order starts generation after confirmed payment. No background generation when a buyer never returns. Support can inspect the paid order and resolve/refund it through Stripe; no automatic refunds are implemented.
Downloaded pack is HTML, printable to PDF with the browser. No PDF/Word binary exporter, online document editor, customer accounts or hosted safety chat is included in this first paid-pack integration. No claims of professional approval or compliance guarantees.

Validation: node --test tests/safework.test.mjs tests/safework-integration.test.mjs tests/fulfilment.test.mjs; npx tsc --noEmit; npm run build. Integration tests mock Stripe/OpenAI and use in-memory SQLite; they are NOT actual Stripe sandbox or model-output acceptance tests.
Before enabling sales: confirm total/VAT treatment with owner, connect keys, verify a real Stripe test payment and refund/cancellation path, assess actual model output and print quality, establish customer refund/support and privacy terms. Confirm source updates and competent-person review of representative packs. Sales must remain disabled until the end-to-end service is verified.
