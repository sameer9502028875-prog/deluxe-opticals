# Deluxe Optical — Website + installable app (PWA)

This is the Deluxe Optical website project prepared for the agreed **₹5,000 package**. It includes the first-year domain allowance in that quote, plus a responsive website and an installable PWA. The source is ready for shop-specific setup; it is not live yet. Do not accept actual customer orders before configuring the shop details, database and HTTPS deployment.

## Contents
- `index.html`, `styles.css`, `app.js`: responsive website, product filters, shopping bag, guest checkout, owner console
- `assets/`: DO monogram logo, matching PWA icons and **sample** eyeglasses illustrations
- `manifest.webmanifest`, `sw.js`: add-to-home-screen app (PWA), limited offline static asset cache
- `config.js`: real Deluxe Optical business information + Supabase keys
- `database/setup.sql`: owner-only admin area, product photo uploads, private customer orders, validated order totals

## 1) Update business info
Edit `config.js`:
- `whatsappNumber`: prefilled from the shop profile as `918985158331`; confirm the owner uses this number for WhatsApp before launch (country code, no `+` or spaces)
- `shopAddress`: prefilled as `Opp. Old Bus Stand, Mangalagiri, Andhra Pradesh`; confirm the wording with the owner
- `googleMapsUrl`: prefilled from the profile screenshot; verify that the short link opens the correct shop listing
- `shopPhone`: optional shop phone
Do **not** invent these fields or publish blank WhatsApp details.

## 2) Supabase (for real products and orders)
1. Sign in to Supabase and create a **separate project for Deluxe Optical**.
2. In `SQL Editor`, run `database/setup.sql` on a **fresh project**; don't run blindly in another business' existing production database.
3. Go to `Authentication` → `Users` and create or invite an **owner account** (email/password). If email confirmation is on, confirm it before logging in.
4. Copy the user's UUID and run **separately** in SQL Editor:
   `INSERT INTO public.admin_users (user_id) VALUES ('PASTE-THE-REAL-OWNER-UUID-HERE');`
5. In Supabase `Project Settings` → `API`, copy the project URL and **publishable (or anon) key** into `config.js`.
   **NEVER put a `service_role` or secret API key in browser code.**
6. Serve the website, open the footer `Shop owner login`, and sign in with the owner email/password. Add products, upload photos (2 MB max), set prices, in-stock and visible statuses.
7. **Before any public launch**, run security tests: anonymous users should be able to read visible products and submit an order request, but MUST NOT be able to read order rows / customer phone numbers, edit products, upload photos, or sign in as owner. Test invalid quantities / spoofed prices and ensure they are rejected.
8. Enable abuse prevention (for example CAPTCHA and request throttling) before running ads or accepting high-volume public ordering. This simple template includes only a per-phone basic 15-minute limit and is not a substitute for robust bot protection.

The `place_order` SQL function derives order totals from stored product prices (not browser values), protects private order details with database rules, and creates public order reference numbers. The admin updates status: Pending → Confirmed → Ready → Completed / Cancelled. Order confirmations are shown on the website only; **there are no automatic SMS/WhatsApp notifications**.

## 3) Publish the website for free
- The project ZIP includes `render.yaml` at its root. Upload the extracted folder to a GitHub repository, then create a Render Blueprint from that repository; it publishes `deluxe_optical_website/` as a static site. Alternatively create a Render Static Site with the publish directory set to `deluxe_optical_website` or use Cloudflare Pages.
- Add the real domain via DNS, enable HTTPS, confirm the page loads, and test installability on Android Chrome.
- With free hosting, changes/limits/pauses are subject to the provider's current rules. A free backend may pause after inactivity, so order handling reliability and backups require attention.
- Put the domain and Supabase project under the SHOP OWNER'S ownership so they don't lose access later.

## 4) PWA (Play Store NOT included)
A PWA is installable from a supported browser over HTTPS. In Chrome on Android: open the live site → menu → `Add to Home screen` or `Install app`. Install prompt depends on browser support and eligibility. This is **not** a Google Play Store app.

## 5) Product and order choices
- First release: no customer account required, guest name/phone, optional address for delivery requests, local pickup, cart, WhatsApp order inquiry.
- Prescription/lens power is confirmed **directly by shop staff**, not stored as sensitive medical detail.
- No payments are collected online. Displayed price is the **frame subtotal**, not a final prescription-lens invoice.
- The admin can manage up to the service plan's storage/data limits; there's no artificial 100-product restriction in the code.
- Compress shop photos to ~150–350 KB WEBP/JPEG, ideally 1200 px maximum dimension.

## 6) Final checks before handover
- Replace all eight sample products with the shop's genuine frame photos, names and prices; verify the listed brands and Instagram profile link with the owner.
- Confirm contact details, Maps listing, pickup/delivery policy, pricing, cancellation policy and WhatsApp responses.
- Test cart, out-of-stock behavior, guest order, admin access permissions, image update, order state, mobile menu/layout, PWA install, HTTPS and backups.
- Publish clear privacy / terms information suitable to actual operations. Obtain the owner's approval for customer contact-data handling.
- Maintain a secure backup export and regularly practice restore. Free service availability is **not guaranteed**.
- 30-day bug fixes can be agreed with the shop; future feature development is separate.

## Run locally
Python 3: `python -m http.server 8000` from this folder, then open `http://localhost:8000`. Without Supabase setup, the site deliberately stays in **PREVIEW MODE** and refuses real order submissions.


## Handover status (22 October 2026)
The source project and interactive preview are prepared. Before the customer sees a live shop site, collect and enter the following shop-approved details:
- Confirmed WhatsApp/call number (currently prefilled as 8985158331)
- Confirmed address (currently Opp. Old Bus Stand, Mangalagiri) and working Google Maps link
- Genuine frame photos, names, categories and prices (current catalogue cards are clearly marked as sample products)
- Shop owner's email for admin login, and the owner's approval to store order contact details
- Domain spelling and registrar access/ownership details

Then create the shop's own Supabase project, run the included SQL on that fresh project, add the shop owner as admin, enter the public project URL/key in `config.js`, deploy the static site, and test the actual order flow and mobile install. The setup guide lists the exact security and launch checks. Do not use another business's database or publish guessed contact details.
