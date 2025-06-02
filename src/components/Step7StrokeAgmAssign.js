import React, { useState } from 'react';
import styles from './Step7StrokeAgmAssign.module.css';

// 배열을 무작위로 섞는 헬퍼 함수
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Step7StrokeAgmAssign({
  participants,    // [{ id, group, nickname, handicap, score, room, partner }, …]
  onScoreChange,   // (id, value) => void
  onManualAssign,  // (id) => void       (App.js 의 handleAgmManualAssign)
  onCancel,        // (id) => void       (App.js 의 handleAgmCancel)
  onAutoAssign,    // () => void         (App.js 의 handleAgmAutoAssign)
  onReset,         // () => void         (App.js 의 handleAgmReset)
  onPrev,          // () => void (이전)
  onNext           // () => void (다음)
}) {
  const half = participants.length / 2;
  const [loadingId, setLoadingId] = useState(null);

  // 이미 같은 방에 2조가 매칭된 1조인지 확인
  const isCompleted = id => {
    const p1 = participants.find(p => p.id === id);
    if (!p1 || p1.room == null) return false;
    return participants.some(
      x => x.id >= half && x.room === p1.room
    );
  };

  // 1조 “수동” 버튼 클릭 시 처리
  function handleAgmAssign(id) {
    if (isCompleted(id)) return;
    setLoadingId(id);
    setTimeout(() => {
      onManualAssign(id);
      setLoadingId(null);
    }, 500);
  }

  return (
    <div className={styles.step}>
      {/* ─── 상단 헤더 ─── */}
      <div className={styles.stepHeader}>
        <h3>7. 포볼 방배정</h3>
      </div>

      {/* ─── 테이블 헤더 ─── */}
      <div className={styles.participantRowHeader}>
        <div className={`${styles.cell} ${styles.group}`}>조</div>
        <div className={`${styles.cell} ${styles.nickname}`}>닉네임</div>
        <div className={`${styles.cell} ${styles.handicap}`}>G핸디</div>
        <div className={`${styles.cell} ${styles.score}`}>점수</div>
        <div className={`${styles.cell} ${styles.manual}`}>수동</div>
        <div className={`${styles.cell} ${styles.force}`}>취소</div>
      </div>

      {/* ─── 참가자 리스트 ─── */}
      <div className={styles.participantTable}>
        {participants.map(p => {
          const isGroup1 = p.id < half;
          // “배정 완료”된 1조라면 비활성화(false → 버튼 disabled)
          const done = isGroup1 && isCompleted(p.id);

          return (
            <div className={styles.participantRow} key={p.id}>
              <div className={`${styles.cell} ${styles.group}`}>
                <input
                  type="text"
                  value={isGroup1 ? '1조' : '2조'}
                  disabled
                />
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

              {/* ─── 수동 버튼 (1조만 표시, 완료되면 disabled) ─── */}
              <div className={`${styles.cell} ${styles.manual}`}>
                {isGroup1 ? (
                  <button
                    onClick={() => handleAgmAssign(p.id)}
                    disabled={done || loadingId === p.id}
                    className={styles.textOnly}
                  >
                    {loadingId === p.id ? (
                      <span className={styles.spinner} />
                    ) : done ? (
                      '완료'
                    ) : (
                      '수동'
                    )}
                  </button>
                ) : (
                  <div style={{ width: 28, height: 28 }} />
                )}
              </div>

              {/* ─── 취소 버튼 (1조만 표시) ─── */}
              <div className={`${styles.cell} ${styles.force}`}>
                {isGroup1 ? (
                  <button
                    onClick={() => { if (!p.room) return; onCancel(p.id); }}
                    className={styles.smallBtn}
                  >
                    취소
                  </button>
                ) : (
                  <div style={{ width: 28, height: 28 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 하단 버튼 (자동배정 / 초기화 / 이전 / 다음) ─── */}
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
