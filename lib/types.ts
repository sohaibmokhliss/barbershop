export type Appointment = {
  id: string;
  client_name: string;
  client_phone: string | null;
  starts_at: string;
  service: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};
