// src/components/Step5StrokeAssign.js
import React, { useState } from 'react';
import styles from './Step5StrokeAssign.module.css';

export default function Step5StrokeAssign({
  participants,      // [{id, group, nickname, handicap, score, room}, …]
  rooms,             // [1, 2, …, N]
  loadingId,         // id of participant currently assigning
  onScoreChange,     // (id, value) => void
  onManualAssign,    // (id) => void
  onForceAssign,     // (id, roomNumber) => void
  onPrev,            // () => void
  onAutoAssign,      // () => void
  onReset,           // () => void
  onNext             // () => void
}) {
  // 강제배정 메뉴 토글 상태
  const [forceSelectingId, setForceSelectingId] = useState(null);

  return (
    <div className={styles.step}>
      {/* 1차 헤더 */}
      <div className={styles.stepHeader}>
        <h3>5. 스트로크 방배정</h3>
      </div>

      {/* 3차 헤더 */}
      <div className={styles.participantRowHeader}>
        <div className={`${styles.cell} ${styles.group}`}>조</div>
        <div className={`${styles.cell} ${styles.nickname}`}>닉네임</div>
        <div className={`${styles.cell} ${styles.handicap}`}>G핸디</div>
        <div className={`${styles.cell} ${styles.score}`}>점수</div>
        <div className={`${styles.cell} ${styles.manual}`}>수동</div>
        <div className={`${styles.cell} ${styles.force}`}>강제</div>
      </div>

      {/* 리스트 영역 */}
      <div className={styles.participantTable}>
        {participants.map(p => (
          <div className={styles.participantRow} key={p.id}>
            <div className={`${styles.cell} ${styles.group}`}>
              <input type="text" value={`${p.group}조`} disabled />
            </div>
            <div className={`${styles.cell} ${styles.nickname}`}>
              <input type="text" value={p.nickname} disabled />
            </div>
            <div className={`${styles.cell} ${styles.handicap}`}>
              <input type="text" value={p.handicap} disabled />
            </div>
            <div className={`${styles.cell} ${styles.score}`}>
              <input
                type="number"
                value={p.score ?? ''}
                onChange={e => onScoreChange(p.id, e.target.value)}
              />
            </div>

            {/* 수동배정 버튼: 한 번만 팝업 */}
            <div className={`${styles.cell} ${styles.manual}`}>
              <button
                className={styles.smallBtn}
                disabled={loadingId === p.id || p.room != null}
                onClick={() => onManualAssign(p.id)}
              >
                {loadingId === p.id ? '⏳ 배정 중…' : '수동'}
              </button>
            </div>

            {/* 강제배정 회전 메뉴 */}
            <div className={`${styles.cell} ${styles.force}`} style={{ position: 'relative' }}>
              {forceSelectingId === p.id ? (
                <div className={styles.forceMenu}>
                  {rooms.map(r => (
                    <button
                      key={r}
                      className={styles.forceOption}
                      onClick={() => {
                        onForceAssign(p.id, r);
                        setForceSelectingId(null);
                      }}
                    >
                      {r}번 방
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  className={styles.smallBtn}
                  onClick={() => setForceSelectingId(p.id)}
                >
                  강제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
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
