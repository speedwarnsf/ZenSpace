/**
 * Project Storage Service
 * Manages multi-room projects with style consistency, notes, and budget tracking.
 * Uses Supabase when logged in, falls back to localStorage.
 */

import { Project, ProjectBudget, ProjectBudgetItem, ProjectStyleGuide } from '../types';
import { supabase, getCurrentUser } from './auth';

const PROJECTS_KEY = 'zenspace-projects';
const MAX_PROJECTS = 20;

// ============================================================================
// HELPERS
// ============================================================================

async function isLoggedIn(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

function loadProjectsLocal(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistProjectsLocal(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      while (projects.length > 5) projects.pop();
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }
}

function createDefaultBudget(): ProjectBudget {
  return { total: 0, spent: 0, currency: 'USD', items: [] };
}

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    description: project.description || null,
    room_ids: project.roomIds,
    style_guide: project.styleGuide || null,
    notes: project.notes,
    budget: project.budget,
    created_at: new Date(project.createdAt).toISOString(),
    updated_at: new Date(project.updatedAt).toISOString(),
  };
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    roomIds: row.room_ids || [],
    styleGuide: row.style_guide || undefined,
    notes: row.notes || '',
    budget: row.budget || createDefaultBudget(),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function getProjects(): Promise<Project[]> {
  // Use localStorage only — the Supabase 'projects' table is shared with Dashboard
  return loadProjectsLocal();
}

export async function getProject(id: string): Promise<Project | null> {
  return loadProjectsLocal().find(p => p.id === id) || null;
}

export async function saveProject(project: Project): Promise<Project> {
  project.updatedAt = Date.now();

  // localStorage only — Supabase 'projects' table is shared with Dashboard
  const projects = loadProjectsLocal();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
    while (projects.length > MAX_PROJECTS) projects.pop();
  }
  persistProjectsLocal(projects);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = loadProjectsLocal().filter(p => p.id !== id);
  persistProjectsLocal(projects);
}

export function createProject(name: string, description?: string): Project {
  const now = Date.now();
  return {
    id: `project-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    description,
    roomIds: [],
    notes: '',
    budget: createDefaultBudget(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function addRoomToProject(projectId: string, roomId: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  if (!project.roomIds.includes(roomId)) {
    project.roomIds.push(roomId);
  }
  return saveProject(project);
}

export async function removeRoomFromProject(projectId: string, roomId: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  project.roomIds = project.roomIds.filter(id => id !== roomId);
  return saveProject(project);
}

export async function updateProjectNotes(projectId: string, notes: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  project.notes = notes;
  return saveProject(project);
}

export async function updateProjectBudget(projectId: string, budget: ProjectBudget): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  project.budget = budget;
  return saveProject(project);
}

export async function updateProjectStyleGuide(projectId: string, styleGuide: ProjectStyleGuide): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  project.styleGuide = styleGuide;
  return saveProject(project);
}

export async function addBudgetItem(projectId: string, item: Omit<ProjectBudgetItem, 'id'>): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const newItem: ProjectBudgetItem = {
    ...item,
    id: `bi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  };
  project.budget.items.push(newItem);
  project.budget.spent = project.budget.items
    .filter(i => i.purchased)
    .reduce((sum, i) => sum + i.amount, 0);
  return saveProject(project);
}

export async function toggleBudgetItemPurchased(projectId: string, itemId: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const item = project.budget.items.find(i => i.id === itemId);
  if (!item) return null;
  item.purchased = !item.purchased;
  project.budget.spent = project.budget.items
    .filter(i => i.purchased)
    .reduce((sum, i) => sum + i.amount, 0);
  return saveProject(project);
}

export async function deleteBudgetItem(projectId: string, itemId: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  project.budget.items = project.budget.items.filter(i => i.id !== itemId);
  project.budget.spent = project.budget.items
    .filter(i => i.purchased)
    .reduce((sum, i) => sum + i.amount, 0);
  return saveProject(project);
}

export async function getProjectCount(): Promise<number> {
  const projects = await getProjects();
  return projects.length;
}
