const Memory = require('../models/Memory');
const aiService = require('./aiService');
const logger = require('../lib/logger');

const FALLBACK_DIMENSIONS = 64;

/**
 * Builds a deterministic fallback vector when embedding service is unavailable.
 */
function buildFallbackEmbedding(text) {
  const vector = new Array(FALLBACK_DIMENSIONS).fill(0);
  const chars = String(text || '').toLowerCase();

  for (let i = 0; i < chars.length; i += 1) {
    const code = chars.charCodeAt(i);
    vector[i % FALLBACK_DIMENSIONS] += (code % 97) / 97;
  }

  const norm = Math.sqrt(vector.reduce((acc, value) => acc + (value * value), 0)) || 1;
  return vector.map((value) => value / norm);
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }

  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    const va = Number(a[i] || 0);
    const vb = Number(b[i] || 0);
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns a semantic embedding for a given text.
 */
async function embedText(text) {
  try {
    const response = await aiService.embedText(String(text || ''));
    if (Array.isArray(response?.embedding) && response.embedding.length > 0) {
      return response.embedding;
    }
  } catch (error) {
    logger.warn({ error: error.message }, 'Embedding service unavailable, using fallback embedding');
  }

  return buildFallbackEmbedding(text);
}

/**
 * Persists a memory item for future chat personalization.
 */
async function storeMemory(userId, content, source = 'chat', relevanceScore = 0.5) {
  const normalized = String(content || '').trim();
  if (normalized.length < 8) {
    return null;
  }

  const embedding = await embedText(normalized);

  return Memory.create({
    user_id: userId,
    content: normalized,
    source,
    relevance_score: relevanceScore,
    embedding,
  });
}

/**
 * Retrieves top-k most relevant memories for a user query.
 */
async function retrieveRelevantMemory(userId, query, topK = 5) {
  const normalized = String(query || '').trim();
  if (!normalized) {
    return [];
  }

  const queryEmbedding = await embedText(normalized);

  const memories = await Memory.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .limit(250)
    .lean();

  const ranked = memories
    .map((memory) => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding || []),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(Number(topK || 5), 1));

  return ranked.filter((item) => item.similarity > 0.05);
}

/**
 * Extracts memory-worthy statements from a user message.
 */
function extractMemoryCandidates(message) {
  const text = String(message || '').trim();
  if (!text) {
    return [];
  }

  const patterns = [
    /i\s+want\s+to\s+save\s+for\s+(.+)/i,
    /my\s+goal\s+is\s+(.+)/i,
    /i\s+am\s+trying\s+to\s+(.+)/i,
    /please\s+remind\s+me\s+to\s+(.+)/i,
  ];

  const extracted = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      extracted.push(match[0]);
    }
  }

  return extracted;
}

module.exports = {
  storeMemory,
  retrieveRelevantMemory,
  extractMemoryCandidates,
  cosineSimilarity,
};
