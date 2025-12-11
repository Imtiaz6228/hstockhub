# HStockHub Social Media Accounts Store

A full production-ready social media accounts marketplace built with Node.js, Express, PostgreSQL, and Stripe payments. Features a responsive one-page site with account categories, cart system, admin dashboard, and order management for Instagram, Facebook, Gmail, and other platforms.

![HStockHub](https://via.placeholder.com/800x400?text=HStockHub+Social+Media+Accounts+Store)

## Features

### Public Website
- **One-page design** with hero section, product catalog, pricing cards, features, reviews, and FAQ
- **Responsive design** that works on all devices
- **SEO optimized** with meta tags and semantic HTML
- **Cart system** with session-based storage
- **User authentication** with registration and login
- **Secure** with CSRF protection, rate limiting, and helmet security headers

### E-commerce System
- **Product catalog** with categories and search
- **Shopping cart** with quantity management
- **Guest and user checkout** (Stripe integration ready)
- **Order management** with status tracking
- **Coupons and discounts** system
- **Automatic email invoices** (SMTP ready)

### Admin Dashboard (`/admin`)
- **Secure admin login** with role-based access
- **Live revenue and order statistics**
- **Products CRUD** management
- **Orders management** with status updates
- **Coupons management**
- **Users management**
- **Refund system** via Stripe (integration ready)
- **Admin activity logging**

### Technical Features
- **PostgreSQL** database with migrations and seeding
- **Stripe** payment gateway (test mode)
- **JWT and session cookies** for authentication
- **Gzip compression** for performance
- **Static asset caching**
- **Rate limiting** for security
- **CSRF protection**
- **Helmet security headers**
- **SQL injection prevention** via parameterized queries

## Project Structure

```
/project-root
├── server.js              # Main application entry
├── routes/                # Route handlers
│   ├── auth.js           # Authentication routes
│   ├── index.js          # Public site routes
│   ├── cart.js           # Cart functionality
│   └── admin.js          # Admin dashboard routes
├── models/               # Database models
│   ├── db.js            # Database connection
│   ├── user.js          # User model
│   ├── product.js       # Product model
│   ├── order.js         # Order model
│   ├── coupon.js        # Coupon model
│   └── adminLog.js      # Admin logging
├── views/                # EJS templates
│   ├── index.ejs        # Home page
│   ├── login.ejs        # Login page
│   ├── register.ejs      # Registration page
│   ├── cart.ejs          # Shopping cart
│   ├── admin/            # Admin templates
│   └── *                 # Other pages
├── public/               # Static assets
│   ├── css/
│   └── js/
├── migrations/           # Database migrations
├── tests/                # Test files (placeholder)
├── package.json
├── .env.example          # Environment variables template
└── README.md
```

## Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zombakk-ecommerce.git
   cd zombakk-ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=zombakk_db
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password

   # Application
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your_session_secret_here

   # JWT
   JWT_SECRET=your_jwt_secret_here

   # Stripe (Test Mode)
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Email
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password

   # Default Admin
   ADMIN_EMAIL=admin@zombakk.com
   ADMIN_PASSWORD=admin123
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE zombakk_db;
   CREATE USER zombakk_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE zombakk_db TO zombakk_user;
   ```

5. **Run migrations and seed database**
   ```bash
   npm run migrate
   npm run seed
   ```

6. **Start the application**
   ```bash
   # Development
   npm start

   # Production (with PM2)
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

The application will be available at `http://localhost:3000`

## Default Admin Credentials

- **Email:** admin@zombakk.com
- **Password:** admin123

## API Documentation

### Authentication Endpoints

#### POST `/api/login`
- **Body:** `{ email, password }`
- **Response:** `{ token, user }`

#### POST `/api/register`
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user }`

### Public Endpoints

#### GET `/`
- Main website page

#### GET `/products`
- List all products

#### POST `/cart/add`
- Add item to cart

#### GET `/cart`
- View shopping cart

### Admin Endpoints (Requires admin role)

#### GET `/admin`
- Admin dashboard with statistics

#### GET `/admin/products`
- Manage products CRUD

#### GET `/admin/orders`
- Manage orders

#### GET `/admin/users`
- Manage users

#### GET `/admin/coupons`
- Manage coupons

## Stripe Integration

### Setup Stripe Webhooks

1. **Create webhook in Stripe Dashboard:**
   - Go to Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/webhooks/stripe`
   - Select events: `checkout.session.completed`, `payment_intent.payment_failed`

2. **Update `.env` with webhook secret**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Test Payments

Use these test card numbers in Stripe test mode:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002

## Email Configuration

Configure SMTP in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

For Gmail, enable 2FA and generate an App Password.

## Deployment

### Production Checklist

- [x] Set `NODE_ENV=production`
- [x] Configure HTTPS certificate
- [x] Update Stripe to live mode
- [x] Configure production database
- [x] Set up monitoring and logging
- [x] Configure backup strategy

### Quick VPS Deployment

1. **Upload your project to VPS**
   ```bash
   scp -r . user@your-vps:/path/to/project
   ```

2. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

3. **Start with PM2**
   ```bash
   npm run production
   # or
   pm2 start ecosystem.config.js --env production
   ```

4. **Save PM2 configuration**
   ```bash
   pm2 save
   pm2 startup
   ```

### Docker Deployment

Use the provided `docker-compose.yml` and run:
```bash
docker-compose up -d
```

The application will be available with Nginx reverse proxy.

### Manual Deployment

1. **Create logs directory**
   ```bash
   mkdir logs
   ```

2. **Nginx configuration**
   Place `nginx.conf` in `/etc/nginx/nginx.conf` and install Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

3. **Create SSL certificates (optional)**
   Use Let's Encrypt for HTTPS:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Environment Variables for Production

Copy `.env.example` and update with production values:
```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_USER=your-prod-user
DB_PASSWORD=your-secure-password
SESSION_SECRET=your-long-random-secret
```

### Monitoring Commands

- **Check PM2 status:** `pm2 status`
- **View logs:** `npm run pm2:logs`
- **Restart app:** `npm run pm2:restart`
- **Monitor resources:** `pm2 monit`

## Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file

## Support

For support, email support@zombakk.com or join our Discord community.

---

**Note:** This is a demonstration project. For production use, ensure proper security measures and compliance with local regulations.
