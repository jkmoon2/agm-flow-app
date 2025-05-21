import React, { useState, useEffect } from 'react';
import styles from './Step5StrokeAssign.module.css';

export default function Step5StrokeAssign({
  participants,      // [{id, group, nickname, handicap, score, room}, …]
  rooms,             // [1, 2, …, N]
  loadingId,         // id of participant currently assigning
  onScoreChange,     // (id, value) => void
  onManualAssign,    // (id) => void
  onForceAssign,     // (id, roomNumber|null) => void
  onPrev,            // () => void
  onAutoAssign,      // () => void
  onReset,           // () => void
  onNext             // () => void
}) {
  const [forceSelectingId, setForceSelectingId] = useState(null);

  useEffect(() => {
    console.log('[Step5] loadingId:', loadingId);
    console.log('[Step5] participants rooms:', participants.map(p => ({ id: p.id, room: p.room })));
  }, [loadingId, participants]);

  return (
    <div className={styles.step}>
      <div className={styles.stepHeader}>
        <h3>5. 스트로크 방배정</h3>
      </div>

      <div className={styles.participantRowHeader}>
        <div className={`${styles.cell} ${styles.group}`}>조</div>
        <div className={`${styles.cell} ${styles.nickname}`}>닉네임</div>
        <div className={`${styles.cell} ${styles.handicap}`}>G핸디</div>
        <div className={`${styles.cell} ${styles.score}`}>점수</div>
        <div className={`${styles.cell} ${styles.manual}`}>수동</div>
        <div className={`${styles.cell} ${styles.force}`}>강제</div>
      </div>

      <div className={styles.participantTable}>
        {participants.map(p => {
          const isDisabled = loadingId === p.id || p.room !== null;
          return (
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

              <div className={`${styles.cell} ${styles.manual}`}>
                <button
                  className={styles.smallBtn}
                  disabled={isDisabled}
                  onClick={() => onManualAssign(p.id)}
                >
                  {loadingId === p.id
                    ? <span className={styles.spinner}/>
                    : '수동'}
                </button>
              </div>

              <div className={`${styles.cell} ${styles.force}`} style={{ position: 'relative' }}>
                <button
                  className={styles.smallBtn}
                  onClick={() => setForceSelectingId(p.id)}
                >
                  강제
                </button>

                {forceSelectingId === p.id && (
                  <div className={styles.forceMenu}>
                    {rooms.map(r => (
                      <div
                        key={r}
                        className={styles.forceOption}
                        onClick={() => {
                          onForceAssign(p.id, r);
                          setForceSelectingId(null);
                        }}
                      >
                        {r}번 방
                      </div>
                    ))}

                    {/* ★ 마지막에 취소 옵션 추가 */}
                    <div
                      className={styles.forceOption}
                      onClick={() => {
                        onForceAssign(p.id, null);
                        setForceSelectingId(null);
                      }}
                    >
                      취소
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
