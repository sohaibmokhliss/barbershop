import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';
import CalendrierClient from './CalendrierClient';

export const dynamic = 'force-dynamic';

export default async function CalendrierPage() {
  let initialAppointments: Appointment[] = [];

  try {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('starts_at', { ascending: true });

    initialAppointments = data ?? [];
  } catch {
    // Supabase not reachable - client renders empty state
  }

  return <CalendrierClient initialAppointments={initialAppointments} />;
}
