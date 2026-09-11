import { ClassDetailContent } from "./ClassDetailContent";

export default async function ClassDetailPage({ params }: PageProps<"/classes/[id]">) {
  const { id } = await params;
  return <ClassDetailContent id={id} />;
}
