# Product onboarding wizard

## What it will do
- Add a **New product** action to Products for managers, with a guided, mobile-friendly wizard.
- Step 1 asks **Ladder** or **Other**. The Ladder path collects product details, lets the manager build its BOM from existing or newly-created parts, and records optional opening stock.
- The Other path offers two ways to start:
  1. Enter the product name, optionally add a product-card photo, create each BOM part with its per-product quantity, optional part photo, and opening stock.
  2. Upload a product photo and optionally enter a preferred name. AI proposes a product name and candidate BOM parts/quantities; the manager can edit, remove, or add rows and must review them before creating anything. Opening quantities can then be entered.
- Product and part stock will be added only through the existing `post_stock_transaction` opening-stock operation; zero quantities create no stock movement.
- On completion, open the new product and refresh Products, Inventory, and BOM data.

## Technical approach
- Build a focused wizard component and mount it from the existing Products page; reuse the existing Supabase client, item/BOM fields, design-system controls, and manager gating.
- Add a manager-protected server function for image analysis using the existing Lovable AI Gateway approach and the required Responses/image-input contract. Validate image type/size and return structured suggestions only; never create records from AI output without manager review.
- Save items and BOM lines through authenticated RLS-scoped client calls, then post nonzero opening quantities through the stock RPC. Handle failed steps visibly and refresh cached queries after success.
- Add focused tests for BOM/onboarding input validation and opening-stock handling. Preserve existing stock-ledger and database permission rules; no schema changes are planned.
- Update the Products page’s route metadata while touching it.

## Not included
- AI-generated part photos, automatic purchasing data, or unreviewed AI writes.
- Replacing the existing item detail, production, or employee workflows.
