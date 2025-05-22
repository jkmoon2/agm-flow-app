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
  const containerRef = useRef();

  // 1) 가시 설정
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
  const toggleMetric = key => e => {
    setVisibleMetrics(vm => ({
      ...vm,
      [key]: e.target.checked
    }));
  };

  // 2) 방 이름
  const headers = Array.from({ length: roomCount }, (_, i) =>
    roomNames[i]?.trim() ? roomNames[i] : `${i + 1}번방`
  );

  // 3) 참가자 방별 묶기
  const byRoom = useMemo(
    () =>
      Array.from({ length: roomCount }, () => []).map((_, idx) => {
        return participants.filter(p => p.room === idx + 1);
      }),
    [participants, roomCount]
  );

  // 4) 방배정표 행
  const allocationRows = Array.from({ length: maxRows }, (_, ri) =>
    byRoom.map(roomArr => roomArr[ri] || { nickname: '', handicap: '' })
  );

  // 5) 최종 결과 계산(detail + sums)
  const resultByRoom = useMemo(() => {
    return byRoom.map(roomArr => {
      // 빈 슬롯 채우기
      const filled = Array.from({ length: maxRows }, (_, i) =>
        roomArr[i] || { nickname: '', handicap: 0, score: 0 }
      );
      // 최고 score 인덱스
      let maxIdx = 0,
        maxVal = -Infinity;
      filled.forEach((p, i) => {
        const sc = p.score || 0;
        if (sc > maxVal) {
          maxVal = sc;
          maxIdx = i;
        }
      });

      let sumHandicap = 0,
        sumScore = 0,
        sumBanddang = 0,
        sumResult = 0;

      const detail = filled.map((p, i) => {
        const hd = p.handicap || 0,
          sc = p.score || 0;
        sumHandicap += hd;
        sumScore += sc;
        const banddang = i === maxIdx ? Math.floor(sc / 2) : sc;
        sumBanddang += banddang;

        // 결과 계산
        let result;
        if (!visibleMetrics.score) {
          // 점수 숨김 → banddang - hd
          result = banddang - hd;
        } else if (!visibleMetrics.bandang) {
          // 반땅 숨김 → score - hd
          result = sc - hd;
        } else {
          // 둘 다 보임
          result = banddang - hd;
        }
        sumResult += result;

        return { ...p, score: sc, banddang, result };
      });

      return { detail, sumHandicap, sumScore, sumBanddang, sumResult };
    });
  }, [byRoom, visibleMetrics]);

  // 6) 등수 계산 (hiddenRooms 제외)
  const rankMap = useMemo(() => {
    // visible 방 인덱스 & sums
    const arr = resultByRoom
      .map((r, idx) => ({ idx, total: r.sumResult }))
      .filter(x => !hiddenRooms.has(x.idx));
    // 정렬 후 rank
    arr.sort((a, b) => a.total - b.total);
    return Object.fromEntries(
      arr.map((x, rank) => [x.idx, rank + 1])
    );
  }, [resultByRoom, hiddenRooms]);

  // 7) 캡처 & 다운로드 (개별 표)
  const captureTable = async (tableIndex, filename, type) => {
    const tableElems = containerRef.current.querySelectorAll(
      `.${styles.tableContainer}`
    );
    const table = tableElems[tableIndex];
    if (!table) return;
    const canvas = await html2canvas(table, {
      width: table.scrollWidth,
      height: table.scrollHeight,
      windowWidth: table.scrollWidth,
      windowHeight: table.scrollHeight
    });
    if (type === 'jpg') {
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = canvas.toDataURL('image/jpeg');
      link.click();
    } else {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`${filename}.pdf`);
    }
  };

  return (
    <div
      className={styles.step}
      ref={containerRef}
      style={{ position: 'relative' }}
    >
      {/* 헤더 */}
      <div className={styles.stepHeader}>
        <h3>6. 스트로크 결과표</h3>
      </div>

      {/* 선택 버튼 */}
      <button
        style={{ position: 'absolute', top: 52, right: 16, zIndex: 9999 }}
        onClick={() => setMenuOpen(o => !o)}
      >
        선택
      </button>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <div className={styles.dropdownMenu}>
          {headers.map((h, i) => (
            <label key={i} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={!hiddenRooms.has(i)}
                onChange={() => toggleRoom(i)}
                style={{ pointerEvents: 'auto' }}
              />{' '}
              {h}
            </label>
          ))}
          <hr />
          <label>
            <input
              type="checkbox"
              checked={visibleMetrics.score}
              onChange={toggleMetric('score')}
              style={{ pointerEvents: 'auto' }}
            />{' '}
            점수
          </label>
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={visibleMetrics.bandang}
              onChange={toggleMetric('banddang')}
              style={{ pointerEvents: 'auto' }}
            />{' '}
            반땅
          </label>
        </div>
      )}

      {/* 방배정표 다운로드 */}
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => captureTable(0, '방배정표', 'jpg')}>
          JPG로 저장
        </button>
        <button
          onClick={() => captureTable(0, '방배정표', 'pdf')}
          style={{ marginLeft: 8 }}
        >
          PDF로 저장
        </button>
      </div>

      {/* 방배정표 */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>🏠 방배정표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map(
                (label, idx) =>
                  !hiddenRooms.has(idx) && (
                    <th
                      key={idx}
                      colSpan={2}
                      className={styles.header}
                    >
                      {label}
                    </th>
                  )
              )}
            </tr>
            <tr>
              {headers.map(
                (_, idx) =>
                  !hiddenRooms.has(idx) && (
                    <React.Fragment key={idx}>
                      <th className={styles.header}>닉네임</th>
                      <th className={styles.header}>G핸디</th>
                    </React.Fragment>
                  )
              )}
            </tr>
          </thead>
          <tbody>
            {allocationRows.map((row, ri) => (
              <tr key={ri}>
                {row.map(
                  (cell, ci) =>
                    !hiddenRooms.has(ci) && (
                      <React.Fragment key={`${ri}-${ci}`}>
                        <td className={styles.cell}>
                          {cell.nickname}
                        </td>
                        <td
                          className={styles.cell}
                          style={{ color: 'blue' }}
                        >
                          {cell.handicap}
                        </td>
                      </React.Fragment>
                    )
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {byRoom.map(
                (roomArr, ci) =>
                  !hiddenRooms.has(ci) && (
                    <React.Fragment key={ci}>
                      <td
                        className={styles.footerLabel}
                        style={{ background: '#f0f0f0' }}
                      >
                        합계
                      </td>
                      <td
                        className={styles.footerValue}
                        style={{
                          background: '#f0f0f0',
                          color: 'blue'
                        }}
                      >
                        {roomArr.reduce(
                          (s, p) => s + (p.handicap || 0),
                          0
                        )}
                      </td>
                    </React.Fragment>
                  )
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 최종결과표 다운로드 */}
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => captureTable(1, '최종결과표', 'jpg')}>
          JPG로 저장
        </button>
        <button
          onClick={() => captureTable(1, '최종결과표', 'pdf')}
          style={{ marginLeft: 8 }}
        >
          PDF로 저장
        </button>
      </div>

      {/* 최종결과표 */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>📊 최종결과표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map(
                (label, idx) =>
                  !hiddenRooms.has(idx) && (
                    <th
                      key={idx}
                      colSpan={
                        2 +
                        (visibleMetrics.score ? 1 : 0) +
                        (visibleMetrics.bandang ? 1 : 0) +
                        1
                      }
                      className={styles.header}
                    >
                      {label}
                    </th>
                  )
              )}
            </tr>
            <tr>
              {headers.map(
                (_, idx) =>
                  !hiddenRooms.has(idx) && (
                    <React.Fragment key={`h2-${idx}`}>
                      <th className={styles.header}>닉네임</th>
                      <th className={styles.header}>G핸디</th>
                      <th
                        className={styles.header}
                        style={{
                          display: visibleMetrics.score
                            ? ''
                            : 'none'
                        }}
                      >
                        점수
                      </th>
                      <th
                        className={styles.header}
                        style={{
                          display: visibleMetrics.bandang
                            ? ''
                            : 'none'
                        }}
                      >
                        반땅
                      </th>
                      <th className={styles.header}>결과</th>
                    </React.Fragment>
                  )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, ri) => (
              <tr key={ri}>
                {resultByRoom.map(
                  (room, ci) =>
                    !hiddenRooms.has(ci) && (
                      <React.Fragment key={`r-${ri}-${ci}`}>
                        <td className={styles.cell}>
                          {room.detail[ri].nickname}
                        </td>
                        <td className={styles.cell}>
                          {room.detail[ri].handicap}
                        </td>
                        <td
                          className={styles.cell}
                          style={{
                            display: visibleMetrics.score
                              ? ''
                              : 'none'
                          }}
                        >
                          {room.detail[ri].score}
                        </td>
                        <td
                          className={styles.cell}
                          style={{
                            color: 'blue',
                            display: visibleMetrics.bandang
                              ? ''
                              : 'none'
                          }}
                        >
                          {room.detail[ri].banddang}
                        </td>
                        <td
                          className={styles.cell}
                          style={{ color: 'red' }}
                        >
                          {room.detail[ri].result}
                        </td>
                      </React.Fragment>
                    )
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {resultByRoom.map(
                (room, ci) =>
                  !hiddenRooms.has(ci) && (
                    <React.Fragment key={`f1-${ci}`}>
                      <td
                        className={styles.footerLabel}
                        style={{ background: '#f0f0f0' }}
                      >
                        합계
                      </td>
                      <td
                        className={styles.footerValue}
                        style={{ background: '#f0f0f0' }}
                      >
                        {room.sumHandicap}
                      </td>
                      <td
                        className={styles.footerValue}
                        style={{
                          background: '#f0f0f0',
                          display: visibleMetrics.score
                            ? ''
                            : 'none'
                        }}
                      >
                        {room.sumScore}
                      </td>
                      <td
                        className={styles.footerBanddang}
                        style={{
                          background: '#f0f0f0',
                          display: visibleMetrics.bandang
                            ? ''
                            : 'none'
                        }}
                      >
                        {room.sumBanddang}
                      </td>
                      <td
                        className={styles.footerResult}
                        style={{ background: '#f0f0f0' }}
                      >
                        {room.sumResult}
                      </td>
                    </React.Fragment>
                  )
              )}
            </tr>
            <tr>
              {headers.map(
                (_, idx) =>
                  !hiddenRooms.has(idx) && (
                    <React.Fragment key={`f2-${idx}`}>
                      <td
                        colSpan={
                          2 +
                          (visibleMetrics.score ? 1 : 0) +
                          (visibleMetrics.bandang ? 1 : 0)
                        }
                        className={styles.footerBlank}
                      />
                      <td className={styles.footerRank}>
                        {rankMap[idx]}등
                      </td>
                    </React.Fragment>
                  )
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 하단 홈 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}
