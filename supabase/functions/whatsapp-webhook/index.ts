import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp] Webhook verified');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle incoming messages (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[WhatsApp] Received:', JSON.stringify(body, null, 2));

      // Extract message data
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        // Status update or other non-message event
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const message = messages[0];
      const from = message.from; // Phone number
      const messageType = message.type;
      const messageBody = message.text?.body || '';
      const messageId = message.id;

      console.log(`[WhatsApp] Message from ${from}: ${messageBody}`);

      // Only handle text messages for now
      if (messageType !== 'text') {
        await sendWhatsAppMessage(from, "📷 I can only process text messages right now. Please type your request.");
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call FLAIR orchestrator
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const flairResponse = await fetch(`${supabaseUrl}/functions/v1/flair-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageBody,
          channel: 'whatsapp',
          channel_id: from,
          user_id: null // Map to user if needed
        })
      });

      const flairData = await flairResponse.json();
      const response = flairData.response || "Sorry, I couldn't process that request.";

      // Format for WhatsApp (convert markdown)
      const formattedResponse = formatForWhatsApp(response);

      // Send response
      await sendWhatsAppMessage(from, formattedResponse);

      return new Response(JSON.stringify({ status: 'ok', response: 'sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[WhatsApp] Error:', error);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

// Send message via WhatsApp Cloud API
async function sendWhatsAppMessage(to: string, text: string) {
  const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('[WhatsApp] Missing credentials');
    return;
  }

  // Split long messages (WhatsApp limit is 4096 chars)
  const chunks = splitMessage(text, 4000);

  for (const chunk of chunks) {
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
          to: to,
          type: 'text',
          text: { body: chunk }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp] Send error:', error);
    }
  }
}

// Format response for WhatsApp (markdown conversion)
function formatForWhatsApp(text: string): string {
  return text
    // Bold: **text** → *text*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Headers: ### Title → *Title*
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
    // Remove HTML tags (from Telegram formatting)
    .replace(/<\/?b>/g, '*')
    .replace(/<\/?i>/g, '_')
    .replace(/<\/?code>/g, '`')
    .replace(/<[^>]+>/g, '')
    // Remove code blocks
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    // Preserve emojis and line breaks
    .trim();
}

// Split long messages
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (current.length + line.length + 1 > maxLength) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}
