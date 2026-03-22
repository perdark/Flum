/**
 * Category Detail API Routes
 *
 * GET /api/categories/[id] - Get category details
 * PUT /api/categories/[id] - Update category
 * DELETE /api/categories/[id] - Soft delete category
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { categories, productCategories } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, isNull } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { generateSlug } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/categories/[id] - Get category details
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;

    const db = getDb();

    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          sql`${categories.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Get product count for this category
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productCategories)
      .where(eq(productCategories.categoryId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        productCount: countResult?.count || 0,
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

    console.error("Get category error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/categories/[id] - Update category
// ============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    const body = await request.json();
    const { name, nameAr, description, icon, banner, parentId, sortOrder, isActive } = body;

    const db = getDb();

    // Check if category exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          sql`${categories.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Validate parentId if provided (can't set self as parent)
    if (parentId && parentId === id) {
      return NextResponse.json(
        { success: false, error: "Cannot set category as its own parent" },
        { status: 400 }
      );
    }

    // Check for circular reference
    if (parentId && parentId !== existing.parentId) {
      let currentId = parentId;
      const visited = new Set<string>([id]);

      while (currentId) {
        if (visited.has(currentId)) {
          return NextResponse.json(
            { success: false, error: "Circular reference detected in category hierarchy" },
            { status: 400 }
          );
        }
        visited.add(currentId);

        const [parent] = await db
          .select({ parentId: categories.parentId })
          .from(categories)
          .where(
            and(
              eq(categories.id, currentId),
              sql`${categories.deletedAt} IS NULL`
            )
          )
          .limit(1);

        if (!parent) break;
        currentId = parent.parentId || "";
      }
    }

    // Check for duplicate name under same parent (if name or parent changed)
    if ((name && name !== existing.name) || (parentId !== undefined && parentId !== existing.parentId)) {
      const targetParentId = parentId !== undefined ? parentId : existing.parentId;
      const targetName = (name || existing.name).trim();

      const [duplicate] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.name, targetName),
            targetParentId ? eq(categories.parentId, targetParentId) : isNull(categories.parentId),
            sql`${categories.deletedAt} IS NULL`,
            sql`${categories.id} != ${id}`
          )
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Category with this name already exists under this parent" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      // Auto-update slug if name changed and slug wasn't provided
      if (!body.slug && existing.slug === generateSlug(existing.name)) {
        updateData.slug = generateSlug(name.trim());
      }
    }
    if (body.slug !== undefined) updateData.slug = body.slug.trim();
    if (nameAr !== undefined) updateData.nameAr = nameAr?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    if (banner !== undefined) updateData.banner = banner?.trim() || null;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update category
    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "category_updated",
      entity: "category",
      entityId: id,
      metadata: {
        changes: {
          name: name !== undefined && name !== existing.name ? { from: existing.name, to: name } : undefined,
          slug: body.slug !== undefined && body.slug !== existing.slug ? { from: existing.slug, to: body.slug } : undefined,
          parentId: parentId !== undefined && parentId !== existing.parentId ? { from: existing.parentId, to: parentId } : undefined,
          isActive: isActive !== undefined && isActive !== existing.isActive ? { from: existing.isActive, to: isActive } : undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
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

    console.error("Update category error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/categories/[id] - Soft delete category
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    const db = getDb();

    // Check if category exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          sql`${categories.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has children
    const [childCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(
        and(
          eq(categories.parentId, id),
          sql`${categories.deletedAt} IS NULL`
        )
      );

    if (childCount && childCount.count > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete category with child categories. Move or delete children first." },
        { status: 409 }
      );
    }

    // Check if category is in use by products
    const [productCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productCategories)
      .where(eq(productCategories.categoryId, id));

    if (productCount && productCount.count > 0) {
      return NextResponse.json(
        { success: false, error: "Category is in use by products. Remove from products first." },
        { status: 409 }
      );
    }

    // Soft delete category
    await db
      .update(categories)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    // Log activity
    await logActivity({
      userId: user.id,
      action: "category_deleted",
      entity: "category",
      entityId: id,
      metadata: { name: existing.name, slug: existing.slug },
    });

    return NextResponse.json({
      success: true,
      data: { id },
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

    console.error("Delete category error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
