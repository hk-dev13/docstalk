-- ============================================================================
-- MIGRATION 010: Add Cloud Provider Doc Sources
-- ============================================================================
-- Creates doc_source entries for major cloud providers and technologies
-- that are referenced in ecosystems but missing from doc_sources table

-- Add cloud provider doc sources
INSERT INTO doc_sources (id, name, description, base_url, is_active, ecosystem_id, keywords) VALUES
  ('azure', 'Azure', 'Microsoft Azure cloud platform documentation', 
   'https://learn.microsoft.com/en-us/azure/', true, 'cloud_infra', 
   ARRAY['azure', 'microsoft', 'cloud', 'vm', 'app service', 'cosmos db', 'blob storage']),
  ('aws', 'AWS', 'Amazon Web Services cloud platform documentation', 
   'https://docs.aws.amazon.com/', true, 'cloud_infra',
   ARRAY['aws', 'amazon', 's3', 'ec2', 'lambda', 'dynamodb', 'cloudfront', 'iam']),
  ('gcp', 'GCP', 'Google Cloud Platform documentation', 
   'https://cloud.google.com/docs', true, 'cloud_infra',
   ARRAY['gcp', 'google cloud', 'bigquery', 'cloud run', 'cloud functions', 'gke', 'firestore']),
  ('firebase', 'Firebase', 'Firebase platform documentation', 
   'https://firebase.google.com/docs', true, 'cloud_infra',
   ARRAY['firebase', 'firestore', 'realtime database', 'auth', 'fcm', 'hosting']),
  ('kubernetes', 'Kubernetes', 'Container orchestration documentation', 
   'https://kubernetes.io/docs/', true, 'cloud_infra',
   ARRAY['kubernetes', 'k8s', 'kubectl', 'pod', 'deployment', 'service', 'ingress', 'helm']),
  ('redis', 'Redis', 'In-memory data store documentation', 
   'https://redis.io/docs/', true, 'database',
   ARRAY['redis', 'cache', 'pub/sub', 'streams', 'cluster', 'sentinel']),
  ('mongodb', 'MongoDB', 'NoSQL document database documentation', 
   'https://www.mongodb.com/docs/', true, 'database',
   ARRAY['mongodb', 'mongo', 'nosql', 'document', 'aggregation', 'mongoose'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_url = EXCLUDED.base_url,
  ecosystem_id = EXCLUDED.ecosystem_id,
  keywords = EXCLUDED.keywords;

-- Verify
DO $$
DECLARE
    count_new INT;
BEGIN
    SELECT COUNT(*) INTO count_new FROM doc_sources 
    WHERE id IN ('azure', 'aws', 'gcp', 'firebase', 'kubernetes', 'redis', 'mongodb');
    
    RAISE NOTICE '✅ Migration 010 completed!';
    RAISE NOTICE 'Added/Updated % cloud/database doc sources', count_new;
END $$;
