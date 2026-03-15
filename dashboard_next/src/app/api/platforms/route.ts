/**
 * Platforms API Routes
 *
 * GET /api/platforms - List platforms (flat or tree structure)
 * POST /api/platforms - Create a new platform
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { platforms, productPlatforms, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, or, isNull } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { generateSlug } from "@/lib/utils";

// ============================================================================
// GET /api/platforms - List platforms
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const asTree = searchParams.get("asTree") === "true";

    const db = getDb();

    // Build conditions
    const conditions = [sql`${platforms.deletedAt} IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(platforms.name, `%${search}%`),
          like(platforms.nameAr || "", `%${search}%`),
          like(platforms.description || "", `%${search}%`)
        )!
      );
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(platforms.isActive, isActive === "true"));
    }

    // Get all platforms
    const allPlatforms = await db
      .select()
      .from(platforms)
      .where(and(...conditions))
      .orderBy(platforms.sortOrder, platforms.name);

    if (asTree) {
      // Build tree structure
      const platformMap = new Map<string, any>();
      const rootPlatforms: any[] = [];

      // First pass: create map and initialize children arrays
      for (const platform of allPlatforms) {
        platformMap.set(platform.id, {
          ...platform,
          children: [],
        });
      }

      // Second pass: build hierarchy
      for (const platform of allPlatforms) {
        const node = platformMap.get(platform.id)!;
        if (platform.parentId) {
          const parent = platformMap.get(platform.parentId);
          if (parent) {
            parent.children.push(node);
          } else {
            // Parent not found (might be deleted), treat as root
            rootPlatforms.push(node);
          }
        } else {
          rootPlatforms.push(node);
        }
      }

      return NextResponse.json({
        success: true,
        data: rootPlatforms,
      });
    }

    // Return flat list
    return NextResponse.json({
      success: true,
      data: allPlatforms,
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

    console.error("Get platforms error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/platforms - Create platform
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const body = await request.json();
    const { name, nameAr, description, icon, banner, parentId, sortOrder, slug: providedSlug } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Generate slug if not provided
    const slug = providedSlug || generateSlug(name);

    // Validate parentId if provided
    if (parentId) {
      const [parent] = await db
        .select()
        .from(platforms)
        .where(
          and(
            eq(platforms.id, parentId),
            sql`${platforms.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (!parent) {
        return NextResponse.json(
          { success: false, error: "Parent platform not found" },
          { status: 404 }
        );
      }

      // Check for duplicate name under same parent
      const [existing] = await db
        .select()
        .from(platforms)
        .where(
          and(
            eq(platforms.name, name.trim()),
            eq(platforms.parentId, parentId),
            sql`${platforms.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Platform with this name already exists under this parent" },
          { status: 409 }
        );
      }
    } else {
      // Check for duplicate root-level name
      const [existing] = await db
        .select()
        .from(platforms)
        .where(
          and(
            eq(platforms.name, name.trim()),
            isNull(platforms.parentId),
            sql`${platforms.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Platform with this name already exists at root level" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate slug
    const [existingSlug] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.slug, slug))
      .limit(1);

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "Platform with this slug already exists" },
        { status: 409 }
      );
    }

    // Create platform
    const newPlatforms = await db
      .insert(platforms)
      .values({
        name: name.trim(),
        slug,
        nameAr: nameAr?.trim() || null,
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        banner: banner?.trim() || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isActive: true,
      })
      .returning();

    const newPlatform = (newPlatforms as any[])[0];

    // Log activity
    await logActivity({
      userId: user.id,
      action: "platform_created",
      entity: "platform",
      entityId: newPlatform.id,
      metadata: { name: newPlatform.name, slug: newPlatform.slug, parentId: newPlatform.parentId },
    });

    return NextResponse.json({
      success: true,
      data: newPlatform,
    }, { status: 201 });
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

    console.error("Create platform error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
