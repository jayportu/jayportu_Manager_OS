import { redirect } from "next/navigation";

/**
 * El índice /press-kit/bookings no tiene vista propia: la bandeja de bookings
 * vive dentro de /press-kit (sección "BOOKINGS RECIBIDOS"). Solo existe el
 * detalle /press-kit/bookings/[id]. Sin este page.tsx, tipear la URL del índice
 * daba un 404. Redirigimos a /press-kit para no dejar una ruta huérfana.
 */
export default function BookingsIndexPage() {
  redirect("/press-kit");
}
