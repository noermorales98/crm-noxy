import ProjectTasksView from "@/src/components/ProjectTasksView";

export default async function ProjectTasksPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ProjectTasksView projectId={id} />;
}
