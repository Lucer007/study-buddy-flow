// Copy this entire file content and paste it into Supabase Edge Function editor
// Function name: parse-syllabus

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
    // Validate environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set in edge function');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set in edge function');
    }
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY environment variable is not set in edge function');
    }

    const { syllabusUrl, classId, userId, weekdayHours, weekendHours } = await req.json();
    
    if (!syllabusUrl || !classId || !userId) {
      throw new Error('Missing required parameters: syllabusUrl, classId, or userId');
    }
    
    console.log('Processing syllabus:', { syllabusUrl, classId, userId });

    // Initialize Supabase client
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
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Process in chunks to avoid stack overflow
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binaryString);
    
    console.log('Calling Lovable AI with Gemini vision to parse syllabus...');

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
            content: `You are a syllabus parser. Extract class schedule, topics, and assignments with time estimates.

Return ONLY valid JSON in this exact format (no markdown):
{
  "schedule": {
    "days": ["Monday", "Wednesday", "Friday"],
    "startTime": "10:00",
    "endTime": "11:00",
    "startDate": "2025-01-15",
    "endDate": "2025-05-15"
  },
  "topics": [
    {"title": "Week 1: Introduction", "description": "Overview", "orderIndex": 1, "estimatedMinutes": 60}
  ],
  "assignments": [
    {"title": "Problem Set 1", "dueDate": "2025-03-15", "type": "reading", "estimatedMinutes": 120}
  ]
}

Schedule extraction:
- Look for class meeting times (e.g., "MWF 10:00-11:00", "Tuesdays and Thursdays 2:00-3:30 PM")
- Extract days of week: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Extract start and end times in 24-hour format (HH:mm)
- Extract semester/term start and end dates if available
- If schedule not found, set schedule to null

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
                text: 'Parse this syllabus PDF and extract the class meeting schedule, all topics/lessons, and assignments with time estimates. Pay special attention to finding when the class meets (days and times).'
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

    const { schedule = null, topics = [], assignments = [] } = parsed;

    console.log(`Parsed schedule:`, schedule);
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

    // Generate class meeting study blocks from schedule
    const classMeetingBlocks: any[] = [];
    if (schedule && schedule.days && schedule.startTime && schedule.endTime) {
      console.log('Generating class meeting blocks from schedule...');
      
      const dayMap: Record<string, number> = {
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
        'Sunday': 0,
        'Mon': 1,
        'Tue': 2,
        'Wed': 3,
        'Thu': 4,
        'Fri': 5,
        'Sat': 6,
        'Sun': 0,
        'M': 1,
        'T': 2,
        'W': 3,
        'R': 4,
        'F': 5,
        'S': 6,
      };

      // Parse start and end dates, default to current semester if not provided
      const today = new Date();
      const currentYear = today.getFullYear();
      let startDate = schedule.startDate 
        ? new Date(schedule.startDate) 
        : new Date(currentYear, 0, 15); // Default to Jan 15
      let endDate = schedule.endDate 
        ? new Date(schedule.endDate) 
        : new Date(currentYear, 4, 15); // Default to May 15

      // Calculate duration in minutes with validation
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      
      // Validate time values
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        console.error('Invalid time format in schedule:', schedule.startTime, schedule.endTime);
        // Skip class meeting blocks if times are invalid
      } else {
        let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        
        // Handle case where endTime is before startTime (could be next day or error)
        if (durationMinutes < 0) {
          // Assume it's the next day (add 24 hours)
          durationMinutes += 24 * 60;
          console.warn(`End time (${schedule.endTime}) is before start time (${schedule.startTime}). Assuming next day. Duration: ${durationMinutes} minutes`);
        }
        
        // Validate minimum duration (at least 15 minutes for a class meeting)
        const MIN_DURATION = 15;
        if (durationMinutes < MIN_DURATION) {
          console.warn(`Duration too short (${durationMinutes} min). Setting to minimum ${MIN_DURATION} minutes.`);
          durationMinutes = MIN_DURATION;
        }
        
        // Validate maximum duration (no class should be longer than 4 hours)
        const MAX_DURATION = 4 * 60;
        if (durationMinutes > MAX_DURATION) {
          console.warn(`Duration too long (${durationMinutes} min). Capping at ${MAX_DURATION} minutes.`);
          durationMinutes = MAX_DURATION;
        }

        // Get day numbers for the schedule
        const scheduleDays = schedule.days.map((day: string) => {
          const dayName = day.trim();
          return dayMap[dayName] ?? dayMap[dayName.substring(0, 3)] ?? null;
        }).filter((d: number | null) => d !== null);

        if (scheduleDays.length === 0) {
          console.warn('No valid days found in schedule:', schedule.days);
        } else {
          // Generate blocks for each occurrence
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (scheduleDays.includes(dayOfWeek)) {
              classMeetingBlocks.push({
                blockDate: currentDate.toISOString().split('T')[0],
                startTime: schedule.startTime,
                durationMinutes: durationMinutes,
                isClassMeeting: true,
              });
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }

          console.log(`Generated ${classMeetingBlocks.length} class meeting blocks with duration ${durationMinutes} minutes`);
        }
      }
    }

    // Generate study plan for assignments with AI
    console.log('Generating study plan for assignments...');
    
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
            content: `Create a study schedule for assignments. Return ONLY valid JSON array:
[
  {"blockDate": "2025-02-10", "startTime": "18:00", "durationMinutes": 45, "assignmentIndex": 0}
]

Rules:
- Weekdays: ${weekdayHours}h max, after 4 PM
- Weekends: ${weekendHours}h max, flexible
- Spread sessions before due dates
- Buffer 1-2 days before deadlines
- assignmentIndex refers to the index in the assignments array`
          },
          {
            role: 'user',
            content: `Create study blocks for these assignments: ${JSON.stringify(assignments)}`
          }
        ]
      }),
    });

    let assignmentStudyBlocks: any[] = [];
    if (planResponse.ok) {
      const planData = await planResponse.json();
      const planText = planData.choices[0].message.content;
      try {
        const jsonMatch = planText.match(/```json\n([\s\S]*?)\n```/) || 
                         planText.match(/\[[\s\S]*\]/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : planText;
        assignmentStudyBlocks = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse study plan:', e);
      }
    }

    // Combine class meeting blocks and assignment study blocks
    const allStudyBlocks: any[] = [];

    // Add class meeting blocks
    if (classMeetingBlocks.length > 0) {
      allStudyBlocks.push(...classMeetingBlocks.map((block: any) => ({
        user_id: userId,
        class_id: classId,
        assignment_id: null,
        block_date: block.blockDate,
        start_time: block.startTime,
        duration_minutes: block.durationMinutes,
      })));
    }

    // Add assignment study blocks
    if (assignmentStudyBlocks.length > 0 && insertedAssignments.length > 0) {
      allStudyBlocks.push(...assignmentStudyBlocks.map((block: any) => ({
        user_id: userId,
        class_id: classId,
        assignment_id: insertedAssignments[block.assignmentIndex]?.id || null,
        block_date: block.blockDate,
        start_time: block.startTime,
        duration_minutes: block.durationMinutes,
      })));
    }

    // Insert all study blocks
    if (allStudyBlocks.length > 0) {
      const { error: blocksError } = await supabase
        .from('study_blocks')
        .insert(allStudyBlocks);

      if (blocksError) {
        console.error('Error inserting study blocks:', blocksError);
        throw new Error(`Failed to save study blocks: ${blocksError.message}`);
      }
      console.log(`Inserted ${allStudyBlocks.length} study blocks (${classMeetingBlocks.length} class meetings, ${assignmentStudyBlocks.length} assignment blocks)`);
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
        studyBlocksCount: allStudyBlocks.length,
        classMeetingBlocksCount: classMeetingBlocks.length,
        assignmentBlocksCount: assignmentStudyBlocks.length,
        totalMinutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error('Error in parse-syllabus function:', errorMessage);
    console.error('Error details:', errorDetails);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: Deno.env.get('DENO_ENV') === 'development' ? errorDetails : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

