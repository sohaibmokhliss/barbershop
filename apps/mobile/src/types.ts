export type ViewMode = 'list' | 'calendar';

export type AppointmentDraft = {
  clientName: string;
  clientPhone: string;
  startsAt: string;
  service: string;
  notes: string;
};

export type PendingAction = 'create' | 'update' | 'delete' | null;
export type SyncStatus = 'idle' | 'syncing' | 'error';

export type LocalAppointment = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  startsAt: string;
  service: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  pendingAction: PendingAction;
  syncError: string | null;
  deleted: boolean;
};

export type MobileSession = {
  username: string;
  token: string;
  baseUrl: string;
  expiresAt: string;
};

export type ServerAppointment = {
  id: string;
  client_name: string;
  client_phone: string | null;
  starts_at: string;
  service: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type CreateQueueOperation = {
  id: string;
  type: 'create';
  appointmentId: string;
  createdAt: string;
  appointment: {
    id: string;
    client_name: string;
    client_phone: string | null;
    starts_at: string;
    service: string | null;
    notes: string | null;
  };
  lastError?: string | null;
};

export type UpdateQueueOperation = {
  id: string;
  type: 'update';
  appointmentId: string;
  createdAt: string;
  changes: Partial<{
    client_name: string;
    client_phone: string | null;
    starts_at: string;
    service: string | null;
    notes: string | null;
  }>;
  lastError?: string | null;
};

export type DeleteQueueOperation = {
  id: string;
  type: 'delete';
  appointmentId: string;
  createdAt: string;
  lastError?: string | null;
};

export type QueueOperation =
  | CreateQueueOperation
  | UpdateQueueOperation
  | DeleteQueueOperation;

export type SyncResult = {
  id: string;
  type: QueueOperation['type'];
  ok: boolean;
  error?: string;
  appointment?: ServerAppointment | null;
};
