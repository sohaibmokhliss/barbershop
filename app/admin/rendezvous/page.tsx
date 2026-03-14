import { listAppointments } from '@/lib/appointmentsRepo';
import type { Appointment } from '@/lib/types';
import RendezvousClient from './RendezvousClient';

export const dynamic = 'force-dynamic';

export default async function RendezvousPage() {
  let initialAppointments: Appointment[] = [];

  const { data } = await listAppointments();
  initialAppointments = data;

  return <RendezvousClient initialAppointments={initialAppointments} />;
}
