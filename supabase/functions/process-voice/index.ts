import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    let audioBase64: string;
    let channel: string;
    let channelId: string;
    let audioFormat = 'audio/ogg';
    let audioDuration = 0;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;
      channel = formData.get('channel') as string || 'web';
      channelId = formData.get('channel_id') as string || '';

      if (!audioFile) {
        throw new Error('No audio file provided');
      }

      const buffer = await audioFile.arrayBuffer();
      audioBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      audioFormat = audioFile.type || 'audio/ogg';
    } else {
      const body = await req.json();
      audioBase64 = body.audio_base64;
      channel = body.channel || 'web';
      channelId = body.channel_id || '';
      audioFormat = body.audio_format || 'audio/ogg';
      audioDuration = body.duration || 0;

      if (!audioBase64) {
        throw new Error('No audio data provided');
      }
    }

    console.log(`[Voice] Processing ${audioFormat} from ${channel}`);

    // Use Gemini for transcription (supports audio)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const transcribeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: audioFormat.includes('ogg') ? 'ogg' : 
                          audioFormat.includes('mp3') ? 'mp3' :
                          audioFormat.includes('wav') ? 'wav' : 'ogg'
                }
              },
              {
                type: 'text',
                text: 'Transcribe this voice message exactly as spoken. Return only the transcription text, nothing else. If you cannot understand parts, indicate with [unclear]. The speaker may be discussing freight forwarding, shipments, suppliers, costs, or business matters.'
              }
            ]
          }
        ]
      })
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('[Voice] Transcription API error:', errorText);
      throw new Error(`Transcription failed: ${transcribeResponse.status}`);
    }

    const transcribeData = await transcribeResponse.json();
    const transcription = transcribeData.choices[0].message.content.trim();

    console.log(`[Voice] Transcribed: "${transcription.substring(0, 100)}..."`);

    // Now send transcription to FLAIR orchestrator
    const flairResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/flair-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcription,
          channel,
          channel_id: channelId,
          metadata: { 
            source: 'voice', 
            original_duration: audioDuration,
            transcription_length: transcription.length
          }
        })
      }
    );

    const flairData = await flairResponse.json();

    // Log the voice message
    await supabase.from('voice_messages').insert({
      channel,
      channel_user_id: channelId,
      audio_duration_seconds: audioDuration,
      audio_format: audioFormat,
      transcription,
      transcription_confidence: 0.9, // Gemini doesn't provide confidence scores
      flair_response: flairData.response,
      tools_used: flairData.tools_used || []
    });

    return new Response(JSON.stringify({
      success: true,
      transcription,
      response: flairData.response,
      tools_used: flairData.tools_used || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Voice] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
