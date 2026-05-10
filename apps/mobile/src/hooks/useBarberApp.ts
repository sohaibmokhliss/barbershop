import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type {
  AppointmentDraft,
  LocalAppointment,
  MobileSession,
  QueueOperation,
  ServerAppointment,
  SyncResult,
  SyncStatus,
} from '../types';
import {
  clearSession,
  loadAppointments,
  loadCursor,
  loadQueue,
  loadServerUrl,
  loadSession,
  saveAppointments,
  saveCursor,
  saveQueue,
  saveServerUrl,
  saveSession,
} from '../lib/localStore';
import { createId } from '../lib/ids';
import {
  getDefaultBackendUrl,
  loginToBackend,
  pullFromBackend,
  pushToBackend,
} from '../lib/api';

function sortAppointments(items: LocalAppointment[]): LocalAppointment[] {
  return [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function draftToLocal(input: AppointmentDraft) {
  return {
    clientName: input.clientName.trim(),
    clientPhone: trimToNull(input.clientPhone),
    startsAt: input.startsAt.trim(),
    service: trimToNull(input.service),
    notes: trimToNull(input.notes),
  };
}

function localToCreatePayload(item: LocalAppointment) {
  return {
    id: item.id,
    client_name: item.clientName,
    client_phone: item.clientPhone,
    starts_at: item.startsAt,
    service: item.service,
    notes: item.notes,
  };
}

function localToServerPatch(input: ReturnType<typeof draftToLocal>) {
  return {
    client_name: input.clientName,
    client_phone: input.clientPhone,
    starts_at: input.startsAt,
    service: input.service,
    notes: input.notes,
  };
}

function fromServer(item: ServerAppointment): LocalAppointment {
  return {
    id: item.id,
    clientName: item.client_name,
    clientPhone: item.client_phone ?? null,
    startsAt: item.starts_at,
    service: item.service ?? null,
    notes: item.notes ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at ?? item.created_at,
    lastSyncedAt: item.updated_at ?? item.created_at,
    pendingAction: null,
    syncError: null,
    deleted: false,
  };
}

function replaceAppointment(
  items: LocalAppointment[],
  next: LocalAppointment,
): LocalAppointment[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return sortAppointments([...items, next]);
  const copy = [...items];
  copy[index] = next;
  return sortAppointments(copy);
}

function markAppointmentError(
  items: LocalAppointment[],
  appointmentId: string,
  error: string,
): LocalAppointment[] {
  return items.map((item) =>
    item.id === appointmentId ? { ...item, syncError: error } : item,
  );
}

function upsertServerRecords(
  localItems: LocalAppointment[],
  remoteItems: ServerAppointment[],
): LocalAppointment[] {
  let next = [...localItems];
  for (const remote of remoteItems) {
    const pending = next.find((item) => item.id === remote.id && item.pendingAction);
    if (pending) continue;
    next = replaceAppointment(next, fromServer(remote));
  }
  return sortAppointments(next);
}

function mergeUpdateQueue(
  queue: QueueOperation[],
  appointmentId: string,
  changes: ReturnType<typeof localToServerPatch>,
): QueueOperation[] {
  const existingIndex = queue.findIndex(
    (operation) => operation.type === 'update' && operation.appointmentId === appointmentId,
  );

  if (existingIndex >= 0) {
    const copy = [...queue];
    const existing = copy[existingIndex];
    if (existing.type === 'update') {
      copy[existingIndex] = {
        ...existing,
        changes: { ...existing.changes, ...changes },
        lastError: null,
      };
    }
    return copy;
  }

  return [
    ...queue,
    {
      id: createId('queue'),
      type: 'update',
      appointmentId,
      createdAt: new Date().toISOString(),
      changes,
      lastError: null,
    },
  ];
}

function queueCreate(queue: QueueOperation[], appointment: LocalAppointment): QueueOperation[] {
  return [
    ...queue.filter((operation) => operation.appointmentId !== appointment.id),
    {
      id: createId('queue'),
      type: 'create',
      appointmentId: appointment.id,
      createdAt: new Date().toISOString(),
      appointment: localToCreatePayload(appointment),
      lastError: null,
    },
  ];
}

function queueUpdate(
  queue: QueueOperation[],
  appointment: LocalAppointment,
  changes: ReturnType<typeof localToServerPatch>,
): QueueOperation[] {
  const createIndex = queue.findIndex(
    (operation) => operation.type === 'create' && operation.appointmentId === appointment.id,
  );

  if (createIndex >= 0) {
    const copy = [...queue];
    const existing = copy[createIndex];
    if (existing.type === 'create') {
      copy[createIndex] = {
        ...existing,
        appointment: localToCreatePayload(appointment),
        lastError: null,
      };
    }
    return copy;
  }

  return mergeUpdateQueue(queue, appointment.id, changes);
}

function queueDelete(queue: QueueOperation[], appointmentId: string): QueueOperation[] {
  const hasUnsyncedCreate = queue.some(
    (operation) => operation.type === 'create' && operation.appointmentId === appointmentId,
  );
  if (hasUnsyncedCreate) {
    return queue.filter((operation) => operation.appointmentId !== appointmentId);
  }

  return [
    ...queue.filter(
      (operation) =>
        !(operation.appointmentId === appointmentId && operation.type === 'update'),
    ),
    {
      id: createId('queue'),
      type: 'delete',
      appointmentId,
      createdAt: new Date().toISOString(),
      lastError: null,
    },
  ];
}

function applyPushResults(
  items: LocalAppointment[],
  queue: QueueOperation[],
  results: SyncResult[],
): { appointments: LocalAppointment[]; queue: QueueOperation[] } {
  let nextAppointments = [...items];
  let nextQueue = [...queue];

  for (const result of results) {
    const queueItem = nextQueue.find((item) => item.id === result.id);
    if (!queueItem) continue;

    if (!result.ok) {
      nextAppointments = markAppointmentError(
        nextAppointments,
        queueItem.appointmentId,
        result.error ?? 'Erreur de synchronisation',
      );
      nextQueue = nextQueue.map((item) =>
        item.id === result.id ? { ...item, lastError: result.error ?? 'Erreur' } : item,
      );
      continue;
    }

    nextQueue = nextQueue.filter((item) => item.id !== result.id);

    if (queueItem.type === 'delete') {
      nextAppointments = nextAppointments.filter((item) => item.id !== queueItem.appointmentId);
      continue;
    }

    if (result.appointment) {
      nextAppointments = replaceAppointment(nextAppointments, fromServer(result.appointment));
    }
  }

  return {
    appointments: sortAppointments(nextAppointments),
    queue: nextQueue,
  };
}

export function useBarberApp() {
  const [ready, setReady] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getDefaultBackendUrl());
  const [auth, setAuth] = useState<MobileSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<LocalAppointment[]>([]);
  const [queue, setQueue] = useState<QueueOperation[]>([]);
  const [cursor, setCursorState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const authRef = useRef<MobileSession | null>(null);
  const queueRef = useRef<QueueOperation[]>([]);
  const appointmentsRef = useRef<LocalAppointment[]>([]);
  const cursorRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    void (async () => {
      const [storedUrl, storedSession, storedAppointments, storedQueue, storedCursor] =
        await Promise.all([
          loadServerUrl(),
          loadSession(),
          loadAppointments(),
          loadQueue(),
          loadCursor(),
        ]);

      const defaultUrl = getDefaultBackendUrl();
      const resolvedUrl = defaultUrl || storedUrl;
      setServerUrlState(resolvedUrl);
      if (resolvedUrl && resolvedUrl !== storedUrl) {
        await saveServerUrl(resolvedUrl);
      }
      setAuth(storedSession);
      setAppointments(sortAppointments(storedAppointments));
      setQueue(storedQueue);
      setCursorState(storedCursor);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveAppointments(appointments);
  }, [appointments, ready]);

  useEffect(() => {
    if (!ready) return;
    void saveQueue(queue);
  }, [queue, ready]);

  useEffect(() => {
    if (!ready) return;
    void saveCursor(cursor);
  }, [cursor, ready]);

  async function persistServerUrl(nextUrl: string) {
    setServerUrlState(nextUrl);
    await saveServerUrl(nextUrl);
  }

  async function syncNow() {
    if (!authRef.current || syncingRef.current) return;

    syncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      let nextAppointments = appointmentsRef.current;
      let nextQueue = queueRef.current;
      let nextCursor = cursorRef.current;

      if (nextQueue.length > 0) {
        const pushed = await pushToBackend(authRef.current, nextQueue);
        const afterPush = applyPushResults(nextAppointments, nextQueue, pushed.results ?? []);
        nextAppointments = upsertServerRecords(afterPush.appointments, pushed.appointments);
        nextQueue = afterPush.queue;
        nextCursor = pushed.cursor;
      }

      const pulled = await pullFromBackend(authRef.current, nextCursor);
      nextAppointments = upsertServerRecords(nextAppointments, pulled.appointments);
      nextCursor = pulled.cursor;

      setAppointments(nextAppointments);
      setQueue(nextQueue);
      setCursorState(nextCursor);
      setSyncStatus('idle');
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Synchronisation impossible.');
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && authRef.current) {
        void syncNow();
      }
    });

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && authRef.current) {
        void syncNow();
      }
    });

    return () => {
      unsubscribeNetInfo();
      subscription.remove();
    };
  }, []);

  async function signIn(login: string, password: string) {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const session = await loginToBackend(serverUrl, login, password);
      authRef.current = session;
      setAuth(session);
      await saveSession(session);
      await persistServerUrl(session.baseUrl);
      await syncNow();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    authRef.current = null;
    setAuth(null);
    setCursorState(null);
    setAuthError(null);
    setSyncError(null);
    await clearSession();
  }

  async function createAppointment(input: AppointmentDraft) {
    const normalized = draftToLocal(input);
    if (!normalized.clientName || !normalized.startsAt) {
      setSyncError('Nom du client et date/heure sont requis.');
      return;
    }

    setIsMutating(true);
    setSyncError(null);
    const now = new Date().toISOString();
    const appointment: LocalAppointment = {
      id: createId('appointment'),
      clientName: normalized.clientName,
      clientPhone: normalized.clientPhone,
      startsAt: normalized.startsAt,
      service: normalized.service,
      notes: normalized.notes,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      pendingAction: 'create',
      syncError: null,
      deleted: false,
    };

    setAppointments((current) => replaceAppointment(current, appointment));
    setQueue((current) => queueCreate(current, appointment));
    setIsMutating(false);
  }

  async function updateAppointment(id: string, input: AppointmentDraft) {
    const normalized = draftToLocal(input);
    if (!normalized.clientName || !normalized.startsAt) {
      setSyncError('Nom du client et date/heure sont requis.');
      return;
    }

    setIsMutating(true);
    setSyncError(null);
    const current = appointmentsRef.current.find((item) => item.id === id);
    if (!current) {
      setIsMutating(false);
      return;
    }

    const updated: LocalAppointment = {
      ...current,
      clientName: normalized.clientName,
      clientPhone: normalized.clientPhone,
      startsAt: normalized.startsAt,
      service: normalized.service,
      notes: normalized.notes,
      updatedAt: new Date().toISOString(),
      pendingAction: current.pendingAction === 'create' ? 'create' : 'update',
      syncError: null,
      deleted: false,
    };

    setAppointments((items) => replaceAppointment(items, updated));
    setQueue((items) => queueUpdate(items, updated, localToServerPatch(normalized)));
    setIsMutating(false);
  }

  async function deleteAppointment(id: string) {
    setIsMutating(true);
    setSyncError(null);
    const current = appointmentsRef.current.find((item) => item.id === id);
    if (!current) {
      setIsMutating(false);
      return;
    }

    const nextQueue = queueDelete(queueRef.current, id);
    const removedUnsyncedCreate = nextQueue.every((item) => item.appointmentId !== id);

    if (removedUnsyncedCreate && current.pendingAction === 'create') {
      setAppointments((items) => items.filter((item) => item.id !== id));
      setQueue(nextQueue);
      setIsMutating(false);
      return;
    }

    setAppointments((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              deleted: true,
              pendingAction: 'delete',
              syncError: null,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setQueue(nextQueue);
    setIsMutating(false);
  }

  async function deletePastAppointments() {
    setIsMutating(true);
    setSyncError(null);

    const now = Date.now();
    const pastAppointments = appointmentsRef.current.filter(
      (item) => !item.deleted && new Date(item.startsAt).getTime() < now,
    );

    if (pastAppointments.length === 0) {
      setIsMutating(false);
      return 0;
    }

    let nextQueue = queueRef.current;
    let nextAppointments = appointmentsRef.current;

    for (const appointment of pastAppointments) {
      nextQueue = queueDelete(nextQueue, appointment.id);
      const removedUnsyncedCreate = nextQueue.every(
        (item) => item.appointmentId !== appointment.id,
      );

      if (removedUnsyncedCreate && appointment.pendingAction === 'create') {
        nextAppointments = nextAppointments.filter(
          (item) => item.id !== appointment.id,
        );
        continue;
      }

      nextAppointments = nextAppointments.map((item) =>
        item.id === appointment.id
          ? {
              ...item,
              deleted: true,
              pendingAction: 'delete',
              syncError: null,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
    }

    setAppointments(nextAppointments);
    setQueue(nextQueue);
    setIsMutating(false);
    return pastAppointments.length;
  }

  return {
    ready,
    auth,
    authError,
    syncStatus,
    syncError,
    pendingCount: queue.length,
    visibleAppointments: appointments.filter((item) => !item.deleted),
    signIn,
    signOut,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deletePastAppointments,
    syncNow,
    isSigningIn,
    isMutating,
  };
}
