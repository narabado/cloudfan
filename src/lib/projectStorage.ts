export interface ReturnTier {
  id: string;
  tier: string;
  amount: number;
  badge: string;
  desc: string;
  stock: number | null;
}

export interface Project {
  id: number;
  school: string;
  club: string;
  title: string;
  shortDesc: string;
  story: string;
  goal: number;
  current: number;
  supporters: number;
  deadline: string;
  region: string;
  youtubeUrl: string;
  images: string[];
  returns: ReturnTier[];
  status: 'active' | 'draft' | 'completed';
  createdAt: string;
}

const STORAGE_KEY = 'ssh_projects_v1';

const DEFAULT_PROJECT: Project = {
  id: 1,
  school: "北星学園女子中学高等学校",
  club: "バドミントン部",
  title: "41年ぶりの全道優勝！北星学園女子バドミントン部を応援しよう",
  shortDesc: "41年ぶりの全道優勝を果たした北星学園女子バドミントン部。全国大会への遠征費用のご支援をお願いします。",
  story: "北星学園女子バドミントン部は、2026年3月に開催された全道高校バドミントン選手権大会において、創部以来41年ぶりの全道優勝を果たしました。\n\n日々の厳しい練習と、部員たちの強い絆が実を結んだ歴史的な瞬間でした。\n\n全国大会出場が決まりましたが、遠征費用・宿泊費・大会参加費など多くの費用が必要です。皆様のご支援が、選手たちの夢を後押しします。",
  goal: 500000,
  current: 0,
  supporters: 0,
  deadline: "2026-05-07",
  region: "札幌",
  youtubeUrl: "",
  images: [],
  returns: [
    { id: "r1", tier: "ブロンズサポーター", amount: 1000, badge: "🥉", desc: "活動報告メール・サンクスカード（デジタル）", stock: null },
    { id: "r2", tier: "シルバーサポーター", amount: 3000, badge: "🥈", desc: "活動報告メール・サンクスカード＋学校HPにお名前掲載", stock: null },
    { id: "r3", tier: "ゴールドサポーター", amount: 10000, badge: "🥇", desc: "上記＋部員直筆サンクスレター", stock: 30 },
    { id: "r4", tier: "プラチナサポーター", amount: 30000, badge: "💎", desc: "上記＋練習見学招待（1名）", stock: 20 },
    { id: "r5", tier: "レジェンドスポンサー", amount: 100000, badge: "👑", desc: "上記＋横断幕にお名前・企業ロゴ掲載＋表彰式参加権", stock: 5 },
  ],
  status: 'active',
  createdAt: "2026-03-12",
};

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [DEFAULT_PROJECT];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_PROJECT]));
      return [DEFAULT_PROJECT];
    }
    return JSON.parse(raw) as Project[];
  } catch { return [DEFAULT_PROJECT]; }
}

export function getProject(id: number): Project | null {
  return getProjects().find(p => p.id === id) ?? null;
}

export function saveProject(project: Project): void {
  const all = getProjects();
  const idx = all.findIndex(p => p.id === project.id);
  if (idx >= 0) all[idx] = project; else all.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function createProject(data: Omit<Project, 'id' | 'createdAt' | 'current' | 'supporters'>): Project {
  const all = getProjects();
  const newId = all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
  const project: Project = { ...data, id: newId, current: 0, supporters: 0, createdAt: new Date().toISOString().split('T')[0] };
  all.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return project;
}

export function deleteProject(id: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getProjects().filter(p => p.id !== id)));
}
