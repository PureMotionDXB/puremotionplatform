import { InstructorDetailContent } from "./InstructorDetailContent";

export default async function InstructorDetailPage({
  params,
}: PageProps<"/admin/instructors/[id]">) {
  const { id } = await params;
  return <InstructorDetailContent id={id} />;
}
