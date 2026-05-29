# ListingFlow AI

ListingFlow AI by MeadeMark Labs is a B2B SaaS MVP for dealerships that need clean, accurate, dealer-ready vehicle listings. It helps staff turn VINs, decoded vehicle details, condition notes, selling points, and dealership style preferences into platform-ready copy while keeping humans in control.

The MVP includes account auth, dealership workspaces, onboarding, style learning, listing generation, saved listings, team invites, join requests, trial generation limits, rate limiting, and demo billing controls.

Recent operations features include bulk inventory intake, approval statuses, claim risk auditing, feature event tracking, audit history, dealership analytics, founder admin visibility, VIN/feature search, and vehicle image URL tracking.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react icons
- framer-motion
- Supabase Auth and Postgres
- OpenAI API for style analysis, input sanity checks, and listing generation
- Vercel-ready deployment

## Environment Variables

Create `.env.local`:

```bash
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LISTINGFLOW_ADMIN_EMAILS=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_DEALER_GROUP_MONTHLY=
STRIPE_PRICE_DEALER_GROUP_YEARLY=
```

`SUPABASE_SERVICE_ROLE_KEY` is used only in secure server contexts for rate limiting and public early access inserts. Do not expose it to the browser.

`LISTINGFLOW_ADMIN_EMAILS` is a server-only comma-separated list of founder/admin emails that can access `/dashboard/admin`.

Optional:

```bash
OPENAI_MODEL=gpt-4o-mini
```

## Supabase Setup

1. Create a Supabase project.
2. Copy the URL and anon key into `.env.local`.
3. Copy the service role key into `.env.local`.
4. Run the SQL migrations in order from `supabase/migrations/`.
   - Fresh setup: run `0001`, then `0002`, then `0003`.
   - Existing setup that already ran the first migration: run the newer migration files you have not applied yet.
5. Enable email/password authentication in Supabase Auth.
6. Configure the site URL and redirect URL, for example:
   - `http://localhost:3000/auth/callback`
   - your Vercel production callback URL

## Database Schema

The migration creates:

- `profiles`
- `dealerships`
- `dealership_members`
- `dealership_invites`
- `join_requests`
- `dealership_style_profiles`
- `style_examples`
- `generation_usage`
- `listings`
- `early_access_leads`
- `rate_limits`
- `feature_events`
- `audit_logs`
- `listing_quality_reports`
- `bulk_inventory_batches`
- `bulk_inventory_items`
- `listing_images`
- `app_admins`

Helper functions:

- `is_dealership_member(user_id, dealership_id)`
- `has_dealership_role(user_id, dealership_id, roles)`

## RLS Summary

Row Level Security is enabled for all app tables. Members can access listings, usage, style profiles, style examples, and team data for their dealership. Owner/admin roles can manage invites, join requests, dealership settings, style profiles, and listing deletion. Staff can generate and save listings but cannot manage billing or team settings.

Dealership rows are selectable by authenticated users so new users can request to join a dealership during onboarding. Sensitive operational data remains protected through the member-scoped tables.

## OpenAI Setup

All OpenAI calls run server-side only:

- `POST /api/style/analyze`
- `POST /api/generate-listing`
- internal `analyzeVehicleInputQuality(input)`

The generation prompt instructs the model not to invent specs, warranty, title status, accident history, ownership history, service history, financing terms, or condition claims. Human review is recommended before publishing listings.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run build
```

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the environment variables in Vercel Project Settings.
4. Add the Vercel deployment URL to Supabase Auth redirect URLs.
5. Deploy.

The app is Vercel-ready and uses Next.js route handlers for server-only API behavior.

## Trial And Rate Limits

Free trial = 35 generations per month per dealership.

Plan limits:

- `trial`: 35/month
- `starter_demo`: 150/month
- `pro_demo`: 500/month
- `unlimited_demo`: unlimited test generations

Route limits:

- `/api/generate-listing`: 10 requests per user per 10 minutes, plus monthly dealership plan limits
- `/api/style/analyze`: 5 requests per user per 30 minutes
- `/api/invites/create`: 10 invites per dealership per day
- `/api/early-access`: 5 submissions per IP per hour, falling back to email

## Stripe Billing

Stripe Checkout is implemented for real subscription collection with a 7-day free trial. Stripe Customer Portal is used for payment method updates, invoices, cancellation, and subscription management. Stripe webhooks update dealership plan state automatically.

Create recurring Stripe prices for:

- Starter monthly/yearly
- Pro monthly/yearly
- Dealer Group monthly/yearly

Then add the Stripe price IDs to `.env.local` and Vercel. Configure the webhook endpoint:

```bash
https://your-domain.com/api/stripe/webhook
```

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Recommended launch pricing:

- Starter: $79/month or $790/year
- Pro: $149/month or $1,490/year
- Dealer Group: $299/month or $2,990/year

## Demo Billing

Demo billing remains available for founder testing only. No real payments are processed by the demo controls. Use Stripe Checkout for real customer billing.

The Billing page can toggle:

- Starter Demo
- Pro Demo
- Unlimited Demo
- Free Trial

Do not use demo billing for real customer billing.

## VIN Decoding

ListingFlow includes server-side VIN decoding through the public NHTSA VPIC API. A valid 17-character VIN can prefill available baseline fields such as year, make, model, trim/series, body class, drivetrain, transmission, engine, and fuel type.

The app also uses free NHTSA recall and NCAP safety-rating endpoints when year, make, and model are available. The results are summarized by `gpt-4o-mini` with strict instructions to validate only the sourced data, then cached in `vehicle_model_intelligence` by year/make/model/trim so repeated models do not need repeated research.

VIN decoding is a starting point, not an autopilot. Dealership staff must confirm decoded details before generation and should still add mileage, condition, title status, accident history, warranty or financing information, selling points, price, photos, and internal notes. ListingFlow does not invent missing specs or claims from a VIN. Title status is manual/staff-entered unless a trusted paid NMVTIS/history provider is added later.

## Images

Vehicle image handling is limited to tracking image URLs and photo notes against saved listings. AI photo decoding and real storage uploads are intentionally held for a later integration.

## Operations Features

- Bulk inventory intake accepts CSV/spreadsheet rows and saves validated intake batches.
- Claim Risk Auditor flags unsupported claims such as clean title, no accidents, one-owner, warranty, financing, service history, and absolute condition language.
- Approval statuses include draft, pending review, changes requested, approved, and published.
- Feature events and audit logs support dealership analytics and founder admin visibility.
- The dashboard search opens with `Cmd/Ctrl+K` and can search saved listings by VIN, stock number, year, make, or model.

## Product Notes

The MVP intentionally does not include real Stripe payments, CRM features, lead management, automated publishing, fake testimonials, fake customer logos, fake integrations, or invented VIN data.

Held for later: paid/commercial VIN data integrations, window sticker data, build-sheet enrichment, and AI/photo-assisted vehicle feature extraction.
