# Ecosystem Detection Algorithm v2.0

**Enhanced with:** Embeddings, Aliases, Confidence Tracking  
**Date:** December 1, 2025

---

## 🎯 **Detection Flow**

### **Multi-Stage Detection:**

```
User Query: "Why does useEffect run twice in Next.js?"
    ↓
[Stage 1] Alias Matching (Fast Path)
    - Check: "useEffect" in aliases?
    - Match: "react hooks" → frontend_web ✅
    - Confidence: 95%
    ↓
[Stage 2] Keyword Groups (Semantic Clustering)
    - Check keyword_groups.hooks
    - Match: ["useEffect", "useMemo", "custom hook"]
    - Boost confidence: +10% → 105% (capped at 100%)
    ↓
[Stage 3] Hybrid Search (If confidence < 80%)
    - Vector: Query embedding vs ecosystem description_embedding
    - Keyword: Query tokens in keywords array
    - Combine: 0.7 * vector_score + 0.3 * keyword_score
    ↓
[Stage 4] AI Classification (If still ambiguous)
    - LLM with ecosystem context
    - Final decision with reasoning
    ↓
[Result] ecosystem="frontend_web", sources=["react", "nextjs"]
```

---

## 📊 **Detection Stages Explained**

### **Stage 1: Alias Matching (Instant)**

**Purpose:** Catch common natural language phrases  
**Speed:** O(1) lookup  
**Confidence Boost:** +30%

```typescript
// Example aliases for frontend_web:
aliases: [
  "react hooks",
  "server components",
  "next router",
  "app router",
  "hydration mismatch",
  "ssr",
];

// Query: "How to fix hydration mismatch?"
// Match: "hydration mismatch" in aliases
// Result: frontend_web with 95% confidence ✅
```

**Why This Helps:**

- ✅ No AI needed for common phrases
- ✅ Instant response (< 10ms)
- ✅ Works for 60% of queries

---

### **Stage 2: Keyword Groups (Semantic Clustering)**

**Purpose:** Handle related concepts within ecosystem  
**Speed:** O(log n) search  
**Confidence Boost:** +15%

```typescript
// keyword_groups for frontend_web:
keyword_groups: {
  "state_management": ["useState", "useReducer", "redux", "zustand"],
  "routing": ["router", "navigation", "route", "link"],
  "rendering": ["ssr", "ssg", "hydration", "server component"],
  "hooks": ["useEffect", "useMemo", "useCallback"]
}

// Query: "How to optimize useCallback?"
// Match: "useCallback" in keyword_groups.hooks
// Also check: "optimize" suggests state_management
// Result: frontend_web, multiple related concepts ✅
```

**Why This Helps:**

- ✅ Captures semantic relationships
- ✅ Reduces false positives
- ✅ Better than flat keyword list

---

### **Stage 3: Hybrid Search (Vector + Keyword)**

**Purpose:** Semantic matching with fallback  
**Speed:** ~100ms (vector search)  
**Confidence:** 60-85%

```typescript
async hybridDetection(query: string, ecosystems: DocEcosystem[]) {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. For each ecosystem, calculate scores
  const scores = ecosystems.map(eco => {
    // Vector similarity (cosine)
    const vectorScore = cosineSimilarity(
      queryEmbedding,
      eco.description_embedding
    );

    // Keyword overlap
    const queryTokens = tokenize(query);
    const matchedKeywords = intersection(queryTokens, eco.keywords);
    const keywordScore = matchedKeywords.length / eco.keywords.length;

    // Weighted average
    const finalScore = 0.7 * vectorScore + 0.3 * keywordScore;

    return { ecosystem: eco, score: finalScore * 100 };
  });

  // 3. Return top ecosystem
  return scores.sort((a, b) => b.score - a.score)[0];
}
```

**Example:**

```
Query: "Building a RAG application with embeddings"

Vector Scores:
- ai_ml:        0.92 (description mentions "RAG, embeddings")
- python:       0.45 (generic programming)
- frontend_web: 0.12 (not relevant)

Keyword Scores:
- ai_ml:        0.80 (matches "rag", "embedding")
- python:       0.30 (might use Python)
- frontend_web: 0.05 (no match)

Final Scores:
- ai_ml:        (0.7*0.92 + 0.3*0.80) * 100 = 88.4% ✅
- python:       (0.7*0.45 + 0.3*0.30) * 100 = 40.5%
- frontend_web: (0.7*0.12 + 0.3*0.05) * 100 = 9.9%

Result: ai_ml ecosystem with 88% confidence
```

---

### **Stage 4: AI Classification (Last Resort)**

**Purpose:** Handle complex/ambiguous queries  
**Speed:** ~500ms (LLM call)  
**Confidence:** 70-95%

```typescript
const prompt = `
You are an ecosystem classifier for DocsTalk.

Available Ecosystems:
${ecosystems
  .map(
    (e) => `
  - ${e.id}: ${e.description}
    Keywords: ${e.keywords.join(", ")}
    Common phrases: ${e.aliases?.join(", ")}
`
  )
  .join("\n")}

User Query: "${query}"

Analyze and respond with JSON:
{
  "ecosystem_id": "ai_ml",
  "confidence": 92,
  "reasoning": "Query mentions RAG and embeddings which are AI/ML concepts",
  "suggested_docs": ["openai", "qdrant", "langchain"]
}
`;
```

**Used When:**

- ❌ No alias matches
- ❌ No keyword group matches
- ❌ Hybrid search < 60% confidence
- ❌ Multiple ecosystems have similar scores

---

## 🎚️ **Confidence Threshold Logic**

### **Confidence Levels:**

```typescript
if (confidence >= 90) {
  // Auto-select, very confident
  return { ecosystem, sources: getPrimarySources(ecosystem) };
} else if (confidence >= 70) {
  // Auto-select, confident
  return { ecosystem, sources: getAllSources(ecosystem) };
} else if (confidence >= 50) {
  // Show clarification with suggestion
  return {
    needsClarification: true,
    suggestedEcosystem: ecosystem,
    alternatives: getAlternatives(confidence),
  };
} else {
  // Show multi-option clarification
  return {
    needsClarification: true,
    suggestedEcosystems: getTopN(3, scores),
  };
}
```

### **Custom Thresholds Per Ecosystem:**

```sql
-- From database:
detection_confidence_threshold FLOAT DEFAULT 0.6

-- Examples:
frontend_web: 0.65  -- Stricter (many overlapping concepts)
js_backend:   0.60  -- Moderate
systems:      0.70  -- Strict (very specific domain)
ai_ml:        0.70  -- Strict (specialized)
styling:      0.60  -- Moderate
```

---

## 📈 **Adaptive Learning**

### **Confidence Tracking:**

```sql
-- After each detection
UPDATE doc_ecosystems
SET
  total_detections = total_detections + 1,
  avg_detection_confidence = (
    (avg_detection_confidence * total_detections) + current_confidence
  ) / (total_detections + 1)
WHERE id = 'frontend_web';
```

### **Dashboard Metrics:**

```typescript
// Analytics view
{
  "frontend_web": {
    "total_detections": 1247,
    "avg_confidence": 82.3,
    "accuracy": 94.2%, // Based on user feedback
    "most_common_aliases": ["react hooks", "next router"],
    "confusion_with": ["js_backend"] // Often confused
  }
}
```

---

## 🔍 **Real-World Examples**

### **Example 1: Direct Alias Match**

```
Query: "How do react hooks work?"
Stage 1: ✅ "react hooks" in aliases → 95%
Result: frontend_web (instant)
```

### **Example 2: Keyword Group Match**

```
Query: "Optimizing useState performance"
Stage 1: ❌ No alias match
Stage 2: ✅ "useState" in keyword_groups.state_management → 85%
Result: frontend_web
```

### **Example 3: Hybrid Search**

```
Query: "Building a real-time API with Node"
Stage 1: ❌ No alias
Stage 2: ❌ No keyword group
Stage 3: ✅ Vector: "API" + "Node" → js_backend (78%)
Result: js_backend
```

### **Example 4: AI Classification**

```
Query: "What's the difference between REST and GraphQL for microservices?"
Stage 1-3: ❌ Ambiguous (could be js_backend OR cloud_infra)
Stage 4: ✅ AI decides: js_backend (72%)
Reason: "API design is primarily backend concern"
Result: js_backend with clarification option
```

---

## ⚡ **Performance Targets**

| Stage            | Avg Time | Success Rate |
| ---------------- | -------- | ------------ |
| Stage 1 (Alias)  | < 10ms   | 60%          |
| Stage 2 (Groups) | < 20ms   | 25%          |
| Stage 3 (Hybrid) | < 100ms  | 10%          |
| Stage 4 (AI)     | < 500ms  | 5%           |

**Overall:** 90% of queries resolved in < 50ms ✅

---

## 🛠️ **Implementation Checklist**

- [x] Database schema with new fields
- [x] TypeScript types
- [ ] EcosystemService with staged detection
- [ ] Embedding generation for descriptions
- [ ] Hybrid search algorithm
- [ ] AI classification fallback
- [ ] Confidence tracking
- [ ] Analytics dashboard
- [ ] A/B testing framework

---

**Next:** Implement EcosystemService with this algorithm! 🚀
