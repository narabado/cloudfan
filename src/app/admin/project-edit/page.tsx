"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProjectEditForm from "./ProjectEditForm";

function FormWrapper() {
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get("id")) || 0;
  return <ProjectEditForm projectId={projectId} />;
}

export default function ProjectEditPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          height: "60vh", color: "#1a3a5c", fontSize: "1.1rem"
        }}>
          読み込み中...
        </div>
      }
    >
      <FormWrapper />
    </Suspense>
  );
}
