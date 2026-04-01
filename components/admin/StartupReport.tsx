"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// --- 연도 자동 계산 로직 ---
const currentYear = new Date().getFullYear();
const targetYears = [currentYear, currentYear - 1, currentYear - 2]; 

// --- 레이아웃 헬퍼 컴포넌트 ---
const FixedLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-[140px] bg-[#f1f5f9] p-3 flex items-center justify-center font-bold border-b border-r border-slate-200 text-slate-600 text-[13px] text-center shrink-0 ${className}`}>
    {children}
  </div>
);

const SubLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-[100px] bg-[#f1f5f9] p-3 flex items-center justify-center font-bold border-b border-r border-slate-200 text-slate-600 text-[13px] text-center shrink-0 ${className}`}>
    {children}
  </div>
);

const Content = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex-1 p-3 flex items-center border-b border-r border-slate-200 bg-white text-slate-800 text-[13px] ${className}`}>
    {children}
  </div>
);

const WideContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex-[1.8] p-3 flex items-center border-b border-r border-slate-200 bg-white text-slate-800 text-[13px] truncate ${className}`}>
    {children}
  </div>
);

function SectionTitle({ title }: { title: string }) {
  return <div className="bg-gray-100 p-2 border-l-8 border-black font-black text-[14px] uppercase mb-3 mt-10 shadow-sm">{title}</div>;
}

// --- 인라인 편집 헬퍼 컴포넌트 ---
const EditableText = ({ 
  value, onChange, isEditing, type = "text", className = "" 
}: { 
  value: any, onChange: (v: any) => void, isEditing: boolean, type?: string, className?: string 
}) => {
  if (!isEditing) {
    if (type === 'number') return <span className={className}>{Number(value || 0).toLocaleString()}</span>;
    return <span className={className}>{value || '-'}</span>;
  }
  return (
    <input 
      type={type} 
      value={value || ''} 
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} 
      className={`w-full px-2 py-1.5 bg-blue-50/60 border border-blue-200 rounded outline-none focus:border-blue-500 focus:bg-blue-100/50 transition-colors text-slate-900 ${className}`} 
    />
  );
};

const EditableTextarea = ({ 
  value, onChange, isEditing, className = "" 
}: { 
  value: any, onChange: (v: any) => void, isEditing: boolean, className?: string 
}) => {
  if (!isEditing) return <span className={`whitespace-pre-wrap ${className}`}>{value || '-'}</span>;
  return (
    <textarea 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)} 
      className={`w-full px-3 py-2 bg-blue-50/60 border border-blue-200 rounded outline-none focus:border-blue-500 focus:bg-blue-100/50 transition-colors min-h-[100px] text-slate-900 resize-y ${className}`} 
    />
  );
};

interface Props {
  selectedItem: any; 
  onClose: () => void;
}

export default function StartupReport({ selectedItem: initialItem, onClose }: Props) {
  const [data, setData] = useState<any>(initialItem);
  const [loading, setLoading] = useState(true);

  // --- 편집 상태 관리 ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!initialItem?.id) return;
      setLoading(true);
      try {
        const { data: fullData, error } = await supabase
          .from('startups')
          .select(`
            *,
            education:startup_education(*),
            careers:startup_careers(*),
            investments:startup_investments(*),
            ips:startup_ips(*),
            awards:startup_awards(*),
            financials:startup_financials(*), 
            services:startup_services(*)
          `)
          .eq('id', initialItem.id)
          .single();

        if (fullData) {
          setData(fullData);
          setEditData(JSON.parse(JSON.stringify(fullData))); // Deep copy for editing
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialItem?.id]);

  // 메인 테이블 필드 업데이트
  const updateField = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  // 관계 테이블(배열) 아이템 업데이트
  const updateArrayItem = (arrayField: string, index: number, key: string, value: any) => {
    setEditData((prev: any) => {
      const newArray = [...(prev[arrayField] || [])];
      if (newArray[index]) {
        newArray[index] = { ...newArray[index], [key]: value };
      }
      return { ...prev, [arrayField]: newArray };
    });
  };

  // 저장 로직 (병렬 처리)
  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      // 1. 메인 startups 테이블 업데이트 추출
      const { 
        education, careers, investments, ips, awards, financials, services, // 제외할 배열 관계 필드
        ...mainDataPayload 
      } = editData;

      const promises = [];

      // 메인 테이블 업데이트 Promise
      promises.push(supabase.from('startups').update(mainDataPayload).eq('id', editData.id));

      // 2. 7개 관계 테이블 업데이트 Promise (배열 순회하며 id 기준 업데이트)
      const relations = [
        { key: 'education', table: 'startup_education' },
        { key: 'careers', table: 'startup_careers' },
        { key: 'financials', table: 'startup_financials' },
        { key: 'investments', table: 'startup_investments' },
        { key: 'ips', table: 'startup_ips' },
        { key: 'awards', table: 'startup_awards' },
        { key: 'services', table: 'startup_services' }
      ];

      relations.forEach(({ key, table }) => {
        (editData[key] || []).forEach((item: any) => {
          if (item.id) {
            promises.push(supabase.from(table).update(item).eq('id', item.id));
          }
        });
      });

      await Promise.all(promises);

      // 성공 처리
      setData(editData);
      setIsEditing(false);
      setStatusMessage({ text: "저장 완료", type: 'success' });
      
    } catch (error) {
      console.error("Save error:", error);
      setStatusMessage({ text: "저장 실패. 다시 시도해주세요.", type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000); // 3초 후 메시지 소멸
    }
  };

  const handleCancel = () => {
    setEditData(JSON.parse(JSON.stringify(data))); // 원본 데이터로 롤백
    setIsEditing(false);
    setStatusMessage(null);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">REPORT GENERATING...</div>;

  // --- 화면 렌더링에 사용될 데이터 소스 (편집 중이면 editData, 아니면 data 참조) ---
  const currentViewData = isEditing ? editData : data;

  const totalInvestAmount = currentViewData?.investments?.reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0) || 0;
  const latestValue = [...(currentViewData?.investments || [])]
    .filter((r: any) => r.period)
    .sort((a: any, b: any) => b.period.localeCompare(a.period))[0] || { pre_share: 0, post_share: 0 };

  return (
    <div className="max-w-5xl mx-auto bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-[13px] animate-in fade-in duration-500 relative">
      
      {/* 상단 버튼부 & 상태 메시지 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {statusMessage && (
            <span className={`px-4 py-2 rounded-full font-bold text-sm animate-in fade-in ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {statusMessage.text}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-700 text-sm font-bold border border-blue-200 bg-blue-50 px-5 py-1.5 rounded-full transition-all hover:bg-blue-100">
                편집하기
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium border border-slate-200 px-4 py-1.5 rounded-full transition-all hover:bg-slate-50">
                [ 닫기 ]
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCancel} disabled={saving} className="text-slate-500 hover:text-slate-700 text-sm font-bold border border-slate-200 bg-slate-50 px-5 py-1.5 rounded-full transition-all hover:bg-slate-100 disabled:opacity-50">
                취소
              </button>
              <button onClick={handleSave} disabled={saving} className="text-white hover:text-white text-sm font-bold border border-blue-600 bg-blue-600 px-5 py-1.5 rounded-full transition-all hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중...' : '저장 완료'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* □ 1. 개요 섹션 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 bg-[#f8fafc] p-3 border-l-4 border-slate-800 mb-4 shadow-sm">
          <span className="text-slate-800 font-bold tracking-tight">□ 개요</span>
        </div>
        
        <div className="border-t-2 border-slate-800 border-x border-slate-200 border-b shadow-sm">
          <div className="flex w-full">
            <div className="flex-1 flex flex-col border-r border-slate-200">
              <div className="flex border-b border-slate-200">
                <FixedLabel>기업명</FixedLabel>
                <Content className="font-black text-slate-900 text-[15px] flex-[2.5]">
                  <EditableText isEditing={isEditing} value={currentViewData.company_name} onChange={(v) => updateField('company_name', v)} className="font-black text-[15px]" />
                </Content>
                <SubLabel>설립일</SubLabel>
                <Content className="flex-1">
                  <EditableText isEditing={isEditing} value={currentViewData.founding_date} onChange={(v) => updateField('founding_date', v)} />
                </Content>
              </div>
              <div className="flex border-b border-slate-200">
                <FixedLabel>회사전화</FixedLabel>
                <Content className="flex-1">
                  <EditableText isEditing={isEditing} value={currentViewData.company_tel} onChange={(v) => updateField('company_tel', v)} />
                </Content>
                <SubLabel>회사이메일</SubLabel>
                <WideContent>
                  <EditableText isEditing={isEditing} value={currentViewData.company_email} onChange={(v) => updateField('company_email', v)} />
                </WideContent>
              </div>
            </div>
            <div className="w-[180px] flex items-center justify-center p-3 bg-white border-b border-slate-200">
              {currentViewData.logo_url ? (
                <img src={currentViewData.logo_url} alt="Logo" className="max-w-full max-h-[80px] object-contain" />
              ) : (
                <div className="text-[10px] text-slate-300 font-bold uppercase text-center leading-tight">NO LOGO</div>
              )}
            </div>
          </div>
          <div className="flex flex-col border-b border-slate-200">
            <div className="flex">
              <FixedLabel>회사주소</FixedLabel>
              <Content className="border-r-0">
                <EditableText isEditing={isEditing} value={currentViewData.company_address} onChange={(v) => updateField('company_address', v)} />
              </Content>
            </div>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>홈페이지</FixedLabel>
            <Content className="flex-1">
              {isEditing ? (
                <EditableText isEditing={true} value={currentViewData.homepage} onChange={(v) => updateField('homepage', v)} />
              ) : (
                <span className="text-blue-600 underline truncate">
                  {currentViewData.homepage ? <a href={currentViewData.homepage} target="_blank" rel="noreferrer">{currentViewData.homepage}</a> : '-'}
                </span>
              )}
            </Content>
            <SubLabel>업종</SubLabel>
            <Content className="flex-1 border-r-0">
              <EditableText isEditing={isEditing} value={currentViewData.biz_type} onChange={(v) => updateField('biz_type', v)} />
            </Content>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>사업자번호</FixedLabel>
            <Content className="flex-1">
              <EditableText isEditing={isEditing} value={currentViewData.biz_number} onChange={(v) => updateField('biz_number', v)} />
            </Content>
            <SubLabel>법인번호</SubLabel>
            <Content className="flex-1 border-r-0">
              <EditableText isEditing={isEditing} value={currentViewData.corp_number} onChange={(v) => updateField('corp_number', v)} />
            </Content>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>대표자명</FixedLabel>
            <Content className="flex-1">
              <EditableText isEditing={isEditing} value={currentViewData.ceo_name} onChange={(v) => updateField('ceo_name', v)} />
            </Content>
            <SubLabel>대표전화</SubLabel>
            <Content className="flex-1">
              <EditableText isEditing={isEditing} value={currentViewData.ceo_tel} onChange={(v) => updateField('ceo_tel', v)} />
            </Content>
            <SubLabel>대표이메일</SubLabel>
            <WideContent className="border-r-0">
              <EditableText isEditing={isEditing} value={currentViewData.ceo_email} onChange={(v) => updateField('ceo_email', v)} />
            </WideContent>
          </div>
          <div className="flex border-b border-slate-200 bg-slate-50/30">
            <FixedLabel>담당자명</FixedLabel>
            <Content className="flex-1">
              <EditableText isEditing={isEditing} value={currentViewData.manager_name} onChange={(v) => updateField('manager_name', v)} />
            </Content>
            <SubLabel>담당전화</SubLabel>
            <Content className="flex-1">
              <EditableText isEditing={isEditing} value={currentViewData.manager_tel} onChange={(v) => updateField('manager_tel', v)} />
            </Content>
            <SubLabel>담당이메일</SubLabel>
            <WideContent className="border-r-0">
              <EditableText isEditing={isEditing} value={currentViewData.manager_email} onChange={(v) => updateField('manager_email', v)} />
            </WideContent>
          </div>
          <div className="flex border-b border-slate-200 items-stretch">
            <FixedLabel>제품/서비스 요약</FixedLabel>
            <Content className="border-r-0 w-full">
              <EditableTextarea isEditing={isEditing} value={currentViewData.service_summary} onChange={(v) => updateField('service_summary', v)} />
            </Content>
          </div>
          <div className="flex">
            <FixedLabel className="border-b-0">TIPS 정보</FixedLabel>
            <Content className="border-b-0 border-r-0 italic text-slate-600 font-medium">
              <EditableText isEditing={isEditing} value={currentViewData.tips_info} onChange={(v) => updateField('tips_info', v)} />
            </Content>
          </div>
        </div>
      </section>

      {/* □ 2. 학력 및 경력 */}
      <SectionTitle title="□ 대표자 학력 및 경력" />
      <div className="grid grid-cols-2 gap-6 mb-10">
        <table className="w-full border-collapse border-t border-slate-400 text-center">
          <thead className="bg-slate-50 font-bold"><tr><th className="border p-2 w-[120px]">학력</th><th className="border p-2">학교/학과</th></tr></thead>
          <tbody>{(currentViewData.education || []).map((e: any, i: number) => (
            <tr key={e.id || i}>
              <td className="border p-1 bg-slate-50/50 font-bold">
                <EditableText isEditing={isEditing} value={e.degree_type} onChange={(v) => updateArrayItem('education', i, 'degree_type', v)} className="text-center" />
              </td>
              <td className="border p-1">
                {isEditing ? (
                  <div className="flex gap-1">
                    <EditableText isEditing={true} value={e.school_name} onChange={(v) => updateArrayItem('education', i, 'school_name', v)} />
                    <EditableText isEditing={true} value={e.department} onChange={(v) => updateArrayItem('education', i, 'department', v)} />
                  </div>
                ) : (
                  <span>{e.school_name} {e.department}</span>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
        <table className="w-full border-collapse border-t border-slate-400 text-center">
          <thead className="bg-slate-50 font-bold"><tr><th className="border p-2 w-[140px]">기간</th><th className="border p-2">회사/업무</th></tr></thead>
          <tbody>{(currentViewData.careers || []).map((c: any, i: number) => (
            <tr key={c.id || i}>
              <td className="border p-1 bg-slate-50/50 font-bold">
                <EditableText isEditing={isEditing} value={c.period} onChange={(v) => updateArrayItem('careers', i, 'period', v)} className="text-center" />
              </td>
              <td className="border p-1">
                {isEditing ? (
                  <div className="flex gap-1">
                    <EditableText isEditing={true} value={c.company_name} onChange={(v) => updateArrayItem('careers', i, 'company_name', v)} />
                    <EditableText isEditing={true} value={c.task} onChange={(v) => updateArrayItem('careers', i, 'task', v)} />
                  </div>
                ) : (
                  <span>{c.company_name} ({c.task})</span>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* □ 3. 매출 및 고용 */}
      <SectionTitle title="□ 매출 및 고용" />
      <table className="w-full border-collapse border-t border-slate-400 text-center mb-10">
        <thead className="bg-slate-100 font-bold border-b">
          <tr>
            <th rowSpan={2} className="border p-2 bg-slate-50">구분</th>
            {targetYears.map(year => <th key={year} colSpan={2} className="border p-2">{year}년</th>)}
          </tr>
          <tr className="bg-slate-50 text-[11px]">
            {targetYears.map(year => (
              <React.Fragment key={year}>
                <th className="border p-1">국내</th>
                <th className="border p-1">해외</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2 font-bold bg-slate-50">매출액</td>
            {targetYears.map(year => {
              const finIndex = (currentViewData.financials || []).findIndex((f: any) => String(f.year) === String(year));
              const fin = finIndex >= 0 ? currentViewData.financials[finIndex] : null;
              
              return (
                <React.Fragment key={year}>
                  <td className="border p-1 font-bold text-blue-600">
                    {finIndex >= 0 ? <EditableText isEditing={isEditing} type="number" value={fin.revenue_domestic} onChange={(v) => updateArrayItem('financials', finIndex, 'revenue_domestic', v)} className="text-center text-blue-600 font-bold" /> : '-'}
                  </td>
                  <td className="border p-1 font-bold text-blue-600">
                    {finIndex >= 0 ? <EditableText isEditing={isEditing} type="number" value={fin.revenue_overseas} onChange={(v) => updateArrayItem('financials', finIndex, 'revenue_overseas', v)} className="text-center text-blue-600 font-bold" /> : '-'}
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
          <tr>
            <td className="border p-2 font-bold bg-slate-50">고용</td>
            {targetYears.map(year => {
              const finIndex = (currentViewData.financials || []).findIndex((f: any) => String(f.year) === String(year));
              const fin = finIndex >= 0 ? currentViewData.financials[finIndex] : null;
              return (
                <td key={year} colSpan={2} className="border p-1 font-bold text-slate-700">
                   {finIndex >= 0 ? <EditableText isEditing={isEditing} type="number" value={fin.employees} onChange={(v) => updateArrayItem('financials', finIndex, 'employees', v)} className="text-center font-bold" /> : '-'}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* □ 4. 투자 현황 */}
      <SectionTitle title="□ 투자 현황" />
      <table className="w-full border-collapse border-t border-slate-400 text-center mb-10">
        <thead className="bg-slate-100 font-black border-b border-slate-300">
          <tr><th className="border p-2 w-[100px]">시기</th><th className="border p-2">투자사</th><th className="border p-2 w-[80px]">단계</th><th className="border p-2 text-blue-700">투자금</th><th className="border p-2">Pre</th><th className="border p-2">Post</th></tr>
        </thead>
        <tbody>{(currentViewData.investments || []).map((inv: any, i: number) => (
          <tr key={inv.id || i}>
            <td className="border p-1">
              <EditableText isEditing={isEditing} value={inv.period} onChange={(v) => updateArrayItem('investments', i, 'period', v)} className="text-center" />
            </td>
            <td className="border p-1 font-bold">
              <EditableText isEditing={isEditing} value={inv.investor} onChange={(v) => updateArrayItem('investments', i, 'investor', v)} className="text-center" />
            </td>
            <td className="border p-1">
              <EditableText isEditing={isEditing} value={inv.round} onChange={(v) => updateArrayItem('investments', i, 'round', v)} className="text-center" />
            </td>
            <td className="border p-1 font-black text-blue-700">
              <EditableText isEditing={isEditing} type="number" value={inv.amount} onChange={(v) => updateArrayItem('investments', i, 'amount', v)} className="text-center text-blue-700" />
            </td>
            <td className="border p-1">
              <EditableText isEditing={isEditing} type="number" value={inv.pre_share} onChange={(v) => updateArrayItem('investments', i, 'pre_share', v)} className="text-center" />
            </td>
            <td className="border p-1 font-bold text-red-600">
              <EditableText isEditing={isEditing} type="number" value={inv.post_share} onChange={(v) => updateArrayItem('investments', i, 'post_share', v)} className="text-center text-red-600 font-bold" />
            </td>
          </tr>
        ))}</tbody>
        <tfoot className="bg-slate-50 font-black border-t-2 border-slate-800">
          <tr>
            <td colSpan={3} className="border p-2 bg-slate-100 text-center">투자 합계 / 최신 밸류</td>
            <td className="border p-2 text-blue-700">{totalInvestAmount.toLocaleString()}</td>
            <td className="border p-2 text-red-600">{Number(latestValue.pre_share).toLocaleString()}</td>
            <td className="border p-2 text-red-600">{Number(latestValue.post_share).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* □ 5. IP 및 수상 */}
      <div className="grid grid-cols-2 gap-8 mb-10 items-start">
        <section>
          <SectionTitle title="□ 지식재산권 (건)" />
          <table className="w-full border-collapse border-t border-slate-400 text-center">
            <thead className="bg-[#f1f5f9] font-bold border-b border-slate-400">
              <tr><th className="p-2 border-r border-slate-300">국내</th><th className="p-2">해외</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-slate-300 p-3 font-black text-[15px]">
                  {currentViewData.ips?.[0] ? (
                    <EditableText isEditing={isEditing} type="number" value={currentViewData.ips[0].domestic} onChange={(v) => updateArrayItem('ips', 0, 'domestic', v)} className="text-center text-[15px] font-black" />
                  ) : '0'}
                </td>
                <td className="p-3 font-black text-[15px]">
                  {currentViewData.ips?.[0] ? (
                    <EditableText isEditing={isEditing} type="number" value={currentViewData.ips[0].overseas} onChange={(v) => updateArrayItem('ips', 0, 'overseas', v)} className="text-center text-[15px] font-black" />
                  ) : '0'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          <SectionTitle title="□ 참여 및 수상" />
          <table className="w-full border-collapse border-t border-slate-400 text-center text-[11px]">
            <thead className="bg-[#f1f5f9] font-bold border-b border-slate-400">
              <tr><th className="p-2 border-r border-slate-300 w-[60px]">연도</th><th className="p-2 border-r border-slate-300">행사명</th><th className="p-2 w-[100px]">주최</th></tr>
            </thead>
            <tbody>
              {currentViewData.awards?.length > 0 ? currentViewData.awards.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-b border-slate-200">
                  <td className="border-r border-slate-300 p-1">
                    <EditableText isEditing={isEditing} value={row.year} onChange={(v) => updateArrayItem('awards', i, 'year', v)} className="text-center" />
                  </td>
                  <td className="border-r border-slate-300 p-1 text-left">
                     <EditableText isEditing={isEditing} value={row.award_name || row.name} onChange={(v) => updateArrayItem('awards', i, 'award_name', v)} />
                  </td>
                  <td className="p-1 text-left text-slate-600">
                     <EditableText isEditing={isEditing} value={row.agency} onChange={(v) => updateArrayItem('awards', i, 'agency', v)} />
                  </td>
                </tr>
              )) : <tr><td colSpan={3} className="p-4 text-slate-400">데이터가 없습니다.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {/* □ 6. 제품 상세 소개 */}
      <SectionTitle title="□ 제품 및 기술 상세 소개" />
      <div className="space-y-4 mb-10">
        {(currentViewData.services || []).length > 0 ? (currentViewData.services || []).map((svc: any, i: number) => (
          <div key={svc.id || i} className="border-2 border-slate-800 p-6 bg-slate-50/30 rounded-2xl shadow-sm">
            <div className="font-black text-[16px] mb-2 text-slate-900 flex items-center">
              <span className="text-blue-600 mr-2">●</span>
              <div className="flex-1">
                <EditableText isEditing={isEditing} value={svc.title} onChange={(v) => updateArrayItem('services', i, 'title', v)} className="font-black text-[16px]" />
              </div>
            </div>
            <div className="text-slate-700">
              <EditableTextarea isEditing={isEditing} value={svc.content} onChange={(v) => updateArrayItem('services', i, 'content', v)} className="min-h-[120px]" />
            </div>
          </div>
        )) : (
          <div className="p-10 text-center text-slate-400 border border-dashed rounded-2xl">등록된 정보가 없습니다.</div>
        )}
      </div>

      {/* □ 7. 필요 지원사항 */}
      <SectionTitle title="□ 기업 필요 지원사항" />
      <div className="border-2 border-slate-800 p-6 mb-10 rounded-2xl">
        <div className="flex flex-wrap gap-2 mb-4">
          {(currentViewData.support_needs || []).map((n: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-100 text-[11px]"># {n}</span>
          ))}
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-[12px] border border-slate-100">
          <span className="font-bold mr-2 italic text-slate-500">기타 의견:</span>
          <EditableTextarea isEditing={isEditing} value={currentViewData.support_needs_other} onChange={(v) => updateField('support_needs_other', v)} className="mt-2" />
        </div>
      </div>
    </div>
  );
}
