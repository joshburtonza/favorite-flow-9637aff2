import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TrackingEvent {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
}

export function useActivityTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const sessionId = useRef<string>(getOrCreateSessionId());
  const pageStartTime = useRef<number>(Date.now());
  const lastPath = useRef<string>('');

  // Track page views automatically
  useEffect(() => {
    if (!user || location.pathname === lastPath.current) return;

    // Log page leave for previous page (if spent more than 1 second)
    const duration = Date.now() - pageStartTime.current;
    if (lastPath.current && duration > 1000) {
      trackActivityInternal({
        action_type: 'view',
        entity_type: 'system',
        entity_name: lastPath.current,
        description: `Left page: ${lastPath.current}`,
        metadata: { duration_ms: duration, session_id: sessionId.current }
      });
    }

    // Log new page view
    lastPath.current = location.pathname;
    pageStartTime.current = Date.now();
    
    trackActivityInternal({
      action_type: 'view',
      entity_type: 'system',
      entity_name: location.pathname,
      description: `Viewed page: ${location.pathname}`,
      metadata: {
        page_url: location.pathname,
        page_title: document.title,
        referrer: document.referrer,
        session_id: sessionId.current,
        device_type: getDeviceType(),
        browser: getBrowser()
      }
    });
  }, [location.pathname, user]);

  const trackActivityInternal = useCallback(async (event: TrackingEvent) => {
    if (!user) return;

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action_type: event.action_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        entity_name: event.entity_name,
        description: event.description,
        old_values: event.old_values || null,
        new_values: event.new_values || null,
        metadata: {
          ...event.metadata,
          timestamp: new Date().toISOString(),
          session_id: sessionId.current
        },
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Activity tracking error:', error);
    }
  }, [user]);

  // Track data operations (CRUD)
  const trackDataAction = useCallback((
    action: 'create' | 'update' | 'delete' | 'view',
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    changes?: { previous?: any; new?: any; fields?: string[] }
  ) => {
    const actionDescriptions = {
      create: `Created ${resourceType}`,
      update: `Updated ${resourceType}`,
      delete: `Deleted ${resourceType}`,
      view: `Viewed ${resourceType}`
    };

    trackActivityInternal({
      action_type: action,
      entity_type: resourceType,
      entity_id: resourceId,
      entity_name: resourceName,
      description: `${actionDescriptions[action]}${resourceName ? `: ${resourceName}` : ''}${changes?.fields ? ` (${changes.fields.join(', ')})` : ''}`,
      old_values: changes?.previous,
      new_values: changes?.new,
      metadata: { changed_fields: changes?.fields }
    });
  }, [trackActivityInternal]);

  // Track file operations
  const trackFileAction = useCallback((
    action: 'upload' | 'download' | 'view' | 'delete',
    fileName: string,
    fileId?: string,
    metadata?: Record<string, any>
  ) => {
    trackActivityInternal({
      action_type: action,
      entity_type: 'document',
      entity_id: fileId,
      entity_name: fileName,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} file: ${fileName}`,
      metadata: { ...metadata, file_name: fileName }
    });
  }, [trackActivityInternal]);

  // Track AI interactions
  const trackAIQuery = useCallback((
    query: string,
    conversationId?: string,
    toolsUsed?: string[]
  ) => {
    trackActivityInternal({
      action_type: 'view',
      entity_type: 'system',
      entity_id: conversationId,
      entity_name: 'AI Query',
      description: `AI Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`,
      metadata: {
        ai_query: query,
        conversation_id: conversationId,
        tools_used: toolsUsed
      }
    });
  }, [trackActivityInternal]);

  // Track exports
  const trackExport = useCallback((
    exportType: 'pdf' | 'excel' | 'csv',
    resourceType: string,
    resourceName?: string,
    metadata?: Record<string, any>
  ) => {
    trackActivityInternal({
      action_type: 'export',
      entity_type: resourceType,
      entity_name: resourceName,
      description: `Exported ${resourceType}${resourceName ? `: ${resourceName}` : ''} as ${exportType.toUpperCase()}`,
      metadata: { export_type: exportType, ...metadata }
    });
  }, [trackActivityInternal]);

  // Track search actions
  const trackSearch = useCallback((
    query: string,
    resultCount: number,
    filters?: Record<string, any>
  ) => {
    trackActivityInternal({
      action_type: 'view',
      entity_type: 'system',
      entity_name: 'Search',
      description: `Search: "${query}" (${resultCount} results)`,
      metadata: { search_query: query, result_count: resultCount, filters }
    });
  }, [trackActivityInternal]);

  // Track errors and security events
  const trackError = useCallback((
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>
  ) => {
    trackActivityInternal({
      action_type: 'view',
      entity_type: 'system',
      entity_name: 'Error',
      description: `Error: ${errorType} - ${errorMessage}`,
      metadata: { error_type: errorType, error_message: errorMessage, ...context }
    });
  }, [trackActivityInternal]);

  // Track login/logout
  const trackAuth = useCallback((
    action: 'login' | 'logout',
    metadata?: Record<string, any>
  ) => {
    trackActivityInternal({
      action_type: action,
      entity_type: 'user',
      description: action === 'login' ? 'User logged in' : 'User logged out',
      metadata: { ...metadata, device_type: getDeviceType(), browser: getBrowser() }
    });
  }, [trackActivityInternal]);

  return {
    trackDataAction,
    trackFileAction,
    trackAIQuery,
    trackExport,
    trackSearch,
    trackError,
    trackAuth,
    trackActivity: trackActivityInternal
  };
}

// Helper functions
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('flair_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('flair_session_id', sessionId);
  }
  return sessionId;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}
