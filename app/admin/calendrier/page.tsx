import { listAppointments } from '@/lib/appointmentsRepo';
import type { Appointment } from '@/lib/types';
import CalendrierClient from './CalendrierClient';

export const dynamic = 'force-dynamic';

export default async function CalendrierPage() {
  let initialAppointments: Appointment[] = [];

  const { data } = await listAppointments();
  initialAppointments = data;

  return <CalendrierClient initialAppointments={initialAppointments} />;
}
