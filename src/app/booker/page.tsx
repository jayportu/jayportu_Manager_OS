import { redirect } from "next/navigation";

// /booker → arranca en "Buscar DJs" (página poblada) en vez del inbox vacío.
// F1 — evita que el booker nuevo aterrice en un dead-end sin datos.
export default function BookerIndexPage() {
  redirect("/booker/buscar");
}
