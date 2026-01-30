import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

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

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const message = messages[0];
      const from = message.from;
      const messageType = message.type;
      const messageBody = message.text?.body || '';

      console.log(`[WhatsApp] Message from ${from}: ${messageBody} (type: ${messageType})`);

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Handle voice/audio messages
      if (messageType === 'audio') {
        await sendWhatsAppMessage(from, "🎤 Voice messages coming soon! Please type your request for now.");
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle image messages
      if (messageType === 'image') {
        const mediaId = message.image.id;
        console.log(`[WhatsApp] Image received: ${mediaId}`);

        try {
          const mediaResponse = await fetch(
            `https://graph.facebook.com/v18.0/${mediaId}`,
            { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` } }
          );
          const mediaData = await mediaResponse.json();

          if (mediaData.url) {
            const imageResponse = await fetch(mediaData.url, {
              headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
            });
            const imageBlob = await imageResponse.blob();
            const fileName = `whatsapp/${from}/${Date.now()}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(fileName, imageBlob, { contentType: 'image/jpeg' });

            if (!uploadError) {
              const { data: queueEntry } = await supabase
                .from('document_extraction_queue')
                .insert({ source_type: 'whatsapp', source_reference: from, original_file_path: fileName, status: 'pending' })
                .select().single();

              if (queueEntry) {
                fetch(`${SUPABASE_URL}/functions/v1/process-document-ocr`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ queue_id: queueEntry.id, file_path: fileName, source_type: 'whatsapp' })
                }).catch(e => console.error('OCR trigger error:', e));
              }
              await sendWhatsAppMessage(from, "📸 Image received! Analyzing now...");
            }
          }
        } catch (e) {
          console.error('[WhatsApp] Image processing error:', e);
          await sendWhatsAppMessage(from, "❌ Couldn't process that image.");
        }
        return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Only handle text messages for FLAIR
      if (messageType !== 'text') {
        await sendWhatsAppMessage(from, "📱 Please send text, images, or voice messages.");
        return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Call FLAIR orchestrator
      const flairResponse = await fetch(`${SUPABASE_URL}/functions/v1/flair-orchestrator`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageBody, channel: 'whatsapp', channel_id: from, user_id: null })
      });

      const flairData = await flairResponse.json();
      const response = flairData.response || "Sorry, I couldn't process that request.";
      const formattedResponse = formatForWhatsApp(response);
      await sendWhatsAppMessage(from, formattedResponse);

      return new Response(JSON.stringify({ status: 'ok', response: 'sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[WhatsApp] Error:', error);
      return new Response(JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('[WhatsApp] Missing credentials');
    return;
  }

  const chunks = splitMessage(text, 4000);
  for (const chunk of chunks) {
    await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: chunk } })
    });
  }
}

function formatForWhatsApp(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^#{1,3}\s+(.+)$/gm, '*$1*').replace(/<\/?b>/g, '*').replace(/<\/?i>/g, '_').replace(/<[^>]+>/g, '').trim();
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
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
