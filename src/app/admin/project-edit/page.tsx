import { Suspense } from "react";
import ProjectEditForm from "./ProjectEditForm";

export default function ProjectEditPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: "#1a3a5c", fontSize: "1.1rem" }}>読み込み中...</div>}>
      <ProjectEditForm />
    </Suspense>
  );
}
