// ============================================================================
// ReliefChain: Emergency SOS Signals & Vector Ingestion API Route
// File: src/app/api/sos/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { generateEmbedding, matchDistressCall } from '@/lib/vector/semantic';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        sos.id,
        sos.sender_name,
        sos.sender_phone,
        sos.latitude,
        sos.longitude,
        sos.victim_count,
        sos.raw_message,
        sos.detected_urgency,
        sos.matched_category_id,
        rc.name AS matched_category_name,
        rc.category_group,
        sos.status,
        sos.created_at,
        z.name AS zone_name
      FROM emergency_sos_signals sos
      LEFT JOIN resource_categories rc ON sos.matched_category_id = rc.id
      LEFT JOIN disaster_zones z ON sos.zone_id = z.id
      ORDER BY 
        CASE sos.detected_urgency WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
        sos.created_at DESC;
    `);

    return NextResponse.json({ success: true, signals: res.rows });
  } catch (error: any) {
    console.error('SOS GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to load SOS signals', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zoneId, senderName, senderPhone, latitude, longitude, victimCount, message } = body;

    if (!senderName || !message) {
      return NextResponse.json(
        { error: 'senderName and message are required' },
        { status: 400 }
      );
    }

    // 1. Generate 384-dimensional dense semantic vector
    const embedding = generateEmbedding(message);
    const vectorString = `[${embedding.join(',')}]`;

    // 2. Classify distress message and match relief aid category
    const matches = matchDistressCall(message);
    const matchedCategory = matches.length > 0 ? matches[0] : null;

    // Determine detected urgency
    let detectedUrgency = 'MEDIUM';
    const lower = message.toLowerCase();
    if (
      lower.includes('trapped') ||
      lower.includes('dying') ||
      lower.includes('bleeding') ||
      lower.includes('collapse') ||
      lower.includes('critical') ||
      lower.includes('drowning') ||
      (victimCount && victimCount > 10)
    ) {
      detectedUrgency = 'CRITICAL';
    } else if (
      lower.includes('medicine') ||
      lower.includes('water') ||
      lower.includes('food') ||
      lower.includes('infant')
    ) {
      detectedUrgency = 'HIGH';
    }

    // 3. Store in PostgreSQL with pgvector vector(384) column
    const res = await query(
      `INSERT INTO emergency_sos_signals (
        zone_id, sender_name, sender_phone, latitude, longitude,
        victim_count, raw_message, embedding, detected_urgency,
        matched_category_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, $10, 'UNRESOLVED')
      RETURNING id, sender_name, sender_phone, latitude, longitude, victim_count, raw_message, detected_urgency, matched_category_id, status, created_at;`,
      [
        zoneId || 1,
        senderName,
        senderPhone || '+91-9999900000',
        latitude || 13.0827,
        longitude || 80.2707,
        victimCount || 1,
        message,
        vectorString,
        detectedUrgency,
        matchedCategory ? matchedCategory.categoryId : 1,
      ]
    );

    return NextResponse.json({
      success: true,
      signal: res.rows[0],
      semanticAnalysis: {
        detectedUrgency,
        topMatch: matchedCategory,
        allMatches: matches,
        vectorDimensions: embedding.length,
      },
    });
  } catch (error: any) {
    console.error('SOS Ingestion Error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest SOS signal', details: error.message },
      { status: 500 }
    );
  }
}
