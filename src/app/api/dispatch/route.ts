// ============================================================================
// ReliefChain: ACID Dispatch & Algorithmic Routing API Route
// File: src/app/api/dispatch/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campId = searchParams.get('campId');
    const categoryId = searchParams.get('categoryId');
    const requiredQty = searchParams.get('requiredQty');

    // 1. Fetch Fleet Readiness View
    const fleetRes = await query(`SELECT * FROM v_fleet_readiness ORDER BY vehicle_id ASC;`);

    // 2. Fetch Active Shipments
    const shipmentsRes = await query(`
      SELECT 
        ds.id,
        ds.tracking_code,
        ds.request_id,
        ds.delivery_status,
        ds.departure_time,
        ds.estimated_arrival,
        ds.actual_arrival,
        ds.route_distance_km,
        w.name AS warehouse_name,
        c.name AS destination_camp,
        c.latitude AS camp_lat,
        c.longitude AS camp_lon,
        vf.vehicle_number,
        vf.vehicle_type,
        rc.name AS item_name,
        di.quantity_loaded
      FROM dispatch_shipments ds
      JOIN warehouses w ON ds.warehouse_id = w.id
      JOIN relief_requests rr ON ds.request_id = rr.id
      JOIN relief_camps c ON rr.camp_id = c.id
      JOIN vehicle_fleet vf ON ds.vehicle_id = vf.id
      JOIN dispatch_items di ON ds.id = di.shipment_id
      JOIN resource_categories rc ON di.category_id = rc.id
      ORDER BY ds.departure_time DESC;
    `);

    // 3. Nearest Warehouse Recommendation via Geospatial SQL Function
    let nearestWarehouses: any[] = [];
    if (campId && categoryId && requiredQty) {
      const nearestRes = await query(
        `SELECT * FROM fn_find_nearest_warehouse_with_stock($1, $2, $3);`,
        [parseInt(campId, 10), parseInt(categoryId, 10), parseInt(requiredQty, 10)]
      );
      nearestWarehouses = nearestRes.rows;
    }

    return NextResponse.json({
      success: true,
      fleet: fleetRes.rows,
      shipments: shipmentsRes.rows,
      nearestWarehouses,
    });
  } catch (error: any) {
    console.error('Dispatch API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dispatch data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, warehouseId, vehicleId, allocatedQty, dispatchedBy } = body;

    if (!requestId || !warehouseId || !vehicleId || !allocatedQty || allocatedQty <= 0) {
      return NextResponse.json(
        { error: 'Missing required dispatch parameters or allocatedQty <= 0' },
        { status: 400 }
      );
    }

    // Call Advanced ACID Transaction Stored Procedure in PostgreSQL
    const procRes = await query(
      `CALL sp_process_resource_dispatch($1, $2, $3, $4, $5, NULL);`,
      [requestId, warehouseId, vehicleId, allocatedQty, dispatchedBy || 1]
    );

    const trackingCode = procRes.rows[0]?.p_tracking_code || 'RC-DISPATCHED';

    return NextResponse.json({
      success: true,
      message: 'Resource dispatch processed atomically via ACID stored procedure',
      trackingCode,
    });
  } catch (error: any) {
    console.error('Process Dispatch Error:', error);
    return NextResponse.json(
      {
        error: 'Dispatch Transaction Failed',
        details: error.message,
      },
      { status: 400 }
    );
  }
}
