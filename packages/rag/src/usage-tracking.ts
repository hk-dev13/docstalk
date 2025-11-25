import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseInstance;
}

/**
 * Check if user has reached usage limit
 */
export async function checkUsageLimit(
  clerkId: string,
  email: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const supabase = getSupabaseClient();

  // 1. Get or Create User (Direct upsert, no RPC)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert(
      { clerk_id: clerkId, email: email },
      { onConflict: 'clerk_id', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (userError) {
    console.error('User upsert error in checkUsageLimit:', userError);
    throw new Error(`User error: ${userError.message}`);
  }

  const userId = userData.id;

  // 2. Ensure usage record exists
  await supabase
    .from('user_usage')
    .upsert(
      { user_id: userId, query_count: 0 },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  // 3. Get usage
  const { data: usage, error: usageError } = await supabase
    .from('user_usage')
    .select('query_count')
    .eq('user_id', userId)
    .single();

  if (usageError) throw new Error(`Usage error: ${usageError.message}`);

  const LIMIT = 30;
  return {
    allowed: usage.query_count < LIMIT,
    count: usage.query_count,
    limit: LIMIT,
  };
}

/**
 * Increment user's query usage count
 */
export async function incrementUsage(clerkId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Get internal ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) return;

  // Direct update
  const { data: usage } = await supabase
    .from('user_usage')
    .select('query_count')
    .eq('user_id', user.id)
    .single();

  if (usage) {
    await supabase
      .from('user_usage')
      .update({ query_count: usage.query_count + 1 })
      .eq('user_id', user.id);
  }
}

/**
 * Get user's usage statistics
 */
export async function getUsageStats(
  clerkId: string
): Promise<{ count: number; limit: number }> {
  const supabase = getSupabaseClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) {
    return { count: 0, limit: 30 };
  }

  const { data: usage } = await supabase
    .from('user_usage')
    .select('query_count')
    .eq('user_id', user.id)
    .single();

  return {
    count: usage?.query_count || 0,
    limit: 30,
  };
}
