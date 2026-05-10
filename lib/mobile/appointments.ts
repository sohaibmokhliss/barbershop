import { getSupabaseClient } from '@/lib/supabase';

export type MobileAppointment = {
  id: string;
  client_name: string;
  client_phone: string | null;
  starts_at: string;
  service: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type MobileAppointmentInput = {
  id?: string;
  client_name: string;
  client_phone: string | null;
  starts_at: string;
  service: string | null;
  notes: string | null;
};

export type MobileAppointmentUpdate = Partial<Omit<MobileAppointmentInput, 'id'>> & {
  id: string;
};

type RepoResult<T> = {
  data: T;
  error: string | null;
};

type QueryError = {
  message?: string;
  code?: string;
};

const APPOINTMENT_FIELDS_WITH_UPDATED_AT =
  'id,client_name,client_phone,starts_at,service,notes,created_at,updated_at';
const APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT =
  'id,client_name,client_phone,starts_at,service,notes,created_at';

type UpdatedAtColumnState = 'unknown' | 'present' | 'missing';

let updatedAtColumnState: UpdatedAtColumnState = 'unknown';

function sortByStartsAt(items: MobileAppointment[]): MobileAppointment[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

function normalizeAppointment(
  row: Partial<MobileAppointment> | null | undefined,
): MobileAppointment | null {
  if (!row) return null;
  if (
    typeof row.id !== 'string' ||
    typeof row.client_name !== 'string' ||
    typeof row.starts_at !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: row.id,
    client_name: row.client_name,
    client_phone:
      typeof row.client_phone === 'string' || row.client_phone === null
        ? row.client_phone
        : null,
    starts_at: row.starts_at,
    service:
      typeof row.service === 'string' || row.service === null
        ? row.service
        : null,
    notes: typeof row.notes === 'string' || row.notes === null ? row.notes : null,
    created_at: row.created_at,
    updated_at:
      typeof row.updated_at === 'string' || row.updated_at === null
        ? row.updated_at ?? null
        : null,
  };
}

function usesUpdatedAtColumn(): boolean {
  return updatedAtColumnState !== 'missing';
}

function getAppointmentSelectFields(): string {
  return usesUpdatedAtColumn()
    ? APPOINTMENT_FIELDS_WITH_UPDATED_AT
    : APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT;
}

function markUpdatedAtColumnState(error: unknown): void {
  if (isMissingUpdatedAtColumnError(error)) {
    updatedAtColumnState = 'missing';
  }
}

function markUpdatedAtColumnPresent(): void {
  if (updatedAtColumnState === 'unknown') {
    updatedAtColumnState = 'present';
  }
}

function isMissingUpdatedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const typedError = error as { code?: unknown; message?: unknown };
  const code = typeof typedError.code === 'string' ? typedError.code : '';
  const message =
    typeof typedError.message === 'string' ? typedError.message : '';

  return (
    code === '42703' ||
    /updated_at/i.test(message) && /does not exist|could not find/i.test(message)
  );
}

function getErrorMessage(error: QueryError | null | undefined): string | null {
  return typeof error?.message === 'string' ? error.message : null;
}

async function listAppointmentsWithFields(
  fields: string,
  since?: string,
): Promise<{ data: unknown[] | null; error: QueryError | null }> {
  const supabase = getSupabaseClient();
  let query = supabase.from('appointments').select(fields).order('starts_at', {
    ascending: true,
  });

  if (since && fields === APPOINTMENT_FIELDS_WITH_UPDATED_AT) {
    query = query.gte('updated_at', since);
  }

  return query;
}

function normalizeRows(data: unknown[] | null | undefined): MobileAppointment[] {
  return (data ?? [])
    .map((item) => normalizeAppointment(item as Partial<MobileAppointment>))
    .filter((item): item is MobileAppointment => item !== null);
}

export async function listMobileAppointments(): Promise<
  RepoResult<MobileAppointment[]>
> {
  return listMobileAppointmentsSince();
}

export async function listMobileAppointmentsSince(
  since?: string,
): Promise<RepoResult<MobileAppointment[]>> {
  try {
    const preferredFields = getAppointmentSelectFields();
    const { data, error } = await listAppointmentsWithFields(
      preferredFields,
      since,
    );

    if (error && isMissingUpdatedAtColumnError(error) && preferredFields !== APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT) {
      markUpdatedAtColumnState(error);
      const fallback = await listAppointmentsWithFields(
        APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT,
        since,
      );

      return {
        data: sortByStartsAt(normalizeRows(fallback.data)),
        error: getErrorMessage(fallback.error),
      };
    }

    if (!error && preferredFields === APPOINTMENT_FIELDS_WITH_UPDATED_AT) {
      markUpdatedAtColumnPresent();
    }

    if (error) {
      markUpdatedAtColumnState(error);
    }

    return {
      data: sortByStartsAt(normalizeRows(data)),
      error: getErrorMessage(error as QueryError | null),
    };
  } catch {
    return { data: [], error: 'Supabase unreachable' };
  }
}

export async function createMobileAppointment(
  input: MobileAppointmentInput,
): Promise<RepoResult<MobileAppointment | null>> {
  try {
    const supabase = getSupabaseClient();
    const row = {
      id: input.id ?? crypto.randomUUID(),
      client_name: input.client_name,
      client_phone: input.client_phone,
      starts_at: input.starts_at,
      service: input.service,
      notes: input.notes,
    };

    const insertWithFields = async (fields: string) =>
      supabase.from('appointments').insert(row).select(fields).single();

    const preferredFields = getAppointmentSelectFields();
    let { data, error } = await insertWithFields(preferredFields);

    if (
      error &&
      isMissingUpdatedAtColumnError(error) &&
      preferredFields !== APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT
    ) {
      markUpdatedAtColumnState(error);
      ({ data, error } = await insertWithFields(
        APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT,
      ));
    }

    if (!error && preferredFields === APPOINTMENT_FIELDS_WITH_UPDATED_AT) {
      markUpdatedAtColumnPresent();
    }

    if (error) {
      markUpdatedAtColumnState(error);
    }

    return {
      data: normalizeAppointment(
        data as Partial<MobileAppointment> | null | undefined,
      ),
      error: getErrorMessage(error as QueryError | null),
    };
  } catch {
    return { data: null, error: 'Supabase unreachable' };
  }
}

export async function updateMobileAppointment(
  input: MobileAppointmentUpdate,
): Promise<RepoResult<MobileAppointment | null>> {
  try {
    const supabase = getSupabaseClient();
    const { id, ...update } = input;
    const updateWithFields = async (fields: string) =>
      supabase
        .from('appointments')
        .update(update)
        .eq('id', id)
        .select(fields)
        .single();

    const preferredFields = getAppointmentSelectFields();
    let { data, error } = await updateWithFields(preferredFields);

    if (
      error &&
      isMissingUpdatedAtColumnError(error) &&
      preferredFields !== APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT
    ) {
      markUpdatedAtColumnState(error);
      ({ data, error } = await updateWithFields(
        APPOINTMENT_FIELDS_WITHOUT_UPDATED_AT,
      ));
    }

    if (!error && preferredFields === APPOINTMENT_FIELDS_WITH_UPDATED_AT) {
      markUpdatedAtColumnPresent();
    }

    if (error) {
      markUpdatedAtColumnState(error);
    }

    return {
      data: normalizeAppointment(
        data as Partial<MobileAppointment> | null | undefined,
      ),
      error: getErrorMessage(error as QueryError | null),
    };
  } catch {
    return { data: null, error: 'Supabase unreachable' };
  }
}

export async function deleteMobileAppointment(
  id: string,
): Promise<RepoResult<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    return { data: !error, error: getErrorMessage(error as QueryError | null) };
  } catch {
    return { data: false, error: 'Supabase unreachable' };
  }
}
