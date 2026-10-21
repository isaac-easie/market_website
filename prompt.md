# MASTER PROMPT: BUILD iSAX MARKET — A COMPLETE AI-POWERED SINGLE-STORE E-COMMERCE WEBSITE

Act as a senior full-stack web developer, Firebase engineer, cybersecurity specialist, payment integration engineer, Gemini AI specialist, and UI/UX designer.

Build a complete, responsive, functional online store called **iSAX Market**, operated by a single store owner. Customers must be able to discover products, create accounts, add products to their carts, place orders, make payments through supported methods, and track their purchases.

The website must integrate Firebase as its backend, Google Gemini AI as an actual AI service, and support a production deployment using suitable hosting.

Do not build a static mockup. Implement real application logic, persistent data, authentication, product management, order processing, payment verification, AI functionality, and security controls.

## 1. Fixed technology stack

Use:

- HTML5
- CSS3
- Vanilla JavaScript using ES modules
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Storage for product images
- Firebase AI Logic for Gemini where appropriate
- Firebase App Check
- Firebase Cloud Functions or another suitable trusted backend for sensitive operations
- Git and GitHub for version control
- Firebase Hosting or another suitable production host for the commercial website

Avoid React, Vue, Angular, and other frontend frameworks. Do not introduce a framework unless I explicitly approve it.

Keep the code modular, readable, lightweight, and suitable for someone learning web development.

## 2. Brand and user experience

Create a professional e-commerce identity for iSAX Market.

The store should look modern, trustworthy, polished, and mobile-first.

Include:
- A custom wordmark and favicon.
- A homepage hero section.
- A clear search bar.
- Product categories.
- Featured and recently added products.
- Product cards with image, price, availability, and product name.
- Product details pages.
- A shopping cart with quantity controls.
- A secure checkout interface.
- Customer account pages.
- A floating Gemini shopping assistant.
- A store-owner dashboard.
- An order tracking interface.
- A footer with contact information, policies, and customer support details.
- A working light/dark theme toggle.
- Responsive layouts for mobile, tablet, and desktop.
- Accessible forms, keyboard navigation, readable typography, and clear colour contrast.
- Loading indicators, toast notifications, empty states, and useful error messages.

Use Ugandan Shillings (UGX) throughout the store. Format amounts clearly and consistently.

Do not invent a real business address, phone number, delivery promise, or payment account. Use clearly labelled placeholders until I supply genuine business details.

## 3. Store-owner model

This is a SINGLE-STORE WEBSITE, not a multi-vendor marketplace.

Only the authorised store owner or administrator can create, update, remove, and manage product listings.

Customers can register and log in, browse products, manage their own carts, place orders, make payments, review eligible purchases, and track orders.

Provide two main interfaces:

1. Customer storefront.
2. Protected store-owner dashboard.

Use Firebase Authentication for customer accounts.

Create a secure administrator setup process. Never let users grant themselves administrator privileges by editing their profile, local storage, JavaScript variables, or Firestore documents.

Use server-controlled Firebase custom claims or an equivalent secure authorization mechanism for privileged operations.

## 4. Product catalogue

Implement real product management with Cloud Firestore.

Each product should support:
- Product ID.
- Name.
- Description.
- Category.
- Price in UGX.
- Available quantity.
- Product image URLs.
- SKU or inventory reference.
- Product condition, where applicable.
- Featured status.
- Active or inactive status.
- Creation and update timestamps.
- Searchable metadata.

Features:
- Create, edit, and remove products.
- Upload and manage product images.
- Search by product name and relevant description text.
- Filter by category and price.
- Sort by price, newest, and popularity.
- Display out-of-stock products clearly.
- Show related products.
- Prevent inactive or deleted products from being purchased.
- Paginate or efficiently load larger catalogues.

The owner dashboard must show genuine product and inventory records, not hardcoded examples.

## 5. Shopping cart and checkout

Implement a functional shopping process:

1. Browse the catalogue.
2. Open a product.
3. Select quantity.
4. Add the item to the cart.
5. Update quantities or remove items.
6. Enter delivery or collection information.
7. Review item prices, subtotal, delivery fees, discounts if supported, and total.
8. Select a payment method.
9. Confirm the order.
10. Receive an order reference and view the order status.

Persist the cart appropriately across sessions and devices for authenticated users.

Validate all quantities, product IDs, prices, inventory, delivery charges, and order totals using trusted backend logic.

Never trust prices or totals sent by the browser.

Use atomic Firestore transactions or another suitable concurrency-safe approach to reserve or deduct stock. Prevent duplicate orders, overselling, negative quantities, and repeated checkout submissions.

Record immutable order-item snapshots so that later product price changes do not rewrite historical purchases.

## 6. Manual payment methods

Support manual payment workflows for methods such as:

- Cash on delivery.
- Cash on collection.
- Mobile money payment followed by manual confirmation.

Let the owner configure which methods are available.

For manual mobile money:
- Display genuine payment instructions supplied by the owner.
- Record the selected payment method and payment status.
- Allow customers to submit a transaction reference when appropriate.
- Mark payment as pending until verified.
- Allow only authorised staff to record manual verification.
- Record who verified the payment and when.
- Never mark a payment successful solely because a customer entered a reference or uploaded a screenshot.

For cash on delivery or collection, track payment status separately from order fulfilment status.

## 7. Online payments

Design a real online payment integration using a payment provider that supports the selected Ugandan business and settlement requirements, such as Flutterwave or Pesapal, subject to current eligibility and availability.

Do not fabricate payment APIs or assume that a provider account is approved.

Implementation requirements:
- Create payment requests on a trusted backend.
- Generate and associate a unique order reference.
- Redirect customers to the provider's legitimate checkout when required.
- Handle successful, pending, cancelled, and failed payments.
- Verify transaction status server-side using the provider's documented API.
- Verify webhook signatures and authenticity.
- Use idempotency or equivalent duplicate-event protection.
- Verify that the paid amount and currency match the order.
- Update the payment status only after trusted verification.
- Store transaction references and appropriate audit records.
- Never store card numbers, CVVs, passwords, or payment-provider secret keys.
- Do not trust query parameters or a browser success page as proof of payment.
- Provide a safe recovery process for delayed payment confirmations.

If credentials or merchant approval are unavailable, implement the integration structure and a clearly labelled test mode. Do not claim live payment processing is functional until the real provider credentials, webhook, and verification flow have been configured and tested.

## 8. Gemini AI shopping assistant

Integrate Google's Gemini AI as a real, working service.

Prefer Firebase AI Logic with the appropriate Gemini model, Firebase App Check enforcement, and usage controls. A trusted backend may be used where required.

Implement a floating AI assistant that can:

- Answer customers' shopping questions.
- Understand natural-language product searches.
- Recommend products within a customer's budget.
- Compare products based on actual catalogue details.
- Explain product specifications.
- Help customers discover categories.
- Suggest alternatives when a product is unavailable.
- Help the owner draft product descriptions and titles.
- Generate suggested search filters.

Example:
"Find a laptop under UGX 1,000,000 suitable for programming."

The assistant must use actual Firestore catalogue information for product-specific answers. Retrieve matching products through application logic and supply verified product data to the AI. Never allow the model to invent stock, prices, product availability, delivery promises, or payment status.

AI-generated product descriptions must be editable drafts and must not automatically publish without owner approval.

Security:
- Never expose a raw Gemini Developer API key in public JavaScript or GitHub.
- Use Firebase AI Logic and App Check, or a trusted backend with server-side secrets.
- Apply usage limits, input validation, rate limiting where appropriate, and abuse protection.
- Do not let Gemini independently alter prices, grant permissions, confirm payments, or create trusted orders.
- Keep the storefront functional when the AI service is unavailable.
- Display a useful message if the AI request fails.

Include the required setup instructions and test the integration after configuration.

## 9. Firebase database structure

Design a documented Firestore schema using appropriate collections, such as:

- users
- products
- categories
- carts
- orders
- payments
- reviews
- wishlists
- notifications
- settings
- auditLogs

For every collection, document:
- Fields and data types.
- Document IDs.
- Ownership and access rules.
- Required indexes.
- Validation requirements.
- Relationships between records.
- Which fields can be changed by customers, the store owner, or trusted backend code.

Use integer minor currency units for calculations where appropriate, and ensure the UGX formatting and rounding logic are consistent.

Implement Firestore Security Rules and Storage Security Rules.

Customers must only access their own private account data, carts, and orders. Public product access must be restricted to appropriate active listings. Only authorised store administrators can modify the catalogue or privileged settings.

Sensitive order, stock, payment, and administrator operations must be protected by trusted backend authorization.

Never deploy unrestricted database rules.

## 10. Store-owner dashboard

Create a protected dashboard with:

- Total products.
- Active and inactive products.
- Low-stock alerts.
- Out-of-stock items.
- New orders.
- Pending payments.
- Confirmed payments.
- Cancelled and completed orders.
- Sales totals.
- Revenue reports based on clearly defined payment and order statuses.
- Recent activity.
- Product management.
- Order management.
- Payment verification for manual transactions.
- Store settings.

All figures must come from real database records.

Clearly distinguish gross orders, confirmed payments, refunds if supported, and net revenue. Do not report pending orders as completed sales.

## 11. Order management

Use clear, separate order and payment statuses.

Example order statuses:
- Pending confirmation.
- Confirmed.
- Processing.
- Ready for collection.
- Out for delivery.
- Completed.
- Cancelled.

Example payment statuses:
- Unpaid.
- Pending.
- Paid.
- Failed.
- Refunded.

Define valid transitions and enforce them through trusted application logic.

Customers should be able to view their order history, order details, payment status, and fulfilment progress.

The store owner should be able to search and filter orders, view customer-provided fulfilment information, and update permitted statuses.

Maintain an audit trail for sensitive changes.

## 12. Security and privacy

Implement:
- Firebase Authentication.
- Firestore Security Rules.
- Storage Security Rules.
- Firebase App Check where supported.
- Server-side authorization.
- Input validation.
- Safe rendering of user-provided text.
- Rate limits or abuse protection where appropriate.
- Secure secret management.
- Minimal collection of personal information.
- Safe error handling.
- Clear privacy, returns, delivery, and terms pages.
- Protection against duplicate payment events and unauthorized price changes.

Never commit service-account files, private keys, payment-provider secrets, raw Gemini Developer API keys, or production secrets.

Firebase client configuration may be visible in a public frontend, so security must rely on proper Firebase rules, authorized access, App Check, and server-side controls rather than treating the configuration as a secret.

## 13. Repository structure

Create a clean project structure, for example:

- index.html
- products.html
- product.html
- cart.html
- checkout.html
- login.html
- register.html
- account.html
- orders.html
- admin/index.html
- assets/css/styles.css
- assets/js/firebase-config.js
- assets/js/auth.js
- assets/js/products.js
- assets/js/cart.js
- assets/js/checkout.js
- assets/js/orders.js
- assets/js/admin.js
- assets/js/gemini-assistant.js
- assets/js/utils.js
- functions/
- firestore.rules
- storage.rules
- firestore.indexes.json
- README.md
- .gitignore

Adjust this structure when necessary, but keep responsibilities separated.

Use a compatible module-serving or build approach. If a build step is required for the chosen Firebase SDK or backend, document it clearly.

## 14. Hosting and deployment

Use GitHub as the source-code repository.

Deploy the actual commercial storefront to Firebase Hosting or another appropriate commercial website host. Do not rely on GitHub Pages as the permanent host for a store that facilitates commercial transactions.

Provide:
- Hosting configuration.
- Deployment commands.
- Firebase project setup instructions.
- Required environment and configuration values.
- Domain and HTTPS instructions.
- Firebase authorized-domain configuration.
- Backend deployment instructions.
- Payment webhook configuration.
- A safe rollback and backup strategy.
- A README with all steps.

If I request a GitHub Pages demo, create a non-commercial demonstration using sample data and no real checkout or collection of sensitive user information.

## 15. Testing

Create a test checklist and, where practical, automated tests.

Verify:
- Customer registration and login.
- Password reset.
- Product search and filtering.
- Product management.
- Image uploads.
- Cart persistence.
- Accurate totals.
- Stock validation.
- Order creation.
- Duplicate submission prevention.
- Manual payment verification.
- Online payment verification.
- Webhook signature verification.
- Customer versus administrator permissions.
- Gemini recommendations based on real products.
- Error handling when Firebase, payment services, or Gemini are unavailable.
- Mobile and desktop responsiveness.
- Production hosting and refresh behaviour.

Never report a feature as working unless it has actually been implemented and tested.

## 16. Build workflow

Work in the following phases:

Phase 1: Architecture, repository setup, UI design, and responsive storefront.

Phase 2: Firebase configuration, authentication, and security rules.

Phase 3: Product catalogue, image uploads, and owner dashboard.

Phase 4: Cart, checkout, orders, and inventory management.

Phase 5: Manual payments and trusted online payment integration.

Phase 6: Gemini AI shopping assistant and seller-independent owner tools.

Phase 7: Testing, security review, and bug fixing.

Phase 8: Production deployment, documentation, and launch checklist.

At each phase:
1. Explain the goal briefly.
2. Create the actual required files.
3. Provide complete code, not pseudocode.
4. Identify configuration values I must supply.
5. Explain how to run and test the feature.
6. Wait for me to verify the result before moving to the next phase when a manual check is needed.

Do not dump an unmanageable amount of code in one response. Keep each step practical and verifiable.

## FINAL OBJECTIVE

Deliver iSAX Market as a real, mobile-friendly, single-store e-commerce website with a persistent Firebase backend, secure order processing, working manual and verified online payment workflows, a genuine Gemini AI assistant, a protected owner dashboard, and a documented production deployment.

Begin with Phase 1. First explain the architecture and create the initial project structure. Do not claim that any external service is connected until it has actually been configured and tested.
