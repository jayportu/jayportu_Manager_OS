import { redirect } from "next/navigation";

// La raíz redirige al dashboard; el middleware se encarga del auth gate.
export default function RootPage() {
  redirect("/dashboard");
}
