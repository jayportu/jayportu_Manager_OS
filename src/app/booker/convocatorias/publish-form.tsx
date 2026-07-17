"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGigAction } from "./actions";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";

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

  return (
    <GlassPanel>
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Publicar convocatoria</h2>
        <div>
          <label htmlFor="gf-title" className="mb-1 block"><MonoLabel>Título</MonoLabel></label>
          <input id="gf-title" className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Buscamos DJ house para sábado 12" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="gf-date" className="mb-1 block"><MonoLabel>Fecha del evento</MonoLabel></label>
            <input id="gf-date" type="date" className={FIELD} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label htmlFor="gf-city" className="mb-1 block"><MonoLabel>Ciudad</MonoLabel></label>
            <input id="gf-city" className={FIELD} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="gf-genre" className="mb-1 block"><MonoLabel>Género/estilo (opcional)</MonoLabel></label>
            <input id="gf-genre" className={FIELD} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="house, techno…" />
          </div>
          <div className="flex-1">
            <label htmlFor="gf-budget" className="mb-1 block"><MonoLabel>Presupuesto CLP (opcional)</MonoLabel></label>
            <input id="gf-budget" type="number" className={FIELD} value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="flex-1">
            <label htmlFor="gf-deadline" className="mb-1 block"><MonoLabel>Deadline postular (opcional)</MonoLabel></label>
            <input id="gf-deadline" type="date" className={FIELD} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="gf-desc" className="mb-1 block"><MonoLabel>Descripción</MonoLabel></label>
          <textarea id="gf-desc" rows={4} className={FIELD} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles del evento, requisitos, horario…" />
        </div>
        {err && <Alert tone="danger">{err}</Alert>}
        <Button
          type="button"
          variant="clayPrimary"
          disabled={pending || !title.trim()}
          onClick={submit}
        >
          {pending ? "Publicando…" : "Publicar convocatoria"}
        </Button>
      </div>
    </GlassPanel>
  );
}
