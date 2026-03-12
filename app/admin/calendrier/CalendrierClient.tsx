'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/types';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeKey(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function toDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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
  for (let hour = 8; hour <= 19; hour++) {
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
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const router = useRouter();

  const dayAppointments = useMemo(() => {
    return initialAppointments
      .filter((apt) => toDateKey(new Date(apt.starts_at)) === selectedDate)
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }, [initialAppointments, selectedDate]);

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
              <p className="text-xs uppercase tracking-wide text-gray-500">Jour sélectionné</p>
              <h2 className="text-xl font-semibold text-gray-900 capitalize mt-1">
                {toDateLabel(selectedDate)}
              </h2>
            </div>

            <div className="flex items-center gap-3">
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

        <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Occupation des creneaux</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {DAY_SLOTS.map((slot) => {
              const slotAppointments = occupiedBySlot.get(slot) ?? [];
              const occupied = slotAppointments.length > 0;
              return (
                <div
                  key={slot}
                  className={`rounded-xl border px-3 py-2 text-sm ${
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
                </div>
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
                <div
                  key={apt.id}
                  className="border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
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
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
