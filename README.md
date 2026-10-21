# iSAX Market

A single-store Ugandan e-commerce project, built with HTML, CSS, and vanilla JavaScript ES modules. The design is a foundation for a Firebase-backed application with a trusted backend for checkout and other sensitive operations.

## Current status: Phase 2 scaffold

This project now includes a responsive storefront, catalogue product detail pages, shopping bag and checkout flows, and a secure admin dashboard structure. It is still a staged project and not a live store until Firebase project settings, production rules, and backend services are configured and tested.

The storefront includes search, category filters, sorting, mobile navigation, the theme toggle, product detail pages, cart persistence, checkout demo flows, and owner dashboard structure. Firebase, authentication, database, image storage, payments, and Gemini are not connected to a live backend yet, but the application is prepared for the next integration phase.

The current visual direction is deliberately retail-led: a compact utility header, short editorial introduction, direct catalogue controls, consistent image placeholders, and restrained paper, ink, green, and rust colours. It uses system fonts and no decorative product illustrations or unsupported social proof. Replace the labelled image placeholders with the store's own product photography when genuine listings are available.

## Architecture

- **Storefront:** static HTML/CSS and browser-native ES modules, no frontend framework or bundler.
- **Identity and customer data (Phase 2):** Firebase Authentication and Firestore with owner-scoped security rules. The project includes configuration placeholders and demo-mode auth fallbacks until the real Firebase project is connected.
- **Catalogue and images (Phase 3):** Firestore product records and Firebase Cloud Storage; privileged changes require server-managed administrator claims.
- **Orders, inventory, payments (Phases 4–5):** trusted Cloud Functions validate prices and stock, create orders, request and verify payments, and record audit events. The browser is never authoritative for totals or payment confirmation.
- **Shopping assistant (Phase 6):** Firebase AI Logic with App Check and verified catalogue context; AI is not a source of product, stock, or payment truth.
- **Hosting (Phase 8):** Firebase Hosting or another suitable production host, after the project, rules, and required backend have been configured and tested.

Initial structure:

```text
index.html
assets/
  css/styles.css
  images/brand-mark.svg
  images/favicon.svg
  js/main.js
functions/              # add with trusted-backend phase
firestore.rules          # add with Firebase security phase
storage.rules            # add with Firebase security phase
firestore.indexes.json   # add as data queries are introduced
```

Backend and security files are intentionally not stubbed with insecure or nonfunctional rules. Add these alongside the features they protect.

## Run locally

Serve this directory over HTTP so the browser can load JavaScript modules. With Node.js installed:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser. No project build or package installation is required.

## Firebase setup checklist

1. Install Firebase CLI:
   ```sh
   npm install -g firebase-tools
   ```
2. In the Firebase console, create a project and enable Authentication, Firestore, Storage, and Hosting.
3. Replace the placeholder values in [assets/js/firebase-config.js](assets/js/firebase-config.js) with your project configuration.
4. In Firebase Authentication, enable Email/Password sign-in.
5. Configure Firestore and Storage rules using [firestore.rules](firestore.rules) and [storage.rules](storage.rules).
6. Deploy the app with:
   ```sh
   firebase login
   firebase use --add
   firebase deploy
   ```

## Phase 1 checks

- Open the homepage on desktop and mobile widths.
- Search listings; try category filters and each sort option.
- Toggle the theme, reload, and check that preference is retained where browser storage is available.
- Open and close the mobile navigation, including with Escape, and open/close the assistant preview.
- Confirm that preview labels are visible and no real checkout or contact details are implied.

## Before launch

The store owner must supply genuine contact details, approved payment methods and instructions, delivery/collection terms, privacy and returns policies, Firebase project settings, and (if enabled) approved payment-provider credentials. Never place service-account credentials, payment secrets, or a raw Gemini Developer API key in browser code or source control.

Proceed phase by phase, adding security rules with the data and operations they protect. The store is not ready for production until its external services are configured, tested, and deployed.
