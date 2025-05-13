// src/components/Step2RoomSetup.js
import React from "react";
import styles from "./Step2RoomSetup.module.css";

export default function Step2RoomSetup({
  step,
  setStep,
  roomCount,
  setRoomCount,
  roomNames,
  setRoomNames,
}) {
  return (
    <div className={`${styles.step} ${styles.step2}`}>
      <div className={styles.stepHeader}>
        <h3>{step}. 방 개수 및 방 이름 설정</h3>
      </div>

      {/* .step-body는 공통 App.css에서 관리 */}
      <div className="step-body">
        <div className={styles.roomCountSelector}>
          <button
            className={styles.rpBtn}
            onClick={() => setRoomCount((c) => Math.max(1, c - 1))}
          >
            –
          </button>
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              className={roomCount === n ? styles.active : undefined}
              onClick={() => setRoomCount(n)}
            >
              {n}개
            </button>
          ))}
          <button
            className={styles.rpBtn}
            onClick={() => setRoomCount((c) => c + 1)}
          >
            ＋
          </button>
        </div>

        <div className={`${styles.roomNames} ${styles.scrollArea}`}>
          {roomNames.map((name, i) => (
            <div key={i} className={styles.roomNameRow}>
              <label>{i + 1}번 방:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const c = [...roomNames];
                  c[i] = e.target.value;
                  setRoomNames(c);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stepFooter}>
        <button onClick={() => setStep(1)}>← 이전</button>
        <button onClick={() => setStep(3)}>다음 →</button>
      </div>
    </div>
  );
}