# hstockhub.com Secure Marketplace Backend

This backend replaces the earlier local JSON demo with a production-oriented **Node.js + Express + MongoDB/Mongoose** MVC system. It keeps the existing mirrored frontend in the same project folder and serves only public frontend assets/pages to unauthenticated visitors.

## Security model

- Separate buyer, seller, and administrator authentication flows.
- Server-side sessions stored in MongoDB using `connect-mongo`.
- HttpOnly, SameSite cookies; `secure` cookies in production.
- Centralized route protection and role-based access control.
- Reserved dashboard paths are protected on the server: `/admin`, `/admin/*`, `/seller`, `/seller/*`, `/buyer`, `/buyer/*`, `/dashboard`, `/dashboard/*`.
- Legacy mirrored dashboard pages such as `/user/dashboard.html` and `/user/seller/*` are blocked from public static serving and redirected to login/dashboard.
- Configurable admin login path through `ADMIN_PATH`; the admin URL is not linked in public navigation.
- Helmet secure headers, rate limiting, CORS allow-list support, NoSQL sanitization, validation, CSRF protection for form/session routes, and centralized error handling.
- Account lockout after repeated failed logins.
- Ownership checks are enforced in queries for buyer orders/downloads and seller stock/product operations.
- Digital stock is encrypted at rest using AES-256-GCM.
- Upload middleware restricts file size and file types.

## Folder structure

```text
backend/
  server.js                 # App entrypoint
  src/
    app.js                  # Express composition
    config/                 # env and database setup
    controllers/            # MVC controllers
    middleware/             # auth, security, validation, uploads, errors
    models/                 # Mongoose schemas and indexes
    routes/                 # route modules
    services/               # auth, delivery, audit services
    utils/                  # logger, crypto, view helpers
    seed.js                 # demo data seeding
```

## Database collections

Implemented Mongoose models include users, categories, products, orders/order items, inventory, digital stock, transactions, coupons, reviews, messages, notifications, support tickets, disputes, withdrawals, wallets, audit logs, and settings.

## Setup

```bash
cd backend
copy .env.example .env
npm install
npm run seed
npm start
```

MongoDB must be running and reachable through `MONGO_URI`.

## Demo accounts after seeding

| Role | URL | Email | Password |
|---|---|---|---|
| Buyer | `/auth/buyer/login` | `buyer@example.com` | `buyer12345` |
| Seller | `/auth/seller/login` | `seller@example.com` | `seller12345` |
| Admin | `${ADMIN_PATH}/login` | `admin@example.com` | `admin12345` |

Default admin path in `.env.example`: `/secure-admin-portal/login`

## Core routes

### Public

- `/`
- `/products.html`
- `/categories.html`
- `/about.html`
- `/contact.html`
- `/auth/buyer/login`
- `/auth/buyer/register`
- `/auth/seller/login`
- `/auth/seller/register`

### Buyer dashboard

- `/buyer/dashboard`
- `/buyer/orders`
- `/buyer/orders/:id`
- `/buyer/orders/:orderId/download/:itemId`
- `/buyer/profile`, `/buyer/wishlist`, `/buyer/favorites`, `/buyer/support`, `/buyer/disputes`, `/buyer/notifications`, `/buyer/messages`, `/buyer/reviews`, `/buyer/coupons`, `/buyer/invoices`, `/buyer/security`, `/buyer/login-history`, `/buyer/api-keys`

### Seller dashboard

- `/seller/dashboard`
- `/seller/products`
- `/seller/inventory`
- `/seller/stock` for digital stock upload
- `/seller/orders/pending`, `/seller/orders/completed`, `/seller/refunds`, `/seller/disputes`, `/seller/messages`, `/seller/analytics`, `/seller/earnings`, `/seller/withdrawals`, `/seller/coupons`, `/seller/reviews`, `/seller/notifications`, `/seller/support`, `/seller/reports`

### Admin panel

Mounted at `ADMIN_PATH`, for example `/secure-admin-portal/dashboard`, with modules for users, sellers, buyers, admins, product moderation, categories, inventory, orders, payments, refunds, withdrawals, disputes, support, coupons, promotions, homepage/banner/CMS/SEO management, email templates, translations, reports, analytics, audit/security/login logs, settings, backups, files, and notifications.

## API routes

- `GET /api/me`
- `GET /api/products`
- `GET /api/products/search?q=...`
- `GET /api/categories`
- `GET /api/buyer/orders` (buyer only)
- `GET /api/notifications` (authenticated)
- `GET /api/tickets` (authenticated)
- `POST /api/webhooks/payment/success` with `x-webhook-secret`

## Verification

```bash
npm run check
npm test
```

`npm test` still verifies the original pure delivery core in `backend/lib` so the automatic delivery algorithm remains regression-tested without requiring MongoDB.

## Production notes

- Replace every secret in `.env` before deploying.
- Use HTTPS and a reverse proxy such as Nginx.
- Set `NODE_ENV=production`.
- Restrict `CORS_ORIGINS` to trusted origins.
- Use a managed MongoDB cluster with backups enabled.
- Add an email provider for password reset and email verification delivery; the current reset flow displays the token in development-oriented output.
- Keep the configurable admin path private and rotate it if exposed.