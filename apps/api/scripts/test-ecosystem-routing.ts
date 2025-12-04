import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { EcosystemService } from "../src/services/ecosystem.service.js";

async function main() {
  console.log("🧪 Testing Ecosystem Routing...");

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if table exists
  const { error: tableError } = await supabase.from("doc_ecosystems").select("count").limit(1);
  if (tableError) {
    console.error("❌ Error accessing doc_ecosystems table. Did you run the migration?");
    console.error(tableError.message);
    process.exit(1);
  }

  const ecosystemService = new EcosystemService(supabase);
  
  // Pre-fetch ecosystems to warm cache
  await ecosystemService.getEcosystems();

  const testCases = [
    {
      query: "How do I use React hooks?",
      expected: "frontend_web",
      type: "Alias/Keyword",
    },
    {
      query: "Explain Rust ownership model",
      expected: "systems",
      type: "Keyword",
    },
    {
      query: "Deploying docker containers to AWS",
      expected: "cloud_infra",
      type: "Keyword Group",
    },
    {
      query: "Machine learning with python",
      expected: "python", // or ai_ml, depending on weights
      type: "Keyword",
    },
    {
      query: "Styling components with utility classes",
      expected: "styling",
      type: "Hybrid/AI",
    },
  ];

  let passed = 0;

  for (const test of testCases) {
    console.log(`\nTesting: "${test.query}"`);
    const start = Date.now();
    const result = await ecosystemService.detectEcosystem(test.query);
    const duration = Date.now() - start;

    const isMatch = result.ecosystem.id === test.expected;
    const status = isMatch ? "✅ PASS" : "❌ FAIL";
    
    if (isMatch) passed++;

    console.log(`  ${status} Result: ${result.ecosystem.id} (${result.confidence}%)`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Reasoning: ${result.reasoning}`);
    console.log(`  Time: ${duration}ms`);
    
    if (result.suggestedDocSources.length > 0) {
      console.log(`  Suggested Sources: ${result.suggestedDocSources.join(", ")}`);
    } else {
      console.log(`  ⚠️ No suggested sources mapped`);
    }
  }

  console.log(`\nPassed: ${passed}/${testCases.length}`);
  
  if (passed === testCases.length) {
    console.log("✅ All tests passed!");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed.");
    process.exit(1);
  }
}

main().catch(console.error);
