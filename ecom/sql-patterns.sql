-- ============================================================================
-- Fulmen Empire - SQL Query Patterns & Best Practices
-- ============================================================================
-- This file contains common SQL queries and patterns for the Fulmen Empire
-- digital products e-commerce platform.
--
-- @author Fulmen Empire Backend Team
-- ============================================================================

-- ========================================================================
-- 1. PRODUCT QUERIES
-- ========================================================================

-- 1.1 Get product with all platforms
SELECT
  p.id,
  p.name,
  p.name_ar,
  p.slug,
  p.base_price,
  p.description,
  p.delivery_type,
  p.points_reward,
  p.rating_average,
  p.sales_count,
  p.is_active,
  p.is_featured,
  p.is_new,
  p.image,
  p.created_at,
  COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', plat.id,
      'name', plat.name,
      'name_ar', plat.name_ar,
      'slug', plat.slug,
      'price', COALESCE(pp.platform_price, p.base_price),
      'is_primary', pp.is_primary
    ) ORDER BY pp.is_primary DESC, plat.sort_order
  ), '[]'::jsonb) as platforms
FROM products p
LEFT JOIN product_platforms pp ON p.id = pp.product_id
LEFT JOIN platforms plat ON plat.id = pp.platform_id
WHERE p.slug = $1 -- 'elden-ring'
  AND p.is_active = true
GROUP BY p.id;

-- 1.2 Search products (full-text with platform)
SELECT DISTINCT
  p.id,
  p.name,
  p.slug,
  p.base_price,
  p.compare_at_price,
  p.rating_average,
  p.sales_count,
  p.image
FROM products p
INNER JOIN product_platforms pp ON p.id = pp.product_id
INNER JOIN platforms plat ON plat.id = pp.platform_id
WHERE p.is_active = true
  AND plat.id = $1 -- platform filter
  AND (
    p.name ILIKE '%' || $2 || '%' OR
    p.name_ar ILIKE '%' || $2 || '%' OR
    p.description ILIKE '%' || $2 || '%'
  )
ORDER BY
  CASE
    WHEN p.rating_average >= 4.5 THEN 1
    WHEN p.is_featured THEN 2
    WHEN p.is_new THEN 3
    ELSE 4
  END,
  p.sales_count DESC,
  p.created_at DESC
LIMIT $3 OFFSET $4;

-- 1.3 Get products by category with pagination
SELECT
  p.*,
  c.name as category_name,
  c.slug as category_slug
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = true
  AND ($1 IS NULL OR c.slug = $1) -- category filter
  AND ($2 IS NULL OR p.base_price BETWEEN $2::numeric AND $3::numeric) -- price range
ORDER BY p.sales_count DESC, p.created_at DESC
LIMIT 20 OFFSET $4;

-- 1.4 Get trending products (last 30 days by sales)
SELECT
  p.id,
  p.name,
  p.slug,
  p.base_price,
  p.image,
  SUM(oi.quantity) as units_sold,
  COUNT(DISTINCT o.id) as order_count
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.id
INNER JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('delivered', 'processing')
  AND o.created_at >= NOW() - INTERVAL '30 days'
  AND p.is_active = true
GROUP BY p.id
ORDER BY units_sold DESC
LIMIT 10;

-- 1.5 Get "Users also bought" recommendations
SELECT
  p.id,
  p.name,
  p.slug,
  p.base_price,
  p.image,
  COUNT(*) as purchase_count
FROM order_items oi1
INNER JOIN orders o ON o.id = oi1.order_id
INNER JOIN order_items oi2 ON o.id = oi2.order_id AND oi2.product_id != oi1.product_id
INNER JOIN products p ON p.id = oi2.product_id
WHERE oi1.product_id = $1 -- product_id
  AND o.status IN ('delivered', 'processing')
  AND p.is_active = true
GROUP BY p.id
ORDER BY purchase_count DESC
LIMIT 6;

-- ========================================================================
-- 2. PLATFORM TREE QUERIES
-- ========================================================================

-- 2.1 Get full platform tree (recursive CTE)
WITH RECURSIVE platform_tree AS (
  -- Root nodes (categories)
  SELECT
    id,
    name,
    name_ar,
    slug,
    parent_id,
    level,
    0 as sort_order,
    ARRAY[id] as path_ids
  FROM platforms
  WHERE parent_id IS NULL
    AND is_active = true

  UNION ALL

  -- Child nodes
  SELECT
    p.id,
    p.name,
    p.name_ar,
    p.slug,
    p.parent_id,
    p.level,
    pt.sort_order + p.sort_order,
    pt.path_ids || p.id
  FROM platforms p
  INNER JOIN platform_tree pt ON pt.id = p.parent_id
  WHERE p.is_active = true
)
SELECT
  *,
  array_to_json(path_ids) as path_ids
FROM platform_tree
ORDER BY level, sort_order;

-- 2.2 Get products by platform (with ancestors)
SELECT
  p.*,
  plat.name as platform_name,
  plat.name_ar as platform_name_ar,
  COALESCE(pp.platform_price, p.base_price) as platform_price
FROM products p
INNER JOIN product_platforms pp ON p.id = pp.product_id
INNER JOIN platforms plat ON plat.id = pp.platform_id
WHERE plat.slug = $1 -- 'steam'
  AND p.is_active = true
  AND pp.is_active = true
ORDER BY p.sales_count DESC;

-- 2.3 Get all products in platform subtree
WITH RECURSIVE platform_tree AS (
  SELECT id, parent_id
  FROM platforms
  WHERE slug = $1 -- 'gaming'

  UNION ALL

  SELECT p.id, p.parent_id
  FROM platforms p
  INNER JOIN platform_tree pt ON p.parent_id = pt.id
)
SELECT DISTINCT
  pr.id,
  pr.name,
  pr.slug,
  pr.base_price,
  pr.image,
  pl.name as platform_name
FROM products pr
INNER JOIN product_platforms pp ON pr.id = pp.product_id
INNER JOIN platforms pl ON pl.id = pp.platform_id
WHERE pl.id IN (SELECT id FROM platform_tree)
  AND pr.is_active = true
ORDER BY pr.sales_count DESC;

-- ========================================================================
-- 3. CART & ORDER QUERIES
-- ========================================================================

-- 3.1 Get user's cart (with real-time pricing)
SELECT
  ci.id,
  ci.quantity,
  ci.price as cart_price,
  ci.product_name,
  ci.product_slug,
  ci.product_image,
  ci.platform_name,
  ci.platform_id,
  p.points_reward,
  ci.quantity * ci.price as line_total
FROM cart_items ci
INNER JOIN carts c ON c.id = ci.cart_id
LEFT JOIN products p ON p.id = ci.product_id
WHERE c.user_id = $1 OR c.session_id = $2
ORDER BY ci.created_at;

-- 3.2 Get order with items
SELECT
  o.*,
  json_agg(
    JSON_BUILD_OBJECT(
      'id', oi.id,
      'product_name', oi.product_name,
      'product_name_ar', oi.product_name_ar,
      'product_slug', oi.product_slug,
      'product_image', oi.product_image,
      'platform_name', oi.platform_name,
      'quantity', oi.quantity,
      'price', oi.price,
      'delivery_type', oi.delivery_type,
      'delivery_status', oi.delivery_status,
      'points_earned', oi.points_earned
    )
  ) as items
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE o.id = $1
GROUP BY o.id;

-- 3.3 Create order from cart
WITH cart_items AS (
  SELECT
    ci.id,
    ci.product_id,
    ci.platform_id,
    ci.quantity,
    ci.price,
    c.user_id,
    c.currency_id
  FROM cart_items ci
  INNER JOIN carts c ON c.id = ci.cart_id
  WHERE c.user_id = $1 OR c.session_id = $2
),
order_number AS (
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_seq')::text, 4, '0')
)
INSERT INTO orders (
  order_number,
  user_id,
  email,
  currency_code,
  subtotal,
  tax,
  total,
  points_earned,
  status,
  created_at
)
SELECT
  order_number.*,
  ci.product_id,
  ci.quantity,
  ci.price,
  p.points_reward,
  p.delivery_type
FROM cart_items ci
CROSS JOIN orders order_number
LEFT JOIN products p ON p.id = ci.product_id;

-- ========================================================================
-- 4. REVIEWS & RATINGS
-- ========================================================================

-- 4.1 Get approved reviews with pagination
SELECT
  r.id,
  r.rating,
  r.title,
  r.comment,
  r.helpful_count,
  r.is_verified_purchase,
  r.created_at,
  u.first_name,
  u.last_name,
  u.avatar
FROM reviews r
INNER JOIN users u ON u.id = r.user_id
WHERE r.product_id = $1
  AND r.is_approved = true
ORDER BY
  r.is_featured DESC,
  r.helpful_count DESC,
  r.created_at DESC
LIMIT $2 OFFSET $3;

-- 4.2 Get review statistics for a product
SELECT
  COUNT(*) as total_reviews,
  AVG(rating)::numeric(3,2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star,
  COUNT(*) FILTER (WHERE rating = 4) as four_star,
  COUNT(*) FILTER (WHERE rating = 3) as three_star,
  COUNT(*) FILTER (WHERE rating = 2) as two_star,
  COUNT(*) FILTER (WHERE rating = 1) as one_star
FROM reviews
WHERE product_id = $1;

-- 4.3 Get pending reviews (for moderation)
SELECT
  r.*,
  p.name as product_name,
  p.slug as product_slug,
  u.first_name,
  u.last_name,
  u.email
FROM reviews r
INNER JOIN products p ON p.id = r.product_id
INNER JOIN users u ON u.id = r.user_id
WHERE r.is_approved = false
ORDER BY r.created_at ASC
LIMIT 50;

-- ========================================================================
-- 5. POINTS SYSTEM
-- ========================================================================

-- 5.1 Get user points balance
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  COALESCE(ub.available_points, 0) as available_points,
  COALESCE(ub.pending_points, 0) as pending_points
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id = $1;

-- 5.2 Get points transaction history
SELECT
  pt.*,
  o.order_number
FROM points_transactions pt
LEFT JOIN orders o ON o.id = pt.order_id
WHERE pt.user_id = $1
ORDER BY pt.created_at DESC
LIMIT 50 OFFSET $2;

-- 5.3 Award points after order completion
INSERT INTO points_transactions (user_id, order_id, amount, type, description, balance_before, balance_after)
SELECT
  o.user_id,
  o.id as order_id,
  SUM(oi.points_earned) as amount,
  'purchase' as type,
  'Order ' || o.order_number as description,
  COALESCE(ub.available_points, 0) as balance_before,
  COALESCE(ub.available_points, 0) + SUM(oi.points_earned) as balance_after
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN user_balances ub ON ub.user_id = o.user_id
WHERE o.id = $1
  AND o.status = 'delivered'
GROUP BY o.user_id, o.id;

-- 5.4 Update user balance after transaction
INSERT INTO user_balances (user_id, available_points, total_earned)
SELECT
  $1 as user_id,
  COALESCE((ub.available_points + $2), 0) as available_points,
  COALESCE((ub.total_earned + $2), 0) as total_earned
FROM user_balances ub
WHERE ub.user_id = $1
ON CONFLICT (user_id) DO UPDATE SET
  available_points = EXCLUDED.available_points,
  total_earned = EXCLUDED.total_earned,
  last_updated_at = NOW();

-- ========================================================================
-- 6. WISHLIST & RECOMMENDATIONS
-- ========================================================================

-- 6.1 Get user's wishlist with price drop alerts
SELECT
  w.*,
  p.name as product_name,
  p.slug as product_slug,
  p.base_price,
  p.compare_at_price,
  p.image,
  pl.name as platform_name,
  CASE
    WHEN w.price_alert IS NOT NULL AND p.base_price <= w.price_alert THEN true
    ELSE false
  END as price_dropped
FROM wishlists w
INNER JOIN products p ON p.id = w.product_id
LEFT JOIN platforms pl ON pl.id = w.platform_id
WHERE w.user_id = $1
  AND w.price_alert_enabled = true
  AND p.is_active = true
ORDER BY
  price_dropped DESC,
  w.created_at DESC;

-- 6.2 Get recently viewed products (for recommendations)
SELECT
  product_id,
  platform_id,
  COUNT(*) as view_count,
  MAX(created_at) as last_viewed_at
FROM recently_viewed
WHERE user_id = $1 OR session_id = $2
GROUP BY product_id, platform_id
ORDER BY last_viewed_at DESC
LIMIT 20;

-- 6.3 Update product view count (atomic)
UPDATE products
SET views = views + 1,
  updated_at = NOW()
WHERE id = $1;

-- ========================================================================
-- 7. ADMIN DASHBOARD QUERIES
-- ========================================================================

-- 7.1 Dashboard statistics
SELECT
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total), 0) as total_revenue,
  COUNT(DISTINCT CASE WHEN o.created_at > NOW() - INTERVAL '30 days' THEN o.id END) as orders_last_30_days,
  COUNT(DISTINCT CASE WHEN o.created_at > NOW() - INTERVAL '30 days' THEN o.user_id END) as customers_last_30_days
FROM orders o
WHERE o.status != 'cancelled';

-- 7.2 Top selling products
SELECT
  p.id,
  p.name,
  p.slug,
  p.base_price,
  p.image,
  SUM(oi.quantity) as units_sold,
  COUNT(DISTINCT o.id) as order_count
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
INNER JOIN products p ON p.id = oi.product_id
WHERE o.status = 'delivered'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id
ORDER BY units_sold DESC
LIMIT 10;

-- 7.3 Low stock alert (for digital products)
-- This would be custom based on inventory tracking
-- For digital products with limited keys/codes:
SELECT
  p.id,
  p.name,
  p.slug,
  p.current_stock,
  p.max_quantity_per_order
FROM products p
WHERE p.is_active = true
  AND p.current_stock < 10
  AND p.current_stock > -1 -- -1 means unlimited
ORDER BY p.current_stock ASC;

-- ========================================================================
-- 8. OFFERS & PROMOTIONS
-- ========================================================================

-- 8.1 Get active offers for a product
SELECT
  o.id,
  o.name,
  o.name_ar,
  o.type,
  o.value,
  o.value_type,
  o.start_date,
  o.end_date,
  po.discounted_price,
  po.discount_percentage
FROM offers o
INNER JOIN product_offers po ON po.offer_id = o.id
WHERE po.product_id = $1
  AND o.is_active = true
  AND NOW() BETWEEN o.start_date AND o.end_date
ORDER BY o.priority DESC, o.value DESC;

-- 8.2 Get product with best applied offer
SELECT
  p.*,
  COALESCE(po.discounted_price, p.base_price) as current_price,
  COALESCE(po.discount_percentage, 0) as discount_percentage,
  o.id as offer_id,
  o.name as offer_name,
  o.badge
FROM products p
LEFT JOIN product_offers po ON po.product_id = p.id
LEFT JOIN offers o ON o.id = po.offer_id
  AND o.is_active = true
  AND NOW() BETWEEN o.start_date AND o.end_date
WHERE p.id = $1
ORDER BY
  COALESCE(po.discount_percentage, 0) DESC,
  o.priority DESC
LIMIT 1;

-- ========================================================================
-- 9. SEARCH & DISCOVERY
-- ========================================================================

-- 9.1 Full-text search using PostgreSQL FTS (if implemented)
-- Create index first:
-- CREATE INDEX products_name_fts ON products USING gin(to_tsvector('english', name || ' ' || coalesce(name_ar, '')));
-- CREATE INDEX products_desc_fts ON products USING gin(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(description_ar, '')));

SELECT
  p.id,
  p.name,
  p.slug,
  p.base_price,
  p.image,
  p.rating_average,
  ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description_ar, '')), plainto_tsquery($2)) as rank
FROM products p
WHERE p.is_active = true
  AND to_tsvector('english', p.name || ' ' || COALESCE(p.description_ar, '')) @@ plainto_tsquery($1)
ORDER BY rank DESC
LIMIT 20;

-- 9.2 Filter products with multiple criteria
SELECT
  p.*,
  c.name as category_name,
  COALESCE(AVG(r.rating), 0) as avg_rating
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN reviews r ON r.product_id = p.id
LEFT JOIN product_platforms pp ON pp.product_id = p.id
WHERE p.is_active = true
  AND ($1::numeric IS NULL OR p.base_price BETWEEN $1::numeric AND $2::numeric) -- price min/max
  AND ($3::boolean IS NULL OR p.rating_average >= $3::numeric) -- min rating
  AND ($4::text[] IS NULL OR pp.platform_id = ANY($4::text[])) -- platforms
  AND ($5::text[] IS NULL OR c.slug = ANY($5::text[])) -- categories
  AND pp.is_primary = true -- only show primary platform
GROUP BY p.id, c.name
HAVING COUNT(*) > 0;

-- ========================================================================
-- 10. MAINTENANCE & CLEANUP
-- ========================================================================

-- 10.1 Clean expired guest carts
DELETE FROM carts
WHERE user_id IS NULL
  AND session_id IS NOT NULL
  AND (
    expires_at IS NULL
    OR expires_at < NOW()
  );

-- 10.2 Archive old orders (optional partitioning)
-- This would move old orders to an archive table
INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < NOW() - INTERVAL '2 years'
  AND status IN ('delivered', 'cancelled');

DELETE FROM orders
WHERE created_at < NOW() - INTERVAL '2 years'
  AND status IN ('delivered', 'cancelled')
  AND id IN (SELECT id FROM orders_archive);

-- 10.3 Update product denormalized stats
WITH product_stats AS (
  SELECT
    product_id,
    AVG(rating) as avg_rating,
    COUNT(*) as rating_count
  FROM reviews
  WHERE is_approved = true
  GROUP BY product_id
),
sales_stats AS (
  SELECT
    product_id,
    SUM(quantity) as total_sales
  FROM order_items
  INNER JOIN orders ON orders.id = order_items.order_id
  WHERE orders.status = 'delivered'
  GROUP BY product_id
),
wishlist_stats AS (
  SELECT
    product_id,
    COUNT(*) as wishlist_count
  FROM wishlists
  GROUP BY product_id
)
UPDATE products
SET
  rating_average = COALESCE(ps.avg_rating, 0),
  rating_count = COALESCE(ps.rating_count, 0),
  sales_count = COALESCE(ss.total_sales, 0),
  wishlist_count = COALESCE(ws.wishlist_count, 0),
  updated_at = NOW()
FROM products p
LEFT JOIN product_stats ps ON ps.product_id = p.id
LEFT JOIN sales_stats ss ON ss.product_id = p.id
LEFT JOIN wishlist_stats ws ON ws.product_id = p.id;

-- 10.4 Calculate and update platform product counts
UPDATE platforms pl
SET product_count = (
  SELECT COUNT(DISTINCT pp.product_id)
  FROM product_platforms pp
  INNER JOIN products p ON p.id = pp.product_id
  WHERE pp.platform_id = pl.id
    AND p.is_active = true
    AND pp.is_active = true
),
  updated_at = NOW();

-- ========================================================================
-- 11. ANALYTICS & REPORTING
-- ========================================================================

-- 11.1 Daily revenue report
SELECT
  DATE(created_at) as date,
  currency_code,
  COUNT(*) as order_count,
  SUM(total) as revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE status = 'delivered'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), currency_code
ORDER BY date DESC;

-- 11.2 Platform popularity report
SELECT
  pl.name as platform_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as items_sold,
  SUM(oi.quantity * oi.price) as revenue
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
INNER JOIN platforms pl ON pl.id = oi.platform_id
WHERE o.status = 'delivered'
  AND o.created_at >= NOW() - INTERVAL '90 days'
GROUP BY pl.id, pl.name
ORDER BY revenue DESC;

-- 11.3 Product performance by category
SELECT
  c.name as category_name,
  COUNT(DISTINCT p.id) as product_count,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as items_sold,
  SUM(oi.quantity * oi.price) as revenue,
  AVG(p.rating_average) as avg_rating
FROM products p
INNER JOIN categories c ON c.id = p.category_id
INNER JOIN product_platforms pp ON pp.product_id = p.id AND pp.is_primary
INNER JOIN order_items oi ON oi.product_id = pp.product_id
INNER JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'delivered'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name
ORDER BY revenue DESC;

-- ========================================================================
-- 12. TRIGGERS (Optional - for maintaining denormalized data)
-- ========================================================================

-- 12.1 Function to update product stats
CREATE OR REPLACE FUNCTION update_product_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rating and sales count
  UPDATE products
  SET
    rating_average = COALESCE(
      (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE product_id = NEW.id AND is_approved = true),
      0
    ),
    rating_count = COALESCE(
      (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.id AND is_approved = true),
      0
    ),
    sales_count = COALESCE(
      (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = NEW.id AND o.status = 'delivered'),
      0
    ),
    wishlist_count = COALESCE(
      (SELECT COUNT(*) FROM wishlists WHERE product_id = NEW.id),
      0
    ),
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (optional - may prefer batch updates for performance)
-- CREATE TRIGGER update_product_stats_trigger
-- AFTER INSERT OR UPDATE ON reviews
-- FOR EACH ROW
-- EXECUTE FUNCTION update_product_stats();

-- ========================================================================
-- 13. CONCURRENT SAFETY
-- ========================================================================

-- 13.1 FOR UPDATE skip locked orders (handle concurrent updates)
SELECT o.id, o.status, o.total
FROM orders o
WHERE o.id = ANY($1::uuid[])
  FOR UPDATE OF o SKIP LOCKED;

-- 13.2 Insert with ON CONFLICT for carts (idempotent cart operations)
INSERT INTO carts (id, user_id, session_id, expires_at)
VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
ON CONFLICT (user_id)
  DO UPDATE SET
    session_id = EXCLUDED.session_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
