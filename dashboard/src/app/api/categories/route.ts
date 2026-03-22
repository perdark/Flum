/**
 * Categories API Routes
 *
 * GET /api/categories - List categories (flat or tree structure)
 * POST /api/categories - Create a new category
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { categories, productCategories, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, or, isNull } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { generateSlug } from "@/lib/utils";

// ============================================================================
// GET /api/categories - List categories
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
    const conditions = [sql`${categories.deletedAt} IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(categories.name, `%${search}%`),
          like(categories.nameAr || "", `%${search}%`),
          like(categories.description || "", `%${search}%`)
        )!
      );
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(categories.isActive, isActive === "true"));
    }

    // Get all categories
    const allCategories = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(categories.sortOrder, categories.name);

    if (asTree) {
      // Build tree structure
      const categoryMap = new Map<string, any>();
      const rootCategories: any[] = [];

      // First pass: create map and initialize children arrays
      for (const category of allCategories) {
        categoryMap.set(category.id, {
          ...category,
          children: [],
        });
      }

      // Second pass: build hierarchy
      for (const category of allCategories) {
        const node = categoryMap.get(category.id)!;
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children.push(node);
          } else {
            // Parent not found (might be deleted), treat as root
            rootCategories.push(node);
          }
        } else {
          rootCategories.push(node);
        }
      }

      return NextResponse.json({
        success: true,
        data: rootCategories,
      });
    }

    // Return flat list
    return NextResponse.json({
      success: true,
      data: allCategories,
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

    console.error("Get categories error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/categories - Create category
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
        .from(categories)
        .where(
          and(
            eq(categories.id, parentId),
            sql`${categories.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (!parent) {
        return NextResponse.json(
          { success: false, error: "Parent category not found" },
          { status: 404 }
        );
      }

      // Check for duplicate name under same parent
      const [existing] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.name, name.trim()),
            eq(categories.parentId, parentId),
            sql`${categories.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Category with this name already exists under this parent" },
          { status: 409 }
        );
      }
    } else {
      // Check for duplicate root-level name
      const [existing] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.name, name.trim()),
            isNull(categories.parentId),
            sql`${categories.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Category with this name already exists at root level" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate slug
    const [existingSlug] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "Category with this slug already exists" },
        { status: 409 }
      );
    }

    // Create category
    const newCategories = await db
      .insert(categories)
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

    const newCategory = (newCategories as any[])[0];

    // Log activity
    await logActivity({
      userId: user.id,
      action: "category_created",
      entity: "category",
      entityId: newCategory.id,
      metadata: { name: newCategory.name, slug: newCategory.slug, parentId: newCategory.parentId },
    });

    return NextResponse.json({
      success: true,
      data: newCategory,
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

    console.error("Create category error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
