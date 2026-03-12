import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="text-8xl mb-6">🪒</div>
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Barbershop Yassine
        </h1>
        <p className="text-xl text-gray-400 mb-2">
          Coupe, barbe, style. Prenez soin de votre image.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-sm">
          <span>📍</span>
          <span>Ancienne Médina, Casablanca — Maroc</span>
        </div>
      </div>

      {/* Services */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-semibold text-center mb-10 text-gray-300">
          Nos prestations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '✂️',
              title: 'Coupe Homme',
              desc: 'Coupe classique ou moderne, adaptée à votre style.',
            },
            {
              icon: '🧔',
              title: 'Taille de barbe',
              desc: 'Entretien et façonnage de la barbe avec soin.',
            },
            {
              icon: '💈',
              title: 'Coupe + Barbe',
              desc: 'Le tout-en-un pour un résultat impeccable.',
            },
          ].map((s) => (
            <div
              key={s.title}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-500 transition"
            >
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm space-y-2">
        <p>© {new Date().getFullYear()} Barbershop Yassine — Ancienne Médina, Casablanca</p>
        <p>
          <Link
            href="/login"
            className="text-gray-700 hover:text-gray-400 transition underline underline-offset-2"
          >
            Espace personnel
          </Link>
        </p>
      </footer>
    </main>
  );
}
