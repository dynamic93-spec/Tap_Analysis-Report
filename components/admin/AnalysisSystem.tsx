"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { StartupDetail } from './types';

interface AnalysisSystemProps {
  selectedItem: any; 
  onClose: () => void;
  onSave: (data: any) => Promise<any>;
}



// 1. 시스템 기본 고정 질문 세트
const DEFAULT_QUESTIONS: Record<string, any[]> = {
  '사업성': [
    { id: 'biz_1', label: 'BM 고도화 수준\n', guide: '① BM 개발 중\n② BM 개발 완료 및 테스트 중\n③ 시장검증단계를 통해 가능성 확인\n④ BM을 통해 시장확보 및 고객 창출 중임\n⑤ BM을 통해 적정한 규모의 매출 발생 중임' },
    { id: 'biz_2', label: '수익성', guide: '① 영역이익의 실현이 어려워 보임\n② 1% 이상의 영역이익을 실현 가능\n③ 3% 이상의 영역이익을 실현 가능\n④ 5% 이상의 영역이익을 실현 가능\n⑤ 10% 이상의 영역이익을 실현 가능' },
    { id: 'biz_3', label: '매출 성장성', guide: '① 향후 3년 이내 1억 미만\n② 향후 3년 이내 1~5억\n③ 향후 3년 이내 5~10억\n④ 향후 3년 이내 10~50억\n⑤ 향후 3년 이내 50억 초과' },
    { id: 'biz_4', label: '판로 개척', guide: '① 새로운 시장이나 고객층에 대한 접근 전략이 없음\n② 새로운 시장이나 고객층에 대한 접근 전략 부족함\n③ 새로운 시장이나 고객층에 대한 접근 전략 보유\n④ 새로운 시장이나 고객층에 대한 접근 전략이 있고, 일부 수행 중\n⑤ 새로운 시장이나 고객층에 대한 접근 전략이 있고 성공적 수행 중' },
    { id: 'biz_5', label: '생산 능력', guide: '① 제품의 품질, 생산량, 생산 공정의 효율성 모두 부족함\n② 제품의 품질과 생산량이 부족하며, 생산 공정의 효율성이 크게 개선 필요함\n③ 제품의 품질이나 생산량이 부족하며, 생산 공정의 효율성이 개선 필요함\n④ 제품의 품질과 생산량이 충분하며, 생산 공정의 효율성이 일부 개선 필요함\n⑤ 제품의 품질과 생산량이 뛰어나며, 생산 공정이 효율적임' },
  ],
  '팀역량': [
    { id: 'team_1', label: '대표자 유관 경력', guide: '① 없음\n② 1~2년\n③ 3~4년\n④ 5~9년\n⑤ 10년 이상' },
    { id: 'team_2', label: '팀워크 역량', guide: '① 팀의 역할분담, 의사소통, 문화가 조화롭지 않음\n② 소수의 요소만 조화되어 있음\n③ 일부 요소만 조화되어 있음\n④ 대부분의 요소가 잘 조화되어 있음\n⑤ 팀의 역할 분담, 의사소통, 문화가 잘 조화되어 있음' },
    { id: 'team_3', label: '핵심 개발 인력', guide:  '① 핵심 개발 인력의 역량이 부족함\n② 소수의 역량만 우수함\n③ 일부 역량이 우수함\n④ 대부분의 역량이 우수함\n⑤ 핵심 개발 인력의 모든 역량이 뛰어남' },
    { id: 'team_4', label: '핵심 경영진 역량', guide: '① 경영진의 역량이 부족함\n② 소수의 역량만 뛰어남\n③ 일부 역량이 뛰어남\n④ 대부분의 역량이 뛰어남\n⑤ 경영진의 모든 역량이 뛰어남' },
    { id: 'team_5', label: '회사 구성원의 전문성', guide: '① 팀원 대부분이 경험과 전문성이 부족함\n② 소수의 팀원만이 경험과 전문성을 가지고 있음\n③ 일부 팀원만이 경험과 전문성을 가지고 있음\n④ 대부분의 팀원이 경험과 전문성을 가지고 있음\n⑤ 팀원 대부분이 해당 분야에 대한 깊은 경험과 전문성을 가지고 있음' }
  ],
  '기술성': [
    { id: 'tech_1', label: '기술개발 완성도', guide: '① 아이디어 단계에 있는 기술\n② 연구개발 진행 단계에 있는 기술\n③ 연구개발 완료 단계에 있는 기술\n④ 상용화를 위한 시제품 제작단계에 있는 기술\n⑤ 상용화 및 양산기준을 충족시킬 수 있는 입증된 기술' },
    { id: 'tech_2', label: '유사 및 대체 기술 출현 가능성', guide: '① 적용 가능한 대체기술이 다수 존재함\n② 적용 가능한 대체기술이 일부(3개 이하) 존재함\n③ 일부 사항이 보완되면 적용 가능한 대체기술이 존재함\n④ 수명 기간 내에 대체기술의 출현 가능성이 있음\n⑤ 평가 대상 기술의 수명 기간 내에는 대체기술의 출현 가능성이 없음' },
    { id: 'tech_3', label: '기술의 경쟁력', guide: '① 경쟁기술 대비 기능 및 성능이 미흡함\n② 경쟁기술 대비 기능 및 성능이 다소 미흡하나 보완 가능\n③ 경쟁기술 대비 기능 및 성능이 유사하거나 다소 우위에 있음\n④ 경쟁기술 대비 기능 및 성능이 우수함\n⑤ 경쟁기술이 없으며, 기능 및 성능이 매우 뛰어남' },
    { id: 'tech_4', label: '모방 난이도', guide: '① 모방이 용이하며, 이로 인해 사업자체의 존립도 영향을 받음\n② 모방이 비교적 용이하며, 이로 인해 사업의 이익감소가 우려 됨\n③ 모방이 쉽지는 않으며, 모방을 통해 이익이 크게 침해받지는 않음\n④ 모방이 어렵고, 또한 모방여부를 쉽게 식별할 수 있음\n⑤ 고도의 기술축적이 필요하여 모방이 거의 불가능' },
    { id: 'tech_5', label: '기술의 확장성', guide: '① 확장 가능성이 없음\n② 일부 기술에 대한 보완이 이루어진다면, 확장이 가능함\n③ 단일 기술분야, 단일 제품군 내에서 복수의 제품으로 확장이 가능함\n④ 단일 기술분야에서 복수의 제품군으로 확장이 가능함\n⑤ 해당 산업 외에도 복수의 기술 분야로 확장이 가능함' }
  ],
  '시장성': [
    { id: 'mkt_1', label: '시장의 성장성', guide: '① 시장이 수요 감소의 따른 기업 철수기\n② 시장이 제품출시가 없는 R&D기\n③ 시장이 제품의 출시가 개시되는 도입기\n④ 시장이 형성되어 성장기로 접어드는 상태\n⑤ 시장이 수요 확대에 따른 매출 증가가 이루어지는 성숙기' },
    { id: 'mkt_2', label: '시장 경쟁도', guide: '① 업체간 경쟁상황이 치열함\n② 업체간 경쟁상황이 치열한 편이며, 경쟁제품이 시장을 과점하고 있음\n③ 경쟁제품이 다수 있으며, 선도업체가 없는 상황에서 시장을 분할하고 있음\n④ 경쟁제품이 소수 있으나, 선도업체가 없는 상황에서 시장을 분할하고 있음\n⑤ 경쟁제품이 거의 없어 사업영위에 미치는 영향이 없음' },
    { id: 'mkt_3', label: '국내 시장 규모', guide: '① 시장이 형성되지 않아 불확실함\n② 국내시장기준으로 연 50억원 이상의 시장이 형성되어 있음\n③ 국내시장기준으로 연 100억원 이상의 시장이 형성되어 있음\n④ 국내시장기준으로 연 500억원 이상의 시장이 형성되어 있음\n⑤ 국내 기준 연 1,000억 원 이상의 시장이 형성되어 있음' },
    { id: 'mkt_4', label: '글로벌 시장 규모', guide: '① 시장이 형성되지 않아 불확실\n② 연 100억원 이상의 글로벌 시장이 형성되어 있음\n③ 연 200억원 이상의 글로벌 시장이 형성되어 있음\n④ 연 1,000억원 이상의 글로벌 시장이 형성되어 있음\n⑤ 연 2,000억원 이상의 글로벌 시장이 형성되어 있음' }, 
    { id: 'mkt_5', label: '시장 진입장벽', guide: '① 진입장벽 요소 다수 존재\n② 초기투자부담, 차별화, 법∙제도적 제약 가운데 어느 한 요소 이상 존재\n③ 초기투자부담이 크지 않으며, 법∙제도적 제약이 약함\n④ 초기투자부담 크지 않으며, 법∙제도에 장려요인이 있음\n⑤ 초기투자부담이 낮으며, 법적 장려요인이 있음' }
  ],
  '지식재산권 포트폴리오': [
    { id: 'fin_1', label: '국내 특허 출원 및 등록', guide: '① 없음\n② 1개 이상\n③ 3개 이상\n④ 5개 이상\n⑤ 10개 이상' },
    { id: 'fin_2', label: '해외 특허 출원 및 등록', guide: '① 없음\n② 1개 이상\n③ 3개 이상\n④ 5개 이상\n⑤ 10개 이상' }, 
    { id: 'fin_3', label: '특허 포트폴리오 주관성/유관성', guide: '① 주관하지 않았고 유관성 없음\n② 특허 포트폴리오가 대표가 주관하였지만 사업유관성이 없음\n③ 특허 포트폴리오가 대표가 주관하지는 않았지만 사업유관성이 있음\n④ 특허 포트폴리오가  대표가 주관하였고 사업유관성도 있지만 향후 추가 계획은 없음\n⑤ 주관하였고 유관성 있으며 향후 계획 있음' },
    { id: 'fin_4', label: 'IP 보호전략(특허 제외)', guide: '① 없음\n② 1건\n③ 2건\n④ 3~4건\n⑤ 5개 이상' },
    { id: 'fin_5', label: '기술사업화 전략', guide: '① 기술 특허를 기반으로 하여 사업을 구성해 본 경험이 없으며, 사업화에 대한 전략이 없음\n② 기술 특허를 기반으로 하여 사업을 구성해 본 경험이 없으며, 사업화에 대한 개략적인 전략을 보유하고 있음\n③ 기술 특허를 기반으로 하여 사업을 구성해 본 경험이 없으며, 사업화에 대한 구체적인 전략을 보유하고 있음\n④ 기술 특허를 기반으로 하여 사업을 진행한 경험이 있고, 사업화에 대한 개략적인 전략을 보유함\n⑤ 기술 특허를 기반으로 하여 사업을 진행한 경험이 있고, 사업화에 대한 구체적인 전략을 보유함' }
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

  // 현재 기업이 속한 폴더 ID
  const currentFolderId = selectedItem.parent_id;

  useEffect(() => { loadAllData(); }, [selectedItem.id, activeTab]);

  
  const loadAllData = async () => {
    if (!selectedItem?.id) return;
    try {
      const { data: folderAnalysis, error } = await supabase
        .from('startup_analysis')
        .select('*')
        .eq('folder_id', currentFolderId);

      if (error) throw error;

      // 핵심: 항상 기본 질문 세트에서 시작합니다.
      const updatedQuestions = { ...DEFAULT_QUESTIONS }; 
      const newCustomTabs: string[] = [];

      if (folderAnalysis && folderAnalysis.length > 0) {
        folderAnalysis.forEach((d: any) => {
          // DB에 저장된 질문 세트가 있다면 해당 카테고리를 업데이트
          if (d.extra_questions && d.extra_questions.length > 0) {
            updatedQuestions[d.category] = d.extra_questions;
          }
          
          // 고정 탭이 아닌 새로운 탭(카테고리) 추가
          if (!fixedTabs.includes(d.category)) {
            newCustomTabs.push(d.category);
          }
        });

        // ⚠️ 중요: 현재 선택된 탭의 질문이 updatedQuestions에 없는 경우 방어 로직
        if (!updatedQuestions[activeTab]) {
          updatedQuestions[activeTab] = DEFAULT_QUESTIONS[activeTab] || [];
        }

        setAllQuestions(updatedQuestions);
        setCustomTabs(Array.from(new Set(newCustomTabs)));

        // 현재 기업의 점수 세팅
        const myData = folderAnalysis.find(d => d.startup_id === selectedItem.id && d.category === activeTab);
        setScores(myData?.scores || {});
        setComment(myData?.comment || '');
      } else {
        // 데이터가 없는 경우 원본 데이터 유지
        setAllQuestions(DEFAULT_QUESTIONS);
        setCustomTabs([]);
      }
    } catch (err) { console.error("Load Error:", err); }
  };

  const handleAddCategory = () => {
    const newTabName = prompt("새로운 평가 카테고리 이름을 입력하세요 (예: 글로벌 역량)");
    if (!newTabName) return;
    if (fixedTabs.includes(newTabName) || customTabs.includes(newTabName)) {
      alert("이미 존재하는 이름입니다.");
      return;
    }

    setCustomTabs(prev => [...prev, newTabName]);
    const initialSet = [1, 2, 3, 4, 5].map(num => ({
      id: `plus_${Date.now()}_${num}`, 
      label: '', 
      guide: '', 
      isExtra: true
    }));

    setAllQuestions(prev => ({ ...prev, [newTabName]: initialSet }));
    setActiveTab(newTabName);
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

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('startup_analysis')
        .upsert({
          startup_id: selectedItem.id,
          folder_id: currentFolderId, // 동기화 기준이 되는 폴더 ID
          category: activeTab,
          scores: scores,
          total_score: Object.values(scores).reduce((a, b) => a + b, 0),
          comment: comment,
          extra_questions: allQuestions[activeTab] || [], // 현재 질문 틀 저장
          updated_at: new Date().toISOString()
        }, { onConflict: 'startup_id, category' });

      if (error) throw error;
      alert(`[${activeTab}] 데이터가 저장되었습니다.\n동일 폴더 내 기업들이 이 질문 구성을 공유하게 됩니다.`);
      loadAllData();
    } catch (error: any) {
      alert("저장 실패: " + error.message);
    } finally { setIsSaving(false); }
  };

  const currentQuestions = allQuestions[activeTab] || [];

  return (
    <div className="max-w-5xl mx-auto pb-20 font-sans text-slate-700 animate-in fade-in duration-500">
      
      {/* 상단 탭 내비게이션 */}
      <div className="flex flex-wrap mb-10 border border-slate-300 bg-white shadow-sm">
        {[...fixedTabs, ...customTabs].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-6 py-4 text-[14px] font-bold border-r border-b border-slate-300 transition-all ${
              activeTab === tab ? 'bg-[#232d3f] text-white shadow-inner' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
        <button onClick={handleAddCategory} className="px-8 py-4 bg-slate-100 text-slate-900 font-black text-xl hover:bg-blue-600 hover:text-white transition-all border-b border-slate-300">+</button>
      </div>

      {/* 진단 테이블 섹션 */}
      <div className="bg-white border border-slate-300 overflow-hidden shadow-sm">
        <div className="p-5 bg-slate-50 border-b border-slate-300 flex justify-between items-end">
          <div>
            <h3 className="font-black text-xl text-slate-800 tracking-tight">[{activeTab}] 상세 진단</h3>
          </div>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] text-slate-700 text-[12px] font-black uppercase tracking-wider border-b border-slate-300">
              <th className="p-4 w-[25%] text-center border-r border-slate-300">질문사항</th>
              <th className="p-4 w-[12%] text-center border-r border-slate-300">점수</th>
              <th className="p-4 w-[63%] text-center">배점기준</th>
            </tr>
          </thead>
          <tbody>
            {currentQuestions.map((q) => (
              <tr key={q.id} className="border-b border-slate-300 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                <td className="p-5 font-bold border-r border-slate-300 bg-slate-50/20 text-slate-800">
                  {q.isExtra ? (
                    <input 
                      type="text" 
                      value={q.label} 
                      onChange={(e) => updateQuestionText(q.id, 'label', e.target.value)} 
                      placeholder="질문 내용을 입력하세요" 
                      className="w-full p-2 border-b border-slate-200 font-bold bg-transparent outline-none focus:border-blue-500 transition-all placeholder:text-slate-300" 
                    />
                  ) : q.label}
                </td>
                <td className="p-4 text-center border-r border-slate-300">
                  <div className="flex flex-col items-center gap-1">
                    <input 
                      type="number" 
                      min="0" max="10" 
                      value={scores[q.id] || ''} 
                      onChange={(e) => handleScoreChange(q.id, e.target.value)} 
                      className="w-16 h-12 text-center text-2xl font-black text-blue-600 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all" 
                      placeholder="0" 
                    />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Max 10</span>
                  </div>
                </td>
                <td className="p-4">
                  <textarea 
                    value={q.guide} 
                    onChange={(e) => updateQuestionText(q.id, 'guide', e.target.value)} 
                    placeholder="해당 질문에 대한 평가 기준이나 가이드를 입력하세요. 저장 시 폴더 전체에 공유됩니다." 
                    className="w-full min-h-[110px] p-4 border border-slate-100 text-[13px] outline-none focus:border-blue-300 bg-white/50 rounded-lg resize-none leading-relaxed shadow-inner" 
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 종합 의견 섹션 */}
      <div className="mt-10 bg-white border border-slate-300 flex min-h-[180px] shadow-sm rounded-sm overflow-hidden">
        <div className="w-[160px] bg-slate-100 border-r border-slate-300 p-6 flex flex-col items-center justify-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="font-black text-slate-500 text-center text-xs uppercase tracking-widest leading-tight">세부<br/>의견</span>
        </div>
        <div className="flex-1">
          <textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            placeholder={`[${activeTab}] 카테고리에 대한 종합적인 검토 의견을 입력하세요. 이 내용은 해당 기업 리포트에만 반영됩니다.`} 
            className="w-full h-full p-8 outline-none text-[15px] resize-none leading-relaxed placeholder:text-slate-300 font-medium" 
          />
        </div>
      </div>

      {/* 하단 버튼 제어 */}
      <div className="mt-14 flex justify-end items-center gap-6">
        
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="px-14 py-5 bg-[#232d3f] text-white font-black rounded-sm shadow-2xl hover:bg-blue-600 active:scale-95 transition-all uppercase tracking-[0.2em] text-sm"
        >
          {isSaving ? 'Processing...' : `Save ${activeTab} Data`}
        </button>
      </div>
    </div>
  );
}