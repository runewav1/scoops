# Scoops & Smiles

A warm, playful storefront and back-office scaffold for a neighborhood ice cream shop.

## Run locally

```bash
pnpm install
pnpm dev
```

- Homepage: `/`
- Menu: `/menu`, with base paths such as `/menu/dairy`, `/menu/plant-based`, and `/menu/sorbet`
- Flavor detail: `/flavors/:id`
- Photo credits: `/credits`
- Story: `/story`
- Visit: `/visit`
- Additional toppings: `/toppings`
- FAQ: `/faq`
- Staff login and overview: `/admin`
- Transactions, catalog, toppings, settings, and help: `/admin/transactions`, `/admin/catalog`, `/admin/toppings`, `/admin/settings`, `/admin/help`

`pnpm dev` serves the site and the API together, including `POST /api/staff/login`. Configure the staff account in `.env` with `pnpm auth:hash`.

To replace that password, generate a new hash and put it in `.env`:

```bash
pnpm auth:hash "use-a-long-unique-password"
```

The browser never receives the password or its hash. `pnpm dev:server` still starts the same API on port 8787 when you want it without Vite.

## Integration boundary

The shop data lives in a local SQLite file at `data/scoops.sqlite`, created with Node’s built-in `node:sqlite`. Tables and the catalog are created on the first catalog or settings query. Ghost transactions are inserted only when a transaction or reporting query finds an empty transaction table.

Core domain types live in `src/lib/models.ts`. Each flavor keeps dietary notes for the menu filters: dairy-free, lactose-free, vegan, gluten-free, a coconut base, and declared ingredients. A transaction stores a first initial, a last name, a payment status (`paid online`, `in person`, or `not paid yet`), a counter status, a timestamp, and one or more line items. A line can repeat a flavor, and a ticket can mix several flavors.

The same query functions can later point at a hosted SQL database. Keep authentication and database credentials on the server.

## Staff access

`POST /api/staff/login` is the explicit login endpoint. It verifies credentials server-side with `scrypt`, rate-limits repeated attempts, and issues an expiring `HttpOnly`/`SameSite=Lax` session cookie. `GET /api/staff/session` gates the admin interface and `POST /api/staff/logout` revokes the in-memory session.

The session store is intentionally local to this scaffold. For production or multiple server instances, move sessions to a shared store and serve the API over HTTPS. Do not commit `.env` or use the example values in production.

## Product direction

The public site is for browsing. Counter tickets are recorded in the back office, and the sales chart is summed from those rows.
