'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Tier {
  id: string;
  name: string;
  amount: number;
  description: string;
  limit: number | null;
  remaining: number | null;
}

interface StoryBlock {
  title: string;
  body: string;
  image_url: string;
}

type Supporter = Record<string, any>;

interface Project {
  id: number;
  title: string;
  school: string;
  club: string;
  region: string;
  description: string;
  story: string | null;
  goal_amount: number;
  deadline: string | null;
  hero_image_url: string | null;
  youtube_url: string | null;
  tiers: Tier[] | null;
  status: string;
}

interface TierComment {
  tierId: string;
  name: string;
  comment: string;
}

const CHAPTER_TITLES = [
  'なぜ支援が必要なのか',
  '私たちの挑戦と夢',
  '支援金の具体的な使い道',
  'あなたの支援で変わること',
  'チームからのメッセージ',
];

function calcDaysLeft(deadline: string | null): { text: string; color: string } {
  if (!deadline || deadline.trim() === '') return { text: '期限未設定', color: '#94a3b8' };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { text: '期限未設定', color: '#94a3b8' };
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { text: '終了',           color: '#ef4444' };
  if (diff === 0) return { text: '本日終了',        color: '#f97316' };
  if (diff <= 7)  return { text: `残り ${diff} 日`, color: '#f97316' };
  return                  { text: `残り ${diff} 日`, color: '#059669' };
}

function getStatusBadge(status: string) {
  if (['募集中', 'active', 'approved'].includes(status))
    return { label: '🟢 募集中', bg: '#dcfce7', color: '#166534' };
  if (['終了', 'closed', 'ended'].includes(status))
    return { label: '🔴 終了', bg: '#fee2e2', color: '#991b1b' };
  if (['準備中', 'preparing'].includes(status))
    return { label: '🟡 準備中', bg: '#fef9c3', color: '#854d0e' };
  return { label: status, bg: '#f1f5f9', color: '#475569' };
}

function isEnded(status: string): boolean {
  return ['終了', 'closed', 'ended'].includes(status);
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseStory(story: string | null): StoryBlock[] {
  if (!story) return [];
  try {
    const parsed = JSON.parse(story);
    if (Array.isArray(parsed)) {
    return parsed.map((b: Record<string, any>) => ({
        title:     String(b['title']     ?? ''),
        body:      String(b['body']      ?? b['text'] ?? ''),
        image_url: String(b['image_url'] ?? b['image'] ?? ''),
      }));
    }
  } catch {
    // JSON でなければ --- 区切りとして処理
    return story.split('---').map((s, i) => ({
      title:     CHAPTER_TITLES[i] ?? `第${i + 1}章`,
      body:      s.trim(),
      image_url: '',
    })).filter(b => b.body);
  }
  return [];
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project,      setProject]      = useState<Project | null>(null);
  const [tiers,        setTiers]        = useState<Tier[]>([]);
  const [supporters,   setSupporters]   = useState<Supporter[]>([]);
  const [totalRaised,  setTotalRaised]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [activeTab,    setActiveTab]    = useState<'story' | 'tiers' | 'supporters' | 'ranking'>('story');
  const [copied,       setCopied]       = useState(false);
  const [tierComments, setTierComments] = useState<TierComment[]>([]);
  const [newComment,   setNewComment]   = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: proj, error: pErr } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !proj) {
        setError('プロジェクトが見つかりません');
        setLoading(false);
        return;
      }
      setProject(proj as unknown as Project);

      // tiers は crowdfunding_projects.tiers JSONB から直接取得
      if (Array.isArray((proj as unknown as Project).tiers) && ((proj as unknown as Project).tiers as Tier[]).length > 0) {
        setTiers(((proj as unknown as Project).tiers as Tier[]).map((t: Tier, i: number) => ({
          ...t,
          id: t.id ?? String(i),
        })));
      }

