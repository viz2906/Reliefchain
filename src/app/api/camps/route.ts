// ============================================================================
// ReliefChain: Relief Camps & Deficit Matrix API Route
// File: src/app/api/camps/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    // Fetch camps and compute urgency priority score using stored SQL function
    const campsRes = await query(`
      SELECT 
        c.id,
        c.name,
        c.camp_type,
        c.contact_person,
        c.contact_phone,
        c.latitude,
        c.longitude,
        c.capacity,
        c.current_occupancy,
        c.status,
        c.created_at,
        z.id AS zone_id,
        z.name AS zone_name,
        z.severity_level,
        ROUND((c.current_occupancy::DECIMAL / NULLIF(c.capacity, 0) * 100), 1) AS occupancy_pct,
        fn_calculate_camp_urgency_score(c.id) AS urgency_score
      FROM relief_camps c
      JOIN disaster_zones z ON c.zone_id = z.id
      ORDER BY urgency_score DESC;
    `);

    // Fetch camp deficit matrix from SQL View
    const deficitRes = await query(`
      SELECT * FROM v_camp_deficit_matrix
      WHERE total_requested > 0
      ORDER BY unfulfilled_deficit DESC;
    `);

    return NextResponse.json({
      success: true,
      camps: campsRes.rows,
      deficits: deficitRes.rows,
    });
  } catch (error: any) {
    console.error('Camps API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve camps data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      zoneId,
      name,
      campType,
      contactPerson,
      contactPhone,
      latitude,
      longitude,
      capacity,
      currentOccupancy,
    } = body;

    // Database input validation
    if (!zoneId || !name || !contactPerson || !contactPhone || !capacity) {
      return NextResponse.json(
        { error: 'Missing required camp parameters' },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO relief_camps (
        zone_id, name, camp_type, contact_person, contact_phone,
        latitude, longitude, capacity, current_occupancy, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPERATIONAL')
      RETURNING *;`,
      [
        zoneId,
        name,
        campType || 'TEMPORARY_SHELTER',
        contactPerson,
        contactPhone,
        latitude || 13.0827,
        longitude || 80.2707,
        capacity,
        currentOccupancy || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      camp: res.rows[0],
    });
  } catch (error: any) {
    console.error('Create Camp Error:', error);
    return NextResponse.json(
      { error: 'Failed to create relief camp', details: error.message },
      { status: 500 }
    );
  }
}
