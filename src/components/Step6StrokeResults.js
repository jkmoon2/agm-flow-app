// src/components/Step6StrokeResults.js

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './Step6StrokeResults.module.css';

export default function Step6StrokeResults({
  participants,    // [{ id, group, nickname, handicap, score, room }, …]
  roomCount,       // 총 방 개수
  roomNames = [],  // 2페이지에서 설정한 방 이름 목록
  onPrev,          // ← 이전
  onNext           // 홈(1페이지) 이동
}) {
  const maxRows = 4;

  // 1) headers: roomNames 로부터, 빈 값이면 "n번방"
  const headers = Array.from({ length: roomCount }, (_, i) =>
    roomNames[i]?.trim() ? roomNames[i] : `${i + 1}번방`
  );

  // 2) 방별 참가자 묶기
  const byRoom = Array.from({ length: roomCount }, () => []);
  participants.forEach(p => {
    if (p.room != null) byRoom[p.room - 1].push(p);
  });

  // 3) 방배정표 4행 고정
  const allocationRows = Array.from({ length: maxRows }, (_, ri) =>
    byRoom.map(roomArr => roomArr[ri] || { nickname: '', handicap: '' })
  );

  // 4) 최종결과표 계산
  const resultByRoom = byRoom.map(roomArr => {
    const filled = Array.from({ length: maxRows }, (_, i) =>
      roomArr[i] || { nickname: '', handicap: 0, score: 0 }
    );
    // 최고점자 찾기
    let maxIdx = 0, maxVal = -Infinity;
    filled.forEach((p, i) => {
      const sc = p.score ?? 0;
      if (sc > maxVal) { maxVal = sc; maxIdx = i; }
    });
    let sumHandicap = 0, sumScore = 0, sumBanddang = 0, sumResult = 0;
    const detail = filled.map((p, i) => {
      const hd = p.handicap ?? 0;
      const sc = p.score ?? 0;
      sumHandicap += hd;
      sumScore += sc;
      const banddang = i === maxIdx ? Math.floor(sc / 2) : sc;
      sumBanddang += banddang;
      const result = banddang - hd;
      sumResult += result;
      return { ...p, score: sc, banddang, result };
    });
    return { detail, sumHandicap, sumScore, sumBanddang, sumResult };
  });

  // 5) 순위
  const ranks = resultByRoom
    .map((r, i) => ({ roomIdx: i, total: r.sumResult }))
    .sort((a, b) => a.total - b.total)
    .map((r, idx) => ({ roomIdx: r.roomIdx, rank: idx + 1 }));
  const rankMap = Object.fromEntries(ranks.map(r => [r.roomIdx, r.rank]));

  // 6) 선택 기능 상태
  const [hiddenRooms, setHiddenRooms] = useState(new Set());
  const [hiddenMetrics, setHiddenMetrics] = useState({ score: false, banddang: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRoom = idx => {
    const s = new Set(hiddenRooms);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setHiddenRooms(s);
  };
  const toggleMetric = key => {
    setHiddenMetrics(m => ({ ...m, [key]: !m[key] }));
  };

  // 7) 캡처용 ref
  const containerRef = useRef();

  // 8) 다운로드: 각 tableContainer 만 캡처
  const handleDownload = async type => {
    const tables = containerRef.current.querySelectorAll(`.${styles.tableContainer}`);
    for (let table of tables) {
      const canvas = await html2canvas(table, {
        width: table.scrollWidth,
        height: table.scrollHeight,
        windowWidth: table.scrollWidth,
        windowHeight: table.scrollHeight
      });
      if (type === 'jpg') {
        const link = document.createElement('a');
        link.download = 'stroke_results.jpg';
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape' });
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save('stroke_results.pdf');
      }
    }
  };

  return (
    <div className={styles.step} ref={containerRef} style={{ position: 'relative' }}>
      {/* 1차 헤더 (원본) */}
      <div className={styles.stepHeader}>
        <h3>6. 스트로크 결과표</h3>
      </div>

      {/* ★1 “선택” 버튼 (원본 폼 바로 아래) */}
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => setMenuOpen(o => !o)}>선택</button>
      </div>

      {/* ★2 선택 드롭다운 */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 16,
          zIndex: 20,
          background: '#fff',
          border: '1px solid #ccc',
          padding: 8
        }}>
          {headers.map((h, i) => (
            <label key={i} style={{ display: 'block' }}>
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
              checked={!hiddenMetrics.score}
              onChange={() => toggleMetric('score')}
            /> 점수
          </label>
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={!hiddenMetrics.bandang}
              onChange={() => toggleMetric('banddang')}
            /> 반땅
          </label>
        </div>
      )}

      {/* ★3 “JPG/PDF로 저장” (방배정표 아래) */}
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => handleDownload('jpg')}>JPG로 저장</button>
        <button onClick={() => handleDownload('pdf')} style={{ marginLeft: 8 }}>PDF로 저장</button>
      </div>

      {/* 방배정표 (원본 그대로) */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>🏠 방배정표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((label, idx) => !hiddenRooms.has(idx) && (
                <th key={idx} colSpan={2} className={styles.header}>
                  {label}
                </th>
              ))}
            </tr>
            <tr>
              {headers.map((_, idx) => !hiddenRooms.has(idx) && (
                <React.Fragment key={idx}>
                  <th className={styles.header}>닉네임</th>
                  <th className={styles.header}>G핸디</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocationRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => !hiddenRooms.has(ci) && (
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{cell.nickname}</td>
                    <td className={styles.cell}>{cell.handicap}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {byRoom.map((roomArr, ci) => !hiddenRooms.has(ci) && (
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel} style={{ background: '#f0f0f0' }}>합계</td>
                  <td className={styles.footerValue} style={{ background: '#f0f0f0' }}>
                    {roomArr.reduce((s, p) => s + (Number(p.handicap) || 0), 0)}
                  </td>
                </React.Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ★4 “JPG/PDF로 저장” (최종결과표 아래) */}
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => handleDownload('jpg')}>JPG로 저장</button>
        <button onClick={() => handleDownload('pdf')} style={{ marginLeft: 8 }}>PDF로 저장</button>
      </div>

      {/* 최종결과표 (원본 그대로) */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>📊 최종결과표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((label, idx) => !hiddenRooms.has(idx) && (
                <th key={idx} colSpan={5} className={styles.header}>
                  {label}
                </th>
              ))}
            </tr>
            <tr>
              {headers.map((_, idx) => !hiddenRooms.has(idx) && (
                <React.Fragment key={idx}>
                  <th className={styles.header}>닉네임</th>
                  <th className={styles.header}>G핸디</th>
                  {!hiddenMetrics.score && <th className={styles.header}>점수</th>}
                  {!hiddenMetrics.bandang && <th className={styles.header}>반땅</th>}
                  <th className={styles.header}>결과</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, ri) => (
              <tr key={ri}>
                {resultByRoom.map((room, ci) => !hiddenRooms.has(ci) && (
                  <React.Fragment key={ci}>
                    <td className={styles.cell}>{room.detail[ri].nickname}</td>
                    <td className={styles.cell}>{room.detail[ri].handicap}</td>
                    {!hiddenMetrics.score && <td className={styles.cell}>{room.detail[ri].score}</td>}
                    {!hiddenMetrics.bandang && <td className={styles.cell}>{room.detail[ri].banddang}</td>}
                    <td className={styles.cell}>{room.detail[ri].result}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {resultByRoom.map((room, ci) => !hiddenRooms.has(ci) && (
                <React.Fragment key={ci}>
                  <td className={styles.footerLabel} style={{ background: '#f0f0f0' }}>합계</td>
                  <td className={styles.footerValue} style={{ background: '#f0f0f0' }}>{room.sumHandicap}</td>
                  {!hiddenMetrics.score && <td className={styles.footerValue} style={{ background: '#f0f0f0' }}>{room.sumScore}</td>}
                  {!hiddenMetrics.bandang && <td className={styles.footerBanddang} style={{ background: '#f0f0f0' }}>{room.sumBanddang}</td>}
                  <td className={styles.footerResult} style={{ background: '#f0f0f0' }}>{room.sumResult}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              {headers.map((_, idx) => !hiddenRooms.has(idx) && (
                <React.Fragment key={idx}>
                  <td colSpan={4} className={styles.footerBlank} />
                  <td className={styles.footerRank}>{rankMap[idx]}등</td>
                </React.Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 하단 “홈” 버튼 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}
