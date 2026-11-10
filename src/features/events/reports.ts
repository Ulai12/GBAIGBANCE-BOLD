import { isSupabaseConfigured, supabase } from '@/services/supabase';

const QUEUE_KEY = 'gba_event_reports_v1';

interface QueuedReport {
  event_id: string;
  reason: string;
  comment: string;
  created_at: string;
}

function readQueue(): QueuedReport[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedReport[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-20)));
}

async function sendOne(report: QueuedReport): Promise<boolean> {
  const { error } = await supabase.rpc('submit_event_report', {
    p_event_id: report.event_id,
    p_reason: report.reason,
    p_comment: report.comment,
  });
  return !error;
}

/** Envoie le signalement. S'il n'atteint pas le serveur, il reste sur l'appareil. */
export async function submitEventReport(
  eventId: string,
  reason: string,
  comment: string
): Promise<{ remote: boolean; message: string }> {
  const report: QueuedReport = {
    event_id: eventId,
    reason,
    comment: comment.trim().slice(0, 1000),
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    writeQueue([...readQueue(), report]);
    return { remote: false, message: 'Signalement conservé sur cet appareil.' };
  }

  const pending = readQueue();
  const stillPending: QueuedReport[] = [];
  for (const item of pending) {
    if (!(await sendOne(item))) stillPending.push(item);
  }
  const remote = await sendOne(report);
  if (!remote) stillPending.push(report);
  writeQueue(stillPending);

  return remote
    ? { remote: true, message: 'Signalement transmis à la modération.' }
    : { remote: false, message: 'Signalement conservé sur cet appareil. Il partira dès que la modération serveur répond.' };
}
