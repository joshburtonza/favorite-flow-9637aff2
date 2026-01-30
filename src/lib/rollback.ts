import { supabase } from '@/integrations/supabase/client';

export interface RollbackCheckpoint {
  id: string;
  user_id: string;
  session_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_ids: string[];
  previous_state: any;
  new_state: any;
  ai_conversation_id: string;
  ai_query: string;
  is_rolled_back: boolean;
  rolled_back_at: string;
  rolled_back_by: string;
  can_rollback: boolean;
  rollback_expires_at: string;
  created_at: string;
}

/**
 * Create a checkpoint before making changes
 */
export async function createCheckpoint(
  actionType: 'create' | 'update' | 'delete' | 'bulk_update',
  entityType: string,
  entityId: string | null,
  previousState: any,
  newState?: any,
  aiContext?: { conversationId?: string; query?: string }
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('rollback_checkpoints')
      .insert({
        user_id: user?.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        previous_state: previousState,
        new_state: newState,
        ai_conversation_id: aiContext?.conversationId,
        ai_query: aiContext?.query,
        session_id: getSessionId()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create checkpoint:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    return null;
  }
}

/**
 * Execute a rollback via Edge Function (server-side)
 */
export async function executeRollback(checkpointId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // Call edge function to perform rollback (handles DB operations safely)
    const { data, error } = await supabase.functions.invoke('flair-orchestrator', {
      body: {
        message: `rollback checkpoint ${checkpointId}`,
        internal_action: 'execute_rollback',
        checkpoint_id: checkpointId
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Rollback error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get recent rollback-able actions
 */
export async function getRecentCheckpoints(limit: number = 10): Promise<RollbackCheckpoint[]> {
  const { data, error } = await supabase
    .from('rollback_checkpoints')
    .select('*')
    .eq('is_rolled_back', false)
    .eq('can_rollback', true)
    .gt('rollback_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching checkpoints:', error);
    return [];
  }

  return (data || []) as unknown as RollbackCheckpoint[];
}

/**
 * Get checkpoints for a specific entity
 */
export async function getEntityHistory(
  entityType: string, 
  entityId: string
): Promise<RollbackCheckpoint[]> {
  const { data, error } = await supabase
    .from('rollback_checkpoints')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching entity history:', error);
    return [];
  }

  return (data || []) as unknown as RollbackCheckpoint[];
}

// Helper functions
function getSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('flair_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('flair_session_id', sessionId);
    }
    return sessionId;
  }
  return 'server-session';
}
