import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'alert' | 'briefing' | 'update' | 'reminder' | 'message';
  alert_id?: string;
  user_id?: string;  // Specific user, or null for all admins
  title: string;
  message: string;
  channels?: ('telegram' | 'whatsapp')[];
  priority?: 'low' | 'normal' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const notification: NotificationRequest = await req.json();
    console.log('[FLAIR Notify] Processing notification:', notification.type, notification.title);
    
    const results: any[] = [];

    // Determine recipients
    let recipients: any[] = [];

    if (notification.user_id) {
      // Specific user
      const { data } = await supabase
        .from('user_channel_identities')
        .select('*')
        .eq('user_id', notification.user_id)
        .eq('is_active', true)
        .eq('receive_alerts', true);
      recipients = data || [];
    } else {
      // Use RPC to get all admin recipients
      const { data } = await supabase.rpc('get_alert_recipients');
      recipients = data || [];
    }

    // Filter by requested channels
    if (notification.channels?.length) {
      recipients = recipients.filter(r => notification.channels!.includes(r.channel));
    }

    // Check quiet hours
    const now = new Date();
    const currentHour = now.getUTCHours() + 2; // SAST offset
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    recipients = recipients.filter(r => {
      if (!r.quiet_hours_start || !r.quiet_hours_end) return true;
      // Simple check - doesn't handle overnight ranges
      return currentTime < r.quiet_hours_start || currentTime > r.quiet_hours_end;
    });

    console.log(`[FLAIR Notify] Sending to ${recipients.length} recipients`);

    // Send to each recipient
    for (const recipient of recipients) {
      const logEntry: any = {
        user_id: recipient.user_id,
        channel: recipient.channel,
        channel_user_id: recipient.channel_user_id,
        notification_type: notification.type,
        alert_id: notification.alert_id || null,
        title: notification.title,
        message: notification.message,
        status: 'pending',
        metadata: { priority: notification.priority }
      };

      try {
        if (recipient.channel === 'telegram') {
          await sendTelegram(recipient.channel_user_id, notification.title, notification.message);
        } else if (recipient.channel === 'whatsapp') {
          await sendWhatsApp(recipient.channel_user_id, notification.title, notification.message);
        }

        logEntry.status = 'sent';
        logEntry.sent_at = new Date().toISOString();
        console.log(`[FLAIR Notify] Sent to ${recipient.channel}:${recipient.display_name}`);

      } catch (error) {
        logEntry.status = 'failed';
        logEntry.error_message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[FLAIR Notify] Failed to send to ${recipient.channel}:`, error);
      }

      // Log the notification
      await supabase.from('notification_log').insert(logEntry);
      results.push({ 
        channel: recipient.channel, 
        user: recipient.display_name, 
        status: logEntry.status,
        error: logEntry.error_message 
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sent_count: results.filter(r => r.status === 'sent').length,
      failed_count: results.filter(r => r.status === 'failed').length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[FLAIR Notify] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function sendTelegram(chatId: string, title: string, message: string) {
  const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!TELEGRAM_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  // Use HTML parse mode instead of MarkdownV2 to avoid escape issues
  const text = `🔔 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram error: ${error}`);
  }
}

async function sendWhatsApp(phone: string, title: string, message: string) {
  const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured');
  }

  // WhatsApp uses *text* for bold
  const text = `🔔 *${title}*\n\n${message}`;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: text }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp error: ${error}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
