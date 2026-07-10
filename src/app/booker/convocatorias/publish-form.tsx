"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGigAction } from "./actions";

export function PublishGigForm({
  defaultCity,
  defaultCountry,
}: {
  defaultCity: string;
  defaultCountry: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState(defaultCity || "");
  const [genre, setGenre] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  function submit() {
    if (!title.trim()) {
      setErr("Ponle un título.");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const r = await createGigAction({
        title,
        event_date: eventDate || null,
        city,
        country: defaultCountry,
        genre,
        budget_clp: budget ? parseInt(budget, 10) : null,
        application_deadline: deadline || null,
        description,
      });
      if (r.ok && r.id) router.push(`/booker/convocatorias/${r.id}`);
      else if (!r.ok) setErr(r.error);
    });
  }

  const inputCls =
    "w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent";
  const labelCls =
    "block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1";

  return (
    <div className="border-2 border-border p-4 space-y-3">
      <h2 className="font-semibold">Publicar convocatoria</h2>
      <div>
        <label className={labelCls}>Título</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Buscamos DJ house para sábado 12" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className={labelCls}>Fecha del evento</label>
          <input type="date" className={inputCls} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Ciudad</label>
          <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className={labelCls}>Género/estilo (opcional)</label>
          <input className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="house, techno…" />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Presupuesto CLP (opcional)</label>
          <input type="number" className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Deadline postular (opcional)</label>
          <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea rows={4} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles del evento, requisitos, horario…" />
      </div>
      {err && <div className="text-xs text-danger">{err}</div>}
      <button
        type="button"
        disabled={pending || !title.trim()}
        onClick={submit}
        className="px-4 py-2 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Publicar convocatoria"}
      </button>
    </div>
  );
}
