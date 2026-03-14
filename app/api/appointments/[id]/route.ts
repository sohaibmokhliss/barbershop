import { NextRequest, NextResponse } from 'next/server';
import { deleteAppointment, updateAppointment } from '@/lib/appointmentsRepo';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UPDATABLE_FIELDS = [
  'client_name',
  'client_phone',
  'starts_at',
  'service',
  'notes',
] as const;

type Context = { params: Promise<{ id: string }> };

// PATCH /api/appointments/:id — update fields of an appointment
export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Only allow whitelisted fields to prevent updating id / created_at
  const update: Record<string, unknown> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) {
      update[field] = body[field] === '' ? null : body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await updateAppointment(id, update);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// DELETE /api/appointments/:id — remove an appointment
export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
  }

  const { error } = await deleteAppointment(id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
