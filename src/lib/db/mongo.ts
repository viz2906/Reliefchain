// ============================================================================
// ReliefChain: MongoDB Client & NoSQL Aggregation Helpers
// File: src/lib/db/mongo.ts
// ============================================================================

import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reliefchain_logs';

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global.__mongoClientPromise) {
    client = new MongoClient(uri);
    global.__mongoClientPromise = client.connect();
  }
  clientPromise = global.__mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getMongoDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db('reliefchain_logs');
}

/**
 * Runs an advanced multi-stage MongoDB Aggregation Pipeline
 * Aggregates drone reconnaissance data by disaster sector
 */
export async function getDroneReconAggregation() {
  const db = await getMongoDb();
  const collection = db.collection('drone_recon_telemetry');

  const pipeline = [
    // Stage 1: Match telemetry from the last 24 hours
    {
      $match: {
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    },
    // Stage 2: Group by disaster zone and calculate key statistics
    {
      $group: {
        _id: '$zone_id',
        zone_name: { $first: '$zone_name' },
        total_missions: { $sum: 1 },
        avg_hazard_score: { $avg: '$survey_results.hazard_score' },
        max_hazard_score: { $max: '$survey_results.hazard_score' },
        total_submerged_structures: { $sum: '$survey_results.submerged_structures_count' },
        all_blockages: { $push: '$survey_results.road_blockages' },
        survivor_detections: { $push: '$survey_results.thermal_survivor_detections' }
      }
    },
    // Stage 3: Project clean, formatted analytics
    {
      $project: {
        _id: 0,
        zone_id: '$_id',
        zone_name: 1,
        total_missions: 1,
        avg_hazard_score: { $round: ['$avg_hazard_score', 2] },
        max_hazard_score: 1,
        total_submerged_structures: 1,
        blockage_count: { $size: { $reduce: { input: '$all_blockages', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } },
        total_thermal_survivors: {
          $sum: {
            $map: {
              input: { $reduce: { input: '$survivor_detections', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } },
              as: 'det',
              in: '$$det.count'
            }
          }
        }
      }
    },
    // Stage 4: Order by hazard severity descending
    {
      $sort: { avg_hazard_score: -1 }
    }
  ];

  return await collection.aggregate(pipeline).toArray();
}

export default clientPromise;
