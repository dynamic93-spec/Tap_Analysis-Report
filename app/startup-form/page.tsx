"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// --- 연도 자동 계산 로직: 매년 1월 1일 자동으로 갱신됨 ---
const currentYear = new Date().getFullYear();
const targetYears = [currentYear, currentYear - 1, currentYear - 2]; 

// --- 타입 정의 ---
interface ServiceFile { id: number; name: string; file: File; }
interface ServiceRow { id: number; title: string; content: string; files: ServiceFile[]; }

function FormContent() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId') || 'root';

  const [folderName, setFolderName] = useState<string>('');

  useEffect(() => {
    const fetchFolderName = async () => {
      if (folderId && folderId !== 'root') {
        try {
          const { data } = await supabase.from('folders').select('name').eq('id', folderId).single();
          if (data) setFolderName(data.name);
        } catch (err) { console.error("폴더명을 불러올 수 없습니다."); }
      }
    };
    fetchFolderName();
  }, [folderId]);

  // --- 1. 상태 관리 ---
  const [formData, setFormData] = useState({
    companyName: '', foundingDate: '', companyTel: '', companyEmail: '',
    companyAddress: '', homepage: '', ceoName: '', ceoTel: '', ceoEmail: '', 
    bizNumber: '', corpNumber: '', bizType: '', managerName: '', 
    managerTel: '', managerEmail: '', serviceSummary: '', tipsInfo: ''
  });

  const [eduRows, setEduRows] = useState([
    { id: 1, type: '학사', sch: '', dept: '', note: '' },
    { id: 2, type: '석사', sch: '', dept: '', note: '' },
    { id: 3, type: '박사', sch: '', dept: '', note: '' }
  ]);
  const [careerRows, setCareerRows] = useState([{ id: 1, period: '', company: '', task: '', note: '' }]);
  const [investRows, setInvestRows] = useState([{ id: 1, period: '', company: '', stage: '', amount: 0, pre: 0, post: 0, note: '' }]);
  
  // 매출 및 고용: 가변 연도 배열 구조
  const [salesData, setSalesData] = useState(
    targetYears.map(year => ({
      year: year.toString(),
      dom_sales: '',
      ovs_sales: '',
      emp_count: ''
    }))
  );

  const [ipData, setIpData] = useState({ domestic: '', overseas: '' });
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([{ id: 1, title: '', content: '', files: [] }]);
  const [bizHistoryRows, setBizHistoryRows] = useState([{ id: 1, year: '', name: '', agency: '', amount: '' }]);
  const [awardRows, setAwardRows] = useState([{ id: 1, year: '', name: '', agency: '', note: '' }]);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [supportChecks, setSupportChecks] = useState<{[key: string]: boolean}>({
    '경영일반': false, '인사/노무': false, '재무/회계': false, '법률': false, '홍보/마케팅': false, 
    '정부지원사업': false, '인증': false, '판로개척': false, '자금조달': false, 'IP': false, 
    '디자인제작': false, '생산시설': false, '글로벌진출': false
  });
  const [supportOther, setSupportOther] = useState('');

  const BIZ_TYPES = [
    '농업, 임업 및 어업', '광업', '제조업', '전기, 가스 중기 및 공기조절 공급업',
    '수도, 하수 및 폐기물 처리, 원료 재생업', '건설업', '도매 및 소매업', '운수 및 창고업',
    '숙박 및 음식점업', '정보통신업', '금융 및 보험업', '부동산업', '전문, 과학 및 기술 서비스업',
    '사업시설 관리, 사업 지원 및 임대 서비스업', '공공 행정, 국방 및 사회보장 행정', '교육 서비스업',
    '보건업 및 사회복지 서비스업', '예술, 스포츠 및 여가관련 서비스업', '협회 및 단체, 수리 및 기타 개인 서비스업'
  ];

  const INVEST_STAGES = ["Seed", "Pre-A", "Series A", "Series B", "Series C"];

  // --- 2. 로직 핸들러 ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSalesChange = (index: number, field: string, value: string) => {
    const updatedSales = [...salesData];
    updatedSales[index] = { ...updatedSales[index], [field]: value };
    setSalesData(updatedSales);
  };

  const addRow = (state: any[], setState: Function, emptyObj: object) => setState([...state, { ...emptyObj, id: Date.now() }]);
  const deleteRow = (state: any[], setState: Function, id: number) => setState(state.filter((row: any) => row.id !== id));
  const updateRowField = (state: any[], setState: Function, id: number, field: string, value: any) => setState(state.map(row => row.id === id ? { ...row, [field]: value } : row));

  const handleSupportCheck = (item: string) => {
    setSupportChecks(prev => {
      const checkedCount = Object.values(prev).filter(v => v).length;
      if (prev[item]) return { ...prev, [item]: false };
      if (checkedCount < 5) return { ...prev, [item]: true };
      alert('지원 사항은 최대 5개까지만 선택 가능합니다.');
      return prev;
    });
  };

  const totalAmount = investRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const latestValue = [...investRows].filter(r => r.period).sort((a, b) => b.period.localeCompare(a.period))[0] || { pre: 0, post: 0 };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- 3. 제출 핸들러 (복합 저장 로직) ---
  const handleSubmit = async () => {
    if (!formData.companyName) return alert('기업명은 필수 입력입니다.');

    try {
      const uploadSafeFile = async (bucket: string, file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${prefix}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
      };

      let uploadedLogoUrl = logoFile ? await uploadSafeFile('logos', logoFile, 'logo') : "";

      const { data: startup, error: startupError } = await supabase.from('startups').insert([{
        company_name: formData.companyName,
        founding_date: formData.foundingDate || null,
        company_tel: formData.companyTel,
        company_email: formData.companyEmail,
        company_address: formData.companyAddress,
        homepage: formData.homepage,
        ceo_name: formData.ceoName,
        ceo_tel: formData.ceoTel,
        ceo_email: formData.ceoEmail,
        biz_number: formData.bizNumber,
        corp_number: formData.corpNumber,
        biz_type: formData.bizType,
        manager_name: formData.managerName,
        manager_tel: formData.managerTel,
        manager_email: formData.managerEmail,
        service_summary: formData.serviceSummary,
        tips_info: formData.tipsInfo,
        parent_id: folderId,
        support_needs: Object.keys(supportChecks).filter(k => supportChecks[k]),
        support_needs_other: supportOther
      }]).select().single();

      if (startupError) throw startupError;
      const sId = startup.id;

      await Promise.all([
      supabase.from('startup_education').insert(eduRows.map(r => ({ startup_id: sId, degree_type: r.type, school_name: r.sch, department: r.dept, note: r.note }))),
      supabase.from('startup_careers').insert(careerRows.map(r => ({ startup_id: sId, period: r.period, company_name: r.company, task: r.task, note: r.note }))),
      supabase.from('startup_investments').insert(investRows.map(r => ({ startup_id: sId, period: r.period, investor: r.company, round: r.stage, amount: r.amount, pre_share: r.pre, post_share: r.post, note: r.note }))),
      supabase.from('startup_biz_history').insert(bizHistoryRows.map(r => ({ startup_id: sId, year: r.year, biz_name: r.name, agency: r.agency, amount: r.amount }))),
      supabase.from('startup_awards').insert(awardRows.map(r => ({ startup_id: sId, year: r.year, award_name: r.name, agency: r.agency, note: r.note }))),
      supabase.from('startup_ips').insert([{ startup_id: sId, domestic: ipData.domestic, overseas: ipData.overseas }]),
      
      // [스크린샷 1 반영] 매출 및 고용 저장
      supabase.from('startup_financials').upsert(
        salesData.map(data => ({
          startup_id: sId,
          year: data.year,
          revenue_domestic: Number(data.dom_sales) || 0,
          revenue_overseas: Number(data.ovs_sales) || 0,
          employees: Number(data.emp_count) || 0
        })),
        { onConflict: 'startup_id, year' }
      ),

      // [스크린샷 2 반영] 제품 및 기술 상세 소개 저장
      // 테이블명이 startup_services가 맞는지 확인하세요!
      supabase.from('startup_services').insert(
        serviceRows.map(row => ({
          startup_id: sId,
          title: row.title,
          content: row.content,
          file_urls: [] // DB 구조에 맞춰 배열로 전송
        }))
      )
    ]);

      alert('모든 데이터가 성공적으로 제출되었습니다!');
    } catch (err: any) { alert('저장 실패: ' + err.message); }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto p-10 bg-white shadow-2xl rounded-sm border border-gray-200 text-gray-800 leading-relaxed font-sans">
        <h1 className="text-3xl font-black mb-10 border-b-4 border-black pb-6 text-center uppercase tracking-tighter italic">
          {folderName ? `[${folderName}] 기업진단 보고서` : "STARTUP INFORMATION FORM"}
        </h1>
      

      {/* □ 1. 개요 */}
      <section className="mb-10">
        <SectionTitle title="□ 개요" />
        <div className="grid grid-cols-12 border-t border-gray-400">
          <div className="col-span-12 grid grid-cols-6">
            <Label className="col-span-1">기업명*</Label>
            <Content className="col-span-2"><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border p-1 font-bold outline-none" /></Content>
            <Label className="col-span-1">설립일</Label>
            <Content className="col-span-2"><input type="date" name="foundingDate" value={formData.foundingDate} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label className="col-span-1">회사전화</Label>
            <Content className="col-span-2"><input type="tel" name="companyTel" value={formData.companyTel} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label className="col-span-1">회사이메일</Label>
            <Content className="col-span-2"><input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
          </div>

          <div className="col-span-12 grid grid-cols-12 border-b border-gray-300">
            <Label className="col-span-2">회사주소</Label>
            <Content className="col-span-10"><input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label className="col-span-2">홈페이지</Label>
            <Content className="col-span-10"><input type="text" name="homepage" value={formData.homepage} onChange={handleChange} placeholder="https://" className="w-full border p-1 outline-none" /></Content>
          </div>
          <div className="col-span-12 grid grid-cols-6 border-b border-gray-300">
            <Label>대표자명</Label><Content><input type="text" name="ceoName" value={formData.ceoName} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>대표자 전화</Label><Content><input type="tel" name="ceoTel" value={formData.ceoTel} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>대표자 이메일</Label><Content><input type="email" name="ceoEmail" value={formData.ceoEmail} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>사업자번호</Label><Content><input type="text" name="bizNumber" value={formData.bizNumber} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>법인번호</Label><Content><input type="text" name="corpNumber" value={formData.corpNumber} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>업종</Label>
            <Content>
              <select name="bizType" value={formData.bizType} onChange={handleChange} className="w-full border p-1 outline-none bg-transparent">
                <option value="">업종 선택</option>
                {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Content>
          </div>
          <div className="col-span-12 grid grid-cols-6 border-b border-gray-300 bg-blue-50/10">
            <Label>담당자명</Label><Content><input type="text" name="managerName" value={formData.managerName} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>담당자 전화</Label><Content><input type="tel" name="managerTel" value={formData.managerTel} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label>담당자 이메일</Label><Content><input type="email" name="managerEmail" value={formData.managerEmail} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
          </div>
          <div className="col-span-12 grid grid-cols-12 border-b border-gray-300">
            <Label className="col-span-2">제품/서비스 요약</Label>
            <Content className="col-span-10"><input type="text" name="serviceSummary" value={formData.serviceSummary} onChange={handleChange} className="w-full border p-1 outline-none" /></Content>
            <Label className="col-span-2">TIPS 정보</Label>
            <Content className="col-span-10"><input type="text" name="tipsInfo" value={formData.tipsInfo} onChange={handleChange} placeholder="딥테크 팁스(2021)-탭엔젤파트너스" className="w-full border p-1 italic outline-none" /></Content>
          </div>
        </div>
      </section>

      {/* □ 2. 대표자 학력/경력 */}
      <section className="mb-10">
        <SectionTitle title="□ 대표자 학력 및 경력" />
        <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px] mb-4">
          <tbody>
            {eduRows.map((row) => (
              <tr key={row.id}>
                <td className="border p-2 bg-gray-50 font-bold w-20">{row.type}</td>
                <td className="border p-1"><input type="text" placeholder="학교명" className="w-full p-1 border outline-none" value={row.sch} onChange={(e) => updateRowField(eduRows, setEduRows, row.id, 'sch', e.target.value)} /></td>
                <td className="border p-1"><input type="text" placeholder="학과" className="w-full p-1 border outline-none" value={row.dept} onChange={(e) => updateRowField(eduRows, setEduRows, row.id, 'dept', e.target.value)} /></td>
                <td className="border p-1"><input type="text" placeholder="비고" className="w-full p-1 border outline-none" value={row.note} onChange={(e) => updateRowField(eduRows, setEduRows, row.id, 'note', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mb-2">
          <SectionTitle title="□ 주요 경력" noMargin />
          <button onClick={() => addRow(careerRows, setCareerRows, {period:'', company:'', task:'', note:''})} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[11px]">+ 경력추가</button>
        </div>
        <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px]">
          <thead className="bg-gray-100 font-black border-b">
            <tr><th className="border p-2">근무 기간</th><th className="border p-2">회사명</th><th className="border p-2">담당 업무</th><th className="border p-2 w-12 text-red-500">삭제</th></tr>
          </thead>
          <tbody>
            {careerRows.map((row) => (
              <tr key={row.id}>
                <td className="border p-1"><input type="text" className="w-full p-1 border outline-none text-center" value={row.period} onChange={(e) => updateRowField(careerRows, setCareerRows, row.id, 'period', e.target.value)} /></td>
                <td className="border p-1"><input type="text" className="w-full p-1 border outline-none text-center" value={row.company} onChange={(e) => updateRowField(careerRows, setCareerRows, row.id, 'company', e.target.value)} /></td>
                <td className="border p-1"><input type="text" className="w-full p-1 border outline-none text-center" value={row.task} onChange={(e) => updateRowField(careerRows, setCareerRows, row.id, 'task', e.target.value)} /></td>
                <td className="border p-1 text-center"><button onClick={() => deleteRow(careerRows, setCareerRows, row.id)} className="text-red-500 font-bold">X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* □ 3. 매출 및 고용 (가변 연도 자동 로직) */}
      <section className="mb-10">
        <SectionTitle title="□ 매출 및 고용" />
        <div className="text-right text-[10px] text-gray-500 mb-1">(단위 : 백만 원, 명)</div>
        <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px]">
          <thead className="bg-gray-100 font-bold border-b">
            <tr>
              <th rowSpan={2} className="border p-2 bg-gray-50">구분</th>
              {targetYears.map(year => <th key={year} colSpan={2} className="border p-2">{year}년</th>)}
            </tr>
            <tr className="bg-gray-50 text-[11px]">
              {targetYears.map(year => (
                <React.Fragment key={year}><th className="border p-1">국내</th><th className="border p-1">해외</th></React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 font-bold bg-gray-50">매출액</td>
              {salesData.map((data, idx) => (
                <React.Fragment key={idx}>
                  <td className="border p-1"><input type="text" value={data.dom_sales} onChange={(e) => handleSalesChange(idx, 'dom_sales', e.target.value)} className="w-full p-1 text-center outline-none" /></td>
                  <td className="border p-1"><input type="text" value={data.ovs_sales} onChange={(e) => handleSalesChange(idx, 'ovs_sales', e.target.value)} className="w-full p-1 text-center outline-none" /></td>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              <td className="border p-2 font-bold bg-gray-50">고용</td>
              {salesData.map((data, idx) => (
                <td key={idx} colSpan={2} className="border p-1">
                  <input type="text" value={data.emp_count} onChange={(e) => handleSalesChange(idx, 'emp_count', e.target.value)} className="w-full p-1 text-center outline-none" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      {/* □ 4. 투자 현황 */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-3">
          <SectionTitle title="□ 투자 현황" noMargin />
          <button onClick={() => addRow(investRows, setInvestRows, {period:'', company:'', stage:'', amount:0, pre:0, post:0, note:''})} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[11px]">+ 투자추가</button>
        </div>
        <div className="text-right text-[10px] text-gray-500 mb-1">(단위 : 백만 원)</div> 
        <table className="w-full border-collapse border-t border-gray-400 text-center text-[11px]">
          <thead className="bg-gray-100 font-black border-b">
            <tr><th className="border p-2">시기</th><th className="border p-2">기관명</th><th className="border p-2">단계</th><th className="border p-2">투자금</th><th className="border p-2">Pre</th><th className="border p-2">Post</th><th className="border w-8">X</th></tr>
          </thead>
          <tbody>
            {investRows.map((row) => (
              <tr key={row.id}>
                <td className="border p-1"><input type="month" className="w-full p-1 text-center outline-none" value={row.period} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'period', e.target.value)} /></td>
                <td className="border p-1"><input type="text" className="w-full p-1 border outline-none text-center" value={row.company} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'company', e.target.value)} /></td>
                <td className="border p-1">
                  <select className="w-full p-1 border outline-none bg-white text-center cursor-pointer" value={row.stage} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'stage', e.target.value)}>
                    <option value="">선택</option>
                    {INVEST_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="border p-1 font-bold"><input type="number" className="w-full p-1 outline-none text-center" value={row.amount} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'amount', e.target.value)} /></td>
                <td className="border p-1"><input type="number" className="w-full p-1 outline-none text-center" value={row.pre} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'pre', e.target.value)} /></td>
                <td className="border p-1"><input type="number" className="w-full p-1 outline-none text-center" value={row.post} onChange={(e) => updateRowField(investRows, setInvestRows, row.id, 'post', e.target.value)} /></td>
                <td className="border p-1 text-center"><button onClick={() => deleteRow(investRows, setInvestRows, row.id)} className="text-red-500 font-bold">X</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-black border-t-2">
            <tr><td colSpan={3} className="border p-2">합계 / 최신 밸류</td><td className="border p-2 text-blue-700">{totalAmount.toLocaleString()}</td><td className="border p-2 text-red-600">{latestValue.pre.toLocaleString()}</td><td className="border p-2 text-red-600">{latestValue.post.toLocaleString()}</td><td className="border"></td></tr>
          </tfoot>
        </table>
      </section>

      {/* □ 5. 제품/기술 소개 */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-2">
          <SectionTitle title="□ 제품 및 기술 상세 소개" noMargin />
          <button onClick={() => addRow(serviceRows, setServiceRows, {title:'', content:'', files:[]})} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[11px]">+ 항목추가</button>
        </div>
        {serviceRows.map((row) => (
          <div key={row.id} className="border-2 border-black mb-6 shadow-sm">
            <input type="text" placeholder="서비스/기술 제목" value={row.title} onChange={(e) => updateRowField(serviceRows, setServiceRows, row.id, 'title', e.target.value)} className="w-full p-3 border-b font-bold bg-gray-50 outline-none" />
            <textarea className="w-full p-4 h-32 resize-none outline-none" placeholder="상세 내용을 입력하세요" value={row.content} onChange={(e) => updateRowField(serviceRows, setServiceRows, row.id, 'content', e.target.value)} />
            <div className="flex justify-end p-2 bg-white"><button onClick={() => deleteRow(serviceRows, setServiceRows, row.id)} className="text-red-600 font-bold text-[11px]">항목 삭제</button></div>
          </div>
        ))}
      </section>

      {/* □ 6. 지재권 / 참여이력 / 수상이력 */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <section>
          <SectionTitle title="□ 보유 지식재산권 (건)" />
          <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px]">
            <thead className="bg-gray-100 font-bold border-b"><tr><th className="border p-2">국내</th><th className="border p-2">해외</th></tr></thead>
            <tbody><tr>
              <td className="border p-1"><input type="text" className="w-full p-1 text-center outline-none" value={ipData.domestic} onChange={(e)=>setIpData({...ipData, domestic: e.target.value})} /></td>
              <td className="border p-1"><input type="text" className="w-full p-1 text-center outline-none" value={ipData.overseas} onChange={(e)=>setIpData({...ipData, overseas: e.target.value})} /></td>
            </tr></tbody>
          </table>
        </section>
        <section>
          <div className="flex justify-between items-center mb-2">
            <SectionTitle title="□ 타 기관 사업 참여 이력" noMargin />
            <button onClick={() => addRow(bizHistoryRows, setBizHistoryRows, {year:'', name:'', agency:'', amount:''})} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px]">+</button>
          </div>
          <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px]">
            <thead className="bg-gray-100 font-bold border-b"><tr><th className="border p-2">연도</th><th className="border p-2">사업명</th><th className="border p-2 w-12 text-red-500">삭제</th></tr></thead>
            <tbody>{bizHistoryRows.map(r => (
              <tr key={r.id}>
                <td className="border p-1"><input type="text" className="w-full p-1 text-center outline-none" value={r.year} onChange={(e) => updateRowField(bizHistoryRows, setBizHistoryRows, r.id, 'year', e.target.value)} /></td>
                <td className="border p-1"><input type="text" className="w-full p-1 outline-none" value={r.name} onChange={(e) => updateRowField(bizHistoryRows, setBizHistoryRows, r.id, 'name', e.target.value)} /></td>
                <td className="border p-1 text-center"><button onClick={() => deleteRow(bizHistoryRows, setBizHistoryRows, r.id)} className="text-red-500 font-bold">X</button></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>

      <section className="mb-10">
        <div className="flex justify-between items-center mb-2">
          <SectionTitle title="□ 입상 및 수상 이력" noMargin />
          <button onClick={() => addRow(awardRows, setAwardRows, {year:'', name:'', agency:'', note:''})} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[11px]">+ 추가</button>
        </div>
        <table className="w-full border-collapse border-t border-gray-400 text-center text-[12px]">
          <thead className="bg-gray-100 font-black border-b">
            <tr><th className="border p-2">연도</th><th className="border p-2">행사명</th><th className="border p-2">주최기관</th><th className="border p-2 w-12 text-red-500">삭제</th></tr>
          </thead>
          <tbody>{awardRows.map((row) => (
            <tr key={row.id}>
              <td className="border p-1"><input type="text" className="w-full p-1 border outline-none text-center" value={row.year} onChange={(e) => updateRowField(awardRows, setAwardRows, row.id, 'year', e.target.value)} /></td>
              <td className="border p-1"><input type="text" className="w-full p-1 border outline-none" value={row.name} onChange={(e) => updateRowField(awardRows, setAwardRows, row.id, 'name', e.target.value)} /></td>
              <td className="border p-1"><input type="text" className="w-full p-1 border outline-none" value={row.agency} onChange={(e) => updateRowField(awardRows, setAwardRows, row.id, 'agency', e.target.value)} /></td>
              <td className="border p-1 text-center"><button onClick={() => deleteRow(awardRows, setAwardRows, row.id)} className="text-red-500 font-bold">X</button></td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      {/* □ 7. 지원 사항 */}
      <section className="mb-20">
        <SectionTitle title="□ 기업 필요 지원사항" />
        <p className="text-red-500 font-bold text-[10px] mb-2">* 최대 5개까지 선택 가능</p>
        <div className="border border-black p-6 bg-gray-50/50 shadow-inner">
          <div className="grid grid-cols-5 gap-y-4 mb-6">
            {Object.keys(supportChecks).map((item) => (
              <label key={item} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={supportChecks[item]} onChange={() => handleSupportCheck(item)} className="w-4 h-4 accent-blue-600" />
                <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{item}</span>
              </label>
            ))}
          </div>
          <input type="text" value={supportOther} onChange={(e) => setSupportOther(e.target.value)} className="w-full border-2 border-black bg-white px-4 py-3 font-bold outline-none shadow-sm" placeholder="기타 필요 지원사항 직접 입력" />
        </div>
      </section>

      <div className="flex justify-center pb-24 pt-10">
        <button onClick={handleSubmit} className="bg-black text-white px-20 py-5 font-black text-xl hover:bg-blue-900 active:scale-95 transition-all shadow-xl uppercase border-b-4 border-black">Final Submit Report</button>
      </div>
    </div>
  </div>  
  );
}

// --- 공통 컴포넌트 ---
function SectionTitle({ title, noMargin = false }: { title: string, noMargin?: boolean }) {
  return <div className={`bg-gray-100 p-2 border-l-8 border-black font-black text-[14px] uppercase ${noMargin ? '' : 'mb-3'}`}>{title}</div>;
}
function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return <div className={`bg-gray-200 p-2 flex items-center justify-center font-bold border-b border-l border-gray-300 text-center ${className}`}>{children}</div>;
}
function Content({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return <div className={`p-1 flex items-center border-b border-l border-gray-300 bg-white ${className}`}>{children}</div>;
}

export default function StartupCompleteForm() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold italic animate-pulse">RELOADING SYSTEM...</div>}>
      <FormContent />
    </Suspense>
  );
}