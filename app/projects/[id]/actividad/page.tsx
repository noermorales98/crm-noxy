import ProjectActivityView from "@/src/components/ProjectActivityView";

export default async function ProjectActivityPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ProjectActivityView projectId={id} />;
}
