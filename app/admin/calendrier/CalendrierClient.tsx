'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/types';

type ViewMode = 'day' | 'week' | 'month';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function toTimeKey(date: Date): string {
  const flooredMinutes = date.getMinutes() < 30 ? 0 : 30;
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(flooredMinutes).padStart(2, '0');
  return `${hour}:${minute}`;
}

function toDateLabel(dateKey: string): string {
  const d = fromDateKey(dateKey);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function toMonthLabel(dateKey: string): string {
  const d = fromDateKey(dateKey);
  return d.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toShortWeekday(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('fr-FR', {
    weekday: 'short',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

const DAY_SLOTS = buildSlots();

export default function CalendrierClient({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(
    null,
  );
  const router = useRouter();

  const sortedAppointments = useMemo(() => {
    return [...initialAppointments].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [initialAppointments]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of sortedAppointments) {
      const key = toDateKey(new Date(apt.starts_at));
      const list = map.get(key) ?? [];
      list.push(apt);
      map.set(key, list);
    }
    return map;
  }, [sortedAppointments]);

  const dayAppointments = useMemo(() => {
    return appointmentsByDate.get(selectedDate) ?? [];
  }, [appointmentsByDate, selectedDate]);

  const occupiedBySlot = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of dayAppointments) {
      const slot = toTimeKey(new Date(apt.starts_at));
      const prev = map.get(slot) ?? [];
      prev.push(apt);
      map.set(slot, prev);
    }
    return map;
  }, [dayAppointments]);

  const weekDateKeys = useMemo(() => {
    const start = startOfWeek(fromDateKey(selectedDate));
    return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
  }, [selectedDate]);

  const monthDateKeys = useMemo(() => {
    const current = fromDateKey(selectedDate);
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const gridStart = startOfWeek(monthStart);
    const endWeekStart = startOfWeek(monthEnd);
    const gridEnd = addDays(endWeekStart, 6);

    const keys: string[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      keys.push(toDateKey(cursor));
      cursor = addDays(cursor, 1);
    }
    return keys;
  }, [selectedDate]);

  function shiftSelectedDate(delta: number) {
    const current = fromDateKey(selectedDate);
    if (viewMode === 'day') {
      setSelectedDate(toDateKey(addDays(current, delta)));
      return;
    }
    if (viewMode === 'week') {
      setSelectedDate(toDateKey(addDays(current, delta * 7)));
      return;
    }
    const shifted = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    setSelectedDate(toDateKey(shifted));
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪒</span>
          <span className="font-bold text-lg">Yassine — Calendrier</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/rendezvous"
            className="text-sm text-gray-300 hover:text-white underline transition"
          >
            Rendez-vous
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white underline transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Calendrier</p>
              {viewMode === 'month' ? (
                <h2 className="text-xl font-semibold text-gray-900 capitalize mt-1">
                  {toMonthLabel(selectedDate)}
                </h2>
              ) : (
                <h2 className="text-xl font-semibold text-gray-900 capitalize mt-1">
                  {toDateLabel(selectedDate)}
                </h2>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    viewMode === 'day' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    viewMode === 'week' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    viewMode === 'month' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Mois
                </button>
              </div>

              <button
                onClick={() => shiftSelectedDate(-1)}
                className="self-end border border-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
              >
                ←
              </button>

              <div>
                <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <button
                onClick={() => shiftSelectedDate(1)}
                className="self-end border border-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
              >
                →
              </button>

              <button
                onClick={() => setSelectedDate(toDateKey(new Date()))}
                className="self-end border border-gray-300 px-3 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
              >
                Aujourd hui
              </button>

              <button
                onClick={() => router.refresh()}
                className="self-end bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition text-sm"
              >
                Rafraichir
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total rendez-vous</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dayAppointments.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Creneaux occupes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{occupiedBySlot.size}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Creneaux libres</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {Math.max(0, DAY_SLOTS.length - occupiedBySlot.size)}
            </p>
          </div>
        </section>

        {viewMode === 'day' && (
          <>
            <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Occupation des creneaux</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {DAY_SLOTS.map((slot) => {
                  const slotAppointments = occupiedBySlot.get(slot) ?? [];
                  const occupied = slotAppointments.length > 0;
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        if (slotAppointments[0]) setSelectedAppointment(slotAppointments[0]);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm text-left ${
                        occupied
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}
                    >
                      <p className="font-semibold">{slot}</p>
                      <p className="text-xs mt-1">
                        {occupied
                          ? `${slotAppointments.length} occupe${slotAppointments.length > 1 ? 's' : ''}`
                          : 'Libre'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Rendez-vous du jour</h3>
              {dayAppointments.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun rendez-vous pour cette date.</p>
              ) : (
                <div className="space-y-3">
                  {dayAppointments.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className="w-full text-left border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatAppointmentTime(apt.starts_at)} - {apt.client_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {apt.service ?? 'Service non precise'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {apt.client_phone ?? 'Pas de telephone'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {viewMode === 'week' && (
          <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Vue semaine</h3>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDateKeys.map((dateKey) => {
                const list = appointmentsByDate.get(dateKey) ?? [];
                return (
                  <div key={dateKey} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                    <button
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setViewMode('day');
                      }}
                      className="w-full text-left"
                    >
                      <p className="text-xs uppercase text-gray-500">
                        {toShortWeekday(dateKey)}
                      </p>
                      <p className="font-semibold text-gray-900">{dateKey.slice(8, 10)}</p>
                    </button>
                    <div className="mt-2 space-y-2">
                      {list.length === 0 ? (
                        <p className="text-xs text-gray-400">Libre</p>
                      ) : (
                        list.map((apt) => (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className="w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-100"
                          >
                            {formatAppointmentTime(apt.starts_at)} - {apt.client_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {viewMode === 'month' && (
          <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Vue mois</h3>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <p key={d} className="text-xs text-center text-gray-500 uppercase">
                  {d}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthDateKeys.map((dateKey) => {
                const list = appointmentsByDate.get(dateKey) ?? [];
                const sameMonth =
                  fromDateKey(dateKey).getMonth() === fromDateKey(selectedDate).getMonth();
                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setViewMode('day');
                    }}
                    className={`min-h-[92px] border rounded-xl p-2 text-left ${
                      sameMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <p className={`text-xs ${sameMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                      {dateKey.slice(8, 10)}
                    </p>
                    {list.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold text-blue-700 mt-1">
                          {list.length} RDV
                        </p>
                        <p className="text-[11px] text-gray-600 truncate mt-1">
                          {formatAppointmentTime(list[0].starts_at)} {list[0].client_name}
                        </p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {selectedAppointment && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAppointment(null);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Rendez-vous</p>
                <h4 className="text-lg font-semibold text-gray-900 mt-1">
                  {selectedAppointment.client_name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Fermer"
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Date:</span>{' '}
                {formatDateTime(selectedAppointment.starts_at)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Telephone:</span>{' '}
                {selectedAppointment.client_phone ?? 'Non renseigne'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Service:</span>{' '}
                {selectedAppointment.service ?? 'Non precise'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Notes:</span>{' '}
                {selectedAppointment.notes ?? 'Aucune note'}
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
