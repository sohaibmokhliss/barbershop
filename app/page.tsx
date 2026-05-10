import Image from 'next/image';
import { listAppointments } from '@/lib/appointmentsRepo';
import PublicCalendarClient from '@/app/PublicCalendarClient';

export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const { data: appointments } = await listAppointments();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(251,146,60,0.16),_transparent_22%),linear-gradient(180deg,_#fff8ef_0%,_#f7efe5_46%,_#f2ece3_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-16 pt-8 md:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-10">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <div className="flex flex-col">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-800">
                    Disponibilité du salon
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    Barbershop Yassine · Ancienne Médina
                  </p>
                </div>
              </div>

              <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-tight text-slate-950 md:text-7xl">
                Regardez les jours occupés et contactez le barber pour votre RDV.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                Le calendrier public reprend les rendez-vous enregistrés dans le salon.
                Vous pouvez vérifier les journées libres ou chargées sans exposer les
                informations privées des clients.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  'Choisissez un jour dans le calendrier.',
                  'Vérifiez si la journée est libre ou déjà occupée.',
                  'Contactez le salon par WhatsApp ou par appel pour confirmer votre RDV.',
                ].map((copy, index) => (
                  <div
                    key={copy}
                    className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      0{index + 1}
                    </p>
                    <p className="mt-3 text-base font-semibold leading-7 text-slate-900">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-slate-200 shadow-sm">
              <Image
                src="/shop-front.jpeg"
                alt="Façade du salon dans l'ancienne médina"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200">
                  Le salon
                </p>
                <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
                  Un barber de quartier, visible directement depuis la rue.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-100/90">
                  Voyez les disponibilités en ligne, puis passez un appel ou un message
                  pour bloquer votre créneau.
                </p>
              </div>
            </div>
          </div>
        </div>

        <PublicCalendarClient appointments={appointments} />

        <footer className="mt-12 border-t border-slate-200/80 pt-6 text-sm text-slate-500">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Barbershop Yassine — Casablanca</p>
            <div className="flex flex-col gap-2 text-left md:items-end">
              <p>Disponibilité visible, informations client privées.</p>
              <a href="/login" className="text-slate-600 underline transition hover:text-slate-900">
                Espace personnel
              </a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
