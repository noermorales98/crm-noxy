import { redirect } from "next/navigation";

/** La landing pública vive en `/`; `/demo` se mantiene por enlaces viejos. */
export default function DemoRedirectPage() {
  redirect("/");
}
