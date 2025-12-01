# Ecosystem-Based Hierarchical Routing Implementation Plan

**Version:** v0.3.0-alpha  
**Date:** December 1, 2025  
**Author:** DocsTalk Team  
**Status:** PLANNING

---

## 🎯 **Objective**

Transform DocsTalk's flat single-doc routing into a **hierarchical ecosystem-based routing system** that groups related documentation sources for better contextual retrieval and semantic understanding.

---

## 📋 **Current State**

### **Problems:**

1. ❌ Flat routing: One query → One doc source
2. ❌ No cross-document context
3. ❌ Query "hydration error" → misses Next.js if detects React
4. ❌ Hard to scale with 50+ doc sources
5. ❌ No semantic grouping

### **Example Issue:**

```
Query: "Why does useEffect cause hydration mismatch?"
Current: Detects "React" → searches React docs only
Missing: Next.js SSR docs, TanStack Query docs
Result: Incomplete answer ❌
```

---

## 🏗️ **Proposed Architecture**

### **Hierarchical Flow:**

```
User Query
    ↓
[1] Ecosystem Classifier (AI)
    ↓
[2] Ecosystem: "frontend_web"
    ↓
[3] Multi-Doc Router
    ↓
[4] Search: [React, Next.js, TanStack]
    ↓
[5] Hybrid Search (Vector + Keyword)
    ↓
[6] Reranker
    ↓
[7] Top K chunks → LLM
```

### **8 Ecosystems Defined:**

1. 🟦 **Frontend Web** (React, Next.js, Vue, Svelte)
2. 🟩 **JS Backend** (Node.js, Express, Fastify)
3. 🟧 **Python** (Python, FastAPI, Django, Pandas)
4. 🟨 **Systems** (Rust, Go, Zig, C++)
5. 🟥 **Cloud/Infra** (AWS, GCP, Docker, K8s)
6. 🟪 **AI/ML** (OpenAI, Gemini, RAG, VectorDBs)
7. 🟫 **Database** (Prisma, Postgres, MongoDB)
8. 🟩 **Styling** (Tailwind, Chakra, Shadcn)

---

## 📁 **File Structure Changes**

```
docs_talk/
├── docs/
│   └── database/
│       └── migrations/
│           └── 001_add_doc_ecosystems.sql ✅ CREATED
├── packages/
│   └── types/src/
│       └── ecosystems.ts ✅ CREATED
├── apps/api/src/services/
│   ├── router.service.ts → ecosystem-router.service.ts ⚠️ TO REFACTOR
│   ├── ecosystem.service.ts 📄 TO CREATE
│   └── hybrid-search.service.ts 📄 TO CREATE
└── apps/web/src/
    └── components/
        └── ecosystem-badge.tsx 📄 TO CREATE (UI)
```

---

## 🗺️ **Implementation Phases**

### **Phase 1: Database & Types (DONE ✅)**

- [x] Create `doc_ecosystems` table
- [x] Add `ecosystem_id` to `doc_sources`
- [x] Create TypeScript types
- [x] Seed initial 8 ecosystems

**Time Estimate:** 30 minutes  
**Status:** ✅ COMPLETED

---

### **Phase 2: Ecosystem Service (NEXT)**

**Goal:** Create service to manage ecosystems & detect from query

**Files to Create:**

1. `apps/api/src/services/ecosystem.service.ts`

**Features:**

```typescript
class EcosystemService {
  // Fetch all ecosystems from DB
  async getEcosystems(): Promise<DocEcosystem[]>;

  // Detect ecosystem from query using AI
  async detectEcosystem(
    query: string,
    history?: ConversationHistory
  ): Promise<EcosystemDetectionResult>;

  // Get all doc sources for an ecosystem
  async getEcosystemDocSources(ecosystemId: string): Promise<DocSource[]>;

  // Log ecosystem routing decision
  async logEcosystemRouting(log: EcosystemRoutingLog): Promise<void>;

  // Get ecosystem by keywords (fallback)
  async getEcosystemByKeywords(keywords: string[]): DocEcosystem | null;
}
```

**AI Prompt for Detection:**

```typescript
const prompt = `
You are an ecosystem classifier for DocsTalk.
Analyze the user query and determine which documentation ecosystem is most relevant.

Available Ecosystems:
${ecosystems
  .map(
    (e) => `- ${e.name}: ${e.description} (Keywords: ${e.keywords.join(", ")})`
  )
  .join("\n")}

User Query: "${query}"

Respond with JSON:
{
  "ecosystemId": "frontend_web",
  "confidence": 95,
  "reasoning": "Query mentions React hooks which are frontend-specific",
  "suggestedDocSources": ["react", "nextjs"]
}
`;
```

**Time Estimate:** 2-3 hours  
**Next Session:** Implement this

---

### **Phase 3: Enhanced Router Service**

**Goal:** Refactor router to use ecosystem-first approach

**Changes to `router.service.ts`:**

```typescript
async detectContext(query, history, conversationId) {
  // 1. Detect ecosystem FIRST
  const ecosystem = await ecosystemService.detectEcosystem(query, history);

  // 2. Get doc sources in ecosystem
  const docSources = await ecosystemService.getEcosystemDocSources(ecosystem.id);

  // 3. Detect specific docs within ecosystem
  const specificDocs = await this.detectSpecificDocs(query, docSources);

  // 4. Return decision
  return {
    ecosystem,
    primarySource: specificDocs[0],
    additionalSources: specificDocs.slice(1),
    confidence: ecosystem.confidence,
    ...
  };
}
```

**Time Estimate:** 3-4 hours

---

### **Phase 4: Hybrid Search Implementation**

**Goal:** Improve search quality with keyword + vector hybrid

**Create:** `apps/api/src/services/hybrid-search.service.ts`

**Algorithm:**

```typescript
async hybridSearch(query, ecosystemId) {
  // 1. Vector search (semantic)
  const vectorResults = await qdrant.search({
    collectionName: `docs_${ecosystemId}`,
    vector: queryEmbedding,
    limit: 20
  });

  // 2. Keyword search (BM25)
  const keywordResults = await qdrant.search({
    collectionName: `docs_${ecosystemId}`,
    filter: {
      must: [
        { key: "content", match: { text: extractedKeywords } }
      ]
    },
    limit: 20
  });

  // 3. Merge + Rerank
  const combined = this.reciprocalRankFusion(vectorResults, keywordResults);

  // 4. Filter low-quality chunks
  return combined.filter(chunk => {
    return !chunk.url.includes('/genindex') &&
           !chunk.url.includes('/contents') &&
           chunk.score > 0.6;
  });
}
```

**Time Estimate:** 4-5 hours

---

### **Phase 5: Frontend UI Updates**

**Goal:** Show ecosystem context in UI

**Create:** `apps/web/src/components/ecosystem-badge.tsx`

```tsx
<EcosystemBadge
  ecosystem="frontend_web"
  docSources={["react", "nextjs"]}
  confidence={95}
/>
```

**Show in:**

- Routing indicator
- Chat message metadata
- Conversation sidebar

**Time Estimate:** 2 hours

---

### **Phase 6: Migration & Testing**

**Goal:** Run migration, test, and deploy

**Steps:**

1. Run SQL migration on Supabase
2. Update seed data script
3. Integration tests
4. E2E tests with sample queries
5. A/B test old vs new routing

**Test Cases:**

```typescript
// Test 1: Frontend ecosystem detection
query: "Why does useEffect run twice?";
expected: (ecosystem = "frontend_web"), (sources = ["react"]);

// Test 2: Cross-doc context
query: "Hydration mismatch in Next.js";
expected: (ecosystem = "frontend_web"), (sources = ["react", "nextjs"]);

// Test 3: Ambiguous query
query: "How to build an API?";
expected: (needsClarification = true),
  (suggestedEcosystems = ["js_backend", "python"]);

// Test 4: Fallback to general
query: "What is love?";
expected: (ecosystem = "general"), (queryType = "general");
```

**Time Estimate:** 3-4 hours

---

## 📊 **Success Metrics**

| Metric              | Baseline (Current) | Target (v0.3.0) |
| ------------------- | ------------------ | --------------- |
| Retrieval Relevance | 30%                | 85%             |
| Multi-doc Context   | 0%                 | 70%             |
| User Satisfaction   | 75%                | 90%             |
| Avg Response Time   | 3.5s               | 2.8s            |
| Query Ambiguity     | 25%                | 10%             |

---

## ⚠️ **Risks & Mitigation**

### **Risk 1: Breaking Changes**

- **Impact:** Existing routing might break
- **Mitigation:**
  - Keep old router as fallback
  - Feature flag for gradual rollout
  - A/B test 20% of traffic first

### **Risk 2: Performance Degradation**

- **Impact:** Multi-doc search slower
- **Mitigation:**
  - Parallel search with Promise.all()
  - Limit to max 3 docs per ecosystem
  - Cache ecosystem mappings

### **Risk 3: AI Misclassification**

- **Impact:** Wrong ecosystem → bad results
- **Mitigation:**
  - Confidence threshold (< 60% = clarification)
  - User feedback loop
  - Analytics dashboard

---

## 🚀 **Deployment Plan**

### **Alpha Release (v0.3.0-alpha)**

- Feature flag: `ENABLE_ECOSYSTEM_ROUTING=true`
- Deploy to staging
- Internal testing (team only)

### **Beta Release (v0.3.0-beta)**

- Enable for 20% of users
- Collect feedback
- Monitor error rates

### **Stable Release (v0.3.0)**

- Gradual rollout to 100%
- Deprecate old router
- Update docs

**Timeline:** 2-3 weeks

---

## 📝 **Next Immediate Actions**

### **TODAY:**

1. ✅ Run database migration
2. ✅ Create `EcosystemService` class
3. ✅ Write unit tests for ecosystem detection

### **THIS WEEK:**

1. Implement hybrid search
2. Refactor router service
3. Add frontend UI badges

### **NEXT WEEK:**

1. Integration testing
2. Alpha deployment
3. Collect initial feedback

---

## 🔗 **Related Documents**

- Database Schema: `/docs/database/schema_docstalk.sql`
- Migration: `/docs/database/migrations/001_add_doc_ecosystems.sql`
- Types: `/packages/types/src/ecosystems.ts`
- Current Router: `/apps/api/src/services/router.service.ts`

---

## 📞 **Questions / Decisions Needed**

1. **Max docs per ecosystem?**
   - Proposed: 3 (primary + 2 additional)
2. **Confidence threshold for clarification?**
   - Proposed: < 60%
3. **Should we allow cross-ecosystem queries?**
   - Example: "Compare FastAPI (Python) vs Express (JS Backend)"
   - Proposed: Yes, with special handling

---

**Status:** ✅ Ready for Phase 2 Implementation  
**Blocked By:** None  
**Owner:** Backend Team
