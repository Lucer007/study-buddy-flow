import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export const useStudyReminders = () => {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check for upcoming study blocks every minute
    const interval = setInterval(async () => {
      await checkUpcomingBlocks();
    }, 60000); // Check every minute

    // Check immediately on mount
    checkUpcomingBlocks();

    return () => clearInterval(interval);
  }, []);

  const checkUpcomingBlocks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayDate = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      // Get study blocks for today
      const { data: blocks } = await supabase
        .from('study_blocks')
        .select(`
          *,
          classes(name)
        `)
        .eq('user_id', user.id)
        .eq('block_date', todayDate)
        .not('start_time', 'is', null);

      if (!blocks) return;

      for (const block of blocks) {
        if (!block.start_time) continue;

        const blockDateTime = parseISO(`${block.block_date}T${block.start_time}`);
        const minutesUntil = differenceInMinutes(blockDateTime, now);

        // Notify 15 minutes before
        if (minutesUntil === 15) {
          showNotification(block);
        }

        // Notify at start time
        if (minutesUntil === 0) {
          showNotification(block, true);
        }
      }
    } catch (error) {
      console.error('Error checking study blocks:', error);
    }
  };

  const showNotification = (block: any, isNow: boolean = false) => {
    if (Notification.permission !== 'granted') return;

    const title = isNow 
      ? '🎯 Study Time NOW!'
      : '⏰ Study Session Starting Soon';
    
    const body = isNow
      ? `Time to study ${block.classes?.name}! Tap to start your nudge.`
      : `${block.classes?.name} in 15 minutes. Get ready!`;

    const notification = new Notification(title, {
      body,
      icon: '/placeholder.svg',
      badge: '/placeholder.svg',
      tag: `study-block-${block.id}`,
      requireInteraction: isNow,
      data: {
        blockId: block.id,
        classId: block.class_id,
        url: '/today'
      }
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/today';
      notification.close();
    };
  };
};
