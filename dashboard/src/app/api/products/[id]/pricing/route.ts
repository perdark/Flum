/**
 * Product Pricing API Routes
 *
 * GET /api/products/[id]/pricing - Get pricing for user context
 * PUT /api/products/[id]/pricing - Update pricing tiers
 * DELETE /api/products/[id]/pricing - Delete pricing tier
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { productPricing, products, users } from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and } from "drizzle-orm";

// GET /api/products/[id]/pricing - Get product pricing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const context = (searchParams.get("context") || "customer") as
      | "admin"
      | "merchant"
      | "customer";

    const db = getDb();

    // Verify product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get all pricing tiers
    const pricing = await db.query.productPricing.findMany({
      where: eq(productPricing.productId, id),
    });

    const retailPricing = pricing.find((p) => p.customerType === "retail");
    const merchantPricing = pricing.find((p) => p.customerType === "merchant");
    const adminPricing = pricing.find((p) => p.customerType === "admin");

    let result: Record<string, any> = {
      productId: id,
      basePrice: product.basePrice,
    };

    switch (context) {
      case "admin":
        result = {
          ...result,
          cost: adminPricing?.cost || retailPricing?.cost,
          wholesale: merchantPricing?.wholesalePrice,
          retail: retailPricing?.retailPrice,
          current: retailPricing?.retailPrice || product.basePrice,
          currency: retailPricing?.currency || "USD",
          creditEligible: merchantPricing?.creditEligible || false,
          creditTermsDays: merchantPricing?.creditTermsDays,
          allTiers: pricing,
        };
        break;

      case "merchant":
        result = {
          ...result,
          retail: retailPricing?.retailPrice,
          current:
            merchantPricing?.wholesalePrice ||
            retailPricing?.retailPrice ||
            product.basePrice,
          currency: merchantPricing?.currency || retailPricing?.currency || "USD",
          creditEligible: merchantPricing?.creditEligible || false,
          creditTermsDays: merchantPricing?.creditTermsDays,
          minQuantity: merchantPricing?.minQuantity,
        };
        break;

      case "customer":
      default:
        result = {
          ...result,
          current: retailPricing?.retailPrice || product.basePrice,
          currency: retailPricing?.currency || "USD",
          creditEligible: false,
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get product pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id]/pricing - Update pricing tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const body = await request.json();
    const {
      customerType,
      cost,
      wholesalePrice,
      retailPrice,
      currency = "USD",
      minQuantity,
      creditEligible = false,
      creditTermsDays,
    } = body;

    if (!customerType || !["retail", "merchant", "admin"].includes(customerType)) {
      return NextResponse.json(
        { success: false, error: "Valid customer type is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if pricing tier exists
    const existing = await db.query.productPricing.findFirst({
      where: and(
        eq(productPricing.productId, id),
        eq(productPricing.customerType, customerType)
      ),
    });

    const pricingData = {
      cost: customerType === "admin" ? cost : null,
      wholesalePrice: customerType === "merchant" ? wholesalePrice : null,
      retailPrice: customerType === "retail" ? retailPrice : null,
      currency,
      minQuantity,
      creditEligible,
      creditTermsDays,
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(productPricing)
        .set(pricingData)
        .where(eq(productPricing.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
      });
    } else {
      // Create new
      const [created] = await db
        .insert(productPricing)
        .values({
          productId: id,
          customerType,
          ...pricingData,
          validFrom: new Date(),
          createdAt: new Date(),
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: created,
      }, { status: 201 });
    }
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

    console.error("Update product pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]/pricing - Delete pricing tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const customerType = searchParams.get("customerType");

    if (!customerType) {
      return NextResponse.json(
        { success: false, error: "Customer type is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const existing = await db.query.productPricing.findFirst({
      where: and(
        eq(productPricing.productId, id),
        eq(productPricing.customerType, customerType)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    await db
      .delete(productPricing)
      .where(eq(productPricing.id, existing.id));

    return NextResponse.json({
      success: true,
      data: { message: "Pricing tier deleted successfully" },
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

    console.error("Delete product pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
