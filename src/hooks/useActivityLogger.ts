import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ActionType = 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'login' | 'logout';
export type EntityType = 'shipment' | 'supplier' | 'client' | 'payment' | 'document' | 'bank_account' | 'user' | 'role' | 'permission' | 'system';

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    actionType,
    entityType,
    entityId,
    entityName,
    description,
    oldValues,
    newValues,
    metadata = {},
  }: LogActivityParams) => {
    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    try {
      const { error } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        old_values: oldValues || null,
        new_values: newValues || null,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, [user]);

  // Convenience methods for common actions
  const logCreate = useCallback((entityType: EntityType, entityId: string, entityName: string, newValues?: Record<string, any>) => {
    return logActivity({
      actionType: 'create',
      entityType,
      entityId,
      entityName,
      description: `Created ${entityType}: ${entityName}`,
      newValues,
    });
  }, [logActivity]);

  const logUpdate = useCallback((entityType: EntityType, entityId: string, entityName: string, oldValues?: Record<string, any>, newValues?: Record<string, any>) => {
    const changedFields = newValues ? Object.keys(newValues).filter(key => 
      JSON.stringify(oldValues?.[key]) !== JSON.stringify(newValues[key])
    ) : [];
    
    return logActivity({
      actionType: 'update',
      entityType,
      entityId,
      entityName,
      description: `Updated ${entityType}: ${entityName}${changedFields.length ? ` (${changedFields.join(', ')})` : ''}`,
      oldValues,
      newValues,
      metadata: { changedFields },
    });
  }, [logActivity]);

  const logDelete = useCallback((entityType: EntityType, entityId: string, entityName: string, oldValues?: Record<string, any>) => {
    return logActivity({
      actionType: 'delete',
      entityType,
      entityId,
      entityName,
      description: `Deleted ${entityType}: ${entityName}`,
      oldValues,
    });
  }, [logActivity]);

  const logView = useCallback((entityType: EntityType, entityId: string, entityName: string) => {
    return logActivity({
      actionType: 'view',
      entityType,
      entityId,
      entityName,
      description: `Viewed ${entityType}: ${entityName}`,
    });
  }, [logActivity]);

  const logExport = useCallback((entityType: EntityType, entityName: string, metadata?: Record<string, any>) => {
    return logActivity({
      actionType: 'export',
      entityType,
      entityName,
      description: `Exported ${entityType}: ${entityName}`,
      metadata,
    });
  }, [logActivity]);

  const logImport = useCallback((entityType: EntityType, count: number, metadata?: Record<string, any>) => {
    return logActivity({
      actionType: 'import',
      entityType,
      entityName: `${count} records`,
      description: `Imported ${count} ${entityType}(s)`,
      metadata: { ...metadata, importCount: count },
    });
  }, [logActivity]);

  return {
    logActivity,
    logCreate,
    logUpdate,
    logDelete,
    logView,
    logExport,
    logImport,
  };
}
