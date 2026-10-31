// ============================================================================
// ReliefChain: Relief Requests API Route
// File: src/app/api/requests/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');

    let sql = `
      SELECT 
        rr.id,
        rr.camp_id,
        c.name AS camp_name,
        z.name AS zone_name,
        rr.category_id,
        rc.code AS resource_code,
        rc.name AS resource_name,
        rc.category_group,
        rc.unit_of_measure,
        rr.requested_quantity,
        rr.approved_quantity,
        rr.urgency_level,
        rr.status,
        rr.notes,
        rr.created_at,
        rr.fulfilled_at,
        COALESCE(SUM(wi.available_quantity), 0) AS global_stock
      FROM relief_requests rr
      JOIN relief_camps c ON rr.camp_id = c.id
      JOIN disaster_zones z ON c.zone_id = z.id
      JOIN resource_categories rc ON rr.category_id = rc.id
      LEFT JOIN warehouse_inventory wi ON rc.id = wi.category_id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND rr.status = $${params.length}`;
    }
    if (urgency && urgency !== 'ALL') {
      params.push(urgency);
      sql += ` AND rr.urgency_level = $${params.length}`;
    }

    sql += `
      GROUP BY 
        rr.id, rr.camp_id, c.name, z.name, rr.category_id, rc.code, rc.name,
        rc.category_group, rc.unit_of_measure, rr.requested_quantity,
        rr.approved_quantity, rr.urgency_level, rr.status, rr.notes,
        rr.created_at, rr.fulfilled_at
      ORDER BY 
        CASE rr.urgency_level 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        rr.created_at DESC;
    `;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, requests: res.rows });
  } catch (error: any) {
    console.error('Relief Requests Error:', error);
    return NextResponse.json(
      { error: 'Failed to load relief requests', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campId, categoryId, requestedQuantity, urgencyLevel, notes } = body;

    // Database input validation
    if (!campId || !categoryId || !requestedQuantity || requestedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid camp, category, or requested quantity' },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO relief_requests (
        camp_id, category_id, requested_quantity, urgency_level, status, notes
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5)
      RETURNING *;`,
      [
        campId,
        categoryId,
        requestedQuantity,
        urgencyLevel || 'HIGH',
        notes || 'Relief request initiated from field camp',
      ]
    );

    return NextResponse.json({
      success: true,
      request: res.rows[0],
    });
  } catch (error: any) {
    console.error('Create Request Error:', error);
    return NextResponse.json(
      { error: 'Failed to create relief request', details: error.message },
      { status: 500 }
    );
  }
}
