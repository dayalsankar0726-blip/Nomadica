# Nomadica — Premium Travel Lifestyle Apparel & Adventure Wear

[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Shopify](https://img.shields.io/badge/Shopify-Storefront_&_Admin_GraphQL-95BF47?style=for-the-badge&logo=shopify)](https://shopify.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment_Gateway-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![Deployment](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

**Nomadica** is an editorial, headless e-commerce platform crafted for modern adventurers, creators, and travelers. Designed with an earthy luxury visual identity, it pairs high-performance Next.js 16 App Router architecture with Shopify's GraphQL APIs, custom Metaobject data structures, interactive color grouping, Razorpay payment processing, and comprehensive SEO structured data.

---

## Table of Contents

- [1. Project Overview & Vision](#1-project-overview--vision)
- [2. Tech Stack & Architecture](#2-tech-stack--architecture)
- [3. What Has Been Built (Key Features)](#3-what-has-been-built-key-features)
- [4. Complete Codebase Index](#4-complete-codebase-index)
- [5. Frontend Route Matrix](#5-frontend-route-matrix)
- [6. Backend API Route Matrix](#6-backend-api-route-matrix)
- [7. Shopify Headless Integration & Data Modeling](#7-shopify-headless-integration--data-modeling)
- [8. Payment Processing Pipeline](#8-payment-processing-pipeline)
- [9. Rate Limiting & Security](#9-rate-limiting--security)
- [10. SEO, Schema & Social Graph](#10-seo-schema--social-graph)
- [11. Environment Variables Configuration](#11-environment-variables-configuration)
- [12. Getting Started & How to Run](#12-getting-started--how-to-run)
- [13. Testing & Performance Benchmarks](#13-testing--performance-benchmarks)
- [14. Production Deployment & Post-SEO Checklist](#14-production-deployment--post-seo-checklist)

---

## 1. Project Overview & Vision

Nomadica was built from the ground up as a bespoke travel lifestyle storefront. Instead of relying on monolithic Shopify themes, the project decouples the frontend to deliver:

1. **Sub-second Navigation & Fluid Interactivity**: Ultra-fast App Router page transitions, optimistic UI updates, and intelligent client caching.
2. **Editorial Aesthetics**: Custom design tokens featuring warm sand palettes (`#FAF9F7`), gold/leather accents (`#c4a77d`), forest green details (`#1a5d3a`), and paired typography (*Playfair Display* for serif editorial headlines + *Montserrat* for body text).
3. **Smart Product Grouping & Swatches**: Individual Shopify color products are automatically consolidated into unified style cards with interactive color swatches.
4. **Resilient Dual-Mode Operation**: The app connects natively to live Shopify Storefront and Admin GraphQL APIs, but includes a built-in mock fallback engine so development, testing, and UI work continue seamlessly even offline or without active API credentials.

---

## 2. Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Nomadica Client (Browser)                       │
│  React 19 Server & Client Components · Framer Motion · Lucide Icons    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Next.js 16 App Router & Proxy                     │
│  - Edge/Node Request Proxy (proxy.ts) with TokenBucket Rate Limiter    │
│  - Dynamic Metadata & JSON-LD Structured Data Generators               │
│  - Dynamic Sitemap & Robots.txt Handlers                               │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │                                 │
                    ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Nomadica REST/JSON APIs        │  │       Razorpay Gateway       │
│  /api/products, /api/collections     │  │  - Order Creation            │
│  /api/cart, /api/wishlist            │  │  - HMAC SHA256 Signature     │
│  /api/checkout, /api/orders          │  │    Verification              │
│  /api/auth, /api/customers           │  │  - Cash on Delivery (COD)    │
└───────────────────┬──────────────────┘  └──────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Shopify GraphQL  │  │ Mock Data Engine │
│ - Storefront API │  │ (Local Fallback) │
│ - Admin API      │  │ MOCK_PRODUCTS    │
│   (Draft Orders) │  │ MOCK_COLLECTIONS │
└──────────────────┘  └──────────────────┘
```

### Core Technologies

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.4.5 (App Router) | Server Components, dynamic streaming, async params, metadata generation |
| **Library** | React 19.2.4 & React DOM 19.2.4 | Modern concurrent rendering, hooks, and lifecycle management |
| **Styling** | Tailwind CSS v4 & PostCSS | Utility-first styling with custom theme CSS variables and animations |
| **Icons & Typography** | Lucide React, Flaticon UIcons, Google Fonts | Playfair Display & Montserrat |
| **E-Commerce API** | Shopify Storefront & Admin GraphQL (2026-10, set by `SHOPIFY_API_VERSION`) | Catalog retrieval, customer auth, cart management, draft orders |
| **Payment Gateway** | Razorpay SDK (`razorpay@^2.9.6`) | Indian and international cards, UPI QR payments, webhook signatures |
| **Security** | Custom Token Bucket Limiter (`lib/rate-limit/tokenBucket.ts`) | Sliding window rate limiting across `/api/*` routes |
| **Animation** | Framer Motion (`^12.40.0`) | Smooth micro-interactions, modal overlays, slide-overs |
| **Testing** | Vitest (`tests/unit`), k6 (`tests/load`) | Unit tests for checkout, orders and rate limiting; load and rate-limit verification |

---

## 3. What Has Been Built (Key Features)

### 🛍️ Dynamic Catalog & Shop System
- **Automated Color Swatch Grouping (`utils/productGroup.ts`)**: Intelligent algorithm grouping separate Shopify products sharing the base style name (e.g. `White Destination Waffle Boxy Fit Tee` and `Black Destination Waffle Boxy Fit Tee`) into a single product card with interactive color swatches.
- **Metaobject Lifestyle Mockups**: Fetches custom Shopify Metaobjects (`custom.product_type_configuration`) to dynamically attach editorial model mockups to product cards.
- **Multi-Dimensional Filter Bar (`utils/productFilters.ts`)**: Filters simultaneously by Category/Collection, Color, Size, and Price Range, with instant sorting (*Featured*, *Price: Low to High*, *Price: High to Low*, *Newest*).
- **Curated Rails & Feeds**: Dedicated views for `/shop/new-arrivals`, `/shop/best-sellers`, and `/shop/collections`.

### 🔍 Interactive Product Details Page (PDP)
- **Responsive Image Lightbox**: High-res thumbnail selection, smooth hover transitions, and fullscreen image lightbox zoom.
- **Variant & Swatch Selector**: Interactive color swatches that preview variant images on hover and lock in on click.
- **Size Chart & Fit Guide**: Modal popup with detailed chest, shoulder, and length measurements.
- **Product Information Accordions**: Smooth collapsible accordions for *Product Details*, *Fabric & Care*, *Fit & Sizing*, and *Shipping & Returns*.
- **Direct Wishlist & Cart Actions**: Instant feedback buttons with toast notices and guest login prompts.

### 🛒 Cart & Wishlist System
- **Persistent Cart**: Client-side synchronization (`localStorage` + Storefront API) with line-item quantity controls and removal.
- **Free Shipping Calculator**: Real-time progress bar computing remaining cart value required for complimentary shipping.
- **Discount & Promo Codes**: Client-side promo code validation with dynamic cart discount calculation.
- **Move-to-Wishlist**: Instant transfer of cart line items to the customer wishlist.
- **Cross-Component Events**: Real-time header badge updates via window `cart-updated` dispatchers.

### 💳 Robust Checkout & Payment Architecture
- **Dual Payment Integration**:
  - **Razorpay**: Server-side order creation (`amount` in paise), secure client-side popup SDK checkout, and server-side HMAC SHA256 signature verification.
  - **Cash on Delivery (COD)**: Zero upfront charge checkout option.
- **Server-side pricing**: The browser only sends the cart ID. The server loads the cart from Shopify and works out prices, shipping and the total (`lib/checkout/serverCart.ts`).
- **Shopify Merchant Order Transition**: Creates a Shopify `DraftOrder` from the server-side cart via the Admin API and completes it (`draftOrderComplete`). Razorpay orders are marked paid only after the signature, payment status, cart and amount all match; COD orders are marked payment pending.
- **Guest & Authenticated Checkout**: Seamless address auto-population for logged-in users alongside guest checkout support.

### 👤 Customer Account Management
- **Shopify Customer Auth**: Full login, signup, token storage, and session cookie synchronization (`utils/hooks/useAuth.ts`).
- **Customer Dashboard**: Overview of orders, default addresses, and profile details.
- **Address Book**: Full CRUD operations (Add, Edit, Delete, Set as Default) for multiple shipping destinations.
- **Order History**: Comprehensive order history listing items, totals, dates, and order status pills.
- **Order Tracking (`/order-tracking`)**: Public order lookup engine by Order Number (e.g., `NMD-2047`) and email/phone, rendering a 5-step progress timeline (*Order Placed* → *Processing* → *Shipped* → *Out for Delivery* → *Delivered*).

### 📖 Editorial Brand Journal & Travel Shorts
- **Brand Journal (`/journal`)**: Full blog system pulling from Shopify articles with tags, excerpts, published dates, reading time calculation (`getReadingTime`), and related article rails.
- **Social Sharing**: Native share links for WhatsApp, Twitter/X, LinkedIn, and one-click Clipboard copy (`components/journal/ShareButtons.tsx`).
- **Curated Travel Shorts (`/brand/story`)**: Curated 4K vertical travel video gallery (9:16 aspect ratio) with infinite pagination, memoized video cards, and embedded video modal playback.
- **Brand Story & Sustainability Pages**: Dedicated pages detailing the brand's travel ethos, eco-conscious fabrics, and ethical sourcing practices.

### 🛡️ Enterprise Security & Rate Limiting
- **In-Memory Token Bucket Limiter (`lib/rate-limit/tokenBucket.ts`)**: 100 capacity bucket with 20 tokens/sec refill rate, preventing API abuse, scraper spikes, and DDoS attempts.
- **Global Proxy Middleware (`proxy.ts`)**: Intercepts all `/api/*` traffic, returning standard `429 Too Many Requests` status codes and `X-RateLimit-*` headers with periodic bucket garbage collection.

### 🌐 SEO & Structured Data Engine
- **JSON-LD Schema Modules**: Custom schemas for `Organization`, `WebSite`, `Product`, `CollectionPage`, `BlogPosting`, `BreadcrumbList`, and `FAQPage`.
- **Dynamic Sitemap (`app/sitemap.ts`)**: Real-time generation of sitemap URLs indexing all static pages, active products, collections, and journal articles.
- **Crawler Optimization (`app/robots.ts`)**: Guides crawlers to public catalogs while shielding private checkout, cart, and account routes.
- **Social Graph & Metadata (`lib/seo/metadata.ts`)**: Unified helper generating OpenGraph, Twitter Cards, and canonical URLs.

---

## 4. Complete Codebase Index

Below is the directory structure detailing every major file and its responsibility:

```text
nomadica/
├── app/                                 # Next.js 16 App Router root
│   ├── account/                         # Customer Account portal
│   │   ├── addresses/page.tsx           # Address book management (CRUD)
│   │   ├── login/page.tsx               # Customer login form
│   │   ├── orders/page.tsx              # Order history & status listing
│   │   ├── profile/page.tsx             # Customer profile settings
│   │   ├── signup/page.tsx              # New customer registration
│   │   ├── wishlist/page.tsx            # Customer saved items view
│   │   └── page.tsx                     # Account overview dashboard
│   ├── api/                             # Serverless Route Handlers
│   │   ├── auth/                        # Auth endpoints (login, register, logout, status)
│   │   ├── cart/                        # Cart endpoints (create, fetch, update, remove lines)
│   │   ├── checkout/route.ts            # Razorpay order create, verify & Shopify order sync
│   │   ├── collections/                 # Collection endpoints (list, get by ID, get by handle)
│   │   ├── customers/                   # Customer profile & address endpoints
│   │   ├── journal/route.ts             # Blog articles listing endpoint
│   │   ├── mockups/route.ts             # Metaobject lifestyle mockups lookup
│   │   ├── orders/                      # Orders listing & tracking endpoints
│   │   ├── products/                    # Product catalog endpoints (list, by ID, by handle)
│   │   ├── search/route.ts              # Product search query endpoint
│   │   ├── travel-shorts/route.ts       # Curated travel video feed
│   │   └── wishlist/                    # Customer wishlist endpoints
│   ├── brand/                           # Editorial brand pages
│   │   ├── about/page.tsx               # Brand heritage & values
│   │   ├── story/page.tsx               # Travel Shorts 4K video showcase
│   │   ├── sustainability/page.tsx      # Eco-fabrics & ethical mission
│   │   └── page.tsx                     # Brand index landing page
│   ├── cart/page.tsx                    # Full-page shopping cart with promo code calculator
│   ├── checkout/page.tsx                # Checkout page with Razorpay, COD & Mock card modes
│   ├── collections/[handle]/page.tsx    # Dynamic collection catalog page
│   ├── journal/                         # Editorial travel journal
│   │   ├── [slug]/page.tsx              # Full article reader with social share buttons
│   │   ├── JournalGridClient.tsx        # Filterable journal grid & search
│   │   └── page.tsx                     # Journal homepage
│   ├── maintenance/page.tsx             # Maintenance standby page
│   ├── not-found.tsx                    # Custom branded 404 handler
│   ├── order-tracking/page.tsx          # Real-time order tracker
│   ├── products/[handle]/page.tsx       # Dynamic product detail page (PDP)
│   ├── shop/                            # Shop landing & curated views
│   │   ├── best-sellers/page.tsx        # Best sellers collection
│   │   ├── collections/page.tsx         # Collections index overview
│   │   ├── new-arrivals/page.tsx        # New arrivals collection
│   │   ├── product-details/             # PDP Client component (ProductDetailClient.tsx)
│   │   ├── search/page.tsx              # Dedicated search results page
│   │   └── page.tsx                     # All-products catalog with sidebar filters
│   ├── support/                         # Customer support & legal pages
│   │   ├── contact/page.tsx             # Contact inquiry form & details
│   │   ├── faq/page.tsx                 # Frequently asked questions accordion
│   │   ├── privacy-policy/page.tsx      # Privacy policy
│   │   ├── return-policy/page.tsx       # Return & exchange policy
│   │   ├── shipping-policy/page.tsx     # Shipping terms & timelines
│   │   ├── terms/page.tsx               # Terms of service
│   │   └── page.tsx                     # Support hub landing
│   ├── ClientLayout.tsx                 # Route change scroll-reset wrapper
│   ├── globals.css                      # Tailwind CSS v4 design tokens & keyframes
│   ├── layout.tsx                       # Root layout with fonts, GA, and JSON-LD schemas
│   ├── page.tsx                         # Editorial Homepage
│   ├── robots.ts                        # Dynamic robots.txt generator
│   └── sitemap.ts                       # Dynamic XML sitemap generator
├── components/                          # Modular React components
│   ├── api/api.tsx                      # Centralized typed API client facade
│   ├── brand/                           # Brand hero & story galleries
│   ├── journal/ShareButtons.tsx         # Social share buttons (WhatsApp, X, LinkedIn, Copy)
│   ├── layout/                          # Global navigation components
│   │   ├── Navbar.tsx                   # Main navigation header with dropdowns & drawers
│   │   └── Footer.tsx                   # Editorial footer with links & newsletter
│   ├── seo/                             # SEO helpers
│   │   ├── GoogleAnalytics.tsx          # GA4 and GTM script injection
│   │   └── JsonLd.tsx                   # JSON-LD script renderer
│   ├── shop/                            # E-commerce shopping components
│   │   ├── CollectionClient.tsx         # Filterable catalog engine
│   │   ├── ProductCard.tsx              # Smart card with swatches, hover zoom, wishlist
│   │   ├── ProductCarouselSection.tsx   # Reusable horizontal product carousel
│   │   ├── QuickViewModal.tsx           # Fast product preview popup
│   │   ├── ShopFilterBar.tsx            # Desktop & mobile filter bar
│   │   └── WishlistCard.tsx             # Saved item card
│   └── ui/                              # Atomic UI components
│       ├── PageLoader.tsx               # Page transition spinner
│       ├── SearchInput.tsx              # Search input with live clear
│       └── SnowBallLoader.tsx           # Custom branded loader
├── lib/                                 # Server & shared utility libraries
│   ├── images/shopifyImage.ts           # Shopify CDN image loader & size optimizer
│   ├── rate-limit/tokenBucket.ts        # In-memory token bucket rate limiter
│   ├── schema/                          # JSON-LD schema builders
│   │   ├── article.ts                   # BlogPosting schema
│   │   ├── brand.ts                     # Brand schema
│   │   ├── breadcrumb.ts                # BreadcrumbList schema
│   │   ├── collection.ts                # CollectionPage schema
│   │   ├── faq.ts                       # FAQPage schema
│   │   ├── organization.ts              # Organization schema
│   │   ├── product.ts                   # Product schema with pricing & availability
│   │   └── website.ts                   # WebSite schema with SiteNavigationElement
│   ├── seo/                             # SEO utilities
│   │   ├── canonical.ts                 # Dynamic canonical URL builder
│   │   └── metadata.ts                  # OpenGraph & Twitter metadata generator
│   └── shopify/                         # Shopify GraphQL API Client
│       ├── client.ts                    # Base ShopifyClient, StorefrontClient, AdminClient
│       ├── journal.ts                   # Blog articles GraphQL fetchers & reading time
│       ├── products.ts                  # Product & collection fetchers + mock fallbacks
│       └── queries.ts                   # Storefront & Admin GraphQL queries and mutations
├── public/                              # Static public assets (banners, logos, textures)
├── utils/                               # Helper functions and hooks
│   ├── env.ts                           # Environment detection and variable parser
│   ├── errors.ts                        # Error wrappers and loggers
│   ├── mockData.ts                      # Rich fallback catalog (products, orders, addresses)
│   ├── productFilters.ts                # Multi-attribute filtering & sorting algorithms
│   ├── productGroup.ts                  # Swatch grouping & base style parser
│   └── hooks/useAuth.ts                 # Client authentication state hook & cookie sync
├── tests/unit/                          # Vitest unit tests
├── tests/load/                          # k6 load and rate-limit tests
├── proxy.ts                             # Next.js request proxy / middleware for rate limiting
├── shopify.app.toml                     # Shopify Custom App configuration & scopes
├── POST_SEO.md                          # Post-deployment SEO verification checklist
└── SHOPIFY_PRODUCT_SETUP_GUIDE.md       # Product setup and swatch publishing manual
```

---

## 5. Frontend Route Matrix

| Route Path | Type | Description |
|---|---|---|
| `/` | SSR / Dynamic | Editorial homepage with hero slider, new arrivals rail, best sellers rail, category showcase, and journal preview |
| `/shop` | SSR + Client | Full catalog browsing with interactive sidebar filters (Category, Color, Size, Sort) |
| `/shop/new-arrivals` | SSR + Client | Curated new product arrivals feed |
| `/shop/best-sellers` | SSR + Client | High-demand best-selling travel garments |
| `/shop/collections` | SSR + Client | Complete directory of signature collections |
| `/collections/[handle]` | SSR + Client | Collection-specific catalog (e.g., `/collections/adventure-and-trekking`) |
| `/products/[handle]` | SSR + Dynamic | Comprehensive Product Detail Page with image gallery, swatches, size chart modal, and related rail |
| `/cart` | Client | Full shopping cart with discount code input, quantity modification, and free shipping progress |
| `/checkout` | Client | Multi-step checkout with address form, Razorpay integration, Cash on Delivery, and Mock Card test mode |
| `/order-tracking` | Client | Real-time order progress tracker querying order number and customer email/phone |
| `/account` | Authenticated | Customer dashboard displaying profile summary, recent orders, and default address |
| `/account/login` | Client | Customer login with email/password authentication |
| `/account/signup` | Client | New customer account creation |
| `/account/orders` | Authenticated | Order history with item details and status badges |
| `/account/addresses` | Authenticated | Address book supporting adding, editing, deleting, and setting default shipping addresses |
| `/account/wishlist` | Authenticated | Saved customer wishlist items with move-to-cart functionality |
| `/journal` | SSR / Dynamic | Brand editorial journal with tag filters and article cards |
| `/journal/[slug]` | SSR / Dynamic | Single journal article reader with social share icons and related articles |
| `/brand/story` | Client | 4K vertical Travel Shorts video showcase with modal player |
| `/brand/about` | Static / SSR | Brand philosophy, history, and narrative |
| `/brand/sustainability`| Static / SSR | Sustainable materials, circularity, and ethical production statement |
| `/support/*` | Static / SSR | Support hub, contact form, FAQ accordions, and legal policy pages |
| `/sitemap.xml` | Server Generated | Dynamic XML sitemap indexing all valid resources |
| `/robots.txt` | Server Generated | Crawler directive configuration |

---

## 6. Backend API Route Matrix

All API endpoints reside under `/app/api/` and are rate-limited via `proxy.ts`:

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/products` | Lists products with pagination (`first`, `after`) | Public |
| `GET` | `/api/products/[id]` | Fetches a single product by Shopify GID | Public |
| `GET` | `/api/products/handle/[handle]` | Fetches a product by its URL handle | Public |
| `GET` | `/api/collections` | Retrieves all store collections | Public |
| `GET` | `/api/collections/[id]` | Retrieves a collection by its GID | Public |
| `GET` | `/api/collections/handle/[handle]` | Retrieves a collection and its products by handle | Public |
| `GET` | `/api/search?q={query}` | Searches products across title, tags, and productType | Public |
| `GET` | `/api/mockups` | Resolves Shopify Metaobject lifestyle mockup mappings | Public |
| `GET` | `/api/journal` | Returns Shopify blog articles with pagination | Public |
| `GET` | `/api/travel-shorts` | Delivers curated 4K travel video feed | Public |
| `GET` | `/api/cart/[id]` | Retrieves current cart lines, totals, and checkout URL | Public / Session |
| `POST` | `/api/cart` | Creates a new cart with initial line items | Public / Session |
| `POST` | `/api/cart/[id]` | Updates lines, changes quantities, or removes line items | Public / Session |
| `POST` | `/api/checkout` | Creates/verifies Razorpay orders & syncs Shopify Draft Orders | Public / Guest / Customer |
| `POST` | `/api/auth/login` | Exchanges customer credentials for a Storefront Customer Token | Public |
| `POST` | `/api/auth/register` | Registers a new customer account in Shopify | Public |
| `POST` | `/api/auth/logout` | Clears customer authentication cookies and session state | Authenticated |
| `GET` | `/api/auth/status` | Validates session token and returns active customer data | Authenticated |
| `GET` | `/api/customers/profile` | Fetches customer details (name, email, phone) | Authenticated |
| `PUT` | `/api/customers/profile` | Updates customer profile fields | Authenticated |
| `GET` | `/api/customers/addresses` | Lists all customer shipping addresses | Authenticated |
| `POST` | `/api/customers/addresses` | Creates, updates, deletes, or defaults shipping addresses | Authenticated |
| `GET` | `/api/orders` | Retrieves customer order history | Authenticated |
| `POST` | `/api/orders/track` | Public tracking query by Order Number & Email/Phone | Public |
| `GET` | `/api/wishlist` | Retrieves customer wishlist items | Authenticated / Local |
| `POST` | `/api/wishlist` | Adds a product to customer wishlist | Authenticated / Local |
| `DELETE`| `/api/wishlist/[id]` | Removes a product from customer wishlist | Authenticated / Local |

---

## 7. Shopify Headless Integration & Data Modeling

Nomadica communicates directly with Shopify via the **Storefront GraphQL API** (for read-heavy public browsing) and the **Admin GraphQL API** (for privileged order creation).

### Title Naming Convention for Automated Swatches
To take advantage of Nomadica's automatic client-side color swatch grouping (`utils/productGroup.ts`), products in Shopify are titled with their color prefix:

```text
[Color Name] [Base Style / Graphic Name]
```

#### Examples:
- `White Destination Waffle Boxy Fit Tee`
- `Black Destination Waffle Boxy Fit Tee`
- `Denim Wash Boxy Fit Tees`
- `Pink Trekking Shirts`

Nomadica detects common base names, strips the color prefix, and combines multiple color products into **a single product card with selectable color swatches**.

### Metaobject Lifestyle Mockups
Lifestyle photos and product type configurations are linked via Shopify Metaobjects:
- **Namespace**: `custom`
- **Key**: `product_type_configuration` or `product_type`
- **Fields**: `entryName`, `displayName`, `mockupImage`

When present, the frontend extracts the lifestyle model shot and layers it into product hover states and collection cards.

---

## 8. Payment Processing Pipeline

The checkout supports Razorpay (card/UPI) and cash on delivery. Every amount comes from the server-side cart:

```
                          ┌──────────────────────────┐
                          │     User Hits Checkout   │
                          └─────────────┬────────────┘
                                        │
                         Select Payment Method?
                                        │
               ┌────────────────────────┴────────────────┐
               ▼                                         ▼
       [ Razorpay (Card/UPI) ]                   [ Cash on Delivery ]
               │                                         │
       1. POST /api/checkout { action: "create", cartId }│
          (server prices cart, creates Razorpay order)   │
               │                                         │
       2. Client opens Razorpay Modal                    │
          (Customer pays)                                │
               │                                POST /api/checkout
       3. POST /api/checkout { action: "verify" }  { action: "cod", cartId }
          (signature, payment status, amount           (payment pending)
           and cart all checked)                         │
          or Razorpay webhook, if the browser            │
          never reports back                             │
               │                                         │
               └────────────────────────┬────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │ Create Draft Order in Shopify │
                        │      (Shopify Admin API)      │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │ Complete Draft Order to Real  │
                        │     (draftOrderComplete)      │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   Return Order Confirmation   │
                        │      (e.g., NMD-2047)         │
                        └───────────────────────────────┘
```

### Razorpay webhook (required for card/UPI)

The browser confirms each payment after the Razorpay popup closes. If the customer closes the tab or loses connection first, the payment is taken but the browser never reports back. The webhook covers that case: Razorpay calls `/api/webhooks/razorpay` server-to-server, and the server creates the same order from the cart ID and shipping details stored on the Razorpay order.

Setup in the Razorpay dashboard (Settings > Webhooks), separately for test and live mode:
1. Webhook URL: `https://<your-domain>/api/webhooks/razorpay`
2. Secret: any strong random value; set the same value as `RAZORPAY_WEBHOOK_SECRET`.
3. Active events: `payment.captured` and `order.paid`.

How duplicates are prevented: each paid Shopify order is tagged `rzp-<payment id>`. Before creating an order, the server looks for an order or open draft order with that tag and reuses it, and a short lock (shared via Redis when configured) stops the browser and webhook creating the order at the same moment.

If a payment can't be turned into an order automatically (for example the cart changed after payment), the server logs `PAYMENT NEEDS MANUAL REVIEW` with the payment ID; handle it from the Razorpay dashboard. The webhook does not need a local URL: test it on a Vercel preview deployment.

### Discount codes

Discount codes are created in Shopify admin (Discounts) and validated by Shopify:

- The cart page sends the code to `POST /api/cart/[id]/discount`, which applies it to the Shopify cart (`cartDiscountCodesUpdate`). Codes Shopify doesn't accept are removed and reported as invalid; `DELETE` removes codes.
- The cart and checkout pages show the server's price summary (`pricing` on `GET /api/cart/[id]`): subtotal, discount, shipping and total. Free shipping applies when the merchandise total after discounts is over ₹2,000.
- Before charging (Razorpay) or placing a cash-on-delivery order, the server asks Shopify to price the order with `draftOrderCalculate`. If Shopify's total differs from the cart (for example a code expired), checkout stops and asks the customer to review their bag, so the amount charged always matches the order.
- Orders are created with the same codes and with automatic discounts enabled.
- In local sample mode only, `WELCOME10` (10%) and `EXPLORE20` (20%) work as sample codes.

### Testing payments
Use Razorpay test keys (`rzp_test_...`) and Razorpay's published test cards and UPI IDs. In local sample mode (no Shopify keys), cash-on-delivery orders are saved in the browser only.

---

## 9. Rate Limiting & Security

All `/api` routes are rate limited per client IP in `proxy.ts` (`lib/rate-limit/sharedLimiter.ts`):

- **Shared store**: With `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV) set, counts are shared across all server instances: 600 requests per IP per minute.
- **Fallback**: Without a store, or if it is down, an in-memory token bucket (`lib/rate-limit/tokenBucket.ts`, 100 tokens, 20/second refill) limits each instance.
- **Client IP**: Taken from Vercel's `x-vercel-forwarded-for` / `x-real-ip`, or the first `x-forwarded-for` entry.
- **Rate Limit Response**: HTTP `429 Too Many Requests` with `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `Retry-After` headers.

Other protections:
- The Shopify Admin token is read only from server environment settings and is never sent to the browser, cookies or disk.
- Customer data (orders, profile, addresses) is read only with the signed-in customer's own Shopify token.
- Sample data and sample sign-in exist only in local development without Shopify keys.

---

## 10. SEO, Schema & Social Graph

Nomadica is fully optimized for search crawlers and social previews:

1. **JSON-LD Structured Data**:
   - `Organization`: Brand metadata, official logo, and social profile links.
   - `WebSite`: Sitelinks Searchbox integration pointing to `/shop/search?q={search_term_string}`.
   - `Product`: Live price, currency (`INR`), availability, brand attribution, and variant images.
   - `CollectionPage`: ItemList metadata on collection pages.
   - `BlogPosting`: Author, publication date, thumbnail, and headline on journal articles.
   - `BreadcrumbList`: Multi-level breadcrumbs across products, collections, and articles.
2. **Dynamic Canonical URLs**: Automatically generated via `lib/seo/canonical.ts` using `NEXT_PUBLIC_APP_URL` or Vercel production domains.
3. **Dynamic Sitemap (`app/sitemap.ts`)**: Crawls all published Shopify products, collections, articles, and static pages, outputting fresh XML at `/sitemap.xml`.
4. **Robots Configuration (`app/robots.ts`)**: Allows indexable store pages while explicitly disallowing private surfaces like `/cart`, `/checkout`, `/account`, and `/api`.

---

## 11. Environment Variables Configuration

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

### Environment Variables Reference

| Variable | Required? | Example | Description |
|---|---|---|---|
| `SHOPIFY_APP_URL` | Production | `your-store.myshopify.com` | Shopify store domain |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Production | `atkn_...` | Public Storefront API token: catalog, cart, customer accounts |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Production | `shpat_...` | Server-only Admin API token used to create orders and look up order tracking. Needs `read_orders`, `write_draft_orders`, `read_draft_orders`, `read_products`. Never expose it to the browser. |
| `SHOPIFY_API_VERSION` | Optional | `2026-10` | Shopify API version for Storefront and Admin requests. Shopify supports each version for about 12 months, so review it yearly. |
| `SHOPIFY_ADMIN_SHOP` | Optional | `your-store.myshopify.com` | Admin API domain; defaults to `SHOPIFY_APP_URL` |
| `RAZORPAY_KEY_ID` | For card/UPI | `rzp_test_...` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | For card/UPI | `...` | Razorpay secret, used to verify payments on the server |
| `RAZORPAY_WEBHOOK_SECRET` | For card/UPI | `...` | Secret set on the Razorpay webhook; used to verify webhook calls (see section 8) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended | `https://...upstash.io` | Shared rate-limit store. Vercel KV's `KV_REST_API_URL` / `KV_REST_API_TOKEN` also work. Without it, limits are per server instance. |
| `NEXT_PUBLIC_APP_URL` | Optional | `https://www.nomadica.com` | Canonical base URL |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GTM_ID` | Optional | `G-XXXX` / `GTM-XXXX` | Analytics |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional | `token` | Search Console verification |

> **Sample mode:** when `npm run dev` runs without the Shopify values, the site uses built-in sample products, sign-in, addresses and orders so you can work on the UI. Production builds never use sample data: they show an error instead.

---

## 12. Getting Started & How to Run

### Prerequisites
- **Node.js**: v20.x or higher recommended
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/nomadica786/nomadica.git
cd nomadica
npm install
```

### 2. Environment Setup

Create `.env.local` from the provided template:

```bash
cp .env.example .env.local
```

### 3. Running Development Server

Start the local Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application supports fast hot-reloading and instant module replacement.

### 4. Production Build

To test production optimizations, SSR bundles, and static page generation locally:

```bash
npm run build
npm run start
```

---

## 13. Testing & Performance Benchmarks

### Checks
```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest unit tests (tests/unit)
npm run build       # Production build
```

### Load & Rate-Limiting Testing (k6)
`tests/load/k6_rate_limit.js` runs three scenarios: a smoke test (1 user), a ramping load test (up to 5 users) and a rate-limit stress test (15 users) that expects HTTP `429` responses. `tests/load/k6_browser.js` is a k6 browser check of the main pages.

```bash
k6 run tests/load/k6_rate_limit.js
```

---

## 14. Production Deployment & Post-SEO Checklist

The application is deployed on **Vercel** with automatic preview deployments on git pushes.

### Post-Deployment Checklist
When connecting a custom domain, complete the following verification steps (see [POST_SEO.md](POST_SEO.md)):

1. **Canonical URLs**: Set `NEXT_PUBLIC_APP_URL` in Vercel to your custom domain (e.g., `https://www.nomadica.com`).
2. **Google Search Console**: Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to your verification token and submit `https://www.nomadica.com/sitemap.xml`.
3. **Robots Inspection**: Verify `https://www.nomadica.com/robots.txt` is accessible and properly disallows `/checkout`, `/account`, and `/cart`.
4. **Schema Audit**: Validate product URLs on the [Schema Markup Validator](https://validator.schema.org/) to confirm `Product`, `BreadcrumbList`, and `Organization` schemas validate without warnings.
5. **Analytics**: Verify live page views and ecommerce triggers via the Google Analytics DebugView.

---

## License & Credits

Nomadica is a proprietary e-commerce storefront. All rights reserved.
Built with ❤️ for modern wanderers and creators.
