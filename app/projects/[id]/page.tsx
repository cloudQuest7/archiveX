import { prisma } from "@/lib/db/prisma";
import { ProjectDetailClient } from "@/components/project/ProjectDetailClient";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const domain = await prisma.domain.findUnique({
    where: { id },
    include: {
      project: true,
    },
  });

  if (!domain) {
    notFound();
  }

  return <ProjectDetailClient domainId={domain.id} />;
}
