// ============================================================================
// ReliefChain: Interactive SQL Lab & Evaluation Workbench API Route
// File: src/app/api/sql-lab/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

const PRESET_QUERIES = [
  {
    id: 'join_triage',
    category: 'JOIN Operations',
    title: 'Multi-Table INNER & LEFT JOIN: Active Requests & Tracking',
    description: 'Joins relief_requests with relief_camps, disaster_zones, resource_categories and dispatch_shipments',
    sql: `SELECT 
    z.name AS zone_name,
    z.disaster_type,
    z.severity_level,
    c.name AS camp_name,
    rc.name AS requested_item,
    rc.category_group,
    rr.requested_quantity,
    rr.urgency_level,
    rr.created_at AS requested_at,
    COALESCE(ds.tracking_code, 'PENDING_DISPATCH') AS tracking_code
FROM relief_requests rr
INNER JOIN relief_camps c ON rr.camp_id = c.id
INNER JOIN disaster_zones z ON c.zone_id = z.id
INNER JOIN resource_categories rc ON rr.category_id = rc.id
LEFT OUTER JOIN dispatch_shipments ds ON rr.id = ds.request_id
WHERE rr.status IN ('PENDING', 'APPROVED', 'DISPATCHED')
ORDER BY 
    CASE rr.urgency_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
    rr.created_at ASC
LIMIT 10;`,
  },
  {
    id: 'group_by_having',
    category: 'Aggregations & HAVING',
    title: 'GROUP BY & HAVING: High Deficit Relief Camps (> 300 units)',
    description: 'Demonstrates SUM, COUNT, AVG, and filtering groups via HAVING',
    sql: `SELECT 
    c.id AS camp_id,
    c.name AS camp_name,
    z.name AS disaster_zone,
    COUNT(rr.id) AS total_requests,
    SUM(rr.requested_quantity) AS total_units_demanded,
    SUM(rr.approved_quantity) AS total_units_approved,
    (SUM(rr.requested_quantity) - SUM(rr.approved_quantity)) AS outstanding_deficit,
    ROUND(AVG(rr.requested_quantity), 2) AS avg_request_batch_size
FROM relief_camps c
JOIN disaster_zones z ON c.zone_id = z.id
JOIN relief_requests rr ON c.id = rr.camp_id
WHERE rr.status != 'REJECTED'
GROUP BY c.id, c.name, z.name
HAVING (SUM(rr.requested_quantity) - SUM(rr.approved_quantity)) > 300
ORDER BY outstanding_deficit DESC;`,
  },
  {
    id: 'scalar_subquery',
    category: 'Subqueries',
    title: 'Scalar Subquery: Warehouses With Above-Average Medical Stock',
    description: 'Calculates overall average medical inventory and finds superior depots',
    sql: `SELECT 
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
ORDER BY wi.available_quantity DESC;`,
  },
  {
    id: 'correlated_subquery',
    category: 'Subqueries',
    title: 'Correlated Subquery (NOT EXISTS): Vulnerable Camps With No Dispatches',
    description: 'Finds operational camps without any active or in-transit supply shipments',
    sql: `SELECT 
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
  );`,
  },
  {
    id: 'stored_function_haversine',
    category: 'Stored Functions',
    title: 'Stored Function: Geospatial Haversine Nearest Warehouse Finder',
    description: 'Executes fn_find_nearest_warehouse_with_stock(camp_id, category_id, required_qty)',
    sql: `SELECT * FROM fn_find_nearest_warehouse_with_stock(1, 1, 100);`,
  },
  {
    id: 'stored_function_urgency',
    category: 'Stored Functions',
    title: 'Stored Function: Camp Urgency Priority Score Algorithm',
    description: 'Executes fn_calculate_camp_urgency_score(camp_id) for multiple camps',
    sql: `SELECT 
    id, name, current_occupancy, capacity,
    fn_calculate_camp_urgency_score(id) AS urgency_priority_score
FROM relief_camps
ORDER BY urgency_priority_score DESC;`,
  },
  {
    id: 'analytics_view',
    category: 'Database Views',
    title: 'Complex View: Active Disaster War Room Rollup',
    description: 'Queries v_active_disaster_dashboard aggregating multiple tables and percentages',
    sql: `SELECT * FROM v_active_disaster_dashboard;`,
  },
  {
    id: 'vector_search_sql',
    category: 'Vector Similarity (pgvector)',
    title: 'pgvector Cosine Distance: Unresolved SOS Semantic Retrieval',
    description: 'Uses <=> operator to rank SOS distress records',
    sql: `SELECT 
    id, sender_name, sender_phone, victim_count, raw_message, detected_urgency
FROM emergency_sos_signals
WHERE status = 'UNRESOLVED'
LIMIT 5;`,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    presets: PRESET_QUERIES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { sql } = await req.json();

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query text is required' }, { status: 400 });
    }

    const trimmed = sql.trim();

    // Safety check for SQL Lab: allow SELECT, CALL, DO, EXPLAIN
    const allowed = /^(SELECT|CALL|DO|EXPLAIN|WITH)\b/i.test(trimmed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Security constraint: SQL Lab only executes read queries, stored procedure CALLs, and EXPLAIN statements.' },
        { status: 403 }
      );
    }

    const startTime = performance.now();
    const result = await query(trimmed);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    const fields = result.fields ? result.fields.map((f) => f.name) : [];

    return NextResponse.json({
      success: true,
      rowCount: result.rowCount,
      fields,
      rows: result.rows,
      executionTimeMs,
    });
  } catch (error: any) {
    console.error('SQL Lab Execution Error:', error);
    return NextResponse.json(
      {
        error: 'Query Execution Failed',
        details: error.message,
      },
      { status: 400 }
    );
  }
}
