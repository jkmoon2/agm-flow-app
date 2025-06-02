// src/components/Step4Participant.js
import React from "react";
import styles from "./Step4Participant.module.css";

export default function Step4Participant({
  step,
  setStep,
  mode,
  uploadMethod,
  participants,
  setParticipants,
  roomCount,
  handleFile,
}) {
  const toggleSelect = (i) => {
    const c = [...participants];
    c[i].selected = !c[i].selected;
    setParticipants(c);
  };
  const addParticipant = () =>
    setParticipants((p) => [
      ...p,
      { group: 1, nickname: "", handicap: 0, selected: false },
    ]);
  const delSelected = () =>
    setParticipants((p) => p.filter((x) => !x.selected));

  const changeGroup = (i, newGroup) => {
    const c = [...participants];
    c[i].group = newGroup;
    setParticipants(c);
  };

  return (
    <div className={`${styles.step} ${styles.step4}`}>
      {/* 1차 헤더: 제목 */}
      <div className={styles.stepHeader}>
        <h3>{step}. 참가자 입력</h3>
      </div>

      {/* 2차 헤더: 파일 선택 / 총 슬롯 */}
      <div
        className={`${styles.excelHeader} ${
          uploadMethod === "manual" ? styles.manual : ""
        }`}
      >
        {uploadMethod === "auto" && (
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
          />
        )}
        <span className={styles.total}>총 슬롯: {roomCount * 4}명</span>
      </div>

      {/* 3차 헤더: 컬럼 타이틀 */}
      <div className={styles.participantRowHeader}>
        <div className={`${styles.cell} ${styles.group}`}>조</div>
        <div className={`${styles.cell} ${styles.nickname}`}>닉네임</div>
        <div className={`${styles.cell} ${styles.handicap}`}>G핸디</div>
        <div className={`${styles.cell} ${styles.delete}`}>선택</div>
      </div>

      {/* 리스트 영역 (스크롤) */}
      <div className={styles.participantTable}>
        {participants.map((p, i) => (
          <div key={i} className={styles.participantRow}>
            <div className={`${styles.cell} ${styles.group}`}>              
              <select
                className={styles.groupSelect}
                value={p.group}
                onChange={(e) => changeGroup(i, Number(e.target.value))}
              >
                {Array.from({ length: roomCount }, (_, idx) => idx + 1).map(
                  (n) => (
                    <option key={n} value={n}> {n}조 </option>
                  )
                )}
              </select>
            </div>
            <div className={`${styles.cell} ${styles.nickname}`}>
              <input
                type="text"
                placeholder="닉네임"
                value={p.nickname}
                onChange={(e) => {
                  const c = [...participants];
                  c[i].nickname = e.target.value;
                  setParticipants(c);
                }}
              />
            </div>
            <div className={`${styles.cell} ${styles.handicap}`}>
              <input
                type="number"
                value={p.handicap}
                onChange={(e) => {
                  const c = [...participants];
                  c[i].handicap = Number(e.target.value);
                  setParticipants(c);
                }}
              />
            </div>
            <div className={`${styles.cell} ${styles.delete}`}>
              <input
                type="checkbox"
                checked={p.selected}
                onChange={() => toggleSelect(i)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 하단 버튼 (1~3단계 일관) */}
      <div className={styles.stepFooter}>
        <button onClick={() => setStep(3)}>← 이전</button>
        <button onClick={addParticipant}>추가</button>
        <button onClick={delSelected}>삭제</button>
        <button onClick={() => setStep(5)}>
          다음 →
        </button>
      </div>
    </div>
  );
}