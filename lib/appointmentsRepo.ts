import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';

type AppointmentInput = {
  client_name: string;
  client_phone: string | null;
  starts_at: string;
  service: string | null;
  notes: string | null;
};

type AppointmentUpdate = Partial<AppointmentInput>;

type RepoResult<T> = {
  data: T;
  error: string | null;
};

type GlobalWithMock = typeof globalThis & {
  __mockAppointments?: Appointment[];
};

function isMockAppointmentsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_USE_MOCK_APPOINTMENTS === 'true'
  );
}

function getMockStore(): Appointment[] {
  const g = globalThis as GlobalWithMock;
  if (!g.__mockAppointments) {
    g.__mockAppointments = [];
  }
  return g.__mockAppointments;
}

function sortByStartsAt(items: Appointment[]): Appointment[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export async function listAppointments(): Promise<RepoResult<Appointment[]>> {
  if (isMockAppointmentsEnabled()) {
    return { data: sortByStartsAt(getMockStore()), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('starts_at', { ascending: true });
    return { data: data ?? [], error: error?.message ?? null };
  } catch {
    return { data: [], error: 'Supabase unreachable' };
  }
}

export async function createAppointment(
  input: AppointmentInput,
): Promise<RepoResult<Appointment | null>> {
  if (isMockAppointmentsEnabled()) {
    const now = new Date().toISOString();
    const created: Appointment = {
      id: crypto.randomUUID(),
      client_name: input.client_name,
      client_phone: input.client_phone,
      starts_at: input.starts_at,
      service: input.service,
      notes: input.notes,
      created_at: now,
    };
    const store = getMockStore();
    store.push(created);
    return { data: created, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(input)
      .select()
      .single();
    return { data, error: error?.message ?? null };
  } catch {
    return { data: null, error: 'Supabase unreachable' };
  }
}

export async function updateAppointment(
  id: string,
  update: AppointmentUpdate,
): Promise<RepoResult<Appointment | null>> {
  if (isMockAppointmentsEnabled()) {
    const store = getMockStore();
    const idx = store.findIndex((item) => item.id === id);
    if (idx < 0) return { data: null, error: null };

    const current = store[idx];
    const updated: Appointment = {
      ...current,
      ...update,
      client_name: (update.client_name ?? current.client_name) as string,
      starts_at: (update.starts_at ?? current.starts_at) as string,
    };
    store[idx] = updated;
    return { data: updated, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    return { data, error: error?.message ?? null };
  } catch {
    return { data: null, error: 'Supabase unreachable' };
  }
}

export async function deleteAppointment(id: string): Promise<RepoResult<null>> {
  if (isMockAppointmentsEnabled()) {
    const store = getMockStore();
    const initialLen = store.length;
    const next = store.filter((item) => item.id !== id);
    (globalThis as GlobalWithMock).__mockAppointments = next;
    if (next.length === initialLen) {
      return { data: null, error: 'Appointment not found' };
    }
    return { data: null, error: null };
  }

  try {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    return { data: null, error: error?.message ?? null };
  } catch {
    return { data: null, error: 'Supabase unreachable' };
  }
}

export async function deletePastAppointments(
  nowIso: string,
): Promise<RepoResult<number>> {
  if (isMockAppointmentsEnabled()) {
    const store = getMockStore();
    const next = store.filter(
      (item) => new Date(item.starts_at).getTime() >= new Date(nowIso).getTime(),
    );
    (globalThis as GlobalWithMock).__mockAppointments = next;
    return { data: store.length - next.length, error: null };
  }

  try {
    const { error, count } = await supabase
      .from('appointments')
      .delete({ count: 'exact' })
      .lt('starts_at', nowIso);
    return { data: count ?? 0, error: error?.message ?? null };
  } catch {
    return { data: 0, error: 'Supabase unreachable' };
  }
}
