// src/lib/projectStorage.ts
export interface Project {
  id: number;
  school: string;
  club: string;
  title: string;
  description?: string;
  story?: string;
  goal: number;
  deadline: string;
  region?: string;
  youtubeUrl?: string;
  images?: string[];
  status: "active" | "draft" | "completed";
  createdAt?: string;
}

const STORAGE_KEY = "cf_projects";

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  return loadProjects();
}

export function getProject(id: number): Project | undefined {
  return loadProjects().find(p => p.id === id);
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);
}

export function createProject(data: Omit<Project, "id" | "createdAt">): Project {
  const projects = loadProjects();
  const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
  const newProject: Project = {
    ...data,
    id: newId,
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  saveProjects(projects);
  return newProject;
}

export function deleteProject(id: number): void {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
}
