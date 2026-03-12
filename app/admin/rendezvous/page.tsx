import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';
import RendezvousClient from './RendezvousClient';

export const dynamic = 'force-dynamic';

export default async function RendezvousPage() {
  let initialAppointments: Appointment[] = [];

  try {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('starts_at', { ascending: true });
    initialAppointments = data ?? [];
  } catch {
    // Supabase not reachable — client component will handle empty state
  }

  return <RendezvousClient initialAppointments={initialAppointments} />;
}
