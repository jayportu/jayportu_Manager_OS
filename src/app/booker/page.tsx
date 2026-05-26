import { redirect } from "next/navigation";

// /booker → redirect a la página inicial del portal (inbox de requests)
export default function BookerIndexPage() {
  redirect("/booker/requests");
}
