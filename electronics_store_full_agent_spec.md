# Electronics Store Digital Storefront — Full AI Agent Specification

This is the consolidated version of the project documentation. Read this entire file before implementation.

---

# Project Decisions Log

This file captures agreed product decisions so the coding agent does not reinterpret them later.

## Decision 1 — Product Type
The product is a **digital storefront system/catalog** for electronics stores, not a generic personal website.

## Decision 2 — Reusability
The same codebase must be reusable for multiple stores through configuration, theme settings and database-driven content.

## Decision 3 — Admin Control
Store owners must manage products, categories, offers, homepage content and store information without developer assistance.

## Decision 4 — Customer Conversion
The main conversion path is direct store contact, especially WhatsApp and phone.

## Decision 5 — Ecommerce Scope
Cart, checkout, payment and shipping are future capabilities, not part of the initial catalog release.

## Decision 6 — AI Scope
AI is a planned feature but **not functional in v1**. The UI should advertise it and show a polished Coming Soon experience.

## Decision 7 — Localization
Arabic and English are supported from the beginning.

## Decision 8 — Favorites
Favorites can work client-side without mandatory customer accounts in v1.

## Decision 9 — Compare
Compare uses structured product specifications and must gracefully handle missing values.

## Decision 10 — Analytics
Analytics should start with useful anonymous engagement events and stay lightweight.



---

# Product Requirements Document (PRD)

## 1. Product Overview
A reusable, modern digital storefront for local electronics stores. Each store gets a branded public website and a private admin dashboard.

The public website behaves like a highly searchable digital catalog rather than a checkout-first ecommerce platform.

## 2. Problem
Many local electronics stores have product information scattered across social media, messaging apps or static pages. Customers need to know what is available, compare products, understand offers and contact the store quickly. Store owners need a simple way to update the catalog without developer involvement.

## 3. Goals
### Customer goals
- Find products quickly.
- Search and filter products easily.
- Understand product specifications and pricing.
- Identify offers and availability.
- Compare alternatives.
- Save or share products.
- Contact the store with product context in one tap.
- Use the site comfortably on mobile.

### Store-owner goals
- Manage products without code.
- Add/remove products from the public catalog.
- Control what appears on the homepage.
- Create and manage offers.
- Update branding/contact information.
- See useful engagement data.
- Reuse the system with minimal customization.

## 4. Non-Goals for v1
- Online checkout.
- Payment processing.
- Shipping management.
- Customer order lifecycle.
- AI inference/recommendation service.

Those capabilities may be added in later phases.

## 5. Personas
### Customer
A visitor using a phone or desktop to browse electronics, compare options and contact a local store.

### Store Admin
A store owner/employee who manages products, categories, offers, homepage content, branding and store information.

### Platform Operator (future)
A SaaS-level administrator who can provision stores, manage subscriptions and monitor tenants.

## 6. Business Model Assumption
The platform should be sellable as a setup/customization service and later as a subscription/Premium feature product.

## 7. Functional Areas
- Storefront
- Catalog
- Product details
- Search
- Filters
- Sorting
- Categories
- Offers
- Featured content
- Homepage CMS
- Engagement tools
- Store contact
- Admin dashboard
- Analytics
- Notifications
- QR/PWA
- Localization
- Customization
- Future AI layer

## 8. Key Business Rules
1. Only active products are publicly visible.
2. Out-of-stock products may remain visible but must show a clear unavailable state.
3. Featured products are manually controlled in v1.
4. New Arrivals may be automatic based on creation date, with optional admin override.
5. Best Sellers may be manually curated initially and later derive from analytics/order data.
6. Offer state is determined by `on_sale` and optional start/end dates.
7. If an offer expires, the storefront must stop presenting it as active.
8. Product prices must be numeric and stored in a consistent currency unit.
9. Product URLs must be stable slugs.
10. Every product must have one primary image; additional images are optional.
11. Product WhatsApp CTA must generate a contextual message containing product name and URL at minimum.
12. The AI entry point must never pretend that AI is already operational in v1.
13. All store identity values must come from database settings/theme configuration.
14. Public users do not need an account to browse, compare, favorite or view recently viewed items in v1; these can use client-side local storage.
15. Admin pages must require authenticated admin access.

## 9. Quality Attributes
### Performance
- Fast first load on mobile.
- Optimized images.
- Pagination or efficient loading for large catalogs.
- Avoid unnecessary client-side rendering.

### Security
- Supabase Auth for admins.
- Row Level Security on database tables.
- Admin routes protected server-side.
- Validate and sanitize admin inputs.
- Never expose service-role secrets to the browser.

### Accessibility
- Keyboard navigable.
- Semantic HTML.
- Visible focus states.
- Accessible labels for icons and controls.
- Sufficient contrast.
- Reduced-motion compatibility where possible.

### SEO
- Metadata per page.
- Product title/description metadata.
- Canonical URLs.
- Open Graph sharing.
- Sitemap and robots configuration.
- Structured product data may be added where appropriate.

## 10. Success Metrics
Initial analytics should support measuring:
- Product views.
- Search queries.
- Product shares.
- WhatsApp clicks.
- Phone clicks.
- Favorite actions.
- Compare actions.
- Popular categories.
- Popular products.

## 11. Release Strategy
### Release 1 — Core
Catalog + admin + homepage CMS + search/filter/sort + offers + contact + localization.

### Release 2 — Modern UX
Compare + favorites + recently viewed + sharing + QR + analytics + themes + PWA.

### Release 3 — Engagement/Premium
Notifications + advanced analytics + recommendation engine + multi-admin.

### Release 4 — AI
AI Shopping Assistant and AI-powered Help Me Choose become functional.



---

# Complete Feature Specifications

This is the authoritative feature list. Do not omit a feature because it appears in a later phase; later-phase features must remain documented and architecturally possible.

## A. Storefront & Catalog

### A1. Product Catalog
Display products in responsive cards/grid/list views.
Each product supports:
- Name
- Brand
- Category
- Price
- Optional old price
- Optional discount percentage
- Short description
- Full description
- Primary image
- Additional images
- Availability
- Specifications
- Badges/tags
- Featured state
- Sale state
- Created date

### A2. Product Details
A dedicated canonical page must show:
- Image gallery
- Product title
- Brand/category
- Current price
- Old price if applicable
- Discount badge if applicable
- Availability state
- Description
- Specifications
- Favorite button
- Compare button
- Share button
- WhatsApp inquiry
- Call action where configured
- QR code or QR entry where useful
- Related products

### A3. Categories
Admin can create, edit, reorder, activate/deactivate and delete categories where safe.
Public site shows category navigation and category pages.

### A4. Search
Search by product name and relevant searchable fields such as brand, category and aliases.
V1 should support fast normal text search without AI.
Search must support Arabic and English values where available.

### A5. Filters
Filters may include:
- Category
- Brand
- Price range
- Availability
- On sale
- Rating (only if ratings are later implemented)

Filters should be combinable.

### A6. Sorting
Provide:
- Newest
- Price low to high
- Price high to low
- Name A-Z
- Popular/Most Viewed when analytics data is available

### A7. Availability States
At minimum:
- In Stock
- Limited Stock
- Out of Stock
Admin controls the state.

### A8. Product Badges
Supported examples:
- NEW
- SALE
- FEATURED
- BEST SELLER
- LIMITED
Badges should be data-driven rather than hardcoded.

## B. Homepage CMS

### B1. Dynamic Homepage
Admin controls visible sections and section order.
Suggested sections:
- Hero banner
- Featured categories
- Special offers
- New arrivals
- Best sellers
- Featured products
- Deal of the Day
- Promotional banners
- Trust/why-choose-us section
- Store contact section

### B2. Section Ordering
Provide drag-and-drop ordering in admin where practical. Persist order.

### B3. Featured Products
Admin selects products for featured display and controls order.

### B4. New Arrivals
Automatic mode based on product creation date plus optional manual override.

### B5. Best Sellers
V1: manually curated or based on view metrics. Future: derive from orders when ecommerce exists.

### B6. Deal of the Day
Special visual promotion for one or more chosen products with optional start/end time and countdown.

## C. Offers & Promotions

### C1. Smart Offers
Admin can set:
- Product
- Old price
- New price
- Label
- Start date/time
- End date/time
- Active/inactive

The storefront calculates or displays discount information consistently.

### C2. Offer Countdown
When valid start/end times exist, show countdown for the remaining offer time.

### C3. Expiry Behavior
Expired offers must no longer display as active.

## D. Engagement

### D1. Quick Actions
Product cards may expose:
- View
- Favorite
- Compare
- WhatsApp

### D2. Favorites
Users can save products locally without mandatory account creation in v1.

### D3. Recently Viewed
Keep a limited local list of recently viewed products.

### D4. Compare Products
Users can select products and compare their structured specifications side-by-side.
Comparison must work on mobile with a horizontally scrollable or stacked presentation.

### D5. Share Product
Use the Web Share API where available and provide fallback copy/share options.
Share URL must be canonical.

### D6. WhatsApp Product Inquiry
CTA must generate a contextual WhatsApp message, e.g. product name + current price + product URL.
Phone CTA may be shown when configured.

## E. Discovery & Guidance

### E1. Smart Search (Non-AI v1)
Support normalized search, Arabic/English aliases and common terms. Do not depend on an LLM.

### E2. Help Me Choose — Coming Soon initially
A guided recommendation flow can ask use-case and priorities such as price, performance, camera, battery, gaming or work.
In v1 the entry point must show a polished modal/page with a **Coming Soon** state rather than performing recommendations.

### E3. AI Shopping Assistant — Coming Soon initially
Visible entry point in storefront.
Clicking it opens a branded Coming Soon experience.
No AI call should be made in v1.
Future behavior: answer product questions using store product data only, return product cards and direct links, and never fabricate store inventory/specifications.

## F. Notifications — Future/Premium

### F1. Restock Notification
User can request notification for an out-of-stock product.

### F2. Price Drop Notification
User can request notification when a product price decreases.

### F3. Notification Delivery
Architecture should allow email, browser push or messaging integrations later. Do not overbuild v1.

## G. QR & Physical Store Bridge

### G1. Product QR Code
Every product has a QR code derived from its canonical URL.
Admin can view/download/share the QR representation where practical.

Primary use cases:
- Shelf labels
- Printed price tags
- In-store promotion
- Social media

## H. Store Branding & Customization

### H1. Store Settings
Admin can manage:
- Store name
- Logo
- Hero/banner images
- Primary color
- Secondary/accent color
- Optional font choice from supported safe fonts
- Contact phone
- WhatsApp
- Instagram
- Facebook
- Address
- Working hours
- About text

### H2. Themes
Provide presets such as:
- Modern
- Minimal
- Gaming
- Luxury
- Tech
Themes must be token-based so branding can be overridden.

## I. Media Management

### I1. Image Upload
Admin can upload by picker or drag-and-drop.

### I2. Image Processing
System should support:
- Compression
- Responsive sizing
- Efficient web formats where available
- Reordering
- Primary image selection

### I3. Media Validation
Validate file type and sensible maximum file size/dimensions.

## J. Analytics

### J1. Dashboard Metrics
Track at minimum:
- Visitors/session indicator if analytics implementation allows
- Product views
- Popular products
- Popular categories
- Search terms
- WhatsApp clicks
- Phone clicks
- Share clicks
- Favorite actions
- Compare actions

### J2. Event Tracking
Use a small, extensible event model instead of hardcoding many analytics tables.

### J3. Data Privacy
Do not collect unnecessary personal data. Anonymous engagement metrics are preferred for v1.

## K. Contact & Store Presence

### K1. Contact Section
Show:
- WhatsApp
- Phone
- Address
- Working hours
- Instagram
- Facebook
- Optional map link/embed if configured

### K2. Open/Closed Indicator
Display Open Now / Closed Now based on configured working hours and timezone.

## L. Localization

### L1. Arabic + English
All interface strings must come from translation resources.

### L2. RTL/LTR
Arabic must switch the document layout to RTL correctly.
English must use LTR.

### L3. Product Content
Product content may exist in one or both languages; the data model should permit bilingual content.

## M. PWA / Mobile

### M1. Mobile-first
Core browsing and contact actions must be excellent on small screens.

### M2. Installability
Prepare the site as a PWA where compatible, including manifest and icons.

### M3. Offline Strategy
Do not promise full offline catalog functionality in v1. Only cache safe/static resources as appropriate.

## N. Admin Dashboard

### N1. Dashboard Overview
Provide cards/charts for core metrics and shortcuts.

### N2. CRUD
Admin must manage products, categories, offers, homepage sections and store settings.

### N3. Product Form
Product creation/editing should include validation, preview and image management.

### N4. Bulk-friendly UX
Even without CSV import in v1, the data model and UI should avoid painful one-by-one workflows.

### N5. Preview
Admin should be able to preview a product before publishing.

## O. Future SaaS Features

### O1. Multiple Admin Users
Roles such as Owner, Manager, Editor.

### O2. Multi-store Tenancy
One platform instance can host multiple stores with isolated data.

### O3. Custom Domain
Map a store to a custom domain in a future SaaS release.

## P. Future Ecommerce Layer
Not required in v1, but architecture should not block later addition of:
- Cart
- Checkout
- Orders
- Online payments
- Shipping/delivery
- Customer accounts
- Order notifications



---

# Admin Dashboard Specification

## 1. Admin Navigation
Suggested navigation:
- Dashboard
- Products
- Categories
- Offers
- Homepage
- Analytics
- Store Settings
- Appearance / Theme
- Notifications (future)
- Admin Users (future)

## 2. Dashboard Home
Show:
- Total active products
- Products on sale
- Out-of-stock products
- Product views
- WhatsApp clicks
- Phone clicks
- Most viewed products
- Most searched terms
- Recent product updates

Provide shortcuts:
- Add Product
- Add Offer
- Manage Homepage
- Edit Store Settings

## 3. Product Management
### Product list
Columns/cards should support:
- Image
- Name
- Category
- Brand
- Price
- Availability
- Sale
- Featured
- Created date
- Actions

Actions:
- Edit
- Duplicate (recommended)
- Preview
- Delete/archive
- Toggle active

### Product editor
Fields:
- Name
- Slug
- Brand
- Category
- Price
- Old price
- Description
- Long description
- Specifications
- Images
- Availability
- Badges
- Featured
- New/automatic behavior
- Sale
- Offer dates
- Sort/order override

Validation examples:
- Name required.
- Category required.
- Price must be >= 0.
- Old price must be >= 0 if present.
- New price should normally be less than old price for an offer.
- Primary image required for publish.

## 4. Category Management
- Add category.
- Edit name/slug.
- Add icon/image.
- Reorder.
- Activate/deactivate.
- Prevent deletion when products depend on category unless products are reassigned or an explicit safe-delete flow exists.

## 5. Offer Management
Admin creates offer-linked product promotions.
Offer fields:
- Product
- Label
- Old price snapshot if required
- New price
- Start/end
- Active flag
- Optional banner image

## 6. Homepage Manager
Recommended UI:
```text
Homepage

☰ Hero Banner        [Edit]
☰ Categories         [Edit]
☰ Special Offers     [Edit]
☰ New Arrivals       [Edit]
☰ Best Sellers       [Edit]
☰ Featured Products  [Edit]
☰ Deal of the Day    [Edit]
☰ Why Choose Us      [Edit]
☰ Contact            [Edit]
```

Requirements:
- Enable/disable sections.
- Reorder sections.
- Configure section title/subtitle.
- Select products where relevant.
- Preview changes before publish if practical.

## 7. Analytics
Admin sees simple, useful charts, not an overwhelming BI dashboard.
Default time filters:
- 7 days
- 30 days
- 90 days

## 8. Store Settings
Sections:
- Identity
- Contact
- Socials
- Address
- Working hours
- Localization
- Currency
- Theme
- SEO defaults

## 9. Appearance
Theme preset selector plus design tokens:
- Primary
- Secondary
- Accent
- Surface/background
- Text
- Border/radius where supported

Do not allow arbitrary CSS injection in normal admin UI.

## 10. Publishing Model
Recommended v1:
- Changes save immediately to database.
- `active/published` flags control visibility.

A future staged draft/publish workflow may be added.

## 11. Admin UX Principles
- Fast paths for frequent tasks.
- Clear destructive action confirmation.
- Autosave only where safe; explicit save for complex forms.
- Toast feedback after successful operations.
- Skeleton states while data loads.
- Empty-state guidance with a primary CTA.



---

# Database Schema Specification

Database: PostgreSQL via Supabase.

The schema should support the current single-store deployment and future multi-store SaaS without requiring a total rewrite.

## 1. Tenancy Strategy
Use a `stores` table even if v1 is deployed for one store. Nearly every business-owned table should include `store_id`.

## 2. Core Tables

### stores
- id UUID PK
- name TEXT NOT NULL
- slug TEXT UNIQUE NOT NULL
- logo_url TEXT
- currency_code TEXT DEFAULT 'ILS'
- locale_default TEXT DEFAULT 'ar'
- timezone TEXT DEFAULT 'Asia/Hebron'
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### store_settings
- store_id UUID PK/FK stores.id
- about_text_ar TEXT
- about_text_en TEXT
- phone TEXT
- whatsapp TEXT
- instagram_url TEXT
- facebook_url TEXT
- address_ar TEXT
- address_en TEXT
- working_hours JSONB
- seo_title TEXT
- seo_description TEXT
- updated_at TIMESTAMPTZ

### store_theme
- store_id UUID PK/FK stores.id
- preset TEXT
- primary_color TEXT
- secondary_color TEXT
- accent_color TEXT
- surface_color TEXT
- logo_variant TEXT
- updated_at TIMESTAMPTZ

### admin_users / profiles
Depending on Supabase Auth design, use `auth.users` plus a public profile/admin membership table.
Recommended fields:
- id UUID PK/FK auth.users.id
- store_id UUID FK stores.id
- role TEXT CHECK (...)
- display_name TEXT
- created_at TIMESTAMPTZ

Future roles: owner, manager, editor, viewer.

### categories
- id UUID PK
- store_id UUID FK
- name_ar TEXT NOT NULL
- name_en TEXT
- slug TEXT NOT NULL
- description_ar TEXT
- description_en TEXT
- image_url TEXT
- icon TEXT
- display_order INTEGER DEFAULT 0
- active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Unique constraint: `(store_id, slug)`.

### brands
- id UUID PK
- store_id UUID FK
- name TEXT NOT NULL
- slug TEXT NOT NULL
- logo_url TEXT
- active BOOLEAN DEFAULT true

Unique constraint: `(store_id, slug)`.

### products
- id UUID PK
- store_id UUID FK
- category_id UUID FK
- brand_id UUID FK nullable
- name_ar TEXT NOT NULL
- name_en TEXT
- slug TEXT NOT NULL
- short_description_ar TEXT
- short_description_en TEXT
- description_ar TEXT
- description_en TEXT
- price NUMERIC(12,2) NOT NULL
- old_price NUMERIC(12,2)
- availability TEXT CHECK IN ('in_stock','limited','out_of_stock')
- active BOOLEAN DEFAULT true
- featured BOOLEAN DEFAULT false
- bestseller_manual BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Unique constraint: `(store_id, slug)`.

### product_images
- id UUID PK
- product_id UUID FK
- storage_path TEXT NOT NULL
- public_url TEXT
- alt_text_ar TEXT
- alt_text_en TEXT
- display_order INTEGER DEFAULT 0
- is_primary BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ

### product_specs
- id UUID PK
- product_id UUID FK
- spec_key TEXT NOT NULL
- value_ar TEXT
- value_en TEXT
- display_order INTEGER DEFAULT 0

Use a child table rather than free-form JSON so compare/search can evolve. A JSONB field can still be added for advanced data later.

### offers
- id UUID PK
- store_id UUID FK
- product_id UUID FK
- title_ar TEXT
- title_en TEXT
- old_price NUMERIC(12,2)
- new_price NUMERIC(12,2)
- start_at TIMESTAMPTZ
- end_at TIMESTAMPTZ
- active BOOLEAN DEFAULT true
- banner_image_url TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### homepage_sections
- id UUID PK
- store_id UUID FK
- type TEXT CHECK IN ('hero','categories','offers','new_arrivals','best_sellers','featured','deal_of_day','banner','trust','contact')
- title_ar TEXT
- title_en TEXT
- subtitle_ar TEXT
- subtitle_en TEXT
- config JSONB
- display_order INTEGER DEFAULT 0
- active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

The `config` field stores type-specific configuration, while referenced entities remain relational where practical.

### homepage_section_items
- id UUID PK
- section_id UUID FK
- product_id UUID FK nullable
- category_id UUID FK nullable
- display_order INTEGER DEFAULT 0

## 3. Analytics Tables

### analytics_events
- id UUID PK
- store_id UUID FK
- event_type TEXT
- product_id UUID FK nullable
- category_id UUID FK nullable
- search_query TEXT nullable
- session_id TEXT nullable
- metadata JSONB
- created_at TIMESTAMPTZ

Example event types:
- page_view
- product_view
- search
- whatsapp_click
- phone_click
- share
- favorite_add
- favorite_remove
- compare_add
- compare_remove
- qr_scan

Do not store raw sensitive data unnecessarily.

## 4. Notification Tables (Future)
### notification_subscriptions
- id UUID PK
- store_id UUID FK
- product_id UUID FK
- type TEXT CHECK IN ('restock','price_drop')
- channel TEXT CHECK IN ('email','push','other')
- destination TEXT
- status TEXT
- created_at TIMESTAMPTZ

## 5. Optional Ratings (Future)
If ratings are introduced:
- product_ratings
- reviews
Do not expose rating filter in v1 unless real rating data exists.

## 6. Row Level Security
Public storefront:
- Read only active public store/product/category/offer/theme content.

Admin:
- Read/write only rows where `store_id` belongs to the authenticated admin.

Platform operator (future):
- Scoped multi-store administration.

Never use a service-role key in client-side code.

## 7. Indexing Recommendations
Add indexes for:
- `(store_id, active)` on products.
- `(store_id, category_id, active)` on products.
- `(store_id, brand_id, active)` on products.
- `(store_id, created_at DESC)` on products.
- `(store_id, display_order)` on categories/homepage sections.
- `(store_id, event_type, created_at)` on analytics.
- text-search indexes as supported by PostgreSQL for relevant searchable fields.

## 8. Storage Buckets
Suggested buckets:
- store-logos
- store-banners
- product-images
- category-images

Apply sensible file type/size restrictions.



---

# API Specification

Use Next.js route handlers or a clearly separated server API layer. All admin mutations must be authenticated.

## 1. Public Product API

### GET /api/products
Query params:
- `search`
- `category`
- `brand`
- `minPrice`
- `maxPrice`
- `availability`
- `onSale`
- `sort`
- `page`
- `pageSize`

Response shape:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "total": 120,
    "totalPages": 5
  }
}
```

### GET /api/products/[slug]
Return complete public product data, images and specifications.

### GET /api/categories
Return active categories in display order.

### GET /api/brands
Return active brands as needed by filters.

### GET /api/offers
Return currently active offers unless explicit admin query is requested.

### GET /api/homepage
Return active homepage sections sorted by `display_order` plus their referenced content.

### GET /api/store
Return safe public store settings/theme/contact information.

## 2. Admin Product API

### POST /api/admin/products
Create a product.

### PATCH /api/admin/products/[id]
Update a product.

### DELETE /api/admin/products/[id]
Soft-delete or deactivate product by default; hard delete only from a safe admin workflow.

### POST /api/admin/products/[id]/duplicate
Optional convenience endpoint.

### POST /api/admin/products/[id]/images
Register/upload product images through authenticated storage flow.

## 3. Admin Category API
- POST /api/admin/categories
- PATCH /api/admin/categories/[id]
- DELETE /api/admin/categories/[id]
- POST /api/admin/categories/reorder

## 4. Admin Offer API
- POST /api/admin/offers
- PATCH /api/admin/offers/[id]
- DELETE /api/admin/offers/[id]

## 5. Homepage API
- GET /api/admin/homepage
- PATCH /api/admin/homepage/sections
- POST /api/admin/homepage/sections
- DELETE /api/admin/homepage/sections/[id]
- POST /api/admin/homepage/reorder

## 6. Settings API
- GET /api/admin/settings
- PATCH /api/admin/settings
- PATCH /api/admin/theme

## 7. Analytics API
### POST /api/analytics/events
Request example:
```json
{
  "eventType": "product_view",
  "productId": "uuid",
  "metadata": {}
}
```

Validate allowed event types server-side.

## 8. Notification API (Future)
- POST /api/notifications/subscribe
- DELETE /api/notifications/subscribe/[id]

## 9. AI API (Future Only)
Do not implement in v1.
Reserved endpoint design:
- POST /api/ai/assistant
- POST /api/ai/recommend

When activated, AI responses must be grounded in current store data and must not invent products, prices or availability.

## 10. Error Contract
Use a predictable shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Price must be greater than or equal to 0",
    "details": {}
  }
}
```

## 11. Auth Behavior
Unauthenticated admin requests return 401.
Authenticated but unauthorized requests return 403.
Invalid input returns 400/422 as appropriate.
Not found returns 404.
Unexpected server errors return 500 without exposing secrets.



---

# UX / UI Specification

## 1. Design Direction
The storefront should feel modern, premium and fast without becoming visually noisy.

Think:
- Clean product cards.
- Strong product photography.
- Clear prices.
- Prominent offers.
- One-tap contact.
- Minimal cognitive load.

The exact colors are store-configurable; do not hardcode a single brand palette.

## 2. Responsive Breakpoints
Use the UI framework defaults unless there is a strong reason to customize.
Prioritize:
- Mobile
- Tablet
- Desktop

## 3. Global Components
Required reusable components:
- Navbar
- Search bar
- Language switcher
- Product card
- Price display
- Discount badge
- Availability badge
- Category card
- Offer banner
- Product gallery
- Specifications table
- Favorite button
- Compare button
- Share button
- WhatsApp CTA
- Call CTA
- Empty state
- Loading skeleton
- Toast/alert
- Modal/drawer
- Breadcrumbs
- Pagination/infinite loading
- Footer
- Coming Soon modal/card

## 4. Home Page Sections
Recommended order (admin can change it):
1. Header/navigation.
2. Hero banner.
3. Featured categories.
4. Special offers.
5. New arrivals.
6. Best sellers.
7. Featured products.
8. Deal of the Day.
9. Why choose us.
10. Contact/store info.
11. Footer.

The actual visible order is data-driven through homepage sections.

## 5. Product Card Requirements
Must show at least:
- Image.
- Name.
- Price.
- Availability.

Optional/contextual:
- Old price.
- Discount.
- Badge.
- Brand.
- Quick actions.

Actions must not make the card feel crowded on mobile. On mobile, use a compact action pattern.

## 6. Product Details UX
Use a two-column desktop layout and stacked mobile layout.
Primary CTA should be WhatsApp/contact, not checkout.

## 7. Search UX
- Search must be visible and easy to reach.
- Support keyboard interaction.
- Show a clean no-results state.
- Preserve search/filter query in URL where practical so results are shareable/bookmarkable.

## 8. Filter UX
Desktop: sidebar or top filter controls.
Mobile: filter drawer/sheet.
Show active filter chips and a clear-all action.

## 9. Compare UX
Maximum recommended selection: 3 or 4 products.
Prevent incompatible compare state if product specifications are missing; show graceful fallbacks such as `—`.

## 10. Favorites UX
Favorite interaction must provide immediate visual feedback.
Persist locally without forcing sign-in.

## 11. Recently Viewed
Keep a small list, e.g. 8–12 products. Use local storage.

## 12. WhatsApp UX
Display WhatsApp CTA prominently.
Generated message should be human-readable and localized.

## 13. Coming Soon UX for AI
This is required in v1.
When user clicks AI:
- Open modal/drawer/page.
- Show AI feature branding.
- Explain that the assistant is coming soon.
- Do not call an AI backend.
- Do not fake generated answers.

Suggested copy:
- Arabic: `مساعد التسوق بالذكاء الاصطناعي — قريبًا`
- English: `AI Shopping Assistant — Coming Soon`

The interaction should feel intentional, not like a disabled broken button.

## 14. Admin UX
Admin interface should prioritize:
- Tables for management.
- Cards for dashboard stats.
- Clear create/edit forms.
- Drag-and-drop for homepage ordering.
- Image preview.
- Search in large product lists.
- Confirmation on destructive actions.

## 15. Accessibility
- Use semantic buttons/links.
- Every icon-only button needs an accessible label.
- Images need alt text.
- Forms need labels and validation messages.
- Preserve focus when modals open/close.
- Ensure RTL layout is tested, not simply mirrored.

## 16. Loading / Empty / Error States
Every data-driven screen must have:
- Loading state.
- Empty state.
- Error state.
- Success feedback after admin mutations.

## 17. SEO / Share Previews
Product pages need dynamic:
- Title.
- Description.
- Open Graph title/description/image.
- Canonical URL.

## 18. Motion
Use subtle motion for:
- Hover.
- Modal transitions.
- Favorite/compare feedback.
- Offer emphasis.
Avoid excessive animation and respect reduced-motion preferences.



---

# Implementation Plan

## Phase 0 — Foundation
1. Initialize Next.js + TypeScript.
2. Install Tailwind and chosen UI primitives.
3. Configure Supabase.
4. Create environment variables safely.
5. Establish app layout, localization and RTL/LTR support.
6. Establish design tokens/theme system.
7. Create seed store and sample catalog data.
8. Add route protection for admin.

## Phase 1 — Core Storefront
1. Navbar/header.
2. Home page shell.
3. Categories.
4. Product listing.
5. Product details.
6. Search.
7. Filters.
8. Sorting.
9. Availability states.
10. Offers.
11. Contact + WhatsApp.
12. Footer.

## Phase 2 — Admin Core
1. Auth.
2. Admin dashboard shell.
3. Product CRUD.
4. Product image upload/reorder.
5. Category CRUD.
6. Brand CRUD where used.
7. Offer management.
8. Store settings.
9. Theme configuration.

## Phase 3 — Homepage CMS
1. Homepage section model.
2. Section CRUD.
3. Enable/disable.
4. Product/category selection.
5. Drag-and-drop ordering.
6. Deal of the Day.
7. Featured/New/Best Seller behavior.

## Phase 4 — Modern Customer Features
1. Favorites.
2. Compare.
3. Recently viewed.
4. Share.
5. Product QR.
6. Quick actions.
7. Related products.
8. Improved empty/error/loading UX.

## Phase 5 — Analytics + PWA
1. Event collection.
2. Admin metrics.
3. Most viewed products.
4. Most searched terms.
5. WhatsApp/phone/share analytics.
6. PWA manifest/icons.
7. Performance optimization.

## Phase 6 — Future/Premium
1. Restock notification.
2. Price drop notification.
3. Multiple admin roles.
4. Advanced analytics.
5. Custom domain/multi-store readiness.
6. Recommendation system.

## Phase 7 — AI Activation
Only after the data quality and product model are stable:
1. Implement AI Shopping Assistant.
2. Implement AI Help Me Choose.
3. Ground responses in store data.
4. Add safeguards for availability and price freshness.
5. Measure AI usage separately.

## Suggested Build Order for an AI Coding Agent
Do not jump directly into feature sprawl.

Sequence:
- Schema/migrations
- Auth/RLS
- Shared UI/design system
- Admin CRUD
- Public catalog
- Homepage CMS
- Engagement features
- Analytics
- PWA/SEO/performance
- Future features

## Definition of Technical Completion per Feature
A feature is not complete until:
1. Database support exists where needed.
2. Server/API behavior exists where needed.
3. UI is responsive.
4. Loading/empty/error/success states exist.
5. Arabic and English are handled.
6. Validation/security are addressed.
7. Acceptance criteria pass.
8. No hardcoded store-specific business data is introduced.



---

# Acceptance Criteria / Definition of Done

## Global
- [ ] App runs in local development.
- [ ] No secrets committed to source control.
- [ ] Admin routes are protected.
- [ ] Public pages are accessible without authentication.
- [ ] RTL and LTR both work.
- [ ] Mobile layout is usable without horizontal overflow except intentional comparison areas.
- [ ] Loading/empty/error states exist for data-driven views.
- [ ] Store-specific content comes from the database/configuration.

## Products
- [ ] Admin can create a product.
- [ ] Admin can edit a product.
- [ ] Admin can activate/deactivate a product.
- [ ] Admin can manage images.
- [ ] Admin can define specifications.
- [ ] Public users see only active products.
- [ ] Product page has stable URL.
- [ ] Price and availability are clear.

## Categories & Brands
- [ ] Admin can CRUD/reorder categories.
- [ ] Product can be assigned to a category.
- [ ] Filters can use categories.
- [ ] Brands can be managed or loaded from product data.

## Search / Filters / Sorting
- [ ] Search returns relevant products.
- [ ] Arabic/English text works where data exists.
- [ ] Multiple filters can be combined.
- [ ] Clear-all filters works.
- [ ] Sorting updates results correctly.
- [ ] Query/filter state can be shared/bookmarked where implemented.

## Offers
- [ ] Admin can create an offer.
- [ ] Active offer appears in offer surfaces.
- [ ] Expired offer is not presented as active.
- [ ] Old/new price display is consistent.
- [ ] Countdown works when end time exists.

## Homepage
- [ ] Admin can enable/disable sections.
- [ ] Admin can reorder sections.
- [ ] Featured products can be selected.
- [ ] New arrivals work.
- [ ] Best sellers work using manual/metric mode.
- [ ] Deal of the Day works.

## Engagement
- [ ] Favorite toggle works without mandatory account.
- [ ] Recently viewed list works.
- [ ] Compare supports multiple products.
- [ ] Compare handles missing specifications gracefully.
- [ ] Share uses native sharing when available and fallback when not.
- [ ] WhatsApp message contains product context.
- [ ] Quick actions work from product cards.

## QR
- [ ] Every public product has a canonical URL.
- [ ] QR code resolves to the correct product page.
- [ ] QR can be shown from product/admin experience.

## Theme / Store Settings
- [ ] Store logo/name are configurable.
- [ ] Contact/social/address/hours are configurable.
- [ ] Theme preset works.
- [ ] Color overrides work without breaking contrast.

## Analytics
- [ ] Product view events are recorded.
- [ ] Search events are recorded.
- [ ] WhatsApp/phone/share events are recordable.
- [ ] Admin dashboard can surface basic metrics.
- [ ] No unnecessary personal data is collected.

## PWA / SEO
- [ ] Manifest exists.
- [ ] App has suitable icons.
- [ ] Dynamic metadata works for products.
- [ ] Open Graph data works.
- [ ] Sitemap/robots are configured.

## AI Coming Soon
- [ ] AI entry point is visible.
- [ ] Clicking it opens a polished Coming Soon state.
- [ ] No AI request is sent in v1.
- [ ] No fake AI answer is displayed.
- [ ] Arabic/English Coming Soon content exists.

## Future Notifications
- [ ] Architecture can represent restock and price-drop subscriptions.
- [ ] Activation is feature-flagged or phase-gated.

## Security
- [ ] RLS policies prevent cross-store data access.
- [ ] Admin mutations require authorization.
- [ ] Input validation is server-side.
- [ ] File uploads are validated.
- [ ] Service-role credentials never reach client code.



---

# Instructions for the AI Coding Agent

## Mission
Build a reusable, production-quality digital storefront system for electronics stores according to this documentation package.

## Non-Negotiable Rules
1. Read all files in this documentation package before implementing major features.
2. Treat `FEATURE_SPECIFICATIONS.md` as the authoritative feature inventory.
3. Do not remove or silently skip documented features.
4. Respect the release phases in `IMPLEMENTATION_PLAN.md`.
5. Do not implement AI functionality in v1. Implement only the visible AI entry point and Coming Soon experience.
6. Never fake AI output.
7. Do not hardcode store-specific products, prices, branding or contact information.
8. Build reusable components and data-driven configuration.
9. Use TypeScript types for database/API models.
10. Validate inputs on the server.
11. Protect admin operations with auth + authorization.
12. Preserve Arabic RTL and English LTR behavior.
13. Avoid unnecessary dependencies.
14. Prefer server-side data fetching where appropriate in Next.js.
15. Optimize images and avoid layout shift.
16. Every feature must have loading, empty and error states where applicable.
17. Keep accessibility in mind for all interactive components.
18. Do not expose secrets or service-role keys in client code.
19. Do not introduce a cart/checkout/payment system into v1 unless explicitly requested.
20. Do not replace the documented stack without a strong technical reason.

## Architecture Rules
- Use a modular folder structure.
- Separate public storefront components from admin components.
- Centralize database access.
- Centralize translations.
- Centralize theme/design tokens.
- Centralize validation schemas.
- Keep product/business models independent of UI.

## Data Rules
- Use UUIDs for database primary keys.
- Use slugs for public URLs.
- Prefer relational tables for queryable product data.
- Use JSONB only for truly flexible configuration.
- Use indexes where query patterns justify them.
- Use soft-disable (`active=false`) instead of destructive deletes when appropriate.

## Admin Rules
- Every CRUD operation must have success and error feedback.
- Destructive operations require confirmation.
- Product forms must support image ordering and primary image selection.
- Homepage ordering must persist reliably.
- Admin must be able to preview public-facing product content.

## UX Rules
- Mobile-first.
- Keep the customer journey short.
- Make price/availability/contact actions obvious.
- Avoid cluttering product cards with too many buttons.
- Use drawers/modals on mobile for filters and secondary actions when helpful.
- Use subtle modern motion only.

## AI Rules for v1
The AI feature is a placeholder only.

Required behavior:
- Show an entry point such as `AI Shopping Assistant`.
- On click show `Coming Soon` in Arabic/English.
- No network call to an AI provider.
- No fake generated recommendations.
- Do not collect user questions for AI unless an explicit non-AI analytics event is intentionally implemented.

Future AI must be grounded in the current store catalog and must not invent inventory, specifications, price or availability.

## Development Workflow
For each feature:
1. Identify its requirements in the docs.
2. Implement schema/API if needed.
3. Implement UI.
4. Add validation and error handling.
5. Test mobile + desktop.
6. Test Arabic + English.
7. Verify acceptance criteria.
8. Refactor duplicated code.

## Before Marking a Phase Complete
- Run lint/type checks.
- Run tests.
- Verify all related acceptance criteria.
- Verify no console errors in key flows.
- Verify responsive behavior.
- Verify admin authorization.

## Suggested Initial Folder Structure
```text
src/
  app/
    (storefront)/
    admin/
    api/
  components/
    storefront/
    admin/
    shared/
  lib/
    supabase/
    validations/
    analytics/
    i18n/
  services/
  types/
  config/
  styles/
```

Adjust to the project conventions only if the resulting architecture remains modular and clear.

## Do Not Overbuild
Do not build every future feature before the core flow works.
Prioritize a stable foundation and preserve extension points for future phases.



---

# Future AI Specification (Reference Only — Do Not Implement in v1)

## AI Shopping Assistant
Purpose: help a customer discover products using natural language.

Examples:
- "I need a laptop for programming under 3000."
- "Which phone has the best camera in this store?"
- "Show me Samsung phones between 1500 and 2500."

Expected behavior later:
1. Parse intent and constraints.
2. Query current store catalog.
3. Return only products that exist in the store data.
4. Explain why each product matches.
5. Link to product pages.
6. Clearly state when no matching product exists.

## AI Help Me Choose
A guided assistant collects:
- Product type.
- Use case.
- Budget.
- Priorities.
- Optional preferences.

Then returns a small set of matching products with concise reasons.

## Grounding Rules
- Catalog is source of truth.
- Current price and availability come from live database data.
- No invented products.
- No invented specifications.
- No unsupported claims.
- Recommendations must be traceable to stored fields.

## Candidate Architecture Later
User → AI endpoint → intent extraction → structured catalog search → optional embeddings/RAG → response formatter → product cards

AI should remain an assistive interface over the store catalog, not a source of truth.



---
