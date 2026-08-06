import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceHome } from "@/components/app/WorkspaceHome";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Workspace Home — EngageAI" },
      {
        name: "description",
        content: "Operational business intelligence command center and AI modules.",
      },
    ],
  }),
  component: WorkspaceHome,
});
