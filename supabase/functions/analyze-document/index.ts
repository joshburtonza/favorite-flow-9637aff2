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
    const { documentContent, documentName, sendToTelegram = true } = await req.json();

    if (!documentContent) {
      throw new Error('Document content is required');
    }

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    console.log(`Analyzing document: ${documentName || 'unnamed'}`);
    console.log(`Document content length: ${documentContent.length} characters`);

    // Call DeepSeek API for analysis
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a document analysis expert for a freight forwarding logistics company called Favorite Logistics. 
Analyze documents and extract key information related to:
- Shipment details (lot numbers, commodities, quantities)
- Supplier information and costs
- Client information and invoices
- Payment schedules and FX rates
- Delivery dates and ETAs
- Any discrepancies or issues found

Provide a structured analysis with:
1. Document Summary
2. Key Data Extracted (in bullet points)
3. Action Items (if any)
4. Potential Issues or Discrepancies
5. Recommendations`
          },
          {
            role: 'user',
            content: `Please analyze this document:\n\nDocument Name: ${documentName || 'Unknown'}\n\nContent:\n${documentContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const analysis = deepseekData.choices?.[0]?.message?.content || 'No analysis generated';

    console.log('Analysis completed successfully');

    // Send to Telegram if configured and requested
    let telegramSent = false;
    if (sendToTelegram && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const telegramMessage = `📄 *Document Analysis*\n\n📁 *File:* ${documentName || 'Unknown'}\n\n${analysis}`;
        
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: telegramMessage.substring(0, 4096), // Telegram message limit
              parse_mode: 'Markdown',
            }),
          }
        );

        if (telegramResponse.ok) {
          telegramSent = true;
          console.log('Analysis sent to Telegram successfully');
        } else {
          const telegramError = await telegramResponse.text();
          console.error('Telegram API error:', telegramError);
        }
      } catch (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        documentName,
        telegramSent,
        analyzedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in analyze-document function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
