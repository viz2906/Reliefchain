-- ============================================================================
-- ReliefChain: Disaster Relief Resource Allocation & Routing System
-- File: sql/03_procedures_and_triggers.sql
-- Description: Stored Procedures, Functions, Triggers, and ACID Transactions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger Function: Prevent Negative Inventory
-- Enforces absolute inventory integrity at the database trigger level
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_negative_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.available_quantity < 0 THEN
        RAISE EXCEPTION 'Database Integrity Violation: available_quantity cannot be negative (Warehouse ID %, Category ID %)',
            NEW.warehouse_id, NEW.category_id;
    END IF;
    IF NEW.reserved_quantity < 0 THEN
        RAISE EXCEPTION 'Database Integrity Violation: reserved_quantity cannot be negative (Warehouse ID %, Category ID %)',
            NEW.warehouse_id, NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_inventory_levels ON warehouse_inventory;
CREATE TRIGGER trg_chk_inventory_levels
BEFORE INSERT OR UPDATE ON warehouse_inventory
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_negative_inventory();

-- ----------------------------------------------------------------------------
-- 2. Trigger Function: Audit Request Status Changes
-- Automatically captures every state transition of a relief request
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO allocation_audit_log (
            entity_name,
            entity_id,
            action_type,
            performed_by,
            old_state,
            new_state,
            timestamp
        ) VALUES (
            'relief_requests',
            NEW.id,
            'UPDATE',
            NULL,
            jsonb_build_object('status', OLD.status, 'approved_quantity', OLD.approved_quantity),
            jsonb_build_object('status', NEW.status, 'approved_quantity', NEW.approved_quantity),
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_request ON relief_requests;
CREATE TRIGGER trg_audit_request
AFTER UPDATE ON relief_requests
FOR EACH ROW
EXECUTE FUNCTION fn_audit_request_status_change();

-- ----------------------------------------------------------------------------
-- 3. Trigger Function: Update Vehicle Status on Shipment Completion
-- When a shipment is marked DELIVERED, automatically free the vehicle to AVAILABLE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_handle_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_status = 'DELIVERED' AND OLD.delivery_status != 'DELIVERED' THEN
        NEW.actual_arrival := CURRENT_TIMESTAMP;
        
        -- Free vehicle
        UPDATE vehicle_fleet 
        SET status = 'AVAILABLE',
            last_ping_time = CURRENT_TIMESTAMP
        WHERE id = NEW.vehicle_id;

        -- Fulfill associated request
        UPDATE relief_requests
        SET status = 'FULFILLED',
            fulfilled_at = CURRENT_TIMESTAMP
        WHERE id = NEW.request_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_delivery ON dispatch_shipments;
CREATE TRIGGER trg_shipment_delivery
BEFORE UPDATE ON dispatch_shipments
FOR EACH ROW
EXECUTE FUNCTION fn_handle_shipment_status_change();

-- ----------------------------------------------------------------------------
-- 4. Stored Function: Geospatial Haversine Nearest Warehouse Finder
-- Computes spherical distance between camp and operational warehouses
-- with sufficient stock for the requested resource category
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_find_nearest_warehouse_with_stock(
    p_camp_id INT,
    p_category_id INT,
    p_required_qty INT
)
RETURNS TABLE (
    warehouse_id INT,
    warehouse_name VARCHAR,
    available_stock INT,
    distance_km DECIMAL(8, 2)
) AS $$
DECLARE
    v_camp_lat DECIMAL(10, 7);
    v_camp_lon DECIMAL(10, 7);
BEGIN
    -- Retrieve camp coordinates
    SELECT latitude, longitude INTO v_camp_lat, v_camp_lon
    FROM relief_camps
    WHERE id = p_camp_id;

    IF v_camp_lat IS NULL THEN
        RAISE EXCEPTION 'Camp with ID % not found', p_camp_id;
    END IF;

    RETURN QUERY
    SELECT 
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        wi.available_quantity AS available_stock,
        ROUND(
            (6371 * acos(
                LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(v_camp_lat)) * cos(radians(w.latitude)) *
                    cos(radians(w.longitude) - radians(v_camp_lon)) +
                    sin(radians(v_camp_lat)) * sin(radians(w.latitude))
                ))
            ))::numeric, 2
        ) AS distance_km
    FROM warehouses w
    JOIN warehouse_inventory wi ON w.id = wi.warehouse_id
    WHERE w.is_operational = TRUE
      AND wi.category_id = p_category_id
      AND wi.available_quantity >= p_required_qty
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 5. Stored Function: Camp Urgency Priority Score Calculator
-- Produces a numerical score (0 to 100) combining camp occupancy, severity, and pending requests
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_camp_urgency_score(p_camp_id INT)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_occupancy_ratio DECIMAL(5, 2);
    v_zone_severity VARCHAR(20);
    v_severity_weight DECIMAL(5, 2);
    v_critical_requests_count INT;
    v_final_score DECIMAL(5, 2);
BEGIN
    -- 1. Occupancy ratio
    SELECT (current_occupancy::DECIMAL / NULLIF(capacity, 0)) * 40.0
    INTO v_occupancy_ratio
    FROM relief_camps
    WHERE id = p_camp_id;

    -- 2. Zone severity weight
    SELECT z.severity_level INTO v_zone_severity
    FROM relief_camps c
    JOIN disaster_zones z ON c.zone_id = z.id
    WHERE c.id = p_camp_id;

    v_severity_weight := CASE v_zone_severity
        WHEN 'CRITICAL' THEN 35.0
        WHEN 'HIGH' THEN 25.0
        WHEN 'MODERATE' THEN 15.0
        ELSE 5.0
    END;

    -- 3. Pending critical requests weight
    SELECT COUNT(*) * 5.0
    INTO v_critical_requests_count
    FROM relief_requests
    WHERE camp_id = p_camp_id AND urgency_level = 'CRITICAL' AND status = 'PENDING';

    v_final_score := LEAST(100.00, COALESCE(v_occupancy_ratio, 0) + v_severity_weight + COALESCE(v_critical_requests_count, 0));
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. Advanced Stored Procedure: ACID Transaction Resource Allocation & Dispatch
-- Atomically reserves warehouse stock, creates shipment manifest, updates request,
-- dispatches vehicle, and writes audit record in a single transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_process_resource_dispatch(
    p_request_id INT,
    p_warehouse_id INT,
    p_vehicle_id INT,
    p_allocated_qty INT,
    p_dispatched_by INT,
    INOUT p_tracking_code VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_category_id INT;
    v_current_stock INT;
    v_requested_qty INT;
    v_vehicle_status VARCHAR(30);
    v_vehicle_capacity DECIMAL(9, 2);
    v_unit_weight DECIMAL(8, 2);
    v_total_weight DECIMAL(9, 2);
    v_shipment_id INT;
BEGIN
    -- 1. Validate and Lock the Request
    SELECT category_id, requested_quantity
    INTO v_category_id, v_requested_qty
    FROM relief_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Relief Request ID % does not exist.', p_request_id;
    END IF;

    -- 2. Validate and Lock the Warehouse Inventory Row
    SELECT available_quantity
    INTO v_current_stock
    FROM warehouse_inventory
    WHERE warehouse_id = p_warehouse_id AND category_id = v_category_id
    FOR UPDATE;

    IF NOT FOUND OR v_current_stock < p_allocated_qty THEN
        RAISE EXCEPTION 'Insufficient stock in Warehouse ID %: requested %, available %',
            p_warehouse_id, p_allocated_qty, COALESCE(v_current_stock, 0);
    END IF;

    -- 3. Validate Vehicle Availability and Payload Capacity
    SELECT status, max_payload_kg
    INTO v_vehicle_status, v_vehicle_capacity
    FROM vehicle_fleet
    WHERE id = p_vehicle_id
    FOR UPDATE;

    IF v_vehicle_status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Vehicle ID % is not available (Current Status: %)', p_vehicle_id, v_vehicle_status;
    END IF;

    SELECT weight_kg_per_unit INTO v_unit_weight
    FROM resource_categories
    WHERE id = v_category_id;

    v_total_weight := p_allocated_qty * COALESCE(v_unit_weight, 1.0);
    IF v_total_weight > v_vehicle_capacity THEN
        RAISE EXCEPTION 'Shipment weight (% kg) exceeds vehicle payload capacity (% kg)',
            v_total_weight, v_vehicle_capacity;
    END IF;

    -- 4. Deduct Available Stock & Transfer to Reserved
    UPDATE warehouse_inventory
    SET available_quantity = available_quantity - p_allocated_qty,
        reserved_quantity = reserved_quantity + p_allocated_qty,
        last_restocked_at = CURRENT_TIMESTAMP
    WHERE warehouse_id = p_warehouse_id AND category_id = v_category_id;

    -- 5. Generate Unique Tracking Code
    p_tracking_code := 'RC-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- 6. Insert Dispatch Shipment Record
    INSERT INTO dispatch_shipments (
        tracking_code,
        request_id,
        warehouse_id,
        vehicle_id,
        dispatched_by,
        departure_time,
        estimated_arrival,
        delivery_status,
        route_distance_km,
        delivery_notes
    ) VALUES (
        p_tracking_code,
        p_request_id,
        p_warehouse_id,
        p_vehicle_id,
        p_dispatched_by,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '3 hours',
        'DISPATCHED',
        42.50,
        'Emergency high-priority dispatch processed via ReliefChain ACID transaction'
    ) RETURNING id INTO v_shipment_id;

    -- 7. Insert Shipment Item Manifest
    INSERT INTO dispatch_items (
        shipment_id,
        category_id,
        quantity_loaded
    ) VALUES (
        v_shipment_id,
        v_category_id,
        p_allocated_qty
    );

    -- 8. Update Vehicle Fleet Status to IN_TRANSIT
    UPDATE vehicle_fleet
    SET status = 'IN_TRANSIT',
        last_ping_time = CURRENT_TIMESTAMP
    WHERE id = p_vehicle_id;

    -- 9. Update Relief Request Status
    UPDATE relief_requests
    SET approved_quantity = approved_quantity + p_allocated_qty,
        status = CASE 
            WHEN (approved_quantity + p_allocated_qty) >= requested_quantity THEN 'DISPATCHED'
            ELSE 'PARTIALLY_FULFILLED'
        END
    WHERE id = p_request_id;

    -- 10. Record in Allocation Audit Log
    INSERT INTO allocation_audit_log (
        entity_name,
        entity_id,
        action_type,
        performed_by,
        old_state,
        new_state
    ) VALUES (
        'dispatch_shipments',
        v_shipment_id,
        'DISPATCH_ALLOCATION',
        p_dispatched_by,
        jsonb_build_object('available_stock_before', v_current_stock),
        jsonb_build_object(
            'tracking_code', p_tracking_code,
            'allocated_qty', p_allocated_qty,
            'remaining_stock', v_current_stock - p_allocated_qty
        )
    );

END;
$$;
