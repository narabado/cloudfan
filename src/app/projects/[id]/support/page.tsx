'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

interface Project {
  id: number;
  title: string;
  school: string;
  club: string;
  region: string;
  goal_amount: number;
  deadline: string | null;
  status: string;
}

type Step = 'form' | 'confirm' | 'done';

export default function SupportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [project,  setProject]  = useState<Project | null>(null);
  const [tiers,    setTiers]    = useState<Tier[]>([]);
  const [selTier,  setSelTier]  = useState<Tier | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');

  // フォーム値
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [qty,      setQty]      = useState(1);
  const [message,  setMessage]  = useState('');
  const [isAnon,   setIsAnon]   = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: proj } = await supabase
        .from('crowdfunding_projects')
        .select('id,title,school,club,region,goal_amount,deadline,status,tiers')
        .eq('id', id)
        .single();
      if (proj) setProject(proj as unknown as Project);

      // project_tiers テーブルは存在しないため crowdfunding_projects.tiers JSONを直接使用
      const jsonTiers = Array.isArray((proj as any)?.tiers) ? (proj as any).tiers : [];
      const finalTierList: Tier[] = jsonTiers.map((t: any, tidx: number) => ({
        ...t,
        id: t.id != null ? t.id : String(tidx),
      }));
      setTiers(finalTierList);

      // URLパラメータでティアを選択
      const tierIdParam = searchParams.get('tier');
      if (tierIdParam) {
        const found = finalTierList.find((t: Tier) => String(t.id) === tierIdParam);
        if (found) {
          setSelTier(found);
        } else {
          // インデックスでフォールバック (tier=0,1,2...)
          const tidx2 = parseInt(tierIdParam, 10);
          if (!isNaN(tidx2) && finalTierList[tidx2]) setSelTier(finalTierList[tidx2]);
          else if (finalTierList.length > 0) setSelTier(finalTierList[0]);
        }
      } else if (finalTierList.length > 0) {
        setSelTier(finalTierList[0]);
      }

