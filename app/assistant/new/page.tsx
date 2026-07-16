import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChatView from "../[id]/_components/ChatView";

export default async function AssistantNewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) redirect("/");

  return (
    <ChatView
      conversationId="new"
      initialMessages={[]}
      emptyExperience="references"
    />
  );
}
