import { NextRequest, NextResponse } from 'next/server';
import { createAppointment, listAppointments } from '@/lib/appointmentsRepo';

export const dynamic = 'force-dynamic';

// GET /api/appointments — list all appointments ordered by starts_at
export async function GET() {
  const { data, error } = await listAppointments();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/appointments — create a new appointment
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { client_name, client_phone, starts_at, service, notes } = body;

  if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
  }
  if (!starts_at || typeof starts_at !== 'string') {
    return NextResponse.json({ error: 'starts_at is required' }, { status: 400 });
  }

  const { data, error } = await createAppointment({
    client_name: (client_name as string).trim(),
    client_phone:
      typeof client_phone === 'string' && client_phone.trim()
        ? client_phone.trim()
        : null,
    starts_at,
    service: typeof service === 'string' && service.trim() ? service.trim() : null,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
