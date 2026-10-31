// ============================================================================
// ReliefChain: Semantic Vector Embedding & Cosine Similarity Engine
// File: src/lib/vector/semantic.ts
// ============================================================================

export interface SemanticMatchResult {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  confidenceScore: number;
  explanation: string;
}

// Key semantic clusters for disaster relief triage (384-dimensional dense projection)
const RELIEF_CLUSTERS = [
  {
    id: 1,
    code: 'WAT-01',
    name: 'Potable Drinking Water (20L Cans)',
    keywords: ['water', 'drinking', 'thirst', 'hydration', 'clean water', 'potable', 'flood', 'contaminated', 'bottled', 'saline'],
    weights: [0.95, 0.98, 0.92, 0.90, 0.99, 0.98, 0.82, 0.85, 0.88, 0.75]
  },
  {
    id: 2,
    code: 'MED-01',
    name: 'Emergency Trauma Surgical Kit',
    keywords: ['trauma', 'bleeding', 'fracture', 'wound', 'injury', 'doctor', 'blood', 'splint', 'bandage', 'surgical', 'amputation'],
    weights: [0.99, 0.96, 0.95, 0.92, 0.94, 0.90, 0.93, 0.89, 0.88, 0.97, 0.98]
  },
  {
    id: 3,
    code: 'MED-02',
    name: 'Insulin & Chronic Care Medicines Box',
    keywords: ['insulin', 'diabetic', 'diabetes', 'medicine', 'prescription', 'heart', 'asthma', 'inhaler', 'dialysis', 'elderly', 'blood pressure'],
    weights: [0.99, 0.98, 0.98, 0.90, 0.92, 0.88, 0.89, 0.94, 0.96, 0.85, 0.87]
  },
  {
    id: 4,
    code: 'FOD-01',
    name: 'High-Protein MRE Meal Ration (Case of 24)',
    keywords: ['food', 'starving', 'hunger', 'eat', 'meals', 'ration', 'groceries', 'infant food', 'baby formula', 'dry rations'],
    weights: [0.98, 0.95, 0.94, 0.90, 0.92, 0.95, 0.85, 0.96, 0.97, 0.91]
  },
  {
    id: 5,
    code: 'SHL-01',
    name: 'All-Weather 6-Person Relief Tents',
    keywords: ['tent', 'shelter', 'roof', 'rain', 'homeless', 'displaced', 'evacuee', 'weather', 'storms', 'tarpaulin', 'exposure'],
    weights: [0.99, 0.96, 0.92, 0.88, 0.95, 0.93, 0.90, 0.85, 0.84, 0.96, 0.89]
  },
  {
    id: 6,
    code: 'PWR-01',
    name: 'Solar Emergency Power Generator 5kW',
    keywords: ['power', 'generator', 'electricity', 'blackout', 'substation', 'battery', 'charge', 'oxygen', 'concentrator', 'lights', 'fuel'],
    weights: [0.95, 0.98, 0.94, 0.92, 0.89, 0.88, 0.85, 0.97, 0.98, 0.84, 0.86]
  },
  {
    id: 7,
    code: 'HYG-01',
    name: 'Water Purification & Sanitation Pack',
    keywords: ['purification', 'tablets', 'sanitation', 'chlorine', 'cholera', 'hygiene', 'soap', 'latrine', 'sewage', 'epidemic'],
    weights: [0.98, 0.96, 0.94, 0.95, 0.97, 0.90, 0.86, 0.89, 0.91, 0.94]
  },
  {
    id: 8,
    code: 'SHL-02',
    name: 'Thermal Wool Blankets (Pack of 10)',
    keywords: ['blanket', 'cold', 'hypothermia', 'shivering', 'warmth', 'winter', 'freezing', 'night', 'thermal', 'damp'],
    weights: [0.98, 0.94, 0.97, 0.92, 0.93, 0.90, 0.91, 0.85, 0.94, 0.87]
  }
];

/**
 * Generates a normalized 384-dimensional dense semantic vector for a text query
 * Compliant with pgvector vector(384) column type
 */
export function generateEmbedding(text: string): number[] {
  const DIMENSIONS = 384;
  const vector = new Array(DIMENSIONS).fill(0.0);
  const normalized = text.toLowerCase();

  // 1. Cluster activation projection (dimensions 0 - 63)
  RELIEF_CLUSTERS.forEach((cluster, cIdx) => {
    let score = 0;
    cluster.keywords.forEach((kw, kwIdx) => {
      if (normalized.includes(kw)) {
        score += cluster.weights[kwIdx];
      }
    });

    const startDim = cIdx * 8;
    for (let i = 0; i < 8; i++) {
      vector[startDim + i] = score * Math.cos((i + 1) * 0.4);
    }
  });

  // 2. Hash-based semantic distributed representation (dimensions 64 - 383)
  const words = normalized.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  words.forEach((w) => {
    let h1 = 5381;
    let h2 = 2166136261;
    for (let i = 0; i < w.length; i++) {
      const code = w.charCodeAt(i);
      h1 = ((h1 << 5) + h1) ^ code;
      h2 = Math.imul(h2 ^ code, 16777619);
    }
    const idx1 = 64 + Math.abs(h1 % (DIMENSIONS - 64));
    const idx2 = 64 + Math.abs(h2 % (DIMENSIONS - 64));
    vector[idx1] += 0.85;
    vector[idx2] += 0.65;
  });

  // 3. L2 Unit Normalization: ||v|| = 1.0 (Essential for Cosine Distance)
  let norm = 0;
  for (let i = 0; i < DIMENSIONS; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  } else {
    // Fallback baseline vector
    vector[0] = 1.0;
  }

  return vector;
}

/**
 * Computes Cosine Similarity between two normalized vectors: (A . B)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Classifies unstructured distress text into matching relief categories with confidence
 */
export function matchDistressCall(text: string): SemanticMatchResult[] {
  const queryVec = generateEmbedding(text);
  const results: SemanticMatchResult[] = [];

  RELIEF_CLUSTERS.forEach((cluster) => {
    // Generate cluster canonical embedding
    const clusterCanonicalText = `${cluster.name} ${cluster.keywords.join(' ')}`;
    const clusterVec = generateEmbedding(clusterCanonicalText);
    const score = cosineSimilarity(queryVec, clusterVec);

    // Filter matches with meaningful similarity
    if (score > 0.15) {
      results.push({
        categoryId: cluster.id,
        categoryCode: cluster.code,
        categoryName: cluster.name,
        confidenceScore: Number((score * 100).toFixed(1)),
        explanation: `Matched ${cluster.keywords.filter(k => text.toLowerCase().includes(k)).join(', ') || 'semantic context'}`
      });
    }
  });

  results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return results;
}
