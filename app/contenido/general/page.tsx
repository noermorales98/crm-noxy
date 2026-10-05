import { redirect } from "next/navigation";
import { auth } from "@/auth";
import GeneralCalendarView from "@/src/components/content/GeneralCalendarView";

export default async function GeneralContentCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <GeneralCalendarView />;
}
