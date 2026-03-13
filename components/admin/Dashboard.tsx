"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

interface DashboardProps {
  folderId: string;
  onSelectFolder?: (id: string) => void;
}

const COLORS = ['#1e293b', '#3b82f6', '#64748b', '#94a3b8', '#cbd5e1', '#0f172a', '#2563eb'];

const QUESTION_LABELS: Record<string, string> = {
  biz_1: '비즈니스 확장성 (Scalability', biz_2: '수익 건전성', biz_3: '매출 성장속도', biz_4: '시장 점유 확대', biz_5: '운영 시스템화',
  team_1: 'C-level 리더십', team_2: '중간관리 조직', team_3: '핵심인재 유지/채용', team_4: '데이터 기반 의사결정', team_5: '조직 확장 유연성',
  tech_1: '기술적 해자(Moat)', tech_2: '시스템 안정성', tech_3: '데이터 자산화', tech_4: 'R&D 실행 속도', tech_5: '기술 부채 관리',
  mkt_1: '시장 침투 속도', mkt_2: '고객 락인(Lock-in)', mkt_3: '진입 장벽', mkt_4: '시장 트렌드 주도권', mkt_5: '마케팅 효율성',
  fin_1: '특허 포트폴리오의 전략성', fin_2: '특허 주체 및 권리 안정성', fin_3: '기술 사업화 수준', fin_4: 'IP 리스크 관리 체계',
  glo_1: '글로벌 시장 적합성', glo_2: '글로벌 파트너십 확장성',  glo_3: '해외 트랙션', glo_4: '글로벌 인적 인프라', glo_5: '글로벌 규제 및 수출 체계'
};

export default function Dashboard({ folderId, onSelectFolder }: DashboardProps) {
  const [folderList, setFolderList] = useState<any[]>([]);
  const [isDetailedVisible, setIsDetailedVisible] = useState(false);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [detailedScores, setDetailedScores] = useState<any[]>([]);
  const [financialsAvg, setFinancialsAvg] = useState<any[]>([]); 
  const [bizTypeDist, setBizTypeDist] = useState<any[]>([]);
  const [supportTypeDist, setSupportTypeDist] = useState<any[]>([]);
  const [regionDist, setRegionDist] = useState<any[]>([]);
  const [investRoundDist, setInvestRoundDist] = useState<any[]>([]);
  const [avgInvestAmount, setAvgInvestAmount] = useState<any[]>([]); // amount 기반 상태
  const [startupCount, setStartupCount] = useState(0);
  const [topPerformers, setTopPerformers] = useState<Record<string, { company: string, score: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFolders = async () => {
      const { data } = await supabase.from('folders').select('*').order('name');
      if (data) setFolderList(data);
    };
    fetchFolders();
  }, []);

  const dynamicTitle = useMemo(() => {
    if (folderId === 'root') return "전체 폴더";
    const current = folderList.find(f => f.id === folderId);
    return current ? `${current.name} 폴더` : "분석 대시보드";
  }, [folderId, folderList]);

  const getAllChildFolderIds = useCallback((parentId: string, list: any[]): string[] => {
    let ids = [parentId];
    const children = list.filter(f => f.parent_id === parentId);
    children.forEach(child => { ids = [...ids, ...getAllChildFolderIds(child.id, list)]; });
    return ids;
  }, []);

  const fetchGroupData = async () => {
    if (!folderId || folderList.length === 0) return;
    setLoading(true);

    try {
      const targetIds = folderId === 'root' ? folderList.map(f => f.id) : getAllChildFolderIds(folderId, folderList);
      const { data: startups } = await supabase.from('startups').select('*').in('parent_id', targetIds);

      if (!startups || startups.length === 0) {
        setStartupCount(0); setLoading(false); return;
      }
      
      const sIds = startups.map((s: { id: any; }) => s.id);
      setStartupCount(startups.length);
      const companyMap: Record<string, string> = {};
      startups.forEach((s: { id: string | number; company_name: string; }) => companyMap[s.id] = s.company_name);

      const bizCounts: Record<string, number> = {};
      const regionCounts: Record<string, number> = {};
      const supportCounts: Record<string, number> = {};
      startups.forEach((s: { biz_type: string | number; company_address: string; support_needs: string[]; }) => {
        if (s.biz_type) bizCounts[s.biz_type] = (bizCounts[s.biz_type] || 0) + 1;
        const reg = s.company_address ? s.company_address.substring(0, 2) : '미등록';
        regionCounts[reg] = (regionCounts[reg] || 0) + 1;
        if (Array.isArray(s.support_needs)) {
          s.support_needs.forEach((n: string) => { if (n) supportCounts[n] = (supportCounts[n] || 0) + 1; });
        }
      });
      setBizTypeDist(Object.entries(bizCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
      setRegionDist(Object.entries(regionCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
      setSupportTypeDist(Object.entries(supportCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

      // 투자금액 기반 통계 로직
      const { data: investData } = await supabase.from('startup_investments').select('*').in('startup_id', sIds);
      const roundCounts: Record<string, number> = {};
      const amountByYear: Record<string, { sum: number, count: number }> = {};
      investData?.forEach((inv: { round: string | number; period: string; amount: any; }) => {
        if (inv.round) roundCounts[inv.round] = (roundCounts[inv.round] || 0) + 1;
        if (inv.period && inv.amount) {
          const year = inv.period.substring(0, 4);
          if (!amountByYear[year]) amountByYear[year] = { sum: 0, count: 0 };
          amountByYear[year].sum += Number(inv.amount); 
          amountByYear[year].count += 1;
        }
      });
      setInvestRoundDist(Object.entries(roundCounts).map(([name, value]) => ({ name, value })));
      setAvgInvestAmount(Object.entries(amountByYear).map(([year, g]) => ({ year, value: Math.round(g.sum / g.count) })).sort((a, b) => a.year.localeCompare(b.year)));

      const { data: finData } = await supabase.from('startup_financials').select('*').in('startup_id', sIds);
      const yearGroups: Record<string, any> = {};
      finData?.forEach((d: { year: string | number; revenue_domestic: any; revenue_overseas: any; employees: any; }) => {
        if (!yearGroups[d.year]) yearGroups[d.year] = { dom: 0, ovs: 0, emp: 0, count: 0 };
        yearGroups[d.year].dom += (d.revenue_domestic || 0);
        yearGroups[d.year].ovs += (d.revenue_overseas || 0);
        yearGroups[d.year].emp += (d.employees || 0);
        yearGroups[d.year].count += 1;
      });
      setFinancialsAvg(Object.entries(yearGroups).map(([year, g]) => ({
        year, revenue_domestic: Math.round(g.dom / g.count), revenue_overseas: Math.round(g.ovs / g.count), employees: Math.round(g.emp / g.count)
      })).sort((a, b) => a.year.localeCompare(b.year)));

      const { data: analysisData } = await supabase.from('startup_analysis').select('*').in('startup_id', sIds);
      const catGroups: Record<string, any> = {};
      const tops: Record<string, { company: string, score: number }> = {};
      analysisData?.forEach((d: { startup_id: string | number; category: string | number; total_score: number; scores: any; }) => {
        const compName = companyMap[d.startup_id] || "Unknown";
        if (!tops[d.category] || d.total_score > tops[d.category].score) tops[d.category] = { company: compName, score: d.total_score };
        if (!catGroups[d.category]) catGroups[d.category] = { category: d.category, total: 0, scores: {}, count: 0 };
        catGroups[d.category].total += d.total_score; catGroups[d.category].count += 1;
        Object.entries(d.scores || {}).forEach(([q, v]: any) => { catGroups[d.category].scores[q] = (catGroups[d.category].scores[q] || 0) + v; });
      });
      setTopPerformers(tops);
      const processed = Object.values(catGroups).map((c: any) => {
        const avgScores: Record<string, number> = {};
        Object.entries(c.scores).forEach(([q, sum]: any) => { avgScores[q] = Math.round((sum / c.count) * 10) / 10; });
        return { category: c.category, total_score: Math.round(c.total / c.count), scores: avgScores };
      });
      setDetailedScores(processed);
      setRadarData(processed.map(a => ({ subject: a.category, groupScore: a.total_score })));

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroupData(); }, [folderId, folderList]);

  if (loading) return <div className="h-[600px] flex items-center justify-center font-black italic text-slate-300 animate-pulse text-xl uppercase tracking-widest">Aggregating Statistics...</div>;

  return (
    <div className="flex flex-col gap-10 pb-24 p-6 md:p-10 min-h-screen bg-slate-50/30 font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic truncate">{dynamicTitle}</h1>
        </div>
      </div>

      {startupCount === 0 ? (
        <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[40px] shadow-xl text-slate-300 font-black uppercase italic tracking-widest border border-slate-50 gap-4">
           <span className="text-8xl opacity-20">📁</span>
           <p>데이터가 존재하지 않습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12 animate-in fade-in duration-700">
          
          {/* 1행: 업종, 지역, 빈칸 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[350px]">
              <h3 className="text-xs font-black mb-4 text-slate-400 uppercase tracking-widest italic border-l-4 border-blue-600 pl-4">업종 분포</h3>
              <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={bizTypeDist} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={5}>{bizTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px'}} /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[350px]">
              <h3 className="text-xs font-black mb-4 text-slate-400 uppercase tracking-widest italic border-l-4 border-blue-600 pl-4">지역 분포</h3>
              <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={regionDist} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={5}>{regionDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px'}} /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 hidden lg:block" />
          </div>

          {/* 2행: 투자 단계, 투자 금액(Amount), 매출액 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[350px]">
              <h3 className="text-xs font-black mb-4 text-slate-400 uppercase tracking-widest italic border-l-4 border-blue-600 pl-4">투자 단계</h3>
              <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={investRoundDist} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={5}>{investRoundDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px'}} /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[350px]">
              <h3 className="text-xs font-black mb-6 text-slate-400 uppercase tracking-widest italic border-l-4 border-blue-600 pl-4">평균 투자 금액</h3>
              <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={avgInvestAmount}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="year" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} /><YAxis tick={{fontSize: 10, fontWeight: 700}} axisLine={false} /><Tooltip /><Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={25} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[350px]">
              <h3 className="text-xs font-black mb-6 text-slate-400 uppercase tracking-widest italic border-l-4 border-blue-600 pl-4">매출액 평균 (국내/해외)</h3>
              <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={financialsAvg}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="year" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} /><YAxis tick={{fontSize: 10, fontWeight: 700}} axisLine={false} /><Tooltip /><Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700}} /><Bar dataKey="revenue_domestic" name="국내" fill="#1e293b" barSize={12} /><Bar dataKey="revenue_overseas" name="해외" fill="#3b82f6" barSize={12} /></BarChart></ResponsiveContainer></div>
            </div>
          </div>

          {/* 3행: 지원사항 (좌: 파이, 우: 막대 스크롤) */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100">
            <h3 className="text-xl font-black mb-10 text-slate-900 uppercase italic border-l-8 border-blue-600 pl-4">기업 필요 지원사항 통계</h3>
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="w-full lg:w-[40%] h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={supportTypeDist.slice(0, 7)} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={5}>
                      {supportTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', fontWeight: 700}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-[60%] h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                <div style={{ height: Math.max(350, supportTypeDist.length * 45) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportTypeDist} layout="vertical" margin={{ left: 60, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tick={{fontSize: 12, fontWeight: 800, fill: '#1e293b'}} width={120} />
                      <Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" name="기업 수" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 4행: 역량 분석 (좌: Radar, 우: 리더보드) */}
          <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 flex flex-col items-center">
            <h3 className="text-xl font-black mb-10 text-slate-900 uppercase italic border-l-8 border-blue-600 pl-4">그룹 통합 역량 분석</h3>
            <div className="flex flex-col lg:flex-row w-full gap-12 items-center">
              <div className="w-full lg:w-[45%] h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 900 }} />
                    <PolarRadiusAxis domain={[0, 50]} tick={false} axisLine={false} />
                    <Radar name="그룹 평균" dataKey="groupScore" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={4} dot={{ r: 6, fill: '#3b82f6' }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-[55%] flex flex-col gap-6">
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
                  <div className="flex items-center gap-3 mb-6"><span className="text-2xl">🏆</span><h4 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Category Leaders</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(topPerformers).map(([cat, data]) => (
                      <div key={cat} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col"><span className="text-[10px] font-black text-blue-600 uppercase italic mb-0.5">{cat}</span><span className="text-sm font-bold text-slate-800 truncate max-w-[110px]">{data.company}</span></div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-slate-900">{data.score}</span>
                          <span className="text-[11px] font-bold text-slate-300">/ 50</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailedVisible(!isDetailedVisible)} 
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl active:scale-[0.98]"
                >
                  {isDetailedVisible ? '▼ 닫기' : '▶ 보기'}
                </button>
              </div>
            </div>
          </div>

          {/* 상세 지표 (4열 배치) */}
          {isDetailedVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {detailedScores.map((cat: any) => (
                <div key={cat.category} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-2 rounded-bl-3xl text-[9px] font-black shadow-lg">TOP: {topPerformers[cat.category]?.company}</div>
                  <h4 className="font-black text-lg text-slate-800 mb-6 border-l-[6px] border-blue-600 pl-3 uppercase italic leading-tight">{cat.category}</h4>
                  <div className="space-y-5">
                    {Object.entries(cat.scores).map(([key, val]: any) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-end"><span className="text-slate-600 text-[11px] font-bold truncate max-w-[130px]">{QUESTION_LABELS[key] || key}</span><span className="text-blue-600 font-black text-xs">{val} <span className="text-slate-300 text-[9px]">/ 10</span></span></div>
                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(val / 10) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-right"><span className="bg-slate-900 text-white text-[9px] px-3 py-1.5 rounded-full font-black">{cat.total_score} / 50</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}