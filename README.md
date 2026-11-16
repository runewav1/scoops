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
- Customer sign-in, signup, points, and pickup orders: `/account` and `/account/signup`
- Transactions, customers, catalog, toppings, settings, and help: `/admin/transactions`, `/admin/customers`, `/admin/catalog`, `/admin/toppings`, `/admin/settings`, `/admin/help`

`pnpm dev` serves the site and the API together, including `POST /api/staff/login`. Configure the staff account in `.env` with `pnpm auth:hash`.

To replace that password, generate a new hash and put it in `.env`:

```bash
pnpm auth:hash "use-a-long-unique-password"
```

The browser never receives the password or its hash. `pnpm dev:server` still starts the same API on port 8787 when you want it without Vite.

## Integration boundary

The shop data lives in a local SQLite file at `data/scoops.sqlite`, created with Node’s built-in `node:sqlite`. Tables and the catalog are created on the first catalog or settings query.

The relational tables follow the class sheet, and the shop keeps the extra columns it needs to run:

- `customers`: customer id, first name, last name, allergies, phone number, Scoops & Smiles points
- `orders`: order id, customer id, order date, order time, plus payment and counter status
- `order_details`: order detail id, order id, product id, quantity, and order price (the line total)
- `products`: product id, name, category, price, in stock, plus the menu copy, photos, and dietary notes already on the site
- `customer_logins`: password hashes for people who can sign in. The hash never leaves the server.

Product ids 001–005 are the five flavors from the sheet (mint chip, double chocolate brownie, strawberry fields, chocolate chip, and banana sorbet). Chocolate chip starts out of stock, matching the sheet. The rest of the case keeps its own product ids. Customer ids 101–105 and orders 1001–1005 are the sheet’s sample rows, including the point balances printed there. The older counter tickets are kept as additional customers and orders, so the shop still has a full stretch of sales. A paid order earns 10 points per dollar. Spending 100 points takes $5 off a pickup order.

Sample accounts from the sheet sign in at `/account` with the password `scoops-demo`.

Core domain types live in `src/lib/models.ts`. Each flavor keeps dietary notes for the menu filters: dairy-free, lactose-free, vegan, gluten-free, a coconut base, and declared ingredients. An order belongs to one customer and stores one or more scoops. A line can repeat a flavor, and a ticket can mix several flavors.

The same query functions can later point at a hosted SQL database. Keep authentication and database credentials on the server.

## Staff and customer access

`POST /api/staff/login` verifies the staff username and password hash from `.env` with `scrypt`, rate-limits repeated attempts, and issues an expiring `HttpOnly` / `SameSite=Lax` session cookie. `GET /api/staff/session` gates the admin interface and `POST /api/staff/logout` revokes that session.

`POST /api/account/login` and `POST /api/account/signup` use the same kind of session for customers. The cookie is `scoops_account_session`. A customer session can read and update only that customer’s row, points, and orders. It cannot open the staff pages.

The session stores are intentionally local to this scaffold. For production or multiple server instances, move sessions to a shared store and serve the API over HTTPS. Do not commit `.env` or use the example values in production. The sample customer password is for the class data only.

## Product direction

The public site is for browsing, signing in, and placing a pickup order. Counter tickets are recorded in the back office, and the sales chart is summed from those orders.
