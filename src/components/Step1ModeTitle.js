// src/components/Step1ModeTitle.js
import React from "react";
import styles from "./Step1ModeTitle.module.css";

export default function Step1ModeTitle({
  step,
  setStep,
  mode,
  setMode,
  title,
  setTitle,
}) {
  const canNext = title.trim() !== "";

  return (
    <div className={`${styles.step} ${styles.step1}`}>
      <div className={styles.stepHeader}>
        <h3>{step}. 모드 선택 및 대회 제목 입력</h3>
      </div>

      <div className="step-body">
        <div className={styles.btnGroup}>
          <button
            className={mode === "stroke" ? styles.active : undefined}
            onClick={() => setMode("stroke")}
          >
            스트로크 모드
          </button>
          <button
            className={mode === "agm" ? styles.active : undefined}
            onClick={() => setMode("agm")}
          >
            AGM 포볼 모드
          </button>
        </div>

        <input
          type="text"
          className={styles.fullWidthInput}
          placeholder="대회 제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className={styles.stepFooter}>
        <button disabled={!canNext} onClick={() => setStep(2)}>
          다음 →
        </button>
      </div>
    </div>
  );
}