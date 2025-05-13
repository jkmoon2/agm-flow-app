// src/components/Step3UploadType.js
import React from "react";
import styles from "./Step3UploadType.module.css";

export default function Step3UploadType({
  step,
  setStep,
  uploadMethod,
  setUploadMethod,
  initManual,
}) {
  const canNext = uploadMethod !== "";
  return (
    <div className={`${styles.step} ${styles.step3}`}>
      <div className={styles.stepHeader}>
        <h3>{step}. 업로드 방식 선택</h3>
      </div>

      <div className="step-body">
        <div className={styles.uploadTypeBtns}>
          <button
            className={uploadMethod === "auto" ? styles.active : undefined}
            onClick={() => setUploadMethod("auto")}
          >
            자동(엑셀) 업로드
          </button>
          <button
            className={uploadMethod === "manual" ? styles.active : undefined}
            onClick={() => {
              setUploadMethod("manual");
              initManual();
            }}
          >
            수동(직접 입력)
          </button>
        </div>
      </div>

      <div className={styles.stepFooter}>
        <button onClick={() => setStep(2)}>← 이전</button>
        <button disabled={!canNext} onClick={() => setStep(4)}>
          다음 →
        </button>
      </div>
    </div>
  );
}