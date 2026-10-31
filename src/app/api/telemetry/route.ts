// ============================================================================
// ReliefChain: MongoDB Telemetry & NoSQL Aggregation Pipeline API Route
// File: src/app/api/telemetry/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, getDroneReconAggregation } from '@/lib/db/mongo';

export async function GET() {
  try {
    const db = await getMongoDb();

    // 1. Execute Multi-stage Aggregation Pipeline
    const aggregatedRecon = await getDroneReconAggregation();

    // 2. Fetch Latest Real-Time Incident Stream
    const incidentCol = db.collection('incident_event_feed');
    const incidents = await incidentCol
      .find({})
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    // 3. Fetch Raw Drone Telemetry Records
    const droneCol = db.collection('drone_recon_telemetry');
    const latestDrones = await droneCol
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      aggregationPipeline: {
        stages: ['$match (24h window)', '$group (by zone_id)', '$project (averages, survivor count, blockages)', '$sort (hazard desc)'],
        data: aggregatedRecon,
      },
      incidents,
      latestDrones,
      paradigm: 'NoSQL Document Store (MongoDB)',
    });
  } catch (error: any) {
    console.error('MongoDB Telemetry Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MongoDB telemetry', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zoneId, source, category, severity, headline, rawPayload } = body;

    if (!headline || !category) {
      return NextResponse.json(
        { error: 'category and headline are required' },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    const incidentCol = db.collection('incident_event_feed');

    const newDoc = {
      event_code: `EVT-${Date.now().toString().slice(-6)}`,
      zone_id: zoneId || 1,
      source: source || 'FIELD_AGENT_REPORT',
      category,
      severity: severity || 'HIGH',
      headline,
      raw_payload: rawPayload || {},
      verified: true,
      created_at: new Date(),
    };

    const insertRes = await incidentCol.insertOne(newDoc);

    return NextResponse.json({
      success: true,
      insertedId: insertRes.insertedId,
      incident: newDoc,
    });
  } catch (error: any) {
    console.error('Incident Ingestion Error:', error);
    return NextResponse.json(
      { error: 'Failed to insert incident into MongoDB', details: error.message },
      { status: 500 }
    );
  }
}
