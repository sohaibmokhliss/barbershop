'use client';

import { useMemo, useState } from 'react';
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
  const date = fromDateKey(dateKey);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function toMonthLabel(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
  for (let hour = 0; hour <= 23; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

const DAY_SLOTS = buildSlots();

export default function PublicCalendarClient({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(
    null,
  );

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [appointments]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of sortedAppointments) {
      const key = toDateKey(new Date(appointment.starts_at));
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    return map;
  }, [sortedAppointments]);

  const dayAppointments = useMemo(() => {
    return appointmentsByDate.get(selectedDate) ?? [];
  }, [appointmentsByDate, selectedDate]);

  const occupiedBySlot = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of dayAppointments) {
      const slot = toTimeKey(new Date(appointment.starts_at));
      const list = map.get(slot) ?? [];
      list.push(appointment);
      map.set(slot, list);
    }
    return map;
  }, [dayAppointments]);

  const weekDateKeys = useMemo(() => {
    const start = startOfWeek(fromDateKey(selectedDate));
    return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(start, index)));
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

  return (
    <div className="mt-10 min-h-screen rounded-[2rem] border border-slate-200/80 bg-gray-50 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <header className="flex items-center justify-between rounded-t-[2rem] bg-gray-900 px-6 py-4 text-white shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪒</span>
          <span className="text-lg font-bold">Yassine — Calendrier</span>
        </div>
        <div className="text-sm text-gray-300">Disponibilité publique</div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Calendrier</p>
              {viewMode === 'month' ? (
                <h2 className="mt-1 text-xl font-semibold capitalize text-gray-900">
                  {toMonthLabel(selectedDate)}
                </h2>
              ) : (
                <h2 className="mt-1 text-xl font-semibold capitalize text-gray-900">
                  {toDateLabel(selectedDate)}
                </h2>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    viewMode === 'day' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    viewMode === 'week' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    viewMode === 'month' ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}
                >
                  Mois
                </button>
              </div>

              <button
                onClick={() => shiftSelectedDate(-1)}
                className="self-end rounded-xl border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-100"
              >
                ←
              </button>

              <div>
                <label
                  htmlFor="selectedDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Date
                </label>
                <input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <button
                onClick={() => shiftSelectedDate(1)}
                className="self-end rounded-xl border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-100"
              >
                →
              </button>

              <button
                onClick={() => setSelectedDate(toDateKey(new Date()))}
                className="self-end rounded-xl border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-100"
              >
                Aujourd hui
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total rendez-vous</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{dayAppointments.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Creneaux occupes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{occupiedBySlot.size}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Creneaux libres</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Math.max(0, DAY_SLOTS.length - occupiedBySlot.size)}
            </p>
          </div>
        </section>

        {viewMode === 'day' && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <h3 className="mb-4 font-semibold text-gray-900">Occupation des creneaux</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {DAY_SLOTS.map((slot) => {
                  const slotAppointments = occupiedBySlot.get(slot) ?? [];
                  const occupied = slotAppointments.length > 0;
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        if (slotAppointments[0]) {
                          setSelectedAppointment(slotAppointments[0]);
                        }
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-sm ${
                        occupied
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                      }`}
                    >
                      <p className="font-semibold">{slot}</p>
                      <p className="mt-1 text-xs">
                        {occupied
                          ? `${slotAppointments.length} occupe${slotAppointments.length > 1 ? 's' : ''}`
                          : 'Libre'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <h3 className="mb-4 font-semibold text-gray-900">Rendez-vous du jour</h3>
              {dayAppointments.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun rendez-vous pour cette date.</p>
              ) : (
                <div className="space-y-3">
                  {dayAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      onClick={() => setSelectedAppointment(appointment)}
                      className="flex w-full flex-col gap-2 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatAppointmentTime(appointment.starts_at)} - Créneau réservé
                        </p>
                        <p className="text-sm text-gray-500">Disponibilité occupée</p>
                      </div>
                      <p className="text-sm text-gray-500">Occupé</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {viewMode === 'week' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <h3 className="mb-4 font-semibold text-gray-900">Vue semaine</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {weekDateKeys.map((dateKey) => {
                const list = appointmentsByDate.get(dateKey) ?? [];
                return (
                  <div key={dateKey} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
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
                        list.map((appointment) => (
                          <button
                            key={appointment.id}
                            onClick={() => setSelectedAppointment(appointment)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-left text-xs hover:bg-gray-100"
                          >
                            {formatAppointmentTime(appointment.starts_at)} - Occupé
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
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <h3 className="mb-4 font-semibold text-gray-900">Vue mois</h3>
            <div className="mb-2 grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
                <p key={label} className="text-center text-xs uppercase text-gray-500">
                  {label}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthDateKeys.map((dateKey) => {
                const list = appointmentsByDate.get(dateKey) ?? [];
                const currentMonth =
                  fromDateKey(dateKey).getMonth() === fromDateKey(selectedDate).getMonth();
                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setViewMode('day');
                    }}
                    className={`min-h-[92px] rounded-xl border p-2 text-left ${
                      currentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <p className={`text-xs ${currentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                      {dateKey.slice(8, 10)}
                    </p>
                    {list.length > 0 ? (
                      <>
                        <p className="mt-1 text-[11px] font-semibold text-blue-700">
                          {list.length} RDV
                        </p>
                        <p className="mt-1 truncate text-[11px] text-gray-600">
                          {formatAppointmentTime(list[0].starts_at)} Occupé
                        </p>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Réserver</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">
            Message us on WhatsApp or give us a call
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Vérifiez la disponibilité sur le calendrier, puis contactez le salon pour
            confirmer votre RDV.
          </p>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <a
              href="https://wa.me/212612829055"
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              WhatsApp · +212 612-829055
            </a>
            <a
              href="tel:+212612829055"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Appeler · +212 612-829055
            </a>
          </div>
        </section>
      </main>

      {selectedAppointment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAppointment(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Rendez-vous</p>
                <h4 className="mt-1 text-lg font-semibold text-gray-900">
                  Créneau réservé
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
                <span className="font-medium">Statut:</span> Occupé
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
