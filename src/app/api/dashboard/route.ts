// ============================================================================
// ReliefChain: Disaster War Room Dashboard API Route
// File: src/app/api/dashboard/route.ts
// ============================================================================

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    // 1. Fetch Active Disaster Dashboard View
    const dashboardView = await query(`
      SELECT * FROM v_active_disaster_dashboard ORDER BY severity_level ASC;
    `);

    // 2. High-level metric aggregates
    const metricsRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM disaster_zones WHERE status = 'ACTIVE') AS active_zones,
        (SELECT COUNT(*) FROM relief_camps WHERE status = 'OPERATIONAL') AS operational_camps,
        (SELECT COALESCE(SUM(current_occupancy), 0) FROM relief_camps) AS total_displaced_sheltered,
        (SELECT COALESCE(SUM(available_quantity), 0) FROM warehouse_inventory) AS global_stock_units,
        (SELECT COUNT(*) FROM vehicle_fleet WHERE status = 'AVAILABLE') AS available_vehicles,
        (SELECT COUNT(*) FROM dispatch_shipments WHERE delivery_status IN ('DISPATCHED', 'IN_TRANSIT')) AS active_missions,
        (SELECT COUNT(*) FROM emergency_sos_signals WHERE status = 'UNRESOLVED') AS unresolved_sos,
        (SELECT COUNT(*) FROM relief_requests WHERE status = 'PENDING') AS pending_requests;
    `);

    // 3. Recent Audit Activity (Audit Trail)
    const auditRes = await query(`
      SELECT 
        id, entity_name, entity_id, action_type, new_state, timestamp 
      FROM allocation_audit_log 
      ORDER BY timestamp DESC 
      LIMIT 8;
    `);

    // 4. Critical Pending Relief Requests
    const criticalRes = await query(`
      SELECT 
        rr.id, rr.requested_quantity, rr.urgency_level, rr.status, rr.created_at,
        c.name AS camp_name, rc.name AS resource_name, z.name AS zone_name
      FROM relief_requests rr
      JOIN relief_camps c ON rr.camp_id = c.id
      JOIN disaster_zones z ON c.zone_id = z.id
      JOIN resource_categories rc ON rr.category_id = rc.id
      WHERE rr.status = 'PENDING'
      ORDER BY 
        CASE rr.urgency_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
        rr.created_at ASC
      LIMIT 5;
    `);

    return NextResponse.json({
      success: true,
      metrics: metricsRes.rows[0],
      disasterZones: dashboardView.rows,
      recentAudit: auditRes.rows,
      criticalRequests: criticalRes.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard metrics', details: error.message },
      { status: 500 }
    );
  }
}
