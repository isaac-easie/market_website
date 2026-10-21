# iSAX Market

A single-store Ugandan retail storefront built with HTML, CSS, browser ES modules, Firebase Authentication, Cloud Firestore, Cloud Storage, Firebase AI Logic, and Firebase Cloud Functions.

## Current status

The repository now contains a working integration implementation, but it is **not launch-ready until the owner configures and tests the Firebase project and business-specific settings**. No Firebase project, App Check site key, owner account, payment instructions, customer contact details, or payment-provider account were provided, so no external service has been configured or deployed from this workspace.

Implemented:

- Responsive storefront with sample catalogue fallback, live Firestore product reads, filters, sort, detail pages, and image upload support in the owner dashboard.
- Firebase email/password customer registration, login, and password reset. Placeholder Firebase values do not create fake/demo accounts.
- Owner dashboard requiring the server-issued `admin` custom claim. Product and store settings edits use Firestore rules; order status and manual payment review go through callable functions.
- Server-side order creation: the browser submits product IDs and quantities only; the function reads authoritative product prices, checks availability, updates stock in a Firestore transaction, calculates UGX totals, and uses an idempotency key.
- Manual mobile-money reference submission remains pending until an owner verifies it. Order/payment changes create audit records.
- Firebase AI Logic Gemini assistant UI that uses live catalogue context only. It does not send the sample fallback catalogue to Gemini.
- Firestore and Storage rules deny client order/payment writes and restrict privileged access to the server-issued owner claim.

Not implemented or not externally verified:

- Flutterwave/Pesapal or other online payment provider, webhook verification, refunds, or automated settlement.
- Cross-device cart sync (the cart currently persists in this browser only).
- Store-specific privacy/returns/fulfilment policy pages, genuine contact details, and delivery zones/fees beyond a single owner-entered delivery fee.
- Live Firebase/Auth/Firestore/Storage/App Check/Gemini deployment or end-to-end tests against a real project.

Do not use the sample products/prices for sales. The site must not be treated as production-ready until the Firebase setup and launch checklist below have been completed.

## Run locally

Serve the directory over HTTP (ES modules require an HTTP origin):

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. Without Firebase settings, catalogue pages use explicitly labelled sample items; sign-in and checkout are unavailable, and no demo orders are created.

Run the backend input-validation tests:

```sh
cd functions
npm test
```

## Firebase project setup

1. Create a Firebase project. Enable Authentication (Email/Password), Firestore, Storage, and Firebase AI Logic. Cloud Functions deployment requires a billing-enabled project.
2. Install and sign in to the Firebase CLI, then select the real project:
   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use --add
   ```
   This replaces the placeholder project alias in `.firebaserc`.
3. Copy the Web App config values into `assets/js/firebase-config.js`. Client config is public; security comes from rules, App Check, and server authorization.
4. Register a web app in Firebase App Check using reCAPTCHA v3, then set the site's public reCAPTCHA key in `appCheckSiteKey` in `assets/js/firebase-config.js`. Configure the local/deployed domains in App Check. Enable App Check enforcement for the callable functions and relevant Firebase services only after the client has been configured.
5. Install backend dependencies and deploy:
   ```sh
   cd functions
   npm install
   cd ..
   firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
   ```
6. Register a customer account through the website. Provision the store owner out of band using an operator identity with Firebase Admin permissions (Application Default Credentials), never from the browser:
   ```sh
   cd functions
   gcloud auth application-default login
   GCLOUD_PROJECT=YOUR_PROJECT_ID node scripts/set-admin-claim.cjs owner@example.com true
   ```
   The owner must sign out and back in to refresh the claim. To remove access, pass `false`.
7. Sign in with the owner account at `/admin/`. Add real product records and images. Configure checkout settings there only after confirming actual fulfilment charges, payment methods, and mobile-money instructions with the business owner.
8. Enable Firebase AI Logic and App Check/usage controls in the Firebase console. Test the assistant only with the live Firestore catalogue. Model availability and cost depend on the selected Firebase project and region.

Do not commit service-account JSON or provider secrets. The owner-claim script uses local Application Default Credentials and should only be run by a trusted operator.

## Firestore document shapes

- `users/{uid}`: `{ email, name, role: "customer", createdAt, updatedAt }`. Customers can update only their own display name; the role is immutable to clients.
- `products/{productId}`: `{ name, description, category, sku, condition, priceUgx, stock, isActive, featured, imageUrl, createdAt, updatedAt }`. Only owners can write.
- `settings/public`: `{ checkoutEnabled, allowedPaymentMethods, deliveryFeeUgx, mobileMoneyInstructions, updatedAt, updatedBy }`. This document is publicly readable, so only put customer-facing instructions here.
- `orders/{orderId}`: server-created immutable item/price snapshots plus customer and fulfilment data, UGX totals, order status, and payment status. A callable function creates/updates orders; clients can only read their own.
- `checkoutRequests/{uid_key}`: server-only idempotency mapping.
- `payments/{orderId}` and `paymentReferences/{referenceHash}`: server-only manual payment review and duplicate-reference records.
- `auditLogs/{logId}`: server-created owner-readable audit entries.

The current static rules do not permit client-side cart documents. Cart contents stay in browser local storage and are re-priced and re-validated at checkout. Firestore automatic indexes cover the current catalogue and customer-order queries; owner order history uses the built-in `createdAt` index.

## Manual payments

The supported manual methods are cash on delivery, cash on collection, and mobile money with owner verification. Only methods selected in the owner dashboard are shown. Mobile-money instructions are public and must be genuine. Entering a transaction reference never marks an order paid; an authorized owner must check the real transaction and verify or reject it from the dashboard.

No online payment provider is wired. Do not advertise online card/mobile payments as functional. A provider integration requires approved merchant credentials, documented checkout APIs, server-side amount/currency verification, webhook signature verification, duplicate-event protection, and live test transactions before it can be enabled.

## Deployment safety and launch checklist

- Replace `.firebaserc` with the real Firebase project, configure the web app and App Check, and test Auth.
- Deploy the provided Firestore/Storage rules and Functions; verify unauthenticated and customer writes to order/payment documents are denied.
- Provision only the intended owner custom claim, test access removal, and review the Firebase audit log.
- Create real products and confirm stock/price changes and concurrent checkout behavior in the emulator/test project.
- Configure actual store delivery/collection terms, mobile-money instructions, privacy/returns policy, and contact information.
- Verify manual payment on real provider records. Implement and test a provider webhook before enabling any online payments.
- Configure Firebase AI Logic quotas and App Check; monitor usage/cost and ensure recommendations use only the live catalogue.
- Test desktop/mobile layouts, customer isolation, checkout retries, stock limits, cancellation stock restoration, payment review, and hosting refresh behavior.
- Back up Firestore and document who can access the Firebase project before commercial launch.
