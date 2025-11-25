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
 * Create a new conversation
 */
export async function createConversation(
  clerkId: string,
  docSource: string,
  title?: string,
  userEmail?: string
): Promise<string> {
  const supabase = getSupabaseClient();

  let userId: string;

  if (userEmail) {
    // Create or get user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(
        { clerk_id: clerkId, email: userEmail },
        { onConflict: 'clerk_id', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (userError) {
      console.error('User upsert error:', userError);
      throw new Error(`User creation failed: ${userError.message}`);
    }

    userId = userData.id;

    // Ensure user_usage record exists
    await supabase
      .from('user_usage')
      .upsert(
        { user_id: userId, query_count: 0 },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
  } else {
    // Fallback: try to get existing user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      throw new Error('User not found and no email provided to create user');
    }

    userId = user.id;
  }

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      doc_source: docSource,
      title: title || 'New Conversation',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Conversation error: ${error.message}`);
  return conversation.id;
}

/**
 * Save message to conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  references?: Array<{ title: string; url: string; snippet: string }>,
  tokensUsed?: number
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role,
    content,
    references: references || null,
    tokens_used: tokensUsed || 0,
  });
}

/**
 * Get user conversations
 */
export async function getUserConversations(
  clerkId: string,
  limit: number = 20
): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) return [];

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, doc_source, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return conversations || [];
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  conversationId: string
): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, references, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return messages || [];
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);
}
