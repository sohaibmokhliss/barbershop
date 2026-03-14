'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormData = {
  client_name: string;
  client_phone: string;
  starts_at: string;
  service: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  client_name: '',
  client_phone: '',
  starts_at: '',
  service: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO timestamp to a human-readable French date string */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert an ISO timestamp to the "YYYY-MM-DDTHH:mm" format required
 * by <input type="datetime-local"> in local time.
 */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RendezvousClient({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const router = useRouter();

  // ---- Modal helpers -------------------------------------------------------

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(apt: Appointment) {
    setEditId(apt.id);
    setForm({
      client_name: apt.client_name,
      client_phone: apt.client_phone ?? '',
      starts_at: toDatetimeLocal(apt.starts_at),
      service: apt.service ?? '',
      notes: apt.notes ?? '',
    });
    setFormError('');
    setShowModal(true);
  }

  // ---- CRUD ----------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      service: form.service.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const res = editId
        ? await fetch(`/api/appointments/${editId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? 'Une erreur est survenue');
        setSaving(false);
        return;
      }

      const saved: Appointment = await res.json();

      setAppointments((prev) => {
        const updated = editId
          ? prev.map((a) => (a.id === editId ? saved : a))
          : [...prev, saved];
        return updated.sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        );
      });

      setShowModal(false);
    } catch {
      setFormError('Erreur réseau, veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
  }

  async function handleDeletePast() {
    const now = new Date();
    const pastAppointments = appointments.filter(
      (a) => new Date(a.starts_at) < now,
    );
    if (pastAppointments.length === 0) {
      alert('Aucun ancien rendez-vous à supprimer.');
      return;
    }
    if (
      !confirm(
        `Supprimer ${pastAppointments.length} ancien${pastAppointments.length > 1 ? 's' : ''} rendez-vous ?`,
      )
    )
      return;
    const res = await fetch('/api/appointments/past', { method: 'DELETE' });
    if (res.ok) {
      setAppointments((prev) =>
        prev.filter((a) => new Date(a.starts_at) >= now),
      );
    } else {
      alert('Erreur lors de la suppression des anciens rendez-vous.');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪒</span>
          <span className="font-bold text-lg">Yassine — Rendez-vous</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/calendrier"
            className="text-sm text-gray-300 hover:text-white underline transition"
          >
            Calendrier
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white underline transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-700 font-medium">
            {appointments.length}{' '}
            {appointments.length === 1 ? 'rendez-vous' : 'rendez-vous'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeletePast}
              className="border border-red-300 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 transition text-sm font-medium"
            >
              Supprimer les anciens
            </button>
            <button
              onClick={openCreate}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition text-sm font-medium"
            >
              + Nouveau rendez-vous
            </button>
          </div>
        </div>

        {/* Table */}
        {appointments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📅</p>
            <p>Aucun rendez-vous pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    { label: 'Client', className: '' },
                    { label: 'Téléphone', className: '' },
                    { label: 'Date & Heure', className: '' },
                    { label: 'Service', className: 'hidden md:table-cell' },
                    { label: 'Notes', className: 'hidden md:table-cell' },
                    {
                      label: 'Actions',
                      className: 'sticky right-0 z-20 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]',
                    },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${h.className}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {apt.client_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {apt.client_phone ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(apt.starts_at)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">
                      {apt.service ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-500 max-w-xs truncate">
                      {apt.notes ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 sticky right-0 z-10 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(apt)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium transition"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Nom du client *">
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_name: e.target.value }))
                  }
                  className={inputCls}
                  required
                  autoFocus
                />
              </Field>

              <Field label="Téléphone">
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_phone: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="ex: 0555 12 34 56"
                />
              </Field>

              <Field label="Date & Heure *">
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, starts_at: e.target.value }))
                  }
                  className={inputCls}
                  required
                />
              </Field>

              <Field label="Service">
                <input
                  type="text"
                  value={form.service}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, service: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="ex: Coupe + barbe"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className={inputCls}
                  rows={3}
                  placeholder="Informations supplémentaires…"
                />
              </Field>

              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition text-sm font-medium"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
