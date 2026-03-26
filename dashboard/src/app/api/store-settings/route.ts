/**
 * Store Settings API Routes
 *
 * GET /api/store-settings - Get store settings (creates default if none exists)
 * PUT /api/store-settings - Update store settings (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { storeSettings, currencies } from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

/**
 * Get or create default store settings
 */
async function getOrCreateSettings(db: any) {
  const [existing] = await db
    .select()
    .from(storeSettings)
    .limit(1);

  if (existing) {
    return existing;
  }

  // Create default settings
  const [settings] = await db
    .insert(storeSettings)
    .values({
      storeName: "Fulmen Empire",
      description: "Your destination for premium digital products",
      defaultLanguage: "en",
      maintenanceMode: false,
      allowGuestCheckout: true,
      requireEmailVerification: false,
      enableReviews: true,
      autoApproveReviews: false,
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
    })
    .returning();

  return settings;
}

// ============================================================================
// GET /api/store-settings - Get store settings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = getDb();
    const settings = await getOrCreateSettings(db);

    // Include default currency details
    let defaultCurrency = null;
    if (settings.defaultCurrencyId) {
      const [currency] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.id, settings.defaultCurrencyId))
        .limit(1);
      defaultCurrency = currency;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        defaultCurrency,
      },
    });
  } catch (error) {
    console.error("Get store settings error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/store-settings - Update store settings
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);

    const body = await request.json();
    const {
      storeName,
      description,
      storeUrl,
      logoUrl,
      faviconUrl,
      defaultCurrencyId,
      defaultLanguage,
      contactEmail,
      supportEmail,
      supportPhone,
      maintenanceMode,
      maintenanceMessage,
      allowGuestCheckout,
      requireEmailVerification,
      enableReviews,
      autoApproveReviews,
      timezone,
      dateFormat,
      metaTitle,
      metaDescription,
      googleAnalyticsId,
      facebookPixelId,
    } = body;

    const db = getDb();

    // Validate default currency if provided
    if (defaultCurrencyId) {
      const [currency] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.id, defaultCurrencyId))
        .limit(1);

      if (!currency) {
        return NextResponse.json(
          { success: false, error: "Invalid default currency" },
          { status: 400 }
        );
      }
    }

    // Get current settings
    const current = await getOrCreateSettings(db);

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Track changes for logging
    const changes: Record<string, unknown> = {};

    const fields = [
      "storeName", "description", "storeUrl", "logoUrl", "faviconUrl",
      "defaultCurrencyId", "defaultLanguage", "contactEmail", "supportEmail",
      "supportPhone", "maintenanceMode", "maintenanceMessage", "allowGuestCheckout",
      "requireEmailVerification", "enableReviews", "autoApproveReviews",
      "timezone", "dateFormat",
      "metaTitle", "metaDescription", "googleAnalyticsId", "facebookPixelId"
    ] as const;

    for (const field of fields) {
      if (body[field] !== undefined) {
        // @ts-ignore - dynamic field access
        if (body[field] !== current[field]) {
          // @ts-ignore
          changes[field] = { from: current[field], to: body[field] };
          // @ts-ignore
          updateData[field] = body[field];
        }
      }
    }

    // Update settings
    const [updated] = await db
      .update(storeSettings)
      .set(updateData)
      .where(eq(storeSettings.id, current.id))
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "settings_updated",
      entity: "store_settings",
      entityId: current.id,
      metadata: { changes },
    });

    // Return with currency details
    let defaultCurrency = null;
    if (updated.defaultCurrencyId) {
      const [currency] = await db
        .select()
        .from(currencies)
        .where(eq(currencies.id, updated.defaultCurrencyId))
        .limit(1);
      defaultCurrency = currency;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        defaultCurrency,
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

    console.error("Update store settings error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
