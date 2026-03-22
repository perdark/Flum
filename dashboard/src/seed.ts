/**
 * Mock Data Seeding Script
 *
 * Run with: npx tsx src/seed.ts
 *
 * This script seeds the database with:
 * 1. Store Settings
 * 2. Currencies (USD, EUR, SAR)
 * 3. Categories (hierarchical tree)
 * 4. Products (5 realistic games/software)
 * 5. Inventory Items (auto-delivery keys)
 * 6. Offer & Coupon
 */

import { getDb } from "./db";
import {
  users,
  currencies,
  categories,
  products,
  productCategories,
  productImages,
  inventoryTemplates,
  inventoryBatches,
  inventoryItems,
  offers,
  productOffers,
  coupons,
  orders,
  orderItems,
  storeSettings,
} from "./db/schema";
import { eq, and, sql } from "drizzle-orm";

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
    pointsReward: 60,
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
    pointsReward: 30,
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
    pointsReward: 10,
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
    pointsReward: 150,
    maxQuantity: 10,
    currentStock: 30,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Windows_11_logo.svg/1200px-Windows_11_logo.svg.png"
    ],
    inventory: {
      templateName: "Windows License Key",
      fields: [
        { productKey: "XXXXX-XXXXX-XXXXX-XXXXX", edition: "Pro OEM" },
        { productKey: "YYYYY-YYYYY-YYYYY-YYYYY", edition: "Pro Retail" },
        { productKey: "ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ", edition: "Pro Upgrade" },
        { productKey: "AAAAA-AAAAA-AAAAA-AAAAA", edition: "Pro OEM" },
        { productKey: "BBBBB-BBBBB-BBBBB-BBBBB", edition: "Pro Retail" },
      ],
    },
  },
  {
    name: "Netflix Premium 1 Month",
    slug: "netflix-premium-1-month",
    nameAr: "نتفليكس بريميوم 1 شهر",
    description: "Premium streaming service with 4K Ultra HD and multiple screens.",
    descriptionAr: "خدمة بث متميزة بدقة 4K Ultra HD وشاشات متعددة.",
    sku: "NETFLIX-1M-PREMIUM",
    basePrice: "15.99",
    compareAtPrice: null,
    deliveryType: "manual",
    categoryName: "Streaming",
    categorySlug: "streaming",
    isActive: true,
    isFeatured: true,
    isNew: false,
    pointsReward: 15,
    maxQuantity: 20,
    currentStock: 50,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/6/69/Netflix_2016_logo.svg"
    ],
    inventory: {
      templateName: "Subscription Account",
      fields: [
        { email: "netflix_user1@email.com", password: "Stream123!", profile: "Main Profile" },
        { email: "netflix_user2@email.com", password: "Stream123!", profile: "Kids Profile" },
        { email: "netflix_user3@email.com", password: "Stream123!", profile: "Main Profile" },
        { email: "netflix_user4@email.com", password: "Stream123!", profile: "Main Profile" },
        { email: "netflix_user5@email.com", password: "Stream123!", profile: "Main Profile" },
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
    pointsPerDollar: 10,
    maxPointsRedemption: 1000,
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
        { name: "steamKey", type: "string", required: true, label: "Steam Key" },
      ],
      isActive: true,
    },
    {
      name: "Social Club Account",
      description: "Rockstar Social Club login credentials",
      fieldsSchema: [
        { name: "email", type: "string", required: true, label: "Email" },
        { name: "password", type: "string", required: true, label: "Password" },
        { name: "note", type: "string", required: false, label: "Notes" },
      ],
      isActive: true,
    },
    {
      name: "PSN Account",
      description: "PlayStation Network account credentials",
      fieldsSchema: [
        { name: "email", type: "string", required: true, label: "Email" },
        { name: "password", type: "string", required: true, label: "Password" },
      ],
      isActive: true,
    },
    {
      name: "Windows License Key",
      description: "Windows product key",
      fieldsSchema: [
        { name: "productKey", type: "string", required: true, label: "Product Key" },
        { name: "edition", type: "string", required: true, label: "Edition" },
      ],
      isActive: true,
    },
    {
      name: "Subscription Account",
      description: "Streaming service login credentials",
      fieldsSchema: [
        { name: "email", type: "string", required: true, label: "Email" },
        { name: "password", type: "string", required: true, label: "Password" },
        { name: "profile", type: "string", required: false, label: "Profile" },
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
    const template = templates.find((t: any) => t.name === productData.inventory.templateName);

    // Find category
    const categoryId = categoryMap.get(productData.categoryName);

    // Insert product
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
      pointsReward: productData.pointsReward,
      maxQuantity: productData.maxQuantity,
      currentStock: productData.currentStock,
      videoUrl: productData.videoUrl,
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

    // Insert inventory items
    const inventoryItemsToInsert = productData.inventory.fields.map((values) => ({
      templateId: template?.id || "",
      productId: product.id,
      values: JSON.stringify(values),
      status: "available",
    }));

    await db.insert(inventoryItems).values(inventoryItemsToInsert).onConflictDoNothing();

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

export async function seed() {
  const db = getDb();

  try {
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
    console.log("  • Inventory Items: " + PRODUCTS.reduce((acc, p) => acc + p.inventory.fields.length, 0));
    console.log("  • Offers: 1 (Summer Sale - 20% off)");
    console.log("  • Coupons: 1 (TEST20 - 20% off, min purchase $25)");

  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run seed function if called directly
seed();
