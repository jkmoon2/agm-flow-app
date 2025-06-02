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
  const MAX_PER_ROOM = 4; // 한 방에 최대 4명

  // ── 1) UI 상태 ───────────────────────────────────────────
  const [hiddenRooms, setHiddenRooms]   = useState(new Set());
  const [menuOpen, setMenuOpen]         = useState(false);
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

  // ── 2) 캡처용 refs ───────────────────────────────────────
  const allocRef        = useRef();
  const resultRef       = useRef();
  // “팀결과표 전체 복제본” 캡처용 ref (off‐screen)
  const teamCaptureRef  = useRef();

  // ── 3) 테이블 다운로드 헬퍼 (JPG / PDF 단일 페이지) ─────────────────────
  const downloadTable = async (ref, name, type) => {
    const elem = ref.current;
    if (!elem) return;

    // ① 원본 overflow, width 백업
    const origOverflow = elem.style.overflow;
    const origWidth    = elem.style.width;

    // ② 캡처용: 숨겨진 영역까지 모두 보이게 강제
    elem.style.overflow = 'visible';
    elem.style.width    = `${elem.scrollWidth}px`;
    elem.scrollLeft = 0;
    elem.scrollTop  = 0;

    // ③ html2canvas로 전체 영역 캡처
    const canvas = await html2canvas(elem, {
      scrollX:      0,
      scrollY:      0,
      width:        elem.scrollWidth,
      height:       elem.scrollHeight,
      windowWidth:  elem.scrollWidth,
      windowHeight: elem.scrollHeight
    });

    // ④ 복원
    elem.style.overflow = origOverflow;
    elem.style.width    = origWidth;

    if (type === 'jpg') {
      const link = document.createElement('a');
      link.download = `${name}.jpg`;
      link.href     = canvas.toDataURL('image/jpeg');
      link.click();
    } else {
      // PDF 저장: 단일 페이지에 “전체 캔버스”를 축소하여 삽입
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF({ orientation: 'landscape' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight= pdf.internal.pageSize.getHeight();

      // 캔버스 실제 크기
      const canvasWidth  = canvas.width;
      const canvasHeight = canvas.height;

      // 가로/세로 비율을 비교하여, 페이지 안에 맞도록 축소 비율 계산
      const ratioW = pageWidth  / canvasWidth;
      const ratioH = pageHeight / canvasHeight;
      const scale = Math.min(ratioW, ratioH);

      // 축소된 크기
      const imgWidth  = canvasWidth  * scale;
      const imgHeight = canvasHeight * scale;

      // 중앙 정렬을 원한다면 (선택사항)
      const xOffset = (pageWidth  - imgWidth)  / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`${name}.pdf`);
    }
  };

  // ── 4) “방 이름” 배열 (없으면 “N번방”) ──────────
  const headers = Array.from({ length: roomCount }, (_, i) =>
    roomNames[i]?.trim() ? roomNames[i] : `${i + 1}번방`
  );

  // ── 5) participants를 방별로 묶은 2차원 배열 ────────────────────
  const byRoom = useMemo(() => {
    const arr = Array.from({ length: roomCount }, () => []);
    participants.forEach(p => {
      if (p.room != null && p.room >= 1 && p.room <= roomCount) {
        arr[p.room - 1].push(p);
      }
    });
    return arr;
  }, [participants, roomCount]);

  // ── 6) “1조=slot[0,2], 2조=slot[1,3]” 규칙으로 4칸 확보 ─────────
  const orderedByRoom = useMemo(() => {
    const half = participants.length / 2;
    return byRoom.map(roomArr => {
      const slot = [null, null, null, null];
      const g1 = roomArr.filter(p => p.id < half);
      const g2 = roomArr.filter(p => p.id >= half);
      g1.forEach((p, idx) => { if (idx < 2) slot[idx * 2] = p; });
      g2.forEach((p, idx) => { if (idx < 2) slot[idx * 2 + 1] = p; });
      return slot.map(p => p ? p : { nickname: '', handicap: 0, score: 0 });
    });
  }, [byRoom, participants]);

  // ── 7) 방배정표 Rows 생성 ──────────────────────────────────────
  const allocRows = Array.from({ length: MAX_PER_ROOM }, (_, ri) =>
    orderedByRoom.map(room => room[ri])
  );

  // ── 8) 최종결과 계산 (반땅 로직 포함) ─────────────────────────────────
  const resultByRoom = useMemo(() => {
    return orderedByRoom.map(roomArr => {
      // 반땅 대상(최고점자) 인덱스 찾기
      let maxIdx = 0, maxVal = -Infinity;
      roomArr.forEach((p, i) => {
        const sc = p.score || 0;
        if (sc > maxVal) {
          maxVal = sc;
          maxIdx = i;
        }
      });

      let sumHd = 0, sumSc = 0, sumBd = 0, sumRs = 0;
      const detail = roomArr.map((p, i) => {
        const hd = p.handicap || 0;
        const sc = p.score    || 0;
        const bd = i === maxIdx ? Math.floor(sc / 2) : sc;
        const used = visibleMetrics.banddang ? bd : sc;
        const rs = used - hd;
        sumHd += hd;
        sumSc += sc;
        sumBd += bd;
        sumRs += rs;
        return { ...p, score: sc, banddang: bd, result: rs };
      });
      return { detail, sumHandicap: sumHd, sumScore: sumSc, sumBanddang: sumBd, sumResult: sumRs };
    });
  }, [orderedByRoom, visibleMetrics]);

  // ── 9) 방별 최종결과 순위 계산 ───────────────────────────────────
  const rankMap = useMemo(() => {
    const arr = resultByRoom
      .map((r, i) => ({ idx: i, tot: r.sumResult, hd: r.sumHandicap }))
      .filter(x => !hiddenRooms.has(x.idx))
      .sort((a, b) => {
        if (a.tot !== b.tot) return a.tot - b.tot;
        return a.hd - b.hd;
      });
    return Object.fromEntries(arr.map((x, i) => [x.idx, i + 1]));
  }, [resultByRoom, hiddenRooms]);

  // ── 10) 팀결과표용: 방별 2인씩 팀A/팀B 로 묶어 합산 ─────────────────
  const teamsByRoom = useMemo(() => {
    const list = [];
    orderedByRoom.forEach((roomArr, roomIdx) => {
      const [p0, p1, p2, p3] = roomArr;

      // (1) 팀 A (slot0, slot1)
      const rA0 = (p0?.score || 0) - (p0?.handicap || 0);
      const rA1 = (p1?.score || 0) - (p1?.handicap || 0);
      const sumResA = rA0 + rA1;
      const sumHdA  = (p0?.handicap || 0) + (p1?.handicap || 0);
      list.push({
        roomIdx,
        teamIdx: 0,
        members: [p0, p1],
        sumResult:   sumResA,
        sumHandicap: sumHdA,
        roomName:    headers[roomIdx],
        originalIndex: list.length
      });

      // (2) 팀 B (slot2, slot3)
      const rB0 = (p2?.score || 0) - (p2?.handicap || 0);
      const rB1 = (p3?.score || 0) - (p3?.handicap || 0);
      const sumResB = rB0 + rB1;
      const sumHdB  = (p2?.handicap || 0) + (p3?.handicap || 0);
      list.push({
        roomIdx,
        teamIdx: 1,
        members: [p2, p3],
        sumResult:   sumResB,
        sumHandicap: sumHdB,
        roomName:    headers[roomIdx],
        originalIndex: list.length
      });
    });
    return list;
  }, [orderedByRoom, headers]);

  // ── 11) 모든 팀(“teamsByRoom”) 중 “낮은 합산점수=1등” 순위 계산 ──────────
  const teamRankMap = useMemo(() => {
    const mapWithIdx = teamsByRoom.map((t, idx) => ({ ...t, idxInOriginal: idx }));
    const visibleTeams = mapWithIdx.filter(t => !hiddenRooms.has(t.roomIdx));

    visibleTeams.sort((a, b) => {
      if (a.sumResult !== b.sumResult) return a.sumResult - b.sumResult;
      return a.sumHandicap - b.sumHandicap;
    });

    const rankMapObj = {};
    visibleTeams.forEach((t, i) => {
      const duplicates = visibleTeams
        .map((x, j) =>
          x.roomIdx === t.roomIdx &&
          x.sumResult === t.sumResult &&
          x.sumHandicap === t.sumHandicap ? j : -1
        )
        .filter(j => j >= 0);
      duplicates.forEach(j => {
        rankMapObj[ visibleTeams[j].idxInOriginal ] = i + 1;
      });
    });

    return rankMapObj;
  }, [teamsByRoom, hiddenRooms]);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.step}>

      {/* ─── 상단 헤더 ─── */}
      <div className={styles.stepHeader}>
        <h3>8. 포볼 결과표</h3>
      </div>

      {/* ─── “선택” 버튼 + 드롭다운 ─── */}
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

      {/* ─── 중간 컨텐츠(스크롤) ─── */}
      <div className={styles.contentWrapper}>

        {/* ── [Allocation Table] 방배정표 ── */}
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
                        <td className={styles.cell} style={{ color: 'blue' }}>
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
                      <td
                        className={styles.footerLabel}
                        style={{ background: '#f7f7f7' }}
                      >
                        합계
                      </td>
                      <td
                        className={styles.footerValue}
                        style={{ color: 'blue', background: '#f7f7f7' }}
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
          <button onClick={() => downloadTable(allocRef, 'allocation', 'jpg')}>
            JPG로 저장
          </button>
          <button onClick={() => downloadTable(allocRef, 'allocation', 'pdf')}>
            PDF로 저장
          </button>
        </div>

        {/* ── [Result Table] 최종결과표 ── */}
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
                        2 /* 닉네임+G핸디 */ +
                        (visibleMetrics.score ? 1 : 0) +
                        (visibleMetrics.banddang ? 1 : 0) +
                        1 /* 결과 */
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
              {Array.from({ length: MAX_PER_ROOM }).map((_, ri) => (
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
                      <td
                        className={styles.footerLabel}
                        style={{ background: '#f7f7f7' }}
                      >
                        합계
                      </td>
                      <td
                        className={styles.footerValue}
                        style={{ color: 'black', background: '#f7f7f7' }}
                      >
                        {room.sumHandicap}
                      </td>
                      {visibleMetrics.score && (
                        <td
                          className={styles.footerValue}
                          style={{ color: 'black', background: '#f7f7f7' }}
                        >
                          {room.sumScore}
                        </td>
                      )}
                      {visibleMetrics.banddang && (
                        <td
                          className={styles.footerBanddang}
                          style={{ background: '#f7f7f7' }}
                        >
                          {room.sumBanddang}
                        </td>
                      )}
                      <td
                        className={styles.footerResult}
                        style={{ background: '#f7f7f7' }}
                      >
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
                          2 /* 닉네임+G핸디 */ +
                          (visibleMetrics.score ? 1 : 0) +
                          (visibleMetrics.banddang ? 1 : 0)
                        }
                        className={styles.footerBlank}
                        style={{ background: '#f7f7f7' }}
                      />
                      <td
                        className={styles.footerRankFinal}
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
          <button onClick={() => downloadTable(resultRef, 'results', 'jpg')}>
            JPG로 저장
          </button>
          <button onClick={() => downloadTable(resultRef, 'results', 'pdf')}>
            PDF로 저장
          </button>
        </div>

        {/* ── [Team Result Table - 화면용] ── */}
        <div className={styles.teamContainer}>
          <h4 className={styles.tableTitle}>📋 팀결과표</h4>
          <div className={styles.tableContainer}>
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
                {Array.from({ length: roomCount }).map((_, roomIdx) => {
                  if (hiddenRooms.has(roomIdx)) return null;

                  const idxA = teamsByRoom.findIndex(
                    t => t.roomIdx === roomIdx && t.teamIdx === 0
                  );
                  const idxB = teamsByRoom.findIndex(
                    t => t.roomIdx === roomIdx && t.teamIdx === 1
                  );
                  const teamA = teamsByRoom[idxA];
                  const teamB = teamsByRoom[idxB];
                  const rankA = teamRankMap[idxA] || '-';
                  const rankB = teamRankMap[idxB] || '-';

                  return (
                    <React.Fragment key={roomIdx}>
                      {/* 팀 A 첫 번째 행 */}
                      <tr>
                        <td rowSpan={MAX_PER_ROOM} className={styles.cell}>
                          {teamA.roomName}
                        </td>
                        <td className={styles.cell}>{teamA.members[0]?.nickname}</td>
                        <td className={styles.cell}>{teamA.members[0]?.handicap}</td>
                        <td className={styles.cell} style={{ color: 'blue' }}>
                          {teamA.members[0]?.score}
                        </td>
                        <td className={styles.cell} style={{ color: 'red' }}>
                          {(teamA.members[0]?.score || 0) - (teamA.members[0]?.handicap || 0)}
                        </td>
                        <td rowSpan={2} className={styles.footerResult}>
                          {teamA.sumResult}
                        </td>
                        <td rowSpan={2} className={styles.footerRank}>
                          {rankA}등
                        </td>
                      </tr>
                      {/* 팀 A 두 번째 행 */}
                      <tr>
                        <td className={styles.cell}>{teamA.members[1]?.nickname}</td>
                        <td className={styles.cell}>{teamA.members[1]?.handicap}</td>
                        <td className={styles.cell} style={{ color: 'blue' }}>
                          {teamA.members[1]?.score}
                        </td>
                        <td className={styles.cell} style={{ color: 'red' }}>
                          {(teamA.members[1]?.score || 0) - (teamA.members[1]?.handicap || 0)}
                        </td>
                      </tr>
                      {/* 팀 B 첫 번째 행 */}
                      <tr>
                        <td className={styles.cell}>{teamB.members[0]?.nickname}</td>
                        <td className={styles.cell}>{teamB.members[0]?.handicap}</td>
                        <td className={styles.cell} style={{ color: 'blue' }}>
                          {teamB.members[0]?.score}
                        </td>
                        <td className={styles.cell} style={{ color: 'red' }}>
                          {(teamB.members[0]?.score || 0) - (teamB.members[0]?.handicap || 0)}
                        </td>
                        <td rowSpan={2} className={styles.footerResult}>
                          {teamB.sumResult}
                        </td>
                        <td rowSpan={2} className={styles.footerRank}>
                          {rankB}등
                        </td>
                      </tr>
                      {/* 팀 B 두 번째 행 */}
                      <tr>
                        <td className={styles.cell}>{teamB.members[1]?.nickname}</td>
                        <td className={styles.cell}>{teamB.members[1]?.handicap}</td>
                        <td className={styles.cell} style={{ color: 'blue' }}>
                          {teamB.members[1]?.score}
                        </td>
                        <td className={styles.cell} style={{ color: 'red' }}>
                          {(teamB.members[1]?.score || 0) - (teamB.members[1]?.handicap || 0)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── [Team Result Table - 캡처용(off‐screen)] ── */}
        <div
          ref={teamCaptureRef}
          style={{
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            background: '#fff',
            border: '1px solid #ddd'
          }}
        >
          {/* (1) 제목 */}
          <h4
            style={{
              background: '#fff',
              padding: '6px 8px',
              fontSize: '16px',
              textAlign: 'left',
              margin: 0,
              borderBottom: '1px solid #bbb'
            }}
          >
            📋 팀결과표
          </h4>

          {/* (2) 표 전체(숨겨진 열 포함) */}
          <table
            style={{
              borderCollapse: 'collapse',
              width: 'auto',
              minWidth: 'max-content'
            }}
          >
            <thead>
              <tr>
                <th style={captureHeaderStyle}>방</th>
                <th style={captureHeaderStyle}>닉네임</th>
                <th style={captureHeaderStyle}>G핸디</th>
                <th style={captureHeaderStyle}>점수</th>
                <th style={captureHeaderStyle}>결과</th>
                <th style={captureHeaderStyle}>총점</th>
                <th style={captureHeaderStyle}>순위</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: roomCount }).map((_, roomIdx) => {
                if (hiddenRooms.has(roomIdx)) return null;

                const idxA = teamsByRoom.findIndex(
                  t => t.roomIdx === roomIdx && t.teamIdx === 0
                );
                const idxB = teamsByRoom.findIndex(
                  t => t.roomIdx === roomIdx && t.teamIdx === 1
                );
                const teamA = teamsByRoom[idxA];
                const teamB = teamsByRoom[idxB];
                const rankA = teamRankMap[idxA] || '-';
                const rankB = teamRankMap[idxB] || '-';

                return (
                  <React.Fragment key={roomIdx}>
                    <tr>
                      <td
                        rowSpan={MAX_PER_ROOM}
                        style={captureCellStyle}
                      >
                        {teamA.roomName}
                      </td>
                      <td style={captureCellStyle}>{teamA.members[0]?.nickname}</td>
                      <td style={captureCellStyle}>{teamA.members[0]?.handicap}</td>
                      <td style={{ ...captureCellStyle, color: 'blue' }}>
                        {teamA.members[0]?.score}
                      </td>
                      <td style={{ ...captureCellStyle, color: 'red' }}>
                        {(teamA.members[0]?.score || 0) - (teamA.members[0]?.handicap || 0)}
                      </td>
                      <td
                        rowSpan={2}
                        style={captureFooterResultStyle}
                      >
                        {teamA.sumResult}
                      </td>
                      <td
                        rowSpan={2}
                        style={captureFooterRankStyle}
                      >
                        {rankA}등
                      </td>
                    </tr>
                    <tr>
                      <td style={captureCellStyle}>{teamA.members[1]?.nickname}</td>
                      <td style={captureCellStyle}>{teamA.members[1]?.handicap}</td>
                      <td style={{ ...captureCellStyle, color: 'blue' }}>
                        {teamA.members[1]?.score}
                      </td>
                      <td style={{ ...captureCellStyle, color: 'red' }}>
                        {(teamA.members[1]?.score || 0) - (teamA.members[1]?.handicap || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td style={captureCellStyle}>{teamB.members[0]?.nickname}</td>
                      <td style={captureCellStyle}>{teamB.members[0]?.handicap}</td>
                      <td style={{ ...captureCellStyle, color: 'blue' }}>
                        {teamB.members[0]?.score}
                      </td>
                      <td style={{ ...captureCellStyle, color: 'red' }}>
                        {(teamB.members[0]?.score || 0) - (teamB.members[0]?.handicap || 0)}
                      </td>
                      <td
                        rowSpan={2}
                        style={captureFooterResultStyle}
                      >
                        {teamB.sumResult}
                      </td>
                      <td
                        rowSpan={2}
                        style={captureFooterRankStyle}
                      >
                        {rankB}등
                      </td>
                    </tr>
                    <tr>
                      <td style={captureCellStyle}>{teamB.members[1]?.nickname}</td>
                      <td style={captureCellStyle}>{teamB.members[1]?.handicap}</td>
                      <td style={{ ...captureCellStyle, color: 'blue' }}>
                        {teamB.members[1]?.score}
                      </td>
                      <td style={{ ...captureCellStyle, color: 'red' }}>
                        {(teamB.members[1]?.score || 0) - (teamB.members[1]?.handicap || 0)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 팀결과표 다운로드 버튼 (off‐screen 복제본을 캡처) */}
        <div className={styles.actionButtons}>
          <button onClick={() => downloadTable(teamCaptureRef, 'team-results', 'jpg')}>
            JPG로 저장
          </button>
          <button onClick={() => downloadTable(teamCaptureRef, 'team-results', 'pdf')}>
            PDF로 저장
          </button>
        </div>
      </div>

      {/* ─── 하단 버튼 ─── */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>홈</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 아래 스타일 객체들은 “off‐screen 팀결과표 복제본”에 쓰이는 inline 스타일입니다.
// on‐screen CSS와 동일한 테두리·배경을 적용하여, 캡처 시 실선이 보이도록 합니다.
// ──────────────────────────────────────────────────────────────────

const captureHeaderStyle = {
  border: '1px solid #ddd',
  background: '#f7f7f7',
  padding: '4px 8px',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap'
};

const captureCellStyle = {
  border: '1px solid #ddd',
  padding: '4px 8px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const captureFooterResultStyle = {
  border: '1px solid #ddd',
  padding: '4px 8px',
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#cc0000',
  background: '#f7f7f7'
};

const captureFooterRankStyle = {
  border: '1px solid #ddd',
  padding: '4px 8px',
  textAlign: 'center',
  fontWeight: 'bold',
  color: 'blue',
  backgroundColor: 'rgba(255, 255, 0, 0.1)'
};
