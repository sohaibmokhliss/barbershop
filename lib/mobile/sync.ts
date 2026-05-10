import type {
  MobileAppointment,
  MobileAppointmentInput,
  MobileAppointmentUpdate,
} from '@/lib/mobile/appointments';
import {
  createMobileAppointment,
  deleteMobileAppointment,
  listMobileAppointments,
  listMobileAppointmentsSince,
  updateMobileAppointment,
} from '@/lib/mobile/appointments';

type MobileAppointmentFields = {
  client_name?: string;
  client_phone?: string | null;
  starts_at?: string;
  service?: string | null;
  notes?: string | null;
};

type MobileCreateOperation = {
  id: string;
  type: 'create';
  appointment: MobileAppointmentFields & { id?: string };
};

type MobileUpdateOperation = {
  id: string;
  type: 'update';
  appointmentId: string;
  changes: MobileAppointmentFields;
};

type MobileDeleteOperation = {
  id: string;
  type: 'delete';
  appointmentId: string;
};

export type MobileSyncOperation =
  | MobileCreateOperation
  | MobileUpdateOperation
  | MobileDeleteOperation;

export type MobileSyncResult = {
  id: string;
  type: MobileSyncOperation['type'];
  ok: boolean;
  error?: string;
  appointment?: MobileAppointment | null;
};

export type MobileSyncPayload = {
  operations: MobileSyncOperation[];
};

export type MobileSyncResponse = {
  serverTime: string;
  cursor: string;
  appointments: MobileAppointment[];
  results?: MobileSyncResult[];
  error?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCreateInput(
  input: MobileAppointmentFields,
): MobileAppointmentInput | null {
  if (!isNonEmptyString(input.client_name) || !isNonEmptyString(input.starts_at)) {
    return null;
  }

  return {
    client_name: input.client_name.trim(),
    client_phone: normalizeNullableString(input.client_phone ?? null),
    starts_at: input.starts_at.trim(),
    service: normalizeNullableString(input.service ?? null),
    notes: normalizeNullableString(input.notes ?? null),
  };
}

function normalizeUpdateInput(
  input: MobileAppointmentFields,
  id: string,
): MobileAppointmentUpdate | null {
  if (!isNonEmptyString(id)) return null;

  const update: MobileAppointmentUpdate = { id };

  if (typeof input.client_name === 'string' && input.client_name.trim()) {
    update.client_name = input.client_name.trim();
  }
  if (typeof input.client_phone !== 'undefined') {
    update.client_phone = normalizeNullableString(input.client_phone);
  }
  if (typeof input.starts_at === 'string' && input.starts_at.trim()) {
    update.starts_at = input.starts_at.trim();
  }
  if (typeof input.service !== 'undefined') {
    update.service = normalizeNullableString(input.service);
  }
  if (typeof input.notes !== 'undefined') {
    update.notes = normalizeNullableString(input.notes);
  }

  if (Object.keys(update).length === 1) return null;
  return update;
}

export async function pullMobileAppointments(options?: {
  since?: string;
}): Promise<MobileSyncResponse> {
  const { data, error } = options?.since
    ? await listMobileAppointmentsSince(options.since)
    : await listMobileAppointments();
  const serverTime = new Date().toISOString();
  return {
    serverTime,
    cursor: serverTime,
    appointments: data,
    error: error ?? undefined,
  };
}

export async function pushMobileOperations(
  payload: MobileSyncPayload,
): Promise<MobileSyncResponse> {
  const results: MobileSyncResult[] = [];

  for (const operation of payload.operations) {
    if (!operation || typeof operation !== 'object') {
      continue;
    }

    if (operation.type === 'create') {
      const normalized = normalizeCreateInput(operation.appointment);
      if (!normalized) {
        results.push({
          id: operation.id,
          type: 'create',
          ok: false,
          error: 'Invalid create payload',
        });
        continue;
      }

      const { data, error } = await createMobileAppointment({
        ...normalized,
        id: operation.appointment.id,
      });

      results.push({
        id: operation.id,
        type: 'create',
        ok: !error && Boolean(data),
        error: error ?? undefined,
        appointment: data,
      });
      continue;
    }

    if (operation.type === 'update') {
      const normalized = normalizeUpdateInput(operation.changes, operation.appointmentId);
      if (!normalized) {
        results.push({
          id: operation.id,
          type: 'update',
          ok: false,
          error: 'Invalid update payload',
        });
        continue;
      }

      const { data, error } = await updateMobileAppointment(normalized);
      results.push({
        id: operation.id,
        type: 'update',
        ok: !error && Boolean(data),
        error: error ?? undefined,
        appointment: data,
      });
      continue;
    }

    if (operation.type === 'delete') {
      if (!isNonEmptyString(operation.appointmentId)) {
        results.push({
          id: operation.id,
          type: 'delete',
          ok: false,
          error: 'Invalid delete payload',
        });
        continue;
      }

      const { data, error } = await deleteMobileAppointment(operation.appointmentId);
      results.push({
        id: operation.id,
        type: 'delete',
        ok: data && !error,
        error: error ?? undefined,
      });
    }
  }

  const { data, error } = await listMobileAppointments();
  const serverTime = new Date().toISOString();
  return {
    serverTime,
    cursor: serverTime,
    appointments: data,
    results,
    error: error ?? undefined,
  };
}
