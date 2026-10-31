// ============================================================================
// ReliefChain: Complete Shipment Delivery API Route (Demonstrates Trigger Execution)
// File: src/app/api/dispatch/[id]/deliver/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipmentId = parseInt(id, 10);

    if (isNaN(shipmentId)) {
      return NextResponse.json({ error: 'Invalid shipment ID' }, { status: 400 });
    }

    // Updating delivery_status to 'DELIVERED' fires BEFORE UPDATE trigger `trg_shipment_delivery`
    // which automatically:
    // 1. Sets actual_arrival = CURRENT_TIMESTAMP
    // 2. Updates vehicle_fleet status to 'AVAILABLE'
    // 3. Fulfills the associated relief_request (status = 'FULFILLED')
    const res = await query(
      `UPDATE dispatch_shipments
       SET delivery_status = 'DELIVERED'
       WHERE id = $1
       RETURNING *;`,
      [shipmentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment marked DELIVERED. Database trigger trg_shipment_delivery executed successfully.',
      shipment: res.rows[0],
    });
  } catch (error: any) {
    console.error('Delivery Error:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery status', details: error.message },
      { status: 500 }
    );
  }
}
