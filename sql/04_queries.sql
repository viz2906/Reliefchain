-- ============================================================================
-- ReliefChain: Disaster Relief Resource Allocation & Routing System
-- File: sql/04_queries.sql
-- Description: Standard & Advanced DML Queries Demonstrating DBMS Curriculum Requirements
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DML - Meaningful INSERT Operations
-- ----------------------------------------------------------------------------
-- Insert an urgent relief request from a camp
INSERT INTO relief_requests (camp_id, category_id, requested_quantity, urgency_level, status, notes)
VALUES (1, 1, 500, 'CRITICAL', 'PENDING', 'Emergency drinking water supplies exhausted after main water main broke');

-- ----------------------------------------------------------------------------
-- 2. DML - Meaningful UPDATE Operations
-- ----------------------------------------------------------------------------
-- Update camp occupancy and mark overcrowding if threshold reached
UPDATE relief_camps 
SET current_occupancy = current_occupancy + 150,
    status = CASE 
        WHEN (current_occupancy + 150) > capacity THEN 'OVERCROWDED'
        ELSE status
    END
WHERE id = 2;

-- ----------------------------------------------------------------------------
-- 3. DML - Meaningful DELETE Operations (with referential safety)
-- ----------------------------------------------------------------------------
-- Purge completed test distress signals older than 30 days that are marked RESOLVED
DELETE FROM emergency_sos_signals 
WHERE status = 'RESOLVED' 
  AND created_at < NOW() - INTERVAL '30 days';

-- ----------------------------------------------------------------------------
-- 4. Multi-Table INNER JOIN & LEFT JOIN
-- Comprehensive report linking disaster zones, camps, pending requests, and requested resource details
-- ----------------------------------------------------------------------------
SELECT 
    z.name AS zone_name,
    z.disaster_type,
    z.severity_level,
    c.name AS camp_name,
    c.capacity,
    c.current_occupancy,
    rc.name AS requested_item,
    rc.category_group,
    rr.requested_quantity,
    rr.urgency_level,
    rr.created_at AS requested_at,
    COALESCE(ds.tracking_code, 'NOT_DISPATCHED') AS dispatch_tracking
FROM relief_requests rr
INNER JOIN relief_camps c ON rr.camp_id = c.id
INNER JOIN disaster_zones z ON c.zone_id = z.id
INNER JOIN resource_categories rc ON rr.category_id = rc.id
LEFT OUTER JOIN dispatch_shipments ds ON rr.id = ds.request_id
WHERE rr.status IN ('PENDING', 'APPROVED')
ORDER BY 
    CASE rr.urgency_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    rr.created_at ASC;

-- ----------------------------------------------------------------------------
-- 5. GROUP BY and HAVING Clause with Aggregate Functions (COUNT, SUM, AVG)
-- Find camps with high accumulated supply deficits exceeding 500 units
-- ----------------------------------------------------------------------------
SELECT 
    c.id AS camp_id,
    c.name AS camp_name,
    z.name AS disaster_zone,
    COUNT(rr.id) AS total_requests_count,
    SUM(rr.requested_quantity) AS total_units_demanded,
    SUM(rr.approved_quantity) AS total_units_approved,
    (SUM(rr.requested_quantity) - SUM(rr.approved_quantity)) AS outstanding_deficit,
    ROUND(AVG(rr.requested_quantity), 2) AS avg_request_batch_size
FROM relief_camps c
JOIN disaster_zones z ON c.zone_id = z.id
JOIN relief_requests rr ON c.id = rr.camp_id
WHERE rr.status != 'REJECTED'
GROUP BY c.id, c.name, z.name
HAVING (SUM(rr.requested_quantity) - SUM(rr.approved_quantity)) > 500
ORDER BY outstanding_deficit DESC;

-- ----------------------------------------------------------------------------
-- 6. Nested Subquery with Aggregate (Scalar Subquery)
-- Identify warehouses holding more than the average stock of critical medical supplies
-- ----------------------------------------------------------------------------
SELECT 
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    w.location_name,
    rc.name AS resource_name,
    wi.available_quantity
FROM warehouse_inventory wi
JOIN warehouses w ON wi.warehouse_id = w.id
JOIN resource_categories rc ON wi.category_id = rc.id
WHERE rc.category_group = 'MEDICAL'
  AND wi.available_quantity > (
      SELECT AVG(available_quantity)
      FROM warehouse_inventory wi2
      JOIN resource_categories rc2 ON wi2.category_id = rc2.id
      WHERE rc2.category_group = 'MEDICAL'
  )
ORDER BY wi.available_quantity DESC;

-- ----------------------------------------------------------------------------
-- 7. Correlated Subquery (EXISTS / NOT EXISTS)
-- Retrieve operational relief camps that currently have ZERO dispatched or in-transit shipments
-- ----------------------------------------------------------------------------
SELECT 
    c.id,
    c.name AS vulnerable_camp,
    c.current_occupancy,
    c.capacity,
    z.name AS zone_name
FROM relief_camps c
JOIN disaster_zones z ON c.zone_id = z.id
WHERE c.status = 'OPERATIONAL'
  AND NOT EXISTS (
      SELECT 1 
      FROM relief_requests rr
      JOIN dispatch_shipments ds ON rr.id = ds.request_id
      WHERE rr.camp_id = c.id 
        AND ds.delivery_status IN ('PREPARING', 'DISPATCHED', 'IN_TRANSIT')
  );

-- ----------------------------------------------------------------------------
-- 8. Advanced Vector Cosine Similarity Search (pgvector)
-- Semantic matching: find top 3 closest SOS distress signals to a given query embedding
-- Demonstrates operator: <=> (Cosine Distance)
-- ----------------------------------------------------------------------------
-- Note: $1 represents a 384-dimensional vector string e.g. '[0.012, -0.045, ...]'
-- SELECT 
--     id,
--     sender_name,
--     victim_count,
--     raw_message,
--     detected_urgency,
--     1 - (embedding <=> $1) AS cosine_similarity_score
-- FROM emergency_sos_signals
-- WHERE status = 'UNRESOLVED'
-- ORDER BY embedding <=> $1 ASC
-- LIMIT 5;
