// ============================================================================
// ReliefChain: MongoDB Seed & Aggregation Pipeline Demonstration
// PES University - DBMS Experiential Learning - Level 3 Project
// File: scripts/seed-mongo.mjs
// ============================================================================

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reliefchain_logs';
const client = new MongoClient(uri);

async function seedMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully.');

    const db = client.db('reliefchain_logs');

    // 1. Drone Reconnaissance Telemetry Collection
    const droneTelemetryCol = db.collection('drone_recon_telemetry');
    await droneTelemetryCol.deleteMany({});

    const telemetryData = [
      {
        mission_id: 'DRONE-RECON-ALPHA-01',
        drone_unit: 'DR-01-AERO-99',
        zone_id: 1,
        zone_name: 'Coastal Sector Alpha',
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
        telemetry: {
          altitude_meters: 185.4,
          speed_kmh: 42.0,
          battery_pct: 78,
          signal_strength_dbm: -64
        },
        survey_results: {
          hazard_score: 8.8,
          submerged_structures_count: 42,
          road_blockages: [
            { street: 'East Coast Expressway KM 14', severity: 'SEVERE', passable: false, water_depth_cm: 120 },
            { street: 'Marina Loop Bridge', severity: 'MODERATE', passable: true, clearance_height_m: 2.1 }
          ],
          thermal_survivor_detections: [
            { count: 6, rooftop: true, coordinates: [13.0612, 80.2789], heat_signature_confidence: 0.94 },
            { count: 2, rooftop: false, coordinates: [13.0720, 80.2810], heat_signature_confidence: 0.88 }
          ]
        },
        payload_status: 'CAM_4K_THERMAL_ACTIVE'
      },
      {
        mission_id: 'DRONE-RECON-ALPHA-02',
        drone_unit: 'DR-02-AERO-10',
        zone_id: 1,
        zone_name: 'Coastal Sector Alpha',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        telemetry: {
          altitude_meters: 140.0,
          speed_kmh: 36.5,
          battery_pct: 62,
          signal_strength_dbm: -71
        },
        survey_results: {
          hazard_score: 9.4,
          submerged_structures_count: 67,
          road_blockages: [
            { street: 'Old Port Causeway', severity: 'CRITICAL', passable: false, water_depth_cm: 210 }
          ],
          thermal_survivor_detections: [
            { count: 12, rooftop: true, coordinates: [13.0911, 80.2941], heat_signature_confidence: 0.97 }
          ]
        },
        payload_status: 'CAM_4K_THERMAL_ACTIVE'
      },
      {
        mission_id: 'DRONE-RECON-BETA-01',
        drone_unit: 'DR-03-AERO-05',
        zone_id: 2,
        zone_name: 'Cauvery Basin Flood Zone',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        telemetry: {
          altitude_meters: 220.0,
          speed_kmh: 48.0,
          battery_pct: 85,
          signal_strength_dbm: -58
        },
        survey_results: {
          hazard_score: 6.5,
          submerged_structures_count: 18,
          road_blockages: [
            { street: 'River Bund South Road', severity: 'MODERATE', passable: false, water_depth_cm: 80 }
          ],
          thermal_survivor_detections: [
            { count: 4, rooftop: false, coordinates: [12.9811, 77.5890], heat_signature_confidence: 0.91 }
          ]
        },
        payload_status: 'CAM_MULTISPECTRAL'
      }
    ];

    await droneTelemetryCol.insertMany(telemetryData);
    await droneTelemetryCol.createIndex({ zone_id: 1, timestamp: -1 });
    await droneTelemetryCol.createIndex({ "survey_results.hazard_score": -1 });
    console.log(`Seeded ${telemetryData.length} drone telemetry documents in MongoDB.`);

    // 2. Incident Event Feed Collection (Real-Time Disaster Stream)
    const incidentCol = db.collection('incident_event_feed');
    await incidentCol.deleteMany({});

    const incidents = [
      {
        event_code: 'EVT-CYC-001',
        zone_id: 1,
        source: 'COASTAL_RADAR_SATELLITE',
        category: 'WEATHER_ALERT',
        severity: 'CRITICAL',
        headline: 'Storm surge elevated by 2.8m above astronomical tide level',
        raw_payload: { wind_gust_knots: 65, wave_height_m: 4.5, tide_anomaly_m: 2.8 },
        verified: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60)
      },
      {
        event_code: 'EVT-PWR-002',
        zone_id: 1,
        source: 'GRID_SCADA_MONITOR',
        category: 'INFRASTRUCTURE_FAILURE',
        severity: 'HIGH',
        headline: 'Substation 33kV Feeder Tripped - Marina Beach Hospital on Backup Diesel',
        raw_payload: { substation_id: 'SS-MB-33', fuel_reserve_hours: 14.5 },
        verified: true,
        created_at: new Date(Date.now() - 1000 * 60 * 40)
      },
      {
        event_code: 'EVT-ROAD-003',
        zone_id: 2,
        source: 'FIELD_OFFICER_RADIO',
        category: 'ACCESS_RESTRICTION',
        severity: 'MEDIUM',
        headline: 'Cauvery River Diversion Channel breached; Light trucks rerouted via Bypass 7',
        raw_payload: { officer_id: 'POL-302', detour_distance_km: 11.2 },
        verified: true,
        created_at: new Date(Date.now() - 1000 * 60 * 20)
      }
    ];

    await incidentCol.insertMany(incidents);
    await incidentCol.createIndex({ zone_id: 1, severity: 1 });
    console.log(`Seeded ${incidents.length} incident feed documents in MongoDB.`);

  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  } finally {
    await client.close();
  }
}

seedMongo();
