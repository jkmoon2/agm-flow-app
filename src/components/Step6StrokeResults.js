// src/components/Step6StrokeResults.js

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

  // ───────────────────────────────────────────────────────────
  // 1) UI 상태
  const [hiddenRooms, setHiddenRooms] = useState(new Set());
  const [visibleMetrics, setVisibleMetrics] = useState({
    score: true,
    banddang: true
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleRoom = idx => {
    const s = new Set(hiddenRooms);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setHiddenRooms(s);
  };
  const toggleMetric = key => {
    setVisibleMetrics(vm => ({ ...vm, [key]: !vm[key] }));
  };
  // ───────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────
  // 2) 테이블별 ref (캡처 대상)
  const allocRef  = useRef();
  const resultRef = useRef();

  // 3) 다운로드 헬퍼
  const downloadTable = async (ref, name, type) => {
    const elem = ref.current;
    const canvas = await html2canvas(elem, {
      scrollX: -elem.scrollLeft,
      scrollY: -elem.scrollTop,
      width:  elem.scrollWidth,
      height: elem.scrollHeight
    });
    if (type === 'jpg') {
      const link = document.createElement('a');
      link.download = `${name}.jpg`;
      link.href = canvas.toDataURL('image/jpeg');
      link.click();
    } else {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`${name}.pdf`);
    }
  };
  // ───────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────
  // 4) 방 이름
  const headers = Array.from({ length: roomCount }, (_, i) =>
    roomNames[i]?.trim() ? roomNames[i] : `${i+1}번방`
  );

  // 5) participants → 방별 묶기
  const byRoom = Array.from({ length: roomCount }, () => []);
  participants.forEach(p => {
    if (p.room != null) byRoom[p.room - 1].push(p);
  });

  // 6) 방배정표 행
  const allocRows = Array.from({ length: maxRows }, (_, ri) =>
    byRoom.map(roomArr => roomArr[ri] || { nickname:'', handicap: '' })
  );

  // 7) 최종결과 계산
  const resultByRoom = useMemo(() => {
    return byRoom.map(roomArr => {
      const filled = Array.from({ length: maxRows }, (_, i) =>
        roomArr[i] || { nickname:'', handicap: 0, score: 0 }
      );
      let maxIdx=0, maxVal=-Infinity;
      filled.forEach((p,i) => {
        const sc = p.score ?? 0;
        if (sc > maxVal) { maxVal=sc; maxIdx=i; }
      });
      let sumHd=0, sumSc=0, sumBd=0, sumRs=0;
      const detail = filled.map((p,i) => {
        const hd = p.handicap ?? 0;
        const sc = p.score ?? 0;
        sumHd += hd; sumSc += sc;
        const bd = i===maxIdx ? Math.floor(sc/2) : sc;
        // 열 표시 여부에 따라 결과 계산
        const used = visibleMetrics.score
          ? (visibleMetrics.banddang ? bd : sc)
          : bd;
        const rs = used - hd;
        sumBd += bd; sumRs += rs;
        return { ...p, score: sc, banddang: bd, result: rs };
      });
      return { detail, sumHandicap: sumHd, sumScore: sumSc, sumBanddang: sumBd, sumResult: sumRs };
    });
  }, [byRoom, visibleMetrics]);

  // 8) 등수 재계산 (숨긴 방 제외)
  const rankMap = useMemo(() => {
    const arr = resultByRoom
      .map((r,i) => ({ idx: i, tot: r.sumResult }))
      .filter(x => !hiddenRooms.has(x.idx))
      .sort((a,b) => a.tot - b.tot);
    return Object.fromEntries(arr.map((x,i) => [x.idx, i+1]));
  }, [resultByRoom, hiddenRooms]);
  // ───────────────────────────────────────────────────────────

  return (
    <div className={styles.step}>

      {/* 1차 헤더 */}
      <div className={styles.stepHeader}>
        <h3>6. 스트로크 결과표</h3>
      </div>

      {/* 1) 선택 버튼 */}
      <div className={styles.selectButton}>
        <button onClick={() => setMenuOpen(o => !o)}>선택</button>
      </div>

      {/* 2) 드롭다운 메뉴 (세로 정렬) */}
      {menuOpen && (
        <div className={styles.dropdownMenu}>
          {headers.map((h,i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={!hiddenRooms.has(i)}
                onChange={() => toggleRoom(i)}
              /> {h}
            </label>
          ))}
          <hr/>
          <label>
            <input
              type="checkbox"
              checked={visibleMetrics.score}
              onChange={() => toggleMetric('score')}
            /> 점수
          </label>
          <label>
            <input
              type="checkbox"
              checked={visibleMetrics.banddang}
              onChange={() => toggleMetric('banddang')}
            /> 반땅
          </label>
        </div>
      )}

      {/* 3) 방배정표 ↓ 다운로드 버튼 */}
      <div className={styles.actions}>
        <button onClick={() => downloadTable(allocRef,  'allocation', 'jpg')}>JPG로 저장</button>
        <button onClick={() => downloadTable(allocRef,  'allocation', 'pdf')}>PDF로 저장</button>
      </div>

      {/* 방배정표 */}
      <div ref={allocRef} className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>🏠 방배정표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h,i) => !hiddenRooms.has(i) &&
                <th key={i} colSpan={2} className={styles.header}>{h}</th>
              )}
            </tr>
            <tr>
              {headers.map((_,i) => !hiddenRooms.has(i) && <>
                <th key={`n${i}`} className={styles.header}>닉네임</th>
                <th key={`h${i}`} className={styles.header}>G핸디</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {allocRows.map((row,ri) =>
              <tr key={ri}>
                {row.map((c,ci) => !hiddenRooms.has(ci) &&
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{c.nickname}</td>
                    <td className={styles.cell} style={{ color:'blue' }}>{c.handicap}</td>
                  </React.Fragment>
                )}
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              {byRoom.map((roomArr,ci) => !hiddenRooms.has(ci) &&
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel}>합계</td>
                  <td className={styles.footerValue} style={{ color:'blue' }}>
                    {roomArr.reduce((s,p) => s + (p.handicap||0), 0)}
                  </td>
                </React.Fragment>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4) 최종결과표 ↓ 다운로드 버튼 */}
      <div className={styles.actions}>
        <button onClick={() => downloadTable(resultRef, 'results', 'jpg')}>JPG로 저장</button>
        <button onClick={() => downloadTable(resultRef, 'results', 'pdf')}>PDF로 저장</button>
      </div>

      {/* 최종결과표 */}
      <div ref={resultRef} className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>📊 최종결과표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h,i) => !hiddenRooms.has(i) &&
                <th key={i} colSpan={
                  2
                  + (visibleMetrics.score    ? 1 : 0)
                  + (visibleMetrics.banddang ? 1 : 0)
                  + 1
                } className={styles.header}>{h}</th>
              )}
            </tr>
            <tr>
              {headers.map((_,i) => !hiddenRooms.has(i) &&
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
            {Array.from({ length: maxRows }).map((_,ri) =>
              <tr key={ri}>
                {resultByRoom.map((room,ci) => !hiddenRooms.has(ci) &&
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{room.detail[ri].nickname}</td>
                    <td className={styles.cell}>{room.detail[ri].handicap}</td>
                    {visibleMetrics.score    && <td className={styles.cell}>{room.detail[ri].score}</td>}
                    {visibleMetrics.banddang &&
                      <td className={styles.cell} style={{ color:'blue' }}>
                        {room.detail[ri].banddang}
                      </td>
                    }
                    <td className={styles.cell} style={{ color:'red' }}>
                      {room.detail[ri].result}
                    </td>
                  </React.Fragment>
                )}
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              {resultByRoom.map((room,ci) => !hiddenRooms.has(ci) &&
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel}>합계</td>
                  <td className={styles.footerValue}>{room.sumHandicap}</td>
                  {visibleMetrics.score    && <td className={styles.footerValue}>{room.sumScore}</td>}
                  {visibleMetrics.banddang &&
                    <td className={styles.footerBanddang}>{room.sumBanddang}</td>
                  }
                  <td className={styles.footerResult}>{room.sumResult}</td>
                </React.Fragment>
              )}
            </tr>
            <tr>
              {headers.map((_,i) => !hiddenRooms.has(i) &&
                <React.Fragment key={i}>
                  <td colSpan={
                    2
                    + (visibleMetrics.score    ? 1 : 0)
                    + (visibleMetrics.banddang ? 1 : 0)
                  } className={styles.footerBlank}/>
                  <td className={styles.footerRank}>{rankMap[i]}등</td>
                </React.Fragment>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 하단 홈 버튼 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}
