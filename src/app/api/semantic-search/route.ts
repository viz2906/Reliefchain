// ============================================================================
// ReliefChain: pgvector Cosine Similarity Semantic Search API Route
// File: src/app/api/semantic-search/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { generateEmbedding, matchDistressCall } from '@/lib/vector/semantic';

export async function POST(req: NextRequest) {
  try {
    const { queryText, limit = 5 } = await req.json();

    if (!queryText || queryText.trim().length === 0) {
      return NextResponse.json(
        { error: 'queryText parameter is required' },
        { status: 400 }
      );
    }

    // 1. Generate 384-dimensional dense semantic vector for query
    const queryVector = generateEmbedding(queryText);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Query PostgreSQL pgvector with Cosine Distance operator (<=>)
    const vectorSearchRes = await query(
      `SELECT 
        sos.id,
        sos.sender_name,
        sos.sender_phone,
        sos.latitude,
        sos.longitude,
        sos.victim_count,
        sos.raw_message,
        sos.detected_urgency,
        sos.status,
        sos.created_at,
        rc.name AS matched_category_name,
        ROUND((1 - (sos.embedding <=> $1::vector))::numeric, 4) AS cosine_similarity
      FROM emergency_sos_signals sos
      LEFT JOIN resource_categories rc ON sos.matched_category_id = rc.id
      WHERE sos.embedding IS NOT NULL
      ORDER BY sos.embedding <=> $1::vector ASC
      LIMIT $2;`,
      [vectorString, limit]
    );

    // 3. Category Catalog Semantic Matching
    const catalogMatches = matchDistressCall(queryText);

    return NextResponse.json({
      success: true,
      queryText,
      vectorEngine: {
        dimensions: 384,
        similarityMetric: 'Cosine Similarity (1 - cosine_distance)',
        indexType: 'HNSW (Hierarchical Navigable Small World)',
        operator: '<=> (pgvector vector_cosine_ops)',
      },
      matchedSignals: vectorSearchRes.rows,
      recommendedReliefKits: catalogMatches,
    });
  } catch (error: any) {
    console.error('Semantic Search Error:', error);
    return NextResponse.json(
      { error: 'Vector search failed', details: error.message },
      { status: 500 }
    );
  }
}
