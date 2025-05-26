import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './Step6StrokeResults.module.css';

export default function Step6StrokeResults({
  participants,
  roomCount,
  roomNames = [],
  onPrev,
  onNext
}) {
  const maxRows = 4;

  // 1) UI 상태
  const [hiddenRooms, setHiddenRooms] = useState(new Set());
  const [visibleMetrics, setVisibleMetrics] = useState({
    score: true,
    banddang: true
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleRoom   = idx => { const s = new Set(hiddenRooms); s.has(idx)?s.delete(idx):s.add(idx); setHiddenRooms(s); };
  const toggleMetric = key => setVisibleMetrics(vm=>({ ...vm, [key]: !vm[key] }));

  // 2) 캡쳐용 ref
  const allocRef  = useRef();
  const resultRef = useRef();

  // 3) 다운로드 헬퍼
  const downloadTable = async (ref, name, type) => {
    const elem   = ref.current;

   // 1) 원본 스타일 보관
   const origOverflow = elem.style.overflow;
   const origWidth    = elem.style.width;

   // 2) 전체 영역이 보이도록 overflow 해제 & width 확장
   elem.style.overflow = 'visible';
   elem.style.width    = `${elem.scrollWidth}px`;

   // 3) 스크롤 초기화 (좌상단부터 캡처)
    elem.scrollLeft = 0;
    elem.scrollTop  = 0;

    const canvas = await html2canvas(elem, {
      scrollX:      0,
      scrollY:      0,
      width:        elem.scrollWidth,
      height:       elem.scrollHeight,
      windowWidth:  elem.scrollWidth,
      windowHeight: elem.scrollHeight
    });

   // 4) 스타일 복구
   elem.style.overflow = origOverflow;
   elem.style.width    = origWidth;

    if (type==='jpg') {
      const link = document.createElement('a');
      link.download = `${name}.jpg`;
      link.href     = canvas.toDataURL('image/jpeg');
      link.click();
    } else {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation:'landscape' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w)/canvas.width;
      pdf.addImage(img,'PNG',0,0,w,h);
      pdf.save(`${name}.pdf`);
    }
  };

  // 4) 방 이름
  const headers = Array.from({ length: roomCount }, (_,i)=>
    roomNames[i]?.trim() ? roomNames[i] : `${i+1}번방`
  );

  // 5) 방별 묶기
  const byRoom = Array.from({ length: roomCount }, ()=>[]);
  participants.forEach(p=>{
    if(p.room!=null) byRoom[p.room-1].push(p);
  });

  // 6) 배정표 rows
  const allocRows = Array.from({ length: maxRows }, (_, ri)=>
    byRoom.map(room=>room[ri]||{ nickname:'', handicap:'' })
  );

  // 7) 최종결과 계산 (visibleMetrics 포함)
  const resultByRoom = useMemo(()=>{
    return byRoom.map(roomArr=>{
      const filled = Array.from({ length: maxRows }, (_,i)=>
        roomArr[i]||{ nickname:'', handicap:0, score:0 }
      );
      let maxIdx=0, maxVal=-Infinity;
      filled.forEach((p,i)=>{
        const sc = p.score||0;
        if(sc>maxVal){ maxVal=sc; maxIdx=i; }
      });
      let sumHd=0, sumSc=0, sumBd=0, sumRs=0;
      const detail = filled.map((p,i)=>{
        const hd = p.handicap||0;
        const sc = p.score||0;
        sumHd+=hd; sumSc+=sc;
        const bd = i===maxIdx?Math.floor(sc/2):sc;
        // 점수/반땅 표시 여부에 따른 결과 값 선택
        const used = visibleMetrics.score
          ? (visibleMetrics.banddang? bd : sc)
          : bd;
        const rs = used - hd;
        sumBd+=bd; sumRs+=rs;
        return { ...p, score: sc, banddang: bd, result: rs };
      });
      return { detail, sumHandicap:sumHd, sumScore:sumSc, sumBanddang:sumBd, sumResult:sumRs };
    });
  }, [byRoom, visibleMetrics]);

  // 8) 등수 재계산 (Tie-break: sumResult 오름차순, 동률 시 sumHandicap 오름차순)
  const rankMap = useMemo(()=>{
    const arr = resultByRoom
      .map((r,i)=>({ idx:i, tot:r.sumResult, hd:r.sumHandicap }))
      .filter(x=>!hiddenRooms.has(x.idx))
      .sort((a,b)=>{
        if(a.tot!==b.tot) return a.tot - b.tot;
        return a.hd - b.hd; // tie-break
      });
    return Object.fromEntries(arr.map((x,i)=>[x.idx, i+1]));
  }, [resultByRoom, hiddenRooms]);

  return (
    <div className={styles.step}>

      {/* 헤더 */}
      <div className={styles.stepHeader}>
        <h3>6. 스트로크 결과표</h3>
      </div>

     {/* 1) 선택 버튼 + 메뉴 래퍼 */}
     <div className={styles.selectWrapper}>
       <button
         className={styles.selectButton}
         onClick={() => setMenuOpen(o => !o)}
       >
         선택
       </button>

       {menuOpen && (
         <div className={styles.dropdownMenu}>
           {/* 1~N번방 체크 */}
           {headers.map((h, i) => (
             <label key={i}>
               <input
                 type="checkbox"
                 checked={!hiddenRooms.has(i)}
                 onChange={() => {
                   toggleRoom(i);
                   setMenuOpen(false);
                 }}
               />
               {h}
             </label>
           ))}

           <hr />

           {/* 점수 · 반땅 체크 */}
           <label>
             <input
               type="checkbox"
               checked={visibleMetrics.score}
               onChange={() => {
                 toggleMetric("score");
                 setMenuOpen(false);
               }}
             />{" "}
             점수
           </label>
           <label>
             <input
               type="checkbox"
               checked={visibleMetrics.banddang}
               onChange={() => {
                 toggleMetric("banddang");
                 setMenuOpen(false);
               }}
             />{" "}
             반땅
           </label>
         </div>
       )}
     </div>

      {/* 드롭다운 */}
      {menuOpen && (
        <div className={styles.dropdownMenu}
             onClick={()=>setMenuOpen(false)} /* 클릭 시 닫기 */
        >
          {headers.map((h,i)=>(
            <label key={i}>
              <input
                type="checkbox"
                checked={!hiddenRooms.has(i)}
                onChange={()=>toggleRoom(i)}
              /> {h}
            </label>
          ))}
          <hr/>
          <label>
            <input
              type="checkbox"
              checked={visibleMetrics.score}
              onChange={()=>toggleMetric('score')}
            /> 점수
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleMetrics.banddang}
              onChange={()=>toggleMetric('banddang')}
            /> 반땅
          </label>
        </div>
      )}

      {/* 방배정표 */}
      <div ref={allocRef} className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>🏠 방배정표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h,i)=>!hiddenRooms.has(i)&&
                <th key={i} colSpan={2} className={styles.header}>{h}</th>
              )}
            </tr>
            <tr>
              {headers.map((_,i)=>!hiddenRooms.has(i)&&<>
                <th key={`n${i}`} className={styles.header}>닉네임</th>
                <th key={`h${i}`} className={styles.header}>G핸디</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {allocRows.map((row,ri)=>(
              <tr key={ri}>
                {row.map((c,ci)=>!hiddenRooms.has(ci)&&
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{c.nickname}</td>
                    <td className={styles.cell} style={{color:'blue'}}>{c.handicap}</td>
                  </React.Fragment>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {byRoom.map((room,ci)=>!hiddenRooms.has(ci)&&
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel}>합계</td>
                  <td className={styles.footerValue} style={{color:'blue'}}>
                    {room.reduce((s,p)=>s+(p.handicap||0),0)}
                  </td>
                </React.Fragment>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 방배정표 다운로드 */}
      <div className={styles.actionButtons}>
        <button onClick={()=>downloadTable(allocRef,'allocation','jpg')}>JPG로 저장</button>
        <button onClick={()=>downloadTable(allocRef,'allocation','pdf')}>PDF로 저장</button>
      </div>

      {/* 최종결과표 */}
      <div
        ref={resultRef}
          className={`${styles.tableContainer} ${styles.resultContainer}`}
         >   
        <h4 className={styles.tableTitle}>📊 최종결과표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h,i)=>!hiddenRooms.has(i)&&
                <th
                  key={i}
                  colSpan={2 
                    + (visibleMetrics.score?1:0)
                    + (visibleMetrics.banddang?1:0)
                    + 1
                  }
                  className={styles.header}
                >{h}</th>
              )}
            </tr>
            <tr>
              {headers.map((_,i)=>!hiddenRooms.has(i)&&
                <React.Fragment key={i}>
                  <th className={styles.header}>닉네임</th>
                  <th className={styles.header}>G핸디</th>
                  {visibleMetrics.score    && <th className={styles.header}>점수</th>}
                  {visibleMetrics.banddang && <th className={styles.header}>반땅</th>}
                  <th className={styles.header}>결과</th>
                </React.Fragment>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:maxRows}).map((_,ri)=>(
              <tr key={ri}>
                {resultByRoom.map((room,ci)=>!hiddenRooms.has(ci)&&
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{room.detail[ri].nickname}</td>
                    <td className={styles.cell}>{room.detail[ri].handicap}</td>
                    {visibleMetrics.score    && <td className={styles.cell}>{room.detail[ri].score}</td>}
                    {visibleMetrics.banddang && (
                      <td className={styles.cell} style={{color:'blue'}}>
                        {room.detail[ri].banddang}
                      </td>
                    )}
                    <td className={styles.cell} style={{color:'red'}}>
                      {room.detail[ri].result}
                    </td>
                  </React.Fragment>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {resultByRoom.map((room,ci)=>!hiddenRooms.has(ci)&&
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel}>합계</td>
                  <td className={styles.footerValue}>{room.sumHandicap}</td>
                  {visibleMetrics.score    && <td className={styles.footerValue}>{room.sumScore}</td>}
                  {visibleMetrics.banddang && <td className={styles.footerBanddang}>{room.sumBanddang}</td>}
                  <td className={styles.footerResult}>{room.sumResult}</td>
                </React.Fragment>
              )}
            </tr>
            <tr>
              {headers.map((_,i)=>!hiddenRooms.has(i)&&
                <React.Fragment key={i}>
                  <td
                    colSpan={2
                      + (visibleMetrics.score?1:0)
                      + (visibleMetrics.banddang?1:0)
                    }
                    className={styles.footerBlank}
                  />
                  <td className={styles.footerRank}
                  style={{ color: 'blue' }}
                  >
                    {rankMap[i]}등
                    </td>
                </React.Fragment>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 최종결과표 다운로드 */}
      <div className={styles.actionButtons}>
        <button onClick={()=>downloadTable(resultRef,'results','jpg')}>JPG로 저장</button>
        <button onClick={()=>downloadTable(resultRef,'results','pdf')}>PDF로 저장</button>
      </div>

      {/* 하단 버튼 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}
