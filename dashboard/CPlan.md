Task 1: Manual Sell — Replace Stocks tab with inventory-style grid, remove Templates tab

Read the file src/app/dashboard/inventory/page.tsx to understand the template-centric inventory UI pattern (4x4 grid of templates → click to toggle fields → click field opens stock modal with select/sell).

Now edit src/app/dashboard/manual-sell/page.tsx:

1. REMOVE the "Templates" tab entirely (delete the TemplatesTab component and all references to it, the tab entry in the tabs array, and the templatesCount state).

2. REPLACE the "Stocks" tab (StocksTab component) with a new component that matches the inventory page pattern but adapted for selling:

   The new StocksTab should:
   - Fetch templates from GET /api/inventory/templates (same as inventory page)
   - Show a 4x4 responsive grid of template cards (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)
   - Each card shows: template name, icon, color stripe, stockCount available, multi-sell badge if enabled
   - Click a card → toggles a fields panel directly below (same expand/collapse as inventory page)
   - Click a field → shows a stock selection table below (NOT a modal, since we need to stay on the sell page)
   - Stock table shows checkboxes to select individual stock entries
   - Below the stock table: a sticky bar with customer email input, unit price input, total display, and "Sell" button
   - "Sell" button calls POST /api/manual-sell/template with { templateId, inventoryIds, customerEmail, unitPrice }
   - After successful sell: toast success, clear selections, refresh stock list
   - The stock selection table should show the field value, status, and created date for each entry

3. Update the tabs array to only have: "stocks", "auto", "manual" (remove "templates" key). Rename "stocks" label to "Stock Templates" or just "Stocks".

4. Update tabCounts to remove templatesCount reference.

5. Keep the existing StockValuePill, ProductListTab, VariantPickerModal, ShortageModal, OrderConfirmation components unchanged.

6. Keep the existing cart system (product cart + stock cart) working — the new stocks tab should use the addStockToCart callback to add selected stock items to the cart, OR sell directly via the template endpoint. Choose the direct sell approach (POST /api/manual-sell/template) since it's cleaner for template-based selling.

Match the exact visual style of src/app/dashboard/inventory/page.tsx for the grid, cards, field chips, and expand/collapse behavior. Use the same cn(), Button, and icon imports.
Task 2: Inventory Add Stock — Line-by-line per field

Edit src/app/dashboard/inventory/page.tsx, specifically the AddStockModal component.

Current behavior: form mode shows one row per stock entry with all fields side by side, or bulk paste mode with tab-separated values.

New behavior: Replace both modes with a SINGLE "line-by-line" mode:

1. Show one textarea per field from the template's fieldsSchema
2. Each textarea is labeled with the field label (e.g., "Sec1", "Sec2")
3. Each line in a textarea = one stock entry's value for that field
4. Lines are matched across textareas by line number:
   - Line 1 of Sec1 + Line 1 of Sec2 = stock entry 1
   - Line 2 of Sec1 + Line 2 of Sec2 = stock entry 2
   - etc.

Example layout:
   ┌─────────────┐  ┌─────────────┐
   │ Sec1         │  │ Sec2         │
   │ CODE1        │  │ CODE3        │
   │ CODE2        │  │ CODE4        │
   └─────────────┘  └─────────────┘
   → Creates 2 entries: {Sec1: "CODE1", Sec2: "CODE3"} and {Sec1: "CODE2", Sec2: "CODE4"}

Implementation:
- State: Record<string, string> where key = field name, value = the full textarea content (multiline string)
- Show a counter below textareas: "X entries detected" (count = max lines across all textareas)
- If one textarea has fewer lines than another, the missing values should be empty string ""
- Keep the cost input field
- On submit: split each textarea by newlines, zip them together into items array, POST to /api/inventory/templates/{id}/stock
- Show the textareas in a responsive grid: grid-cols-1 for 1 field, grid-cols-2 for 2+ fields, up to grid-cols-3 for 3+ fields
- Each textarea should be at least 8 rows tall with resize-y
- Add a line count indicator on each textarea showing "X lines"

Remove the old "form" vs "bulk" mode toggle, the rows state, addRow/removeRow logic. Replace with this single clean interface.
Task 3: Race condition protection for concurrent selling

Edit src/app/api/manual-sell/template/route.ts to prevent two employees from selling the same stock simultaneously.

Current problem: Two employees can see the same available stock, both click sell, and both sales go through for the same inventory item.

Solution: Use PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED to lock rows atomically.

Replace the current stock selection logic in the transaction:

BEFORE (current, lines ~46-54):
```ts
const stockRows = await tx
  .select()
  .from(inventoryItems)
  .where(and(
    inArray(inventoryItems.id, inventoryIds),
    eq(inventoryItems.templateId, templateId),
    eq(inventoryItems.status, "available"),
    sql`${inventoryItems.deletedAt} IS NULL`
  ));
AFTER (with row locking + auto-replacement):


// Try to lock the requested inventory items with SKIP LOCKED
// If another employee already locked some items, those are skipped
const lockedRows = await tx.execute(sql`
  SELECT id, values, status, template_id, product_id
  FROM inventory_items
  WHERE id = ANY(${inventoryIds}::uuid[])
    AND template_id = ${templateId}
    AND status = 'available'
    AND deleted_at IS NULL
  FOR UPDATE SKIP LOCKED
`);

const lockedIds = new Set((lockedRows.rows as any[]).map(r => r.id));
const missingIds = inventoryIds.filter(id => !lockedIds.has(id));

let replacementRows: any[] = [];
if (missingIds.length > 0) {
  // Some items were already taken by another employee
  // Auto-pick replacement items from the same template
  const replacements = await tx.execute(sql`
    SELECT id, values, status, template_id, product_id
    FROM inventory_items
    WHERE template_id = ${templateId}
      AND status = 'available'
      AND deleted_at IS NULL
      AND id != ALL(${[...lockedIds]}::uuid[])
    ORDER BY created_at ASC
    LIMIT ${missingIds.length}
    FOR UPDATE SKIP LOCKED
  `);
  replacementRows = replacements.rows as any[];
}

const stockRows = [...(lockedRows.rows as any[]), ...replacementRows];

if (stockRows.length === 0) {
  throw new Error("No available stock entries found");
}

// If we couldn't get enough even with replacements, proceed with what we have
// (partial sell is better than failing)
Then update the rest of the transaction to use stockRows instead of the old query result. The existing code that marks items as sold and creates the order should work with this new array.

Also add a note in the order metadata if replacements were used:


metadata: {
  saleSource: "manual_template",
  templateId,
  templateName: template.name,
  replacedItems: replacementRows.length > 0 ? missingIds : undefined,
  replacementCount: replacementRows.length > 0 ? replacementRows.length : undefined,
},
Also apply the same FOR UPDATE SKIP LOCKED pattern to src/app/api/manual-sell/route.ts in the fulfillItems function where it calls pickOneInventoryLine. Edit src/services/autoDelivery.ts:

In the pickOneInventoryLine function, the existing SQL already uses FOR UPDATE SKIP LOCKED (verify this). If it doesn't, add it to the SELECT query. This protects the product-based selling path too.



---

## Task 4: Cost & Debts page

Create a new dashboard page at src/app/dashboard/costs/page.tsx

This page tracks costs and debts for inventory operations.

Requirements:

DATABASE: Edit src/db/schema.ts to add a new table:

export const costEntries = pgTable('cost_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 20 }).notNull(), // 'cost' | 'debt' | 'payment'
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  // Link to template/product (optional)
  templateId: uuid('template_id').references(() => inventoryTemplates.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  // Debt tracking
  creditorName: varchar('creditor_name', { length: 255 }),
  dueDate: timestamp('due_date'),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }),
  // Metadata
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  typeIdx: index('cost_entries_type_idx').on(table.type),
  templateIdx: index('cost_entries_template_idx').on(table.templateId),
  isPaidIdx: index('cost_entries_is_paid_idx').on(table.isPaid),
}));
Add type exports at the bottom of schema.ts:


export type CostEntry = typeof costEntries.$inferSelect;
export type NewCostEntry = typeof costEntries.$inferInsert;
API: Create src/app/api/costs/route.ts with:

GET: List cost entries with filters (?type=cost|debt|payment, ?isPaid=true|false, ?templateId=X)
POST: Create a new cost/debt/payment entry
Create src/app/api/costs/[id]/route.ts with:

PUT: Update entry (mark as paid, edit amount, etc.)
DELETE: Soft delete
FRONTEND: The page should have:

Header: "Costs & Debts" title with summary cards:

Total Costs (sum of type='cost')
Outstanding Debts (sum of type='debt' where isPaid=false)
Total Paid (sum of type='payment' + paid debts)
Tabs: "All" | "Costs" | "Debts" | "Payments"

Each tab shows a table with: date, description, type badge, amount, linked template/product name, creditor (for debts), status (paid/unpaid for debts), actions (edit/delete/mark paid)

"Add Entry" button opens a modal with:

Type selector (cost/debt/payment)
Description (text)
Amount (number)
Template selector (dropdown from /api/inventory/templates, optional)
If type=debt: creditor name, due date
If type=payment: link to existing debt (optional)
For debts: a "Mark as Paid" button that sets isPaid=true, paidAt=now, paidAmount=amount

Add "cost_entry_created" and "cost_entry_updated" to the ActivityAction type in src/types/index.ts

Add the page to the dashboard navigation. Read src/components/dashboard/DashboardSidebar.tsx (or similar navigation component) and add a "Costs & Debts" link with a DollarSign icon pointing to /dashboard/costs.

Run npm run db:push after schema changes.

Use the same visual patterns as the inventory page: cards, tables, badges, modals. Use sonner toast for notifications.


