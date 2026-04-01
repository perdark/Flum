/**
 * Stock Mismatch Alerts API
 *
 * GET /api/inventory/mismatch-alerts - Get stock mismatch alerts
 * Query params:
 *   - templateId: Get alerts for a specific template
 *   - productId: Get alerts for a specific product
 *   - (none): Get all alerts globally
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { analyzeStockAvailability, getAllMismatchAlerts } from "@/services/stockValidation";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const productId = searchParams.get("productId");

    if (templateId || productId) {
      // Get alerts for specific template/product
      const availability = await analyzeStockAvailability(
        productId || undefined,
        templateId || undefined
      );

      if (!availability) {
        return NextResponse.json({
          success: true,
          data: {
            hasMismatch: false,
            mismatches: [],
            sellableQuantity: 0,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          hasMismatch: availability.hasMismatch,
          mismatches: availability.mismatches,
          fieldCounts: availability.fieldCounts,
          linkedGroups: availability.linkedGroups,
          sellableQuantity: availability.sellableQuantity,
        },
      });
    }

    // Get all alerts
    const alerts = await getAllMismatchAlerts();

    return NextResponse.json({
      success: true,
      data: alerts,
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

    console.error("Get mismatch alerts error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
