<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- First admin creation requires a server-held private setup code, durable attempt limits and an atomic service-only completion RPC; no public signup may assign administrator roles.
- Signup provisions inactive profiles by default; only invitations activate staff, and missing records must never be classified as deactivation.
- Phone home-screen support is manifest-only with local raster icons and no app-shell service worker, so previews remain fresh; keep safe-area spacing on mobile navigation.
- Stock quantities change only via the `post_stock_transaction` DB function (a trigger blocks direct edits) so the ledger stays immutable and permissions are enforced in the database.
- Write permissions are enforced by RLS using `is_manager()` (active admin/super_admin); never rely on hidden buttons alone.
- Employee invites/role changes run in server functions (`src/lib/employees.functions.ts`) that verify the caller's role before using the admin client.
- Product onboarding saves product, new parts, BOM and opening ledger entries through the manager-checked atomic `onboard_product` RPC so failed saves cannot leave partial inventory.
- Uploaded inventory photos use private object-storage references and temporary signed display URLs; never save an expiring URL as the item's permanent photo.
- Product-photo AI calls stay in server-only helpers behind authenticated manager checks; quantities describe one finished ladder/product and suggestions require explicit review before inventory creation to avoid unverified stock changes.
- Capacity totals and per-part breakdowns share a single grouped-BOM calculation so repeated component requirements cannot inflate build counts.
- Website leads are ingested only by a bounded, timestamped HMAC-verified server webhook with idempotent external IDs; reads use authenticated manager checks and manager-only RLS to keep customer contact details private.
