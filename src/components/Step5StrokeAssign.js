// src/components/Step5StrokeAssign.js
import React from 'react';
import styles from './Step5StrokeAssign.module.css';

export default function Step5StrokeAssign({
  participants,      // [{ id, group, nickname, handicap, score }, …]
  onScoreChange = () => {},
  onManualAssign = () => {},
  onForceAssign = () => {},
  onPrev = () => {},
  onAutoAssign = () => {},
  onReset = () => {},
  onNext = () => {}
}) {
  return (
    <div className={styles.step}>
      {/* 상단 제목 */}
      <div className={styles.stepHeader}>
        <h3>5. 스트로크 방배정</h3>
      </div>

      {/* 3차 헤더: 조 / 닉네임 / G핸디 / 점수 / 수동 / 강제 */}
      <div className={styles.participantRowHeader}>
        <div className={`${styles.cell} ${styles.group}`}>조</div>
        <div className={`${styles.cell} ${styles.nickname}`}>닉네임</div>
        <div className={`${styles.cell} ${styles.handicap}`}>G핸디</div>
        <div className={`${styles.cell} ${styles.score}`}>점수</div>
        <div className={`${styles.cell} ${styles.manual}`}>수동</div>
        <div className={`${styles.cell} ${styles.force}`}>강제</div>
      </div>

      {/* 리스트 영역 (스크롤) */}
      <div className={styles.participantTable}>
        {participants.map(p => (
          <div className={styles.participantRow} key={p.id}>
            <div className={`${styles.cell} ${styles.group}`}>{p.group}조</div>
            <div className={`${styles.cell} ${styles.nickname}`}>{p.nickname}</div>
            <div className={`${styles.cell} ${styles.handicap}`}>{p.handicap}</div>
            <div className={`${styles.cell} ${styles.score}`}>
              <input
                type="number"
                value={p.score ?? ''}
                onChange={e => onScoreChange(p.id, e.target.value)}
              />
            </div>
            <div className={`${styles.cell} ${styles.manual}`}>
              <button
                className={styles.smallBtn}
                onClick={() => onManualAssign(p.id)}
              >
                수동
              </button>
            </div>
            <div className={`${styles.cell} ${styles.force}`}>
              <button
                className={styles.smallBtn}
                onClick={() => onForceAssign(p.id)}
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
