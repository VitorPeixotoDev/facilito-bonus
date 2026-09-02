import Link from "next/link";

export default function CollaboratorNotFound() {
  return (
    <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
      <h1 className="text-2xl font-bold text-white">
        Colaborador não encontrado
      </h1>
      <p className="mt-2 max-w-xl text-slate-400">
        Esse colaborador não existe ou não pertence à sua empresa.
      </p>
      <Link
        href="/admin/colaboradores"
        className="mt-6 inline-flex text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
      >
        Voltar para colaboradores
      </Link>
    </section>
  );
}
