// src/components/Step6StrokeResults.js
import React from 'react';
import styles from './Step6StrokeResults.module.css';

export default function Step6StrokeResults({
  participants,  // [{ id, group, nickname, handicap, score, room }, …]
  roomCount,     // 총 방 개수
  onPrev,        // ← 이전
  onNext         // 다음 →
}) {
  const maxRows = 4;

  // 1) 방별 참가자 묶기 (0-based index)
  const byRoom = Array.from({ length: roomCount }, () => []);
  participants.forEach(p => {
    if (p.room != null) {
      byRoom[p.room - 1].push(p);
    }
  });

  // 2) 방배정표용 행 생성 (최대 4행 고정)
  const allocationRows = Array.from({ length: maxRows }, (_, ri) =>
    byRoom.map(roomArr => roomArr[ri] || { nickname: '', handicap: '' })
  );

  // 3) 최종결과표용 계산
  const resultByRoom = byRoom.map(roomArr => {
    // 4명 슬롯 채우기
    const filled = Array.from({ length: maxRows }, (_, i) =>
      roomArr[i] || { nickname: '', handicap: 0, score: 0 }
    );
    // 최고 스코어 인덱스 찾기
    let maxIdx = 0;
    let maxVal = -Infinity;
    filled.forEach((p, i) => {
      const sc = p.score ?? 0;
      if (sc > maxVal) {
        maxVal = sc;
        maxIdx = i;
      }
    });
    // 합계 초기화
    let sumHandicap = 0, sumScore = 0, sumBanddang = 0, sumResult = 0;
    // 세부 계산
    const detail = filled.map((p, i) => {
      const hd = p.handicap ?? 0;
      const sc = p.score ?? 0;
      sumHandicap += hd;
      sumScore += sc;
      const banddang = i === maxIdx ? Math.floor(sc / 2) : sc;
      sumBanddang += banddang;
      const result = banddang - hd;
      sumResult += result;
      return { ...p, banddang, result };
    });
    return { detail, sumHandicap, sumScore, sumBanddang, sumResult };
  });

  // 4) 방별 순위 계산
  const ranks = resultByRoom
    .map((r, i) => ({ roomIdx: i, total: r.sumResult }))
    .sort((a, b) => a.total - b.total)
    .map((r, idx) => ({ roomIdx: r.roomIdx, rank: idx + 1 }));
  const rankMap = Object.fromEntries(ranks.map(r => [r.roomIdx, r.rank]));

  // 방 번호 배열 (0-based for indexing)
  const rooms = Array.from({ length: roomCount }, (_, i) => i);

  return (
    <div className={styles.step}>
      {/* 1차 헤더 */}
      <div className={styles.stepHeader}>
        <h3>6. 스트로크 결과표</h3>
      </div>

      {/* 방배정표 */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>🏠 방배정표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {rooms.map(r => (
                <th key={r} colSpan={2} className={styles.header}>
                  {r + 1}번방
                </th>
              ))}
            </tr>
            <tr>
              {rooms.map(r => (
                <React.Fragment key={r}>
                  <th className={styles.header}>닉네임</th>
                  <th className={styles.header}>G핸디</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocationRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
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
              {byRoom.map((roomArr, ci) => {
                const sum = roomArr.reduce(
                  (s, p) => s + (Number(p.handicap) || 0),
                  0
                );
                return (
                  <React.Fragment key={ci}>
                    {/* 합계 라인만 인라인으로 배경 적용 */}
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
                      {sum}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 최종결과표 */}
      <div className={styles.tableContainer}>
        <h4 className={styles.tableTitle}>📊 최종결과표</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {rooms.map(r => (
                <th key={r} colSpan={5} className={styles.header}>
                  {r + 1}번방
                </th>
              ))}
            </tr>
            <tr>
              {rooms.map(r => (
                <React.Fragment key={r}>
                  <th className={styles.header}>닉네임</th>
                  <th className={styles.header}>G핸디</th>
                  <th className={styles.header}>점수</th>
                  <th className={styles.header}>반땅</th>
                  <th className={styles.header}>결과</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, ri) => (
              <tr key={ri}>
                {resultByRoom.map((room, ci) => {
                  const p = room.detail[ri];
                  return (
                    <React.Fragment key={ci}>
                      <td className={styles.cell}>{p.nickname}</td>
                      <td className={styles.cell}>{p.handicap}</td>
                      <td className={styles.cell}>{p.score}</td>
                      <td
                        className={styles.cell}
                        style={{ color: 'blue' }}
                      >
                        {p.bandang}
                      </td>
                      <td
                        className={styles.cell}
                        style={{ color: 'red' }}
                      >
                        {p.result}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {resultByRoom.map((room, ci) => (
                <React.Fragment key={ci}>
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
                    style={{ background: '#f0f0f0' }}
                  >
                    {room.sumScore}
                  </td>
                  <td
                    className={styles.footerBanddang}
                    style={{ background: '#f0f0f0' }}
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
              ))}
            </tr>
            <tr>
              {rooms.map(r => (
                <React.Fragment key={r}>
                  <td colSpan={4} className={styles.footerBlank} />
                  <td className={styles.footerRank}>{rankMap[r]}등</td>
                </React.Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 이전/다음 버튼 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onNext}>다음 →</button>
      </div>
    </div>
  );
}
