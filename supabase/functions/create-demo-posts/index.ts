import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, classIds } = await req.json();
    
    console.log('Creating demo posts for user:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Study photo prompts
    const photoPrompts = [
      "A cozy study desk setup with laptop, coffee cup, textbooks, and warm desk lamp lighting. Modern minimalist aesthetic, natural wood desk, plants in background. High quality, photorealistic.",
      "A library study table with highlighters, open textbooks, notebook with handwritten notes, and a macbook. Soft natural lighting from window. Clean, organized study environment.",
      "A colorful study setup with RGB keyboard, dual monitors showing code, energy drink, programming books, and sticky notes. Gaming chair, LED strip lights, dark room aesthetic.",
      "A cafe study scene with matcha latte, open laptop, course notes, and a view of city through window. Warm afternoon lighting, bokeh background. Aesthetic study vibes.",
      "A nighttime study desk with tablet, apple pencil, digital notes on screen, AirPods, and soft purple-blue ambient lighting. Modern tech setup, clean minimal desk.",
      "A bright study corner with physics textbook open, calculator, graph paper with equations, pencils, and natural sunlight streaming in. Academic, organized workspace."
    ];

    const captions = [
      "Finally understanding this topic 🧠✨ #studygrind",
      "Late night study sesh but we're making progress 💪📚",
      "Coffee + focus = productivity ☕️💯",
      "When the concepts finally click 🎯 #studymode",
      "My happy place 📖✨ Love this view!",
      "Physics problems hitting different today 🔬💫"
    ];

    const createdPosts = [];

    // Generate 6 demo posts
    for (let i = 0; i < 6; i++) {
      console.log(`Generating photo ${i + 1}/6...`);
      
      // Generate study photo
      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [{
            role: 'user',
            content: photoPrompts[i]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!imageResponse.ok) {
        console.error('Image generation failed:', await imageResponse.text());
        continue;
      }

      const imageData = await imageResponse.json();
      const photoUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!photoUrl) {
        console.error('No image URL in response');
        continue;
      }

      // Random time in the past week
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      
      const minutesStudied = 30 + Math.floor(Math.random() * 90); // 30-120 minutes
      const classId = classIds[i % classIds.length];

      // Create study session
      const { data: session, error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          class_id: classId,
          minutes_studied: minutesStudied,
          started_at: new Date(timestamp.getTime() - minutesStudied * 60000).toISOString(),
          completed_at: timestamp.toISOString(),
          photo_url: photoUrl,
          front_photo_url: photoUrl,
          status: 'completed'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        continue;
      }

      // Create feed post
      const { data: post, error: postError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: userId,
          session_id: session.id,
          class_id: classId,
          photo_url: photoUrl,
          front_photo_url: photoUrl,
          minutes_studied: minutesStudied,
          caption: captions[i],
          visibility: 'everyone'
        })
        .select()
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        continue;
      }

      createdPosts.push(post);
      console.log(`Created post ${i + 1}/6`);
    }

    console.log(`✅ Created ${createdPosts.length} demo posts`);

    return new Response(
      JSON.stringify({ 
        success: true,
        postsCreated: createdPosts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating demo posts:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});