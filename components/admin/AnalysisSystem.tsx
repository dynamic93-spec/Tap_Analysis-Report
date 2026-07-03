"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AnalysisSystemProps {
  selectedItem: any; 
  onClose: () => void;
  onSave: (data: any) => Promise<any>;
}

const DEFAULT_QUESTIONS: Record<string, any[]> = {
  '사업성': [
    { id: 'biz_1', label: 'BM 고도화 수준', guide: '현재의 BM을 통한 시장 확보 정도' },
    { id: 'biz_2', label: '수익성', guide: '매출 발생 정도, 영업이익(BEP) 달성 여부' },
    { id: 'biz_3', label: '매출 성장성', guide: '향후 매출 전망, 단기‧중장기 성장 가능성' },
    { id: 'biz_4', label: '판로 개척', guide: '새로운 시장 또는 고객층 접근 및 가능성' },
    { id: 'biz_5', label: '생산 능력', guide: '제품 품질, 생산, 공정 등의 양과 질(QC)' },
  ],
  '팀역량': [
    { id: 'team_1', label: '대표자 유관 경력', guide: '동종업계 이력, 관련 전공 여부 등' },
    { id: 'team_2', label: '팀워크 역량', guide: '팀의 역할 분담, 의사소통, 사내 문화 ' },
    { id: 'team_3', label: '핵심 개발 인력', guide:  '핵심 개발 인력 유무, 역량, 수' },
    { id: 'team_4', label: '핵심 경영진 역량', guide: 'C-level 유무, 역량, 수' },
    { id: 'team_5', label: '회사 구성원의 전문성', guide: '조직 체계별 전문성, 업무 세분화 정도' }
  ],
  '기술성': [
    { id: 'tech_1', label: '기술개발 완성도', guide: '연구개발, 상용화, 시/양산 정도' },
    { id: 'tech_2', label: '유사 및 대체 기술 출현 가능성', guide: '대체 기술 존재 여부, 기술적 알고리즘 유무' },
    { id: 'tech_3', label: '기술의 경쟁력', guide: '경쟁기술 대비 기능, 성능 우수성' },
    { id: 'tech_4', label: '모방 난이도', guide: '기술의 개발 구현 허들, 기술적 해자 등' },
    { id: 'tech_5', label: '기술의 확장성', guide: '이종산업으로의 기술 확장 가능성 여부' }
  ],
  '시장성': [
    { id: 'mkt_1', label: '시장 성장성', guide: '시장 침투 속도, 점유율, 유효 시장 진입 여부'},
    { id: 'mkt_2', label: '시장 경쟁도', guide: '경쟁업체 유무, 시장 트렌드 부합도 등' },
    { id: 'mkt_3', label: '고객 충성도(Lock-in)', guide: 'ARRPU, 리텐션, 구매전환율, 반복 거래 발생 등어 있음' },
    { id: 'mkt_4', label: '국내 및 글로벌 시장 규모', guide: 'TAM/SAM/SOM 규모, CAGR 등' }, 
    { id: 'mkt_5', label: '시장 진입장벽', guide: '법적/기술적 장벽 유무, 파트너십' }
  ],
  '지식재산권 포트폴리오': [
    { id: 'fin_1', label: '특허포트폴리오의 전략성', guide: '해외PCT 및 타겟 국가 대상 특허 취득 여부'},
    { id: 'fin_2', label: '해외 특허 출원 및 등록', guide: '해외PCT 및 타겟 국가 대상 특허 취득 여부' }, 
    { id: 'fin_3', label: '특허 포트폴리오 주관성/유관성', guide: '법인 단독 소유 혹은 기술 이전 여부 등' },
    { id: 'fin_4', label: 'IP 보호전략(특허 제외)', guide: '영업비밀 관리 시스템, 데이터 라벨링' },
    { id: 'fin_5', label: '기술사업화 전략', guide: 'IP라이선싱 기반 수익 발생 유무, 기술성숙도' }
  ]
};

export default function AnalysisSystem({ selectedItem, onClose, onSave }: AnalysisSystemProps) {
  const [activeTab, setActiveTab] = useState<string>('사업성');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [fixedTabs] = useState<string[]>(['사업성', '팀역량', '기술성', '시장성', '지식재산권 포트폴리오']);
  const [customTabs, setCustomTabs] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<Record<string, any[]>>(DEFAULT_QUESTIONS);
  
  const currentFolderId = selectedItem.parent_id;

  useEffect(() => { loadAllData(); }, [selectedItem.id, activeTab]);

  const loadAllData = async () => {
    if (!selectedItem?.id) return;
    try {
      const { data: folderAnalysis, error } = await supabase
        .from('startup_analysis')
        .select('*')
        .eq('folder_id', currentFolderId)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      let updatedQuestions = { ...DEFAULT_QUESTIONS }; 
      let newCustomTabs: string[] = [];

      if (folderAnalysis && folderAnalysis.length > 0) {
        // 웹에서 수정한 질문지(extra_questions)가 있으면 고정/커스텀 탭 모두 적용
        // 가장 최근에 저장된 질문지가 최종 적용되도록 정렬 (updated_at이 없는 옛 데이터는 가장 오래된 것으로 취급)
        // DEFAULT_QUESTIONS는 저장된 질문지가 없을 때의 초기 템플릿 역할
        const sortedAnalysis = [...folderAnalysis].sort((a: any, b: any) =>
          new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
        );
        sortedAnalysis.forEach((d: any) => {
          if (d.extra_questions && d.extra_questions.length > 0) {
            updatedQuestions[d.category] = d.extra_questions;
          }
          if (!fixedTabs.includes(d.category) && !newCustomTabs.includes(d.category)) {
            newCustomTabs.push(d.category);
          }
        });

        const myData = folderAnalysis.find((d: any) => d.startup_id === selectedItem.id && d.category === activeTab);
        setScores(myData?.scores || {});
        setComment(myData?.comment || '');
      } else {
        setScores({});
        setComment('');
      }

      // 아직 DB에 저장되지 않은(방금 추가한) 커스텀 탭과 질문지는 유지하면서 병합
      // 커스텀 탭인데 질문이 하나도 없으면(과거에 빈 상태로 저장된 경우) 빈 질문 5개를 채워줌
      setAllQuestions(prev => {
        const merged = { ...prev, ...updatedQuestions };
        newCustomTabs.forEach(tab => {
          if (!merged[tab] || merged[tab].length === 0) {
            merged[tab] = createBlankQuestions();
          }
        });
        return merged;
      });
      setCustomTabs(prev => Array.from(new Set([...prev, ...newCustomTabs])));
    } catch (err) { console.error("Load Error:", err); }
  };

  const createBlankQuestions = () => [1, 2, 3, 4, 5].map(num => ({
    id: `plus_${Date.now()}_${num}`, label: '', guide: '', isExtra: true
  }));

  const handleAddCategory = () => {
    const newTabName = prompt("새로운 평가 카테고리 이름을 입력하세요.");
    if (!newTabName) return;
    if (fixedTabs.includes(newTabName) || customTabs.includes(newTabName)) {
      alert("이미 존재하는 이름입니다.");
      return;
    }
    setCustomTabs(prev => [...prev, newTabName]);
    setAllQuestions(prev => ({ ...prev, [newTabName]: createBlankQuestions() }));
    setActiveTab(newTabName);
  };

  // 커스텀 탭에 질문 행을 하나씩 추가
  const handleAddQuestion = () => {
    setAllQuestions(prev => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), { id: `plus_${Date.now()}`, label: '', guide: '', isExtra: true }]
    }));
  };

  const handleRenameCategory = async (oldName: string) => {
    if (fixedTabs.includes(oldName)) return;
    const newName = prompt("카테고리 이름을 수정합니다:", oldName);
    if (!newName || newName === oldName) return;
    try {
      const { error } = await supabase.from('startup_analysis').update({ category: newName }).eq('folder_id', currentFolderId).eq('category', oldName);
      if (error) throw error;
      setCustomTabs(prev => prev.map(t => t === oldName ? newName : t));
      setActiveTab(newName);
    } catch (err: any) { alert("수정 실패: " + err.message); }
  };

  const handleDeleteCategory = async (targetTab: string) => {
    if (fixedTabs.includes(targetTab)) return;
    if (!confirm(`[${targetTab}] 카테고리를 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from('startup_analysis').delete().eq('folder_id', currentFolderId).eq('category', targetTab);
      if (error) throw error;
      setCustomTabs(prev => prev.filter(t => t !== targetTab));
      setActiveTab('사업성');
    } catch (err: any) { alert("삭제 실패: " + err.message); }
  };

  const updateQuestionText = (id: string, field: 'label' | 'guide', value: string) => {
    setAllQuestions(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(q => q.id === id ? { ...q, [field]: value } : q)
    }));
  };

  const handleScoreChange = (id: string, value: string) => {
    const num = Math.min(10, Math.max(0, parseInt(value) || 0));
    setScores(prev => ({ ...prev, [id]: num }));
  };

  // [수정] 가장 중요한 저장 로직: 폴더 전체에 질문지 동기화 처리 포함
  const handleSave = async () => {
    if (!selectedItem?.id) return;
    setIsSaving(true);
    
    try {
      // 1. 현재 작성 중인 질문지(extra_questions) — 고정/커스텀 탭 모두 웹에서 수정한 내용을 저장
      const currentQuestions = allQuestions[activeTab] || [];

      // 2. 현재 선택된 기업의 데이터 저장 (Upsert)
      const { error: mySaveError } = await supabase
        .from('startup_analysis')
        .upsert({
          startup_id: selectedItem.id,
          folder_id: currentFolderId,
          category: activeTab,
          scores: scores,
          total_score: Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0),
          comment: comment,
          extra_questions: currentQuestions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'startup_id, category' });

      if (mySaveError) throw mySaveError;

      // 3. [동기화] 같은 폴더 내 다른 기업들에게도 질문지(label, guide) 전파
      // 점수(scores)는 건드리지 않고 질문지 메타데이터만 업데이트합니다.
      const { error: syncError } = await supabase
        .from('startup_analysis')
        .update({ extra_questions: currentQuestions })
        .eq('folder_id', currentFolderId)
        .eq('category', activeTab);

      if (syncError) console.error("Sync Warning:", syncError);

      alert(`[${activeTab}] 저장이 완료되었습니다.`);
      await loadAllData();
      
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("저장 실패: " + error.message);
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 font-sans text-slate-700">
      {/* 탭/테이블 UI 코드는 이전과 동일하므로 유효함 */}
      {/* (중략 - UI 렌더링 부분은 로직 수정이 없으므로 그대로 사용) */}
      <div className="flex flex-wrap mb-10 border border-slate-300 bg-white shadow-sm">
        {[...fixedTabs, ...customTabs].map((tab) => (
          <div key={tab} className="relative group flex items-center border-r border-slate-300">
            <button onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-[14px] font-bold transition-all ${activeTab === tab ? 'bg-[#232d3f] text-white shadow-inner' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{tab}</button>
            {!fixedTabs.includes(tab) && (
              <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-0.5 rounded-bl-md">
                <button onClick={() => handleRenameCategory(tab)} className="p-1 text-blue-500 hover:scale-125">✎</button>
                <button onClick={() => handleDeleteCategory(tab)} className="p-1 text-red-500 hover:scale-125">✕</button>
              </div>
            )}
          </div>
        ))}
        <button onClick={handleAddCategory} className="px-8 py-4 bg-slate-100 text-slate-900 font-black text-xl hover:bg-blue-600 hover:text-white transition-all">+</button>
      </div>

      <div className="bg-white border border-slate-300 shadow-sm rounded-sm">
        <div className="p-5 bg-slate-50 border-b border-slate-300 flex justify-between items-center">
          <h3 className="font-black text-xl text-slate-800 tracking-tight">[{activeTab}] 상세 진단</h3>
          <button onClick={handleAddQuestion} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-[13px] font-bold rounded-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">+ 질문 추가</button>
        </div>
        <table className="w-full border-collapse">
          <thead><tr className="bg-[#f8fafc] text-slate-700 text-[12px] font-black border-b border-slate-300"><th className="p-4 w-[25%] text-center border-r border-slate-300">질문사항</th><th className="p-4 w-[12%] text-center border-r border-slate-300">점수</th><th className="p-4 w-[63%] text-center">배점기준</th></tr></thead>
          <tbody>
            {(allQuestions[activeTab] || []).map((q) => (
              <tr key={q.id} className="border-b border-slate-300 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                <td className="p-5 font-bold border-r border-slate-300 bg-slate-50/20"><input type="text" value={q.label} onChange={(e) => updateQuestionText(q.id, 'label', e.target.value)} placeholder="질문 내용을 입력하세요" className="w-full p-2 border-b border-transparent font-bold bg-transparent outline-none focus:border-blue-500 transition-all" /></td>
                <td className="p-4 text-center border-r border-slate-300"><div className="flex flex-col items-center gap-1"><input type="number" min="0" max="10" value={scores[q.id] || ''} onChange={(e) => handleScoreChange(q.id, e.target.value)} className="w-16 h-12 text-center text-2xl font-black text-blue-600 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-blue-400" placeholder="0" /><span className="text-[10px] font-bold text-slate-300">Max 10</span></div></td>
                <td className="p-4"><textarea value={q.guide} onChange={(e) => updateQuestionText(q.id, 'guide', e.target.value)} placeholder="평가 기준을 입력하세요." className="w-full min-h-[110px] p-4 border border-slate-100 text-[13px] outline-none focus:border-blue-3.00 bg-white/50 rounded-lg resize-none" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 bg-white border border-slate-300 flex min-h-[180px] shadow-sm rounded-sm overflow-hidden">
        <div className="w-[160px] bg-slate-100 border-r border-slate-300 p-6 flex flex-col items-center justify-center gap-2"><span className="text-2xl">✍️</span><span className="font-black text-slate-500 text-center text-xs uppercase tracking-widest">세부<br/>의견</span></div>
        <div className="flex-1"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`[${activeTab}] 카테고리에 대한 종합적인 검토 의견을 입력하세요.`} className="w-full h-full p-8 outline-none text-[15px] resize-none leading-relaxed" /></div>
      </div>

      <div className="mt-14 flex justify-end items-center gap-6">
        <button onClick={handleSave} disabled={isSaving} className="px-14 py-5 bg-[#232d3f] text-white font-black rounded-sm shadow-2xl hover:bg-blue-600 active:scale-95 transition-all text-sm">{isSaving ? '저장 중...' : `${activeTab} 데이터 저장`}</button>
      </div>
    </div>
  );
}