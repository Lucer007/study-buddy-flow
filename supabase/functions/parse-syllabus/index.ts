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
    const { syllabusUrl, classId, userId, weekdayHours, weekendHours } = await req.json();
    
    console.log('Processing syllabus:', { syllabusUrl, classId, userId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('syllabi')
      .download(syllabusUrl);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert PDF to base64 for Gemini vision
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log('Calling Lovable AI with Gemini vision to parse syllabus...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a syllabus parser. Extract topics and assignments with time estimates.

Return ONLY valid JSON in this exact format (no markdown):
{
  "topics": [
    {"title": "Week 1: Introduction", "description": "Overview", "orderIndex": 1, "estimatedMinutes": 60}
  ],
  "assignments": [
    {"title": "Problem Set 1", "dueDate": "2025-03-15", "type": "reading", "estimatedMinutes": 120}
  ]
}

Time estimates:
- Reading: 3-5 min/page
- Homework: 90-180 min
- Project: 300-600 min
- Exam prep: 180-360 min

Assignment types: "reading", "hw", "project", "exam"
Adjust estimates based on weekday hours preference: ${weekdayHours}h/day`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Parse this syllabus PDF and extract all topics/lessons and assignments with time estimates.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const contentText = aiData.choices[0].message.content;
    
    console.log('AI response:', contentText);

    // Parse the AI response
    let parsed;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || 
                       contentText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : contentText;
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('AI returned invalid JSON format');
    }

    const { topics = [], assignments = [] } = parsed;

    console.log(`Parsed ${topics.length} topics and ${assignments.length} assignments`);

    // Insert topics into syllabus_topics table
    if (topics.length > 0) {
      const topicInserts = topics.map((t: any) => ({
        class_id: classId,
        title: t.title,
        description: t.description || '',
        order_index: t.orderIndex || 0,
        estimated_minutes: t.estimatedMinutes || 60,
      }));

      const { error: topicsError } = await supabase
        .from('syllabus_topics')
        .insert(topicInserts);

      if (topicsError) {
        console.error('Error inserting topics:', topicsError);
        throw new Error(`Failed to save topics: ${topicsError.message}`);
      }
      console.log('Topics saved:', topics.length);
    }

    // Insert assignments into syllabus_assignments table
    let insertedAssignments = [];
    if (assignments.length > 0) {
      const assignmentInserts = assignments.map((a: any) => ({
        class_id: classId,
        title: a.title,
        type: a.type || 'reading',
        due_date: a.dueDate || null,
        estimated_minutes: a.estimatedMinutes || 60,
      }));

      const { data: insertData, error: assignError } = await supabase
        .from('syllabus_assignments')
        .insert(assignmentInserts)
        .select();

      if (assignError) {
        console.error('Error inserting assignments:', assignError);
        throw new Error(`Failed to save assignments: ${assignError.message}`);
      }
      insertedAssignments = insertData || [];
      console.log('Assignments saved:', assignments.length);
    }

    // Calculate total estimated minutes
    const totalMinutes = 
      topics.reduce((sum: number, t: any) => sum + (t.estimatedMinutes || 0), 0) +
      assignments.reduce((sum: number, a: any) => sum + (a.estimatedMinutes || 0), 0);

    // Generate study plan with AI
    console.log('Generating study plan...');
    
    const planResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Create a study schedule. Return ONLY valid JSON array:
[
  {"blockDate": "2025-02-10", "startTime": "18:00", "durationMinutes": 45, "assignmentIndex": 0}
]

Rules:
- Weekdays: ${weekdayHours}h max, after 4 PM
- Weekends: ${weekendHours}h max, flexible
- Spread sessions before due dates
- Buffer 1-2 days before deadlines`
          },
          {
            role: 'user',
            content: `Create study blocks: ${JSON.stringify(assignments)}`
          }
        ]
      }),
    });

    let studyBlocks = [];
    if (planResponse.ok) {
      const planData = await planResponse.json();
      const planText = planData.choices[0].message.content;
      try {
        const jsonMatch = planText.match(/```json\n([\s\S]*?)\n```/) || 
                         planText.match(/\[[\s\S]*\]/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : planText;
        studyBlocks = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse study plan:', e);
      }
    }

    // Insert study blocks
    if (studyBlocks.length > 0 && insertedAssignments.length > 0) {
      const blockInserts = studyBlocks.map((block: any) => ({
        user_id: userId,
        class_id: classId,
        assignment_id: insertedAssignments[block.assignmentIndex]?.id,
        block_date: block.blockDate,
        start_time: block.startTime,
        duration_minutes: block.durationMinutes,
      }));

      await supabase
        .from('study_blocks')
        .insert(blockInserts);
    }

    // Update class with AI parsed flag and time estimates
    await supabase
      .from('classes')
      .update({ 
        ai_parsed: true,
        estimated_total_minutes: totalMinutes,
        estimated_remaining_minutes: totalMinutes
      })
      .eq('id', classId);

    console.log('✅ Syllabus parsing complete');

    return new Response(
      JSON.stringify({ 
        success: true,
        topicsCount: topics.length,
        assignmentsCount: assignments.length,
        studyBlocksCount: studyBlocks.length,
        totalMinutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-syllabus function:', error);
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