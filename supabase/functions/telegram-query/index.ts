import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const body = await req.json();
    console.log('[Telegram] Received:', JSON.stringify(body));

    const message = body.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chatId = message.chat.id;
    const userMessage = message.text;
    const userId = message.from?.id;

    // Show typing indicator
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    // Handle /start command
    if (userMessage === '/start') {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
        "👋 <b>Welcome to FLAIR - Favorite Logistics AI!</b>\n\n" +
        "I can help you with:\n\n" +
        "📦 <b>Shipments</b>\n" +
        "• \"Show LOT 881\"\n" +
        "• \"New lot from Wintex for Adnan\"\n" +
        "• \"881 docs are in\"\n" +
        "• \"Mark LOT 882 delivered\"\n\n" +
        "💰 <b>Financials</b>\n" +
        "• \"What do we owe Wintex?\"\n" +
        "• \"Pay Wintex $50k Friday\"\n" +
        "• \"Show all balances\"\n\n" +
        "📊 <b>Reports</b>\n" +
        "• \"How did we do this month?\"\n" +
        "• \"Cash flow next 4 weeks\"\n\n" +
        "Just type naturally!"
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle /alerts command
    if (userMessage === '/alerts') {
      const alertsResponse = await fetch(`${SUPABASE_URL}/functions/v1/flair-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Show all active alerts',
          channel: 'telegram',
          channel_id: String(chatId),
          user_id: null
        })
      });

      const alertsData = await alertsResponse.json();
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, alertsData.response || "No active alerts.");
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle /help command
    if (userMessage === '/help') {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
        "📚 <b>FLAIR Commands</b>\n\n" +
        "<b>Shipments:</b>\n" +
        "• Show LOT [number]\n" +
        "• List pending/in-transit shipments\n" +
        "• [LOT] docs are in\n" +
        "• Mark [LOT] as [status]\n" +
        "• New lot from [supplier] for [client]\n\n" +
        "<b>Suppliers:</b>\n" +
        "• What do we owe [supplier]?\n" +
        "• Show all supplier balances\n" +
        "• Add supplier [name]\n\n" +
        "<b>Payments:</b>\n" +
        "• Pay [supplier] $[amount]\n" +
        "• Schedule payment to [supplier]\n" +
        "• Show pending payments\n\n" +
        "<b>Reports:</b>\n" +
        "• How did we do this month/week?\n" +
        "• Profit summary\n" +
        "• Cash flow projection\n\n" +
        "<b>System:</b>\n" +
        "/alerts - Show active alerts\n" +
        "/help - Show this help"
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call FLAIR orchestrator for all other messages
    console.log(`[Telegram] Calling FLAIR orchestrator with: "${userMessage}"`);
    
    const flairResponse = await fetch(`${SUPABASE_URL}/functions/v1/flair-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        channel: 'telegram',
        channel_id: String(chatId),
        user_id: null
      })
    });

    const flairData = await flairResponse.json();
    console.log('[Telegram] FLAIR response:', JSON.stringify(flairData));

    if (!flairData.success) {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId,
        "❌ " + (flairData.error || "Sorry, something went wrong. Please try again.")
      );
    } else {
      // Convert any markdown to HTML for Telegram
      const formattedResponse = formatForTelegram(flairData.response);
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, formattedResponse);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Telegram] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Format response for Telegram HTML
function formatForTelegram(text: string): string {
  return text
    // Convert markdown bold to HTML
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    // Convert markdown italic to HTML
    .replace(/_(.+?)_/g, '<i>$1</i>')
    // Convert markdown code to HTML
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Keep existing HTML tags
    .trim();
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  // Split long messages (Telegram limit is 4096)
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= 4000) {
      chunks.push(remaining);
      break;
    }
    // Find last newline before 4000
    let splitIndex = remaining.lastIndexOf('\n', 4000);
    if (splitIndex === -1) splitIndex = 4000;
    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trim();
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Telegram] Send error:', errorText);
        
        // If HTML parsing fails, try without parse_mode
        if (errorText.includes('can\'t parse')) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: chunk.replace(/<[^>]+>/g, '') // Strip HTML tags
            })
          });
        }
      }
    } catch (err) {
      console.error('[Telegram] Send exception:', err);
    }
  }
}
