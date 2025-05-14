// src/components/Step5StrokeAssign.js
import React from 'react';
import styles from './Step5StrokeAssign.module.css';

export default function Step5StrokeAssign({
  participants,      // [{ id, group, nickname, handicap, selected }, …]
  onAutoAssign,      // () => void
  onReset,           // () => void
  onManualAssign,    // (id: string) => void
  onForceAssign,     // (id: string) => void
  onPrev,            // () => void
  onNext             // () => void
}) {
  return (
    <div className={styles.step}>
      {/* 상단 제목 */}
      <div className={styles.stepHeader}>
        <h3>5. 스트로크 방배정</h3>
      </div>

      {/* 중간 스크롤 영역 */}
      <div className={styles.tableContainer}>
        {/* 타이틀 행 */}
        <div className={styles.tableHeader}>
          <div className={styles.cell}>조</div>
          <div className={styles.cell}>닉네임</div>
          <div className={styles.cell}>G핸디</div>
          <div className={styles.cell}>수동</div>
          <div className={styles.cell}>강제</div>
        </div>
        {/* 데이터 행 */}
        {participants.map(p => (
          <div className={styles.tableRow} key={p.id}>
            <div className={styles.cell}>{p.group}조</div>
            <div className={styles.cell}>{p.nickname}</div>
            <div className={styles.cell}>{p.handicap}</div>
            <div className={styles.cell}>
              <button
                onClick={() => onManualAssign(p.id)}
                className={styles.smallBtn}
              >
                수동
              </button>
            </div>
            <div className={styles.cell}>
              <button
                onClick={() => onForceAssign(p.id)}
                className={styles.smallBtn}
              >
                강제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 내비게이션 & 작업 버튼 */}
      <div className={styles.stepFooter}>
        <button onClick={onPrev}>← 이전</button>
        <button onClick={onAutoAssign} className={styles.textOnly}>
          자동배정
        </button>
        <button onClick={onReset} className={styles.textOnly}>
          초기화
        </button>
        <button onClick={onNext}>다음 →</button>
      </div>
    </div>
  );
}
