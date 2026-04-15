/**
 * Mock Data Seeding Script
 *
 * Run with: npx tsx src/seed.ts
 * Run with database reset: npx tsx src/seed.ts reset
 * Or: npm run db:reset
 *
 * This script seeds the database with:
 * 1. Store Settings
 * 2. Currencies (USD, EUR, SAR)
 * 3. Categories (hierarchical tree)
 * 4. Products (multi-sell, bundle, and regular products)
 * 5. Inventory Items (auto-delivery keys)
 * 6. Multi-sell Inventory Units
 * 7. Bundle Items
 * 8. Offer & Coupon
 */

import 'dotenv/config';
import { getDb } from "./db";
import {
  users,
  currencies,
  categories,
  products,
  productCategories,
  productImages,
  inventoryTemplates,
  inventoryItems,
  offers,
  productOffers,
  coupons,
  orders,
  orderItems,
  storeSettings,
  bundleItems,
  productPricing,
} from "./db/schema";
import { eq, and, sql, ne } from "drizzle-orm";

// ============================================================================
// DATA TEMPLATES
// ============================================================================

// Currencies
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: "1.0000", isActive: true },
  { code: "EUR", name: "Euro", symbol: "€", exchangeRate: "0.9200", isActive: true },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س", exchangeRate: "3.7500", isActive: true },
  { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: "0.7900", isActive: false },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: "3.6700", isActive: false },
];

// Categories (Hierarchical Tree)
const CATEGORIES = [
  // Gaming
  {
    name: "Gaming",
    slug: "gaming",
    nameAr: "الألعاب",
    description: "Video games for all platforms",
    descriptionAr: "ألعاب فيديو لجميع المنصات",
    icon: "https://cdn-icons-png.flaticon.com/512/4975/4975602_game-controller.png",
    parentId: null,
    sortOrder: 1,
    children: [
      {
        name: "PC Games",
        slug: "pc-games",
        nameAr: "ألعاب الكمبيوتر",
        description: "Steam, Epic Games, and more",
        descriptionAr: "ستيم وإيبك جيمز والمزيد",
        icon: "https://cdn-icons-png.flaticon.com/512/2904/computer.png",
        sortOrder: 1,
      },
      {
        name: "PlayStation",
        slug: "playstation",
        nameAr: "بلايستيشن",
        description: "PS4, PS5 games and subscriptions",
        descriptionAr: "ألعاب PS4 و PS5 والاشتراكات",
        icon: "https://cdn-icons-png.flaticon.com/512/3302/playstation.png",
        sortOrder: 2,
      },
      {
        name: "Xbox",
        slug: "xbox",
        nameAr: "إكس بوكس",
        description: "Xbox One, Series X|S games",
        descriptionAr: "ألعاب إكس ون وسيريس إكس",
        icon: "https://cdn-icons-png.flaticon.com/512/4293/xbox.png",
        sortOrder: 3,
      },
      ],
  },
  // Software
  {
    name: "Software",
    slug: "software",
    nameAr: "البرامج",
    description: "Productivity and utility software",
    descriptionAr: "برامج الإنتاجية والأدوات",
    icon: "https://cdn-icons-png.flaticon.com/512/2872/floppy-disk.png",
    parentId: null,
    sortOrder: 2,
    children: [
      {
        name: "Antivirus",
        slug: "antivirus",
        nameAr: "برامج الحماية",
        description: "Internet security and antivirus",
        descriptionAr: "الأمن على الإنترنت والبرامج المضادة للفيروسات",
        icon: "https://cdn-icons-png.flaticon.com/512/6662/shield.png",
        sortOrder: 1,
      },
      {
        name: "Office",
        slug: "office",
        nameAr: "مكتب",
        description: "Microsoft Office and alternatives",
        descriptionAr: "مايكروسوفت أوفيس والبدائل",
        icon: "https://cdn-icons-png.flaticon.com/512/2921/microsoft-word.png",
        sortOrder: 2,
      },
      ],
  },
  // Entertainment
  {
    name: "Entertainment",
    slug: "entertainment",
    nameAr: "الترفيه",
    description: "Streaming services and subscriptions",
    descriptionAr: "خدمات البث والاشتراكات",
    icon: "https://cdn-icons-png.flaticon.com/512/2902/netflix-1.png",
    parentId: null,
    sortOrder: 3,
    children: [
      {
        name: "Streaming",
        slug: "streaming",
        nameAr: "البث",
        description: "Movies, TV shows, and more",
        descriptionAr: "أفلام ومسلسلات وغيرها",
        icon: "https://cdn-icons-png.flaticon.com/512/1838/movie.png",
        sortOrder: 1,
      },
      {
        name: "Music",
        slug: "music",
        nameAr: "موسيقى",
        description: "Music streaming services",
        descriptionAr: "خدمات بث الموسيقى",
        icon: "https://cdn-icons-png.flaticon.com/512/2909/music.png",
        sortOrder: 2,
      },
    ],
  },
];

// Products
const PRODUCTS = [
  // ==================== MULTI-SELL PRODUCT EXAMPLE ====================
  {
    name: "Netflix Shared Account",
    slug: "netflix-shared",
    nameAr: "حساب نتفليكس مشترك",
    description: "Shared Netflix Premium account. Can be sold 5 times per account with 12 hour cooldown.",
    descriptionAr: "حساب نتفليكس بريميوم مشترك. يمكن بيعه 5 مرات لكل حساب مع فترة تبريد 12 ساعة.",
    sku: "NETFLIX-SHARED",
    basePrice: "2.99",
    compareAtPrice: null,
    deliveryType: "auto_account",
    categoryName: "Streaming",
    categorySlug: "streaming",
    isActive: true,
    isFeatured: true,
    isNew: true,
    maxQuantity: 5,
    currentStock: 50,
    // Multi-sell configuration
    multiSellEnabled: true,
    multiSellFactor: 5,
    cooldownEnabled: true,
    cooldownDurationHours: 12,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/6/69/Netflix_2016_logo.svg"
    ],
    inventory: {
      templateName: "Shared Account",
      fields: [
        { email: "netflix_shared1@email.com", password: "Netflix123!" },
        { email: "netflix_shared2@email.com", password: "Netflix123!" },
        { email: "netflix_shared3@email.com", password: "Netflix123!" },
        { email: "netflix_shared4@email.com", password: "Netflix123!" },
        { email: "netflix_shared5@email.com", password: "Netflix123!" },
      ],
    },
  },
  // ==================== BUNDLE PRODUCT EXAMPLE ====================
  {
    name: "Call of Duty Series Bundle",
    slug: "cod-series-bundle",
    nameAr: "حزمة سلسلة كول أوف ديوتي",
    description: "Complete Call of Duty collection: COD 1, COD 2, COD 3, MW, MW2, MW3, Black Ops, Black Ops 2, Black Ops 3.",
    descriptionAr: "مجموعة كول أوف ديوتي الكاملة: كول أوف ديوتي 1 و 2 و 3 و MW و MW2 و MW3 وبلاك أوبس.",
    sku: "BUNDLE-COD-SERIES",
    basePrice: "89.99",
    compareAtPrice: "179.99",
    deliveryType: "manual",
    categoryName: "PC Games",
    categorySlug: "pc-games",
    isActive: true,
    isFeatured: true,
    isNew: true,
    maxQuantity: 10,
    currentStock: 25,
    // Bundle configuration
    isBundle: true,
    bundleTemplateId: null, // Will be set to Game Bundle Template
    bundleItems: [
      {
        templateFieldId: "games",
        lineIndex: 0,
        productName: "Call of Duty 1",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 1,
        productName: "Call of Duty 2",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 2,
        productName: "Call of Duty 3",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 3,
        productName: "Call of Duty: Modern Warfare",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 4,
        productName: "Call of Duty: Modern Warfare 2",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 5,
        productName: "Call of Duty: Modern Warfare 3",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 6,
        productName: "Call of Duty: Black Ops",
        quantity: 1,
      },
      {
        templateFieldId: "games",
        lineIndex: 7,
        productName: "Call of Duty: Black Ops 2",
        quantity: 1,
      },
      {
        templateFieldId: "bonusContent",
        lineIndex: 0,
        productName: "COD Wallpaper Pack",
        quantity: 1,
      },
    ],
    images: [
      "https://upload.wikimedia.org/wikipedia/en/3/30/Call_of_Duty_Cover.png"
    ],
    inventory: null, // Bundle products don't have direct inventory
  },
  // ==================== REGULAR PRODUCTS ====================
  {
    name: "Elden Ring",
    slug: "elden-ring",
    nameAr: "إلدن رينج",
    description: "An action RPG developed by FromSoftware. Embark on a journey across a vast fantasy world.",
    descriptionAr: "لعبة تقمص أدبي develop by FromSoftware. انطلق في رحلة عبر عالم فانتازيا شاسع.",
    sku: "ELDEN-001",
    basePrice: "59.99",
    compareAtPrice: null,
    deliveryType: "auto_key",
    categoryName: "PC Games",
    categorySlug: "pc-games",
    isActive: true,
    isFeatured: true,
    isNew: false,
    maxQuantity: 5,
    currentStock: 50,
    videoUrl: "https://www.youtube.com/watch?v=example",
    images: [
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/0/capsule_184x69.jpg"
    ],
    inventory: {
      templateName: "Steam Key",
      fields: [
        { steamKey: "AAAA-BBBB-CCCC-DDDD" },
        { steamKey: "EEEE-FFFF-GGGG-HHHH" },
        { steamKey: "IIII-JJJJ-KKKK-LLLL" },
        { steamKey: "MMMM-NNNN-OOOO-PPPP" },
        { steamKey: "QQQQ-RRRR-SSSS-TTTT" },
      ],
    },
  },
  {
    name: "Grand Theft Auto V",
    slug: "gta-v",
    nameAr: "غراند ثيفت أوتو في",
    description: "An open-world action-adventure game set in the city of Los Santos.",
    descriptionAr: "لعبة عالم مفتوح تقع أحداث في مدينة لوس سانتوس.",
    sku: "GTA5-001",
    basePrice: "29.99",
    compareAtPrice: "39.99",
    deliveryType: "auto_account",
    categoryName: "PC Games",
    categorySlug: "pc-games",
    isActive: true,
    isFeatured: true,
    isNew: false,
    maxQuantity: 3,
    currentStock: 15,
    images: [
      "https://upload.wikimedia.org/wikipedia/en/9/99/Grand_Theft_Auto_V_cover_art.jpg"
    ],
    inventory: {
      templateName: "Social Club Account",
      fields: [
        { email: "gta5_user1@email.com", password: "Pass123!", note: "Social Club account" },
        { email: "gta5_user2@email.com", password: "Pass123!", note: "Social Club account" },
        { email: "gta5_user3@email.com", password: "Pass123!", note: "Social Club account" },
        { email: "gta5_user4@email.com", password: "Pass123!", note: "Social Club account" },
        { email: "gta5_user5@email.com", password: "Pass123!", note: "Social Club account" },
      ],
    },
  },
  {
    name: "PlayStation Plus 1 Month",
    slug: "ps-plus-1-month",
    nameAr: "بلايستيشن بلس 1 شهر",
    description: "One month of PlayStation Plus membership. Includes free games every month.",
    descriptionAr: "اشتراك لمدة شهر في بلايستيشن بلس. يتضمن ألعاب مجانية كل شهر.",
    sku: "PSN-PLUS-1M",
    basePrice: "9.99",
    compareAtPrice: null,
    deliveryType: "auto_account",
    categoryName: "PlayStation",
    categorySlug: "playstation",
    isActive: true,
    isFeatured: false,
    isNew: true,
    maxQuantity: 10,
    currentStock: 25,
    images: [
      "https://media.direct.playstation.com/is/image/screenshot/9/ps-plus-monthly-linear.jpg"
    ],
    inventory: {
      templateName: "PSN Account",
      fields: [
        { email: "psn_user1@email.com", password: "Pass123!", note: "Primary account" },
        { email: "psn_user2@email.com", password: "Pass123!", note: "Account created" },
        { email: "psn_user3@email.com", password: "Pass123!", note: "Account created" },
        { email: "psn_user4@email.com", password: "Pass123!", note: "Account created" },
        { email: "psn_user5@email.com", password: "Pass123!", note: "Account created" },
      ],
    },
  },
  {
    name: "Windows 11 Pro",
    slug: "windows-11-pro",
    nameAr: "ويندوز 11 برو",
    description: "The latest Windows operating system with advanced features for professionals.",
    descriptionAr: "أحدث نظام تشغيل من مايكروسوفت مع ميزات متقدمة للمحترفين.",
    sku: "WIN11-PRO-001",
    basePrice: "149.99",
    compareAtPrice: "199.99",
    deliveryType: "auto_key",
    categoryName: "Software",
    categorySlug: "software",
    isActive: true,
    isFeatured: false,
    isNew: false,
    maxQuantity: 10,
    currentStock: 30,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Windows_11_logo.svg/1200px-Windows_11_logo.svg.png"
    ],
    inventory: {
      templateName: "Steam Key",
      fields: [
        { steamKey: "XXXXX-XXXXX-XXXXX-XXXXX", edition: "Pro OEM" },
        { steamKey: "YYYYY-YYYYY-YYYYY-YYYYY", edition: "Pro Retail" },
        { steamKey: "ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ", edition: "Pro Upgrade" },
        { steamKey: "AAAAA-AAAAA-AAAAA-AAAAA", edition: "Pro OEM" },
        { steamKey: "BBBBB-BBBBB-BBBBB-BBBBB", edition: "Pro Retail" },
      ],
    },
  },
];

// Offer
const OFFER = {
  name: "Summer Sale",
  slug: "summer-sale-2024",
  nameAr: "تخفيضات الصيف",
  description: "Up to 50% off on selected games and software!",
  descriptionAr: "خصم يصل إلى 50٪ على ألعاب وبرامج مختارة!",
  type: "percentage",
  value: "20", // 20% off
  minPurchase: "50",
  maxDiscount: "20",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  banner: "https://cdn-icons-png.flaticon.com/512/3450/sale.png",
  appliesTo: "all",
};

// Coupon
const COUPON = {
  code: "TEST20",
  description: "20% off your order. Minimum purchase $25.",
  discountType: "percentage",
  discountValue: "20",
  minPurchase: "25",
  maxDiscount: "50", // Max $50 discount
  usageLimit: 100,
  userLimit: 5,
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
  isActive: true,
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

/**
 * Reset database — wipe storefront / catalog / orders data.
 * Keeps `users` (dashboard admins) and `__drizzle_migrations`.
 * Clears `sessions` so staff must sign in again.
 */
async function resetDatabase(db: any) {
  console.log("🗑️  Resetting database (DELETE order, FK-safe)...");

  const safeDelete = async (tableName: string) => {
    try {
      await db.execute(sql.raw(`DELETE FROM ${tableName}`));
    } catch (err: unknown) {
      console.warn(`  (skip ${tableName}: ${err instanceof Error ? err.message : String(err)})`);
    }
  };

  const tables = [
    "deliveries",
    "order_delivery_snapshots",
    "coupon_usage",
    "order_items",
    "orders",
    "points_transactions",
    "cart_items",
    "carts",
    "customer_sessions",
    "customers",
    "price_alert_subscriptions",
    "store_newsletter_signups",
    "wishlists",
    "reviews",
    "recently_viewed",
    "product_relations",
    "bundle_items",
    "product_variants",
    "product_option_values",
    "product_option_groups",
    "product_pricing",
    "product_tags",
    "product_offers",
    "product_images",
    "product_categories",
    "inventory_items",
    "cost_entries",
    "products",
    "inventory_catalog_items",
    "coupons",
    "offers",
    "inventory_templates",
    "store_settings",
    "currencies",
    "activity_logs",
    "daily_analytics",
    "sessions",
  ];

  for (const t of tables) {
    await safeDelete(t);
  }

  // Categories may be a self-referring tree: remove leaves until empty.
  for (let i = 0; i < 30; i++) {
    try {
      await db.execute(sql.raw(`
        DELETE FROM categories c
        WHERE NOT EXISTS (SELECT 1 FROM categories ch WHERE ch.parent_id = c.id)
      `));
    } catch {
      break;
    }
  }
  await safeDelete("categories");

  console.log("  ✓ Data cleared (users + migration history kept).\n");
}

async function seedCurrencies(db: any) {
  console.log("Seeding currencies...");
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(currencies);

  if (existing[0]?.count > 0) {
    console.log("  → Currencies already exist, skipping.");
    // Still need to return the USD currency ID
    const usd = await db.select().from(currencies).where(eq(currencies.code, "USD")).limit(1);
    return usd[0]?.id;
  }

  for (const currency of CURRENCIES) {
    await db.insert(currencies).values(currency).onConflictDoNothing();
  }

  const usd = await db.select().from(currencies).where(eq(currencies.code, "USD")).limit(1);
  console.log(`  ✓ Inserted ${CURRENCIES.length} currencies.`);
  return usd[0]?.id;
}

async function seedStoreSettings(db: any, defaultCurrencyId: string) {
  console.log("Seeding store settings...");
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(storeSettings);

  if (existing[0]?.count > 0) {
    console.log("  → Store settings already exist, skipping.");
    return;
  }

  await db.insert(storeSettings).values({
    storeName: "Fulmen Empire",
    description: "Your destination for premium digital products",
    defaultCurrencyId,
    defaultLanguage: "en",
    maintenanceMode: false,
    allowGuestCheckout: true,
    requireEmailVerification: false,
    enableReviews: true,
    autoApproveReviews: false,
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
  });

  console.log("  ✓ Inserted store settings.");
}

async function seedInventoryTemplates(db: any) {
  console.log("Seeding inventory templates...");

  const templates = [
    {
      name: "Steam Key",
      description: "Steam game activation key",
      fieldsSchema: [
        {
          name: "steamKey",
          type: "string",
          required: true,
          label: "Steam Key",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: true,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 0,
        },
      ],
      isActive: true,
    },
    {
      name: "Social Club Account",
      description: "Rockstar Social Club login credentials",
      fieldsSchema: [
        {
          name: "email",
          type: "string",
          required: true,
          label: "Email",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: false,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 0,
        },
        {
          name: "password",
          type: "string",
          required: true,
          label: "Password",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: false,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 1,
        },
        {
          name: "note",
          type: "string",
          required: false,
          label: "Notes",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: true,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 2,
        },
      ],
      isActive: true,
    },
    {
      name: "Game Bundle Template",
      description: "Template for game series bundles (e.g., COD Series)",
      fieldsSchema: [
        {
          name: "games",
          type: "multiline",
          required: true,
          label: "Games in Bundle (one per line)",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: true,
          repeatable: false,
          eachLineIsProduct: true,
          parentId: null,
          displayOrder: 0,
        },
        {
          name: "bonusContent",
          type: "multiline",
          required: false,
          label: "Bonus Content (one per line)",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: true,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 1,
        },
      ],
      isActive: true,
    },
    {
      name: "Shared Account",
      description: "Multi-sell shared account with cooldown",
      fieldsSchema: [
        {
          name: "email",
          type: "string",
          required: true,
          label: "Account Email",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: false,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 0,
        },
        {
          name: "password",
          type: "string",
          required: true,
          label: "Password",
          isVisibleToAdmin: true,
          isVisibleToMerchant: true,
          isVisibleToCustomer: false,
          repeatable: false,
          eachLineIsProduct: false,
          parentId: null,
          displayOrder: 1,
        },
      ],
      isActive: true,
    },
  ];

  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(inventoryTemplates);

  if (existing[0]?.count >= templates.length) {
    console.log("  → Inventory templates already exist, skipping.");
    // Return templates from database with IDs
    const dbTemplates = await db.select().from(inventoryTemplates);
    return dbTemplates;
  }

  for (const template of templates) {
    await db.insert(inventoryTemplates).values(template).onConflictDoNothing();
  }

  console.log(`  ✓ Inserted ${templates.length} inventory templates.`);
  // Return templates from database with IDs
  const dbTemplates = await db.select().from(inventoryTemplates);
  return dbTemplates;
}

async function seedCategories(db: any) {
  console.log("Seeding categories...");
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(categories);

  if (existing[0]?.count > 0) {
    console.log("  → Categories already exist, skipping.");
    // Build categoryMap from existing categories
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map<string, string>();
    for (const cat of allCategories) {
      categoryMap.set((cat as any).name, (cat as any).id);
    }
    return categoryMap;
  }

  const categoryMap = new Map<string, string>(); // name -> id

  for (const category of CATEGORIES) {
    // Insert parent category
    const [parent] = await db.insert(categories).values({
      name: category.name,
      slug: category.slug,
      nameAr: category.nameAr,
      description: category.description,
      descriptionAr: category.descriptionAr,
      icon: category.icon,
      parentId: null,
      sortOrder: category.sortOrder,
      isActive: true,
    }).returning();

    categoryMap.set(category.name, (parent as any).id);

    // Insert child categories
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        const [childCat] = await db.insert(categories).values({
          name: child.name,
          slug: child.slug,
          nameAr: child.nameAr,
          description: child.description,
          descriptionAr: child.descriptionAr,
          icon: child.icon,
          parentId: (parent as any).id,
          sortOrder: child.sortOrder,
          isActive: true,
        }).returning();

        categoryMap.set(child.name, (childCat as any).id);
      }
    }
  }

  console.log(`  ✓ Inserted category tree with ${categoryMap.size} categories.`);
  return categoryMap;
}

async function seedProductsAndInventory(db: any, categoryMap: Map<string, string>, templates: any[]) {
  console.log("Seeding products and inventory...");

  let insertedCount = 0;

  for (const productData of PRODUCTS) {
    // Check if product already exists by slug
    const existing = await db.select().from(products).where(eq((products as any).slug, productData.slug)).limit(1);

    if (existing.length > 0) {
      console.log(`  → Product "${productData.name}" already exists, skipping.`);
      continue;
    }

    // Find template
    const template = productData.inventory
      ? templates.find((t: any) => t.name === productData.inventory.templateName)
      : null;

    // Find category
    const categoryId = categoryMap.get(productData.categoryName);

    // Find bundle template if this is a bundle
    let bundleTemplateId = null;
    if (productData.isBundle) {
      bundleTemplateId = templates.find((t: any) => t.name === "Game Bundle Template")?.id || null;
    }

    // Insert product with all fields
    const [product] = await db.insert(products).values({
      name: productData.name,
      slug: productData.slug,
      nameAr: productData.nameAr,
      description: productData.description,
      descriptionAr: productData.descriptionAr,
      sku: productData.sku,
      basePrice: productData.basePrice,
      compareAtPrice: productData.compareAtPrice,
      deliveryType: productData.deliveryType,
      inventoryTemplateId: template?.id || null,
      isActive: productData.isActive,
      isFeatured: productData.isFeatured,
      isNew: productData.isNew,
      maxQuantity: productData.maxQuantity,
      currentStock: productData.currentStock,
      videoUrl: productData.videoUrl,
      // Multi-sell fields
      multiSellEnabled: productData.multiSellEnabled || false,
      multiSellFactor: productData.multiSellFactor || 5,
      cooldownEnabled: productData.cooldownEnabled || false,
      cooldownDurationHours: productData.cooldownDurationHours || 12,
      // Bundle fields
      isBundle: productData.isBundle || false,
      bundleTemplateId: bundleTemplateId,
    }).returning();

    // Link to category
    if (categoryId) {
      await db.insert(productCategories).values({
        productId: product.id,
        categoryId,
        isPrimary: true,
      }).onConflictDoNothing();
    }

    // Insert images
    if (productData.images && productData.images.length > 0) {
      await db.insert(productImages).values(
        productData.images.map((url, index) => ({
          productId: product.id,
          url,
          alt: productData.name,
          sortOrder: index,
        }))
      ).onConflictDoNothing();
    }

    // Handle inventory based on product type
    if (productData.isBundle) {
      // Handle bundle items
      if (productData.bundleItems && productData.bundleItems.length > 0) {
        const bundleItemsToInsert = productData.bundleItems.map((item: any) => ({
          bundleProductId: product.id,
          templateFieldId: item.templateFieldId,
          lineIndex: item.lineIndex,
          productName: item.productName,
          quantity: item.quantity,
        }));
        await db.insert(bundleItems).values(bundleItemsToInsert).onConflictDoNothing();
        console.log(`    → Created bundle with ${bundleItemsToInsert.length} items`);
      }
    } else if (productData.inventory && template) {
      // Handle regular inventory items
      const inventoryItemsToInsert = productData.inventory.fields.map((values) => ({
        templateId: template.id,
        productId: product.id,
        values: JSON.stringify(values),
        status: "available",
      }));
      await db.insert(inventoryItems).values(inventoryItemsToInsert).onConflictDoNothing();
    }

    // Create pricing tiers for the product
    await db.insert(productPricing).values([
      {
        productId: product.id,
        customerType: "retail",
        retailPrice: productData.basePrice,
        currency: "USD",
        creditEligible: false,
      },
      {
        productId: product.id,
        customerType: "merchant",
        wholesalePrice: (parseFloat(productData.basePrice) * 0.7).toFixed(2), // 30% off for merchants
        currency: "USD",
        creditEligible: true,
        creditTermsDays: 30,
      },
    ]).onConflictDoNothing();

    insertedCount++;
  }

  console.log(`  ✓ Inserted ${insertedCount} products with inventory items.`);
}

async function seedOfferAndCoupon(db: any, products: any[]) {
  console.log("Seeding offers and coupons...");

  // Check existing
  const [existingOffer] = await db.select().from(offers).limit(1);
  const [existingCoupon] = await db.select().from(coupons).limit(1);

  if (existingOffer && existingCoupon) {
    console.log("  → Offer and coupon already exist, skipping.");
    return;
  }

  // Insert offer - convert date strings to Date objects
  const [offer] = await db.insert(offers).values({
    name: OFFER.name,
    slug: OFFER.slug,
    nameAr: OFFER.nameAr,
    description: OFFER.description,
    descriptionAr: OFFER.descriptionAr,
    type: OFFER.type,
    value: OFFER.value,
    minPurchase: OFFER.minPurchase,
    maxDiscount: OFFER.maxDiscount,
    startDate: new Date(OFFER.startDate),
    endDate: new Date(OFFER.endDate),
    isActive: true,
    banner: OFFER.banner,
    appliesTo: OFFER.appliesTo,
  }).returning();

  // Link offer to all products
  for (const product of products) {
    // Calculate discounted price
    const originalPrice = parseFloat(product.basePrice);
    let discount = 0;
    if (offer.type === "percentage") {
      discount = originalPrice * (parseFloat(OFFER.value) / 100);
    } else {
      discount = parseFloat(OFFER.value);
    }

    const maxDiscount = offer.maxDiscount ? parseFloat(offer.maxDiscount) : discount;
    const finalDiscount = Math.min(discount, maxDiscount);

    const discountedPrice = originalPrice - finalDiscount;

    await db.insert(productOffers).values({
      productId: product.id,
      offerId: offer.id,
      discountedPrice: discountedPrice.toFixed(2),
    }).onConflictDoNothing();
  }

  // Insert coupon - convert date strings to Date objects
  await db.insert(coupons).values({
    code: COUPON.code,
    description: COUPON.description,
    discountType: COUPON.discountType,
    discountValue: COUPON.discountValue,
    minPurchase: COUPON.minPurchase,
    maxDiscount: COUPON.maxDiscount,
    usageLimit: COUPON.usageLimit,
    userLimit: COUPON.userLimit,
    validFrom: new Date(COUPON.validFrom),
    validUntil: new Date(COUPON.validUntil),
    isActive: COUPON.isActive,
  }).onConflictDoNothing();

  console.log("  ✓ Inserted 'Summer Sale' offer.");
  console.log(`  ✓ Inserted coupon code: ${COUPON.code} (${COUPON.discountValue}% off, min $${COUPON.minPurchase})`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

export async function seed(reset = false) {
  const db = getDb();

  try {
    if (reset) {
      await resetDatabase(db);
    }

    console.log("🌱 Starting database seeding...\n");

    // 1. Seed currencies
    const defaultCurrency = await seedCurrencies(db);

    // 2. Seed store settings
    await seedStoreSettings(db, defaultCurrency.id);

    // 3. Seed inventory templates
    const templates = await seedInventoryTemplates(db);

    // 4. Seed categories
    const categoryMap = await seedCategories(db);

    // 5. Seed products and inventory
    await seedProductsAndInventory(db, categoryMap, templates);

    // 6. Seed offer and coupon
    const allProducts = await db.select().from(products);
    await seedOfferAndCoupon(db, allProducts);

    console.log("\n✅ Seeding completed successfully!");
    console.log("\n📋 Summary:");
    console.log("  • Currencies: " + CURRENCIES.length);
    console.log("  • Categories: " + CATEGORIES.reduce((acc, cat) => acc + 1 + cat.children.length, 0));
    console.log("  • Products: " + PRODUCTS.length);
    console.log("  • Multi-sell products: 1 (Netflix Shared - 5x sales per unit)");
    console.log("  • Bundle products: 1 (COD Series Bundle)");
    console.log("  • Regular products: " + (PRODUCTS.length - 2));
    console.log("  • Offers: 1 (Summer Sale - 20% off)");
    console.log("  • Coupons: 1 (TEST20 - 20% off, min purchase $25)");

  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run seed function if called directly
// Pass 'reset' as argument to clear database first: npx tsx src/seed.ts reset
const args = process.argv.slice(2);
const shouldReset = args.includes('reset');
seed(shouldReset);
