-- ============================================================================
-- ReliefChain: Disaster Relief Resource Allocation & Routing System
-- File: sql/02_views.sql
-- Description: Advanced SQL Views for Real-Time Triage, Deficit Analysis & Fleet Tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View 1: Camp Deficit Matrix
-- Calculates exact deficit between requested aid, approved shipments, and delivered stock
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_camp_deficit_matrix AS
SELECT 
    c.id AS camp_id,
    c.name AS camp_name,
    z.name AS zone_name,
    z.severity_level,
    rc.id AS category_id,
    rc.name AS resource_name,
    rc.category_group,
    rc.unit_of_measure,
    COALESCE(SUM(rr.requested_quantity), 0) AS total_requested,
    COALESCE(SUM(rr.approved_quantity), 0) AS total_approved,
    COALESCE(SUM(CASE WHEN ds.delivery_status = 'DELIVERED' THEN di.quantity_loaded ELSE 0 END), 0) AS total_delivered,
    COALESCE(SUM(CASE WHEN ds.delivery_status IN ('DISPATCHED', 'IN_TRANSIT') THEN di.quantity_loaded ELSE 0 END), 0) AS in_transit,
    (COALESCE(SUM(rr.requested_quantity), 0) - COALESCE(SUM(CASE WHEN ds.delivery_status = 'DELIVERED' THEN di.quantity_loaded ELSE 0 END), 0)) AS unfulfilled_deficit,
    MAX(rr.created_at) AS latest_request_time
FROM relief_camps c
JOIN disaster_zones z ON c.zone_id = z.id
LEFT JOIN relief_requests rr ON c.id = rr.camp_id
LEFT JOIN resource_categories rc ON rr.category_id = rc.id
LEFT JOIN dispatch_shipments ds ON rr.id = ds.request_id
LEFT JOIN dispatch_items di ON ds.id = di.shipment_id AND di.category_id = rc.id
GROUP BY 
    c.id, c.name, z.name, z.severity_level, rc.id, rc.name, rc.category_group, rc.unit_of_measure;

-- ----------------------------------------------------------------------------
-- View 2: Active Disaster Dashboard Metrics
-- High-level operational rollups per disaster zone
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_disaster_dashboard AS
SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    z.disaster_type,
    z.severity_level,
    z.status AS zone_status,
    COUNT(DISTINCT c.id) AS total_camps,
    COALESCE(SUM(c.capacity), 0) AS total_shelter_capacity,
    COALESCE(SUM(c.current_occupancy), 0) AS total_sheltered_victims,
    ROUND((COALESCE(SUM(c.current_occupancy), 0)::DECIMAL / NULLIF(SUM(c.capacity), 0) * 100), 2) AS shelter_utilization_pct,
    COUNT(DISTINCT rr.id) FILTER (WHERE rr.status = 'PENDING') AS pending_requests_count,
    COUNT(DISTINCT rr.id) FILTER (WHERE rr.urgency_level = 'CRITICAL' AND rr.status = 'PENDING') AS critical_requests_count,
    COUNT(DISTINCT sos.id) FILTER (WHERE sos.status = 'UNRESOLVED') AS unresolved_sos_count
FROM disaster_zones z
LEFT JOIN relief_camps c ON z.id = c.zone_id
LEFT JOIN relief_requests rr ON c.id = rr.camp_id
LEFT JOIN emergency_sos_signals sos ON z.id = sos.zone_id
GROUP BY z.id, z.name, z.disaster_type, z.severity_level, z.status;

-- ----------------------------------------------------------------------------
-- View 3: Fleet Readiness & Real-time Capacity
-- Summary of logistics fleet status, payload capability, and warehouse deployment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_fleet_readiness AS
SELECT 
    vf.id AS vehicle_id,
    vf.vehicle_number,
    vf.vehicle_type,
    vf.max_payload_kg,
    vf.status,
    w.name AS home_warehouse_name,
    ds.tracking_code AS active_mission_code,
    ds.delivery_status AS active_shipment_status,
    ds.estimated_arrival,
    vf.last_ping_time
FROM vehicle_fleet vf
LEFT JOIN warehouses w ON vf.home_warehouse_id = w.id
LEFT JOIN dispatch_shipments ds ON vf.id = ds.vehicle_id AND ds.delivery_status IN ('PREPARING', 'DISPATCHED', 'IN_TRANSIT');

-- ----------------------------------------------------------------------------
-- View 4: Urgent Unfulfilled Requests With Stock Availability
-- Identifies critical needs and checks if nearby warehouses have inventory ready
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_urgent_unfulfilled_requests AS
SELECT 
    rr.id AS request_id,
    c.id AS camp_id,
    c.name AS camp_name,
    z.name AS zone_name,
    rc.id AS category_id,
    rc.name AS resource_name,
    rr.requested_quantity,
    rr.urgency_level,
    rr.status,
    rr.created_at,
    COALESCE(SUM(wi.available_quantity), 0) AS global_available_stock,
    COUNT(DISTINCT CASE WHEN wi.available_quantity >= rr.requested_quantity THEN wi.warehouse_id END) AS warehouses_with_sufficient_stock
FROM relief_requests rr
JOIN relief_camps c ON rr.camp_id = c.id
JOIN disaster_zones z ON c.zone_id = z.id
JOIN resource_categories rc ON rr.category_id = rc.id
LEFT JOIN warehouse_inventory wi ON rc.id = wi.category_id
WHERE rr.status IN ('PENDING', 'APPROVED')
GROUP BY 
    rr.id, c.id, c.name, z.name, rc.id, rc.name, rr.requested_quantity, rr.urgency_level, rr.status, rr.created_at;
