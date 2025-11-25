import { v1beta } from "@google-cloud/discoveryengine";

const projectId = "docstalk-479013";
const location = "global";
const collectionId = "default_collection";
const dataStoreId = "nextjs-docs_1763841817834"; // isi sesuai datastore kamu

async function main() {
  const client = new v1beta.ServingConfigServiceClient();

  const parent = `projects/${projectId}/locations/${location}/collections/${collectionId}/dataStores/${dataStoreId}`;

  console.log("📌 Parent:", parent);

  const [configs] = await client.listServingConfigs({ parent });

  console.log("📌 Serving Configs:");
  for (const cfg of configs) {
    console.log("➡️", cfg.name);
  }
}

main().catch(console.error);
