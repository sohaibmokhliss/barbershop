import { NextResponse } from 'next/server';
import { deletePastAppointments } from '@/lib/appointmentsRepo';

export const dynamic = 'force-dynamic';

// DELETE /api/appointments/past — remove all past appointments
export async function DELETE() {
  const now = new Date().toISOString();

  const { data: deleted, error } = await deletePastAppointments(now);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ deleted });
}
