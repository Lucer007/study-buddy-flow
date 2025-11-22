import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email sending');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Get current time and 1 hour from now
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const todayDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    const targetTime = oneHourLater.toTimeString().slice(0, 5);

    console.log('Checking for pinky promises...', { todayDate, currentTime, targetTime });

    // Find active pinky promises for study blocks happening in 1 hour
    const { data: promises, error: promisesError } = await supabase
      .from('pinky_promises')
      .select(`
        *,
        study_blocks(
          *,
          classes(name)
        )
      `)
      .eq('status', 'active')
      .eq('date', todayDate);

    if (promisesError) {
      console.error('Error fetching promises:', promisesError);
      throw promisesError;
    }

    console.log(`Found ${promises?.length || 0} active promises for today`);

    let remindersSent = 0;

    for (const promise of promises || []) {
      const block = promise.study_blocks;
      if (!block || !block.start_time) continue;

      const blockTime = block.start_time;
      
      // Check if block starts in approximately 1 hour (within 5 minute window)
      const shouldRemind = blockTime >= currentTime && blockTime <= targetTime;

      if (!shouldRemind) continue;

      console.log('Sending reminder for promise:', promise.id);

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(promise.user_id);
      
      if (!userData?.user?.email) {
        console.log('No email found for user:', promise.user_id);
        continue;
      }

      // Send reminder email if Resend is configured
      if (resend) {
        try {
          const formatTime = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          await resend.emails.send({
            from: 'Nudge Study App <onboarding@resend.dev>',
            to: [userData.user.email],
            subject: '🤙 Pinky Promise Reminder - Study Time Soon!',
            html: `
              <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="font-size: 24px; margin-bottom: 20px;">🤙 Hey! You made a pinky promise!</h1>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h2 style="margin: 0 0 10px 0; font-size: 18px;">${block.classes?.name || 'Your study session'}</h2>
                  <p style="margin: 5px 0; color: #666;">
                    <strong>Time:</strong> ${formatTime(blockTime)} (in about 1 hour)
                  </p>
                  <p style="margin: 5px 0; color: #666;">
                    <strong>Duration:</strong> ${block.duration_minutes} minutes
                  </p>
                </div>

                <p style="font-size: 16px; line-height: 1.6;">
                  You promised to show up for this study session. Don't break your pinky promise! 💪
                </p>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Remember: Keeping your promises builds trust with yourself and makes you stronger.
                </p>
              </div>
            `,
          });

          remindersSent++;
          console.log('Reminder email sent to:', userData.user.email);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    // Check for broken promises (blocks that passed without completion)
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: oldPromises, error: oldError } = await supabase
      .from('pinky_promises')
      .select(`
        *,
        study_blocks(
          id,
          class_id
        )
      `)
      .eq('status', 'active')
      .lt('date', todayDate);

    if (!oldError && oldPromises) {
      for (const promise of oldPromises) {
        // Check if there's a completed study session for this block
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('id')
          .eq('block_id', promise.block_id)
          .eq('user_id', promise.user_id)
          .limit(1);

        const newStatus = sessions && sessions.length > 0 ? 'completed' : 'broken';
        
        await supabase
          .from('pinky_promises')
          .update({ status: newStatus })
          .eq('id', promise.id);

        console.log(`Updated promise ${promise.id} to ${newStatus}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        message: `Sent ${remindersSent} reminder(s)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-pinky-reminders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
