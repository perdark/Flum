/**
 * Inventory Export API
 *
 * GET /api/inventory/export - Export available inventory as TSV/CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const format = searchParams.get("format") || "tsv"; // tsv or csv

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get product and template
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        templateId: inventoryTemplates.id,
        fieldsSchema: inventoryTemplates.fieldsSchema,
      })
      .from(products)
      .innerJoin(inventoryTemplates, eq(products.inventoryTemplateId, inventoryTemplates.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get available inventory
    const inventory = await db
      .select({
        values: inventoryItems.values,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.productId, productId),
          eq(inventoryItems.status, "available"),
          sql`${inventoryItems.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(inventoryItems.createdAt));

    // Get field names from template schema
    const fields = product.fieldsSchema || [];
    const fieldNames = fields.map((f: any) => f.name);

    // Build output
    const separator = format === "csv" ? "," : "\t";
    const rows: string[] = [];

    // Header row
    rows.push(fieldNames.join(separator));

    // Data rows
    for (const item of inventory) {
      const row = fieldNames.map((name: string) => {
        const value = (item.values as Record<string, unknown> | null)?.[name];
        // Escape quotes and wrap in quotes for CSV
        if (format === "csv") {
          const strValue = String(value ?? "");
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return String(value ?? "");
      });
      rows.push(row.join(separator));
    }

    const content = rows.join("\n");
    const contentType = format === "csv"
      ? "text/csv"
      : "text/tab-separated-values";

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${product.name.replace(/[^a-z0-9]/gi, '_')}_inventory.${format}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Export inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
