// src/components/Step8AgmResults.js

import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './Step8AgmResults.module.css';

export default function Step8AgmResults({
  participants,    // [{id, group, nickname, handicap, score, room, partner}, …]
  roomCount,
  roomNames = [],
  onPrev,
  onNext
}) {
  const maxRows = 4;

  const [hiddenRooms, setHiddenRooms] = useState(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState({
    score: true,
    banddang: true
  });

  const toggleRoom = idx => {
    const s = new Set(hiddenRooms);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setHiddenRooms(s);
  };
  const toggleMetric = key =>
    setVisibleMetrics(vm => ({ ...vm, [key]: !vm[key] }));

  const allocRef = useRef();
  const resultRef = useRef();
  const teamRef = useRef();

  const downloadTable = async (ref, name, type) => {
    const elem = ref.current;
    const origOverflow = elem.style.overflow;
    const origWidth = elem.style.width;
    elem.style.overflow = 'visible';
    elem.style.width = `${elem.scrollWidth}px`;
    elem.scrollLeft = 0;
    elem.scrollTop = 0;

    const canvas = await html2canvas(elem, {
      scrollX: 0,
      scrollY: 0,
      width: elem.scrollWidth,
      height: elem.scrollHeight,
      windowWidth: elem.scrollWidth,
      windowHeight: elem.scrollHeight
    });

    elem.style.overflow = origOverflow;
    elem.style.width = origWidth;

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

  const headers = Array.from({ length: roomCount }, (_, i) =>
    roomNames[i]?.trim() ? roomNames[i] : `${i + 1}번방`
  );

  const byRoom = useMemo(() => {
    const arr = Array.from({ length: roomCount }, () => []);
    participants.forEach(p => {
      if (p.room != null && p.room >= 1 && p.room <= roomCount) {
        arr[p.room - 1].push(p);
      }
    });
    return arr;
  }, [participants, roomCount]);

  const orderedByRoom = useMemo(() => {
    const half = participants.length / 2;
    return byRoom.map(roomArr => {
      const slot = [null, null, null, null];
      const g1 = roomArr.filter(p => p.id < half);
      const g2 = roomArr.filter(p => p.id >= half);
      g1.forEach((p, idx) => { if (idx < 2) slot[idx * 2] = p });
      g2.forEach((p, idx) => { if (idx < 2) slot[idx * 2 + 1] = p });
      return slot.map(p =>
        p
          ? p
          : {
              nickname: '',
              handicap: 0,
              score: 0
            }
      );
    });
  }, [byRoom, participants]);

  const allocRows = Array.from({ length: maxRows }, (_, ri) =>
    orderedByRoom.map(room => room[ri])
  );

  const resultByRoom = useMemo(() => {
    return orderedByRoom.map(roomArr => {
      let maxIdx = 0, maxVal = -Infinity;
      roomArr.forEach((p, i) => {
        const sc = p.score || 0;
        if (sc > maxVal) { maxVal = sc; maxIdx = i; }
      });

      let sumHd = 0, sumSc = 0, sumBd = 0, sumRs = 0;
      const detail = roomArr.map((p, i) => {
        const hd = p.handicap || 0;
        const sc = p.score || 0;
        const bd = i === maxIdx ? Math.floor(sc / 2) : sc;
        const used = visibleMetrics.banddang ? bd : sc;
        const rs = used - hd;
        sumHd += hd;
        sumSc += sc;
        sumBd += bd;
        sumRs += rs;
        return { ...p, score: sc, banddang: bd, result: rs };
      });
      return {
        detail,
        sumHandicap: sumHd,
        sumScore: sumSc,
        sumBanddang: sumBd,
        sumResult: sumRs
      };
    });
  }, [orderedByRoom, visibleMetrics]);

  const rankMap = useMemo(() => {
    const arr = resultByRoom
      .map((r, i) => ({
        idx: i,
        tot: r.sumResult,
        hd: r.sumHandicap
      }))
      .filter(x => !hiddenRooms.has(x.idx))
      .sort((a, b) => {
        if (a.tot !== b.tot) return a.tot - b.tot;
        return a.hd - b.hd;
      });
    return Object.fromEntries(arr.map((x, i) => [x.idx, i + 1]));
  }, [resultByRoom, hiddenRooms]);

  const teamIndividualByRoom = useMemo(() => {
    return resultByRoom.map((r, idx) => ({
      roomName: headers[idx],
      sumResult: r.sumResult,
      sumHandicap: r.sumHandicap,
      detail: r.detail.map(p => ({ ...p }))
    }));
  }, [resultByRoom, headers]);

  return (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>8. 포볼 결과표</h3>
      </div>

      <div className={styles.selectWrapper}>
        <button
          className={styles.selectButton}
          onClick={() => setMenuOpen(o => !o)}
        >
          선택
        </button>
        {menuOpen && (
          <div className={styles.dropdownMenu}>
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
            <label>
              <input
                type="checkbox"
                checked={visibleMetrics.score}
                onChange={() => {
                  toggleMetric('score');
                  setMenuOpen(false);
                }}
              />
              점수
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleMetrics.banddang}
                onChange={() => {
                  toggleMetric('banddang');
                  setMenuOpen(false);
                }}
              />
              반땅
            </label>
          </div>
        )}
      </div>

      <div className={styles.contentWrapper}>
        <div ref={allocRef} className={styles.tableContainer}>
          <h4 className={styles.tableTitle}>🏠 방배정표</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                {headers.map((h, i) =>
                  !hiddenRooms.has(i) && (
                    <th key={i} colSpan={2} className={styles.header}>
                      {h}
                    </th>
                  )
                )}
              </tr>
              <tr>
                {headers.map((_, i) =>
                  !hiddenRooms.has(i) && (
                    <React.Fragment key={i}>
                      <th className={styles.header}>닉네임</th>
                      <th className={styles.header}>G핸디</th>
                    </React.Fragment>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {allocRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) =>
                    !hiddenRooms.has(ci) && (
                      <React.Fragment key={ci}>
                        <td className={styles.cell}>{c.nickname}</td>
                        <td
                          className={styles.cell}
                          style={{ color: 'blue' }}
                        >
                          {c.handicap}
                        </td>
                      </React.Fragment>
                    )
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {byRoom.map((room, ci) =>
                  !hiddenRooms.has(ci) && (
                    <React.Fragment key={ci}>
                      <td className={styles.footerLabel}>합계</td>
                      <td
                        className={styles.footerValue}
                        style={{ color: 'blue' }}
                      >
                        {room.reduce((s, p) => s + (p.handicap || 0), 0)}
                      </td>
                    </React.Fragment>
                  )
                )}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.actionButtons}>
          <button
            onClick={() => downloadTable(allocRef, 'allocation', 'jpg')}
          >
            JPG로 저장
          </button>
          <button
            onClick={() => downloadTable(allocRef, 'allocation', 'pdf')}
          >
            PDF로 저장
          </button>
        </div>

        <div
          ref={resultRef}
          className={`${styles.tableContainer} ${styles.resultContainer}`}
        >
          <h4 className={styles.tableTitle}>📊 최종결과표</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                {headers.map((h, i) =>
                  !hiddenRooms.has(i) && (
                    <th
                      key={i}
                      colSpan={
                        2 +
                        (visibleMetrics.score ? 1 : 0) +
                        (visibleMetrics.banddang ? 1 : 0) +
                        1
                      }
                      className={styles.header}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
              <tr>
                {headers.map((_, i) =>
                  !hiddenRooms.has(i) && (
                    <React.Fragment key={i}>
                      <th className={styles.header}>닉네임</th>
                      <th className={styles.header}>G핸디</th>
                      {visibleMetrics.score && (
                        <th className={styles.header}>점수</th>
                      )}
                      {visibleMetrics.banddang && (
                        <th className={styles.header}>반땅</th>
                      )}
                      <th className={styles.header}>결과</th>
                    </React.Fragment>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, ri) => (
                <tr key={ri}>
                  {resultByRoom.map((room, ci) =>
                    !hiddenRooms.has(ci) && (
                      <React.Fragment key={ci}>
                        <td className={styles.cell}>
                          {room.detail[ri].nickname}
                        </td>
                        <td className={styles.cell}>
                          {room.detail[ri].handicap}
                        </td>
                        {visibleMetrics.score && (
                          <td className={styles.cell}>
                            {room.detail[ri].score}
                          </td>
                        )}
                        {visibleMetrics.banddang && (
                          <td
                            className={styles.cell}
                            style={{ color: 'blue' }}
                          >
                            {room.detail[ri].banddang}
                          </td>
                        )}
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
                {resultByRoom.map((room, ci) =>
                  !hiddenRooms.has(ci) && (
                    <React.Fragment key={ci}>
                      <td className={styles.footerLabel}>합계</td>
                      <td className={styles.footerValue}>
                        {room.sumHandicap}
                      </td>
                      {visibleMetrics.score && (
                        <td className={styles.footerValue}>
                          {room.sumScore}
                        </td>
                      )}
                      {visibleMetrics.banddang && (
                        <td className={styles.footerBanddang}>
                          {room.sumBanddang}
                        </td>
                      )}
                      <td className={styles.footerResult}>
                        {room.sumResult}
                      </td>
                    </React.Fragment>
                  )
                )}
              </tr>
              <tr>
                {headers.map((_, i) =>
                  !hiddenRooms.has(i) && (
                    <React.Fragment key={i}>
                      <td
                        colSpan={
                          2 +
                          (visibleMetrics.score ? 1 : 0) +
                          (visibleMetrics.banddang ? 1 : 0)
                        }
                        className={styles.footerBlank}
                      />
                      <td
                        className={styles.footerRank}
                        style={{ color: 'blue' }}
                      >
                        {rankMap[i]}등
                      </td>
                    </React.Fragment>
                  )
                )}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.actionButtons}>
          <button
            onClick={() => downloadTable(resultRef, 'results', 'jpg')}
          >
            JPG로 저장
          </button>
          <button
            onClick={() => downloadTable(resultRef, 'results', 'pdf')}
          >
            PDF로 저장
          </button>
        </div>

        <div ref={teamRef} className={styles.tableContainer}>
          <h4 className={styles.tableTitle}>📋 팀결과표</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.header}>방</th>
                <th className={styles.header}>닉네임</th>
                <th className={styles.header}>G핸디</th>
                <th className={styles.header}>점수</th>
                <th className={styles.header}>결과</th>
                <th className={styles.header}>총점</th>
                <th className={styles.header}>순위</th>
              </tr>
            </thead>
            <tbody>
              {teamIndividualByRoom.map((room, ri) =>
                room.detail.map((p, ci) => (
                  <tr key={`${ri}-${ci}`}>
                    {ci === 0 && (
                      <td rowSpan={maxRows} className={styles.cell}>
                        {room.roomName}
                      </td>
                    )}
                    <td className={styles.cell}>{p.nickname}</td>
                    <td className={styles.cell}>{p.handicap}</td>
                    <td
                      className={styles.cell}
                      style={{ color: 'blue' }}
                    >
                      {p.score}
                    </td>
                    <td
                      className={styles.cell}
                      style={{ color: 'red' }}
                    >
                      {p.result}
                    </td>
                    {ci === 0 && (
                      <>
                        <td
                          rowSpan={maxRows}
                          className={styles.footerResult}
                        >
                          {room.sumResult}
                        </td>
                        <td
                          rowSpan={maxRows}
                          className={styles.footerRank}
                          style={{ color: 'blue' }}
                        >
                          {rankMap[ri]}등
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.actionButtons}>
          <button
            onClick={() => downloadTable(teamRef, 'team-results', 'jpg')}
          >
            JPG로 저장
          </button>
          <button
            onClick={() => downloadTable(teamRef, 'team-results', 'pdf')}
          >
            PDF로 저장
          </button>
        </div>
      </div>

      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}
