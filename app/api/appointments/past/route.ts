import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/appointments/past — remove all past appointments
export async function DELETE() {
  const now = new Date().toISOString();

  const { error, count } = await supabase
    .from('appointments')
    .delete({ count: 'exact' })
    .lt('starts_at', now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}
