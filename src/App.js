// src/App.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

import Step1ModeTitle       from './components/Step1ModeTitle';
import Step2RoomSetup       from './components/Step2RoomSetup';
import Step3UploadType      from './components/Step3UploadType';
import Step4Participant     from './components/Step4Participant';
import Step5StrokeAssign    from './components/Step5StrokeAssign';
import Step6StrokeResults   from './components/Step6StrokeResults';
import Step7StrokeAgmAssign from './components/Step7StrokeAgmAssign';
import Step8AgmResults      from './components/Step8AgmResults';

import './App.css';

// ───────────────────────────────────────────────────────────
// 배열을 무작위로 섞는 헬퍼 함수
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function App() {
  // ─────────────────────────────────────────────────────────
  // 1) 상태 선언
  // ─────────────────────────────────────────────────────────
  const [stepState, setStepState]       = useState(1);
  const [mode, setMode]                 = useState('stroke'); // 'stroke' or 'agm'
  const [title, setTitle]               = useState('');
  const [roomCount, setRoomCount]       = useState(4);
  const [roomNames, setRoomNames]       = useState(Array(4).fill(''));
  const [uploadMethod, setUploadMethod] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loadingId, setLoadingId]       = useState(null);

  // ─────────────────────────────────────────────────────────
  // 2) displayStep 계산
  //    — AGM 포볼 모드(mode === 'agm')일 때,
  //      stepState가 5·6·7인 동안 모두 7로 매핑
  // ─────────────────────────────────────────────────────────
  const displayStep =
    mode === 'agm' && stepState > 4 && stepState < 8
      ? 7
      : stepState;

  // ─────────────────────────────────────────────────────────
  // 3) 단계 이동 헬퍼
  // ─────────────────────────────────────────────────────────
  const goToStep = newStep => {
    setStepState(newStep);
  };

  // ─────────────────────────────────────────────────────────
  // 4) roomCount 변경 시 참가자/방 이름 초기화
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
    setParticipants([]);
  }, [roomCount]);

  // ─────────────────────────────────────────────────────────
  // 5) Step3 → Step4: 수동 초기 참가자 생성
  //    — partner 필드를 추가하여 짝(Pair) 관계를 저장하도록 함
  // ─────────────────────────────────────────────────────────
  const initManual = () => {
    setParticipants(
      Array.from({ length: roomCount * 4 }, (_, i) => ({
        id:       i,
        group:    1,
        nickname: '',
        handicap: 0,
        score:    null,
        room:     null,
        partner:  null, // 1조-2조 짝을 저장할 필드
      }))
    );
  };

  // ─────────────────────────────────────────────────────────
  // 6) 파일 업로드 핸들러 (Excel → participants)
  //    — 업로드 시 partner = null 로 초기화
  // ─────────────────────────────────────────────────────────
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const wb   = XLSX.read(evt.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const rows = data.slice(1).map((r, idx) => ({
        id:       idx,
        group:    Number(r[0]) || 1,
        nickname: r[1] || '',
        handicap: Number(r[2]) || 0,
        score:    null,
        room:     null,
        partner:  null,
      }));
      setParticipants(rows);
    };
    reader.readAsBinaryString(file);
  };

  // ─────────────────────────────────────────────────────────
  // 7) 점수 변경 핸들러
  // ─────────────────────────────────────────────────────────
  const handleScoreChange = (id, value) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, score: value === '' ? null : Number(value) }
          : p
      )
    );
  };

  // ─────────────────────────────────────────────────────────
  // 스트로크 모드 핸들러 (Steps 5 & 6)
  // ─────────────────────────────────────────────────────────
  const handleManualAssign = id => {
    const p = participants.find(x => x.id === id);
    if (!p || !p.group || p.room != null) return;
    setLoadingId(id);
    setTimeout(() => {
      // 1) 같은 그룹(조)에서 이미 배정된 방 번호 목록
      const occupied = participants
        .filter(x => x.group === p.group && x.room != null)
        .map(x => x.room);
      // 2) 빈 방(candidates) 구하기
      const candidates = Array.from({ length: roomCount }, (_, i) => i + 1)
        .filter(r => !occupied.includes(r));
      if (!candidates.length) {
        setLoadingId(null);
        return;
      }
      // 3) 빈 방 중 무작위 선택
      const choice = shuffle(candidates)[0];
      // 4) 해당 id만 방 배정
      setParticipants(prev =>
        prev.map(x => (x.id === id ? { ...x, room: choice } : x))
      );
      setLoadingId(null);
      alert(`${p.nickname}님은 ${choice}번 방에 배정되었습니다.`);
    }, 1200);
  };

  const handleForceAssign = (id, toRoom) => {
    if (toRoom === null) {
      setParticipants(prev =>
        prev.map(x => (x.id === id ? { ...x, room: null } : x))
      );
      return;
    }
    const p    = participants.find(x => x.id === id);
    const from = p.room;
    const occ  = participants.find(x => x.group === p.group && x.room === toRoom);
    setParticipants(prev =>
      prev.map(x => {
        if (x.id === id) return { ...x, room: toRoom };
        if (occ && x.id === occ.id) return { ...x, room: from };
        return x;
      })
    );
    alert(`${p.nickname}님은 ${toRoom}번 방으로 강제배정 완료`);
  };

  const handleAutoAssign = () => {
    setParticipants(prev => {
      const next     = [...prev];
      const roomsArr = Array.from({ length: roomCount }, (_, i) => i + 1);
      [1, 2, 3, 4].forEach(g => {
        const occupied  = next.filter(p => p.group === g && p.room != null).map(p => p.room);
        const freeRooms = roomsArr.filter(r => !occupied.includes(r));
        const unassigned= next.filter(p => p.group === g && p.room == null).map(p => p.id);
        shuffle(unassigned).forEach((pid, idx) => {
          if (idx < freeRooms.length) {
            next[pid] = { ...next[pid], room: freeRooms[idx] };
          }
        });
      });
      return next;
    });
  };

  const handleReset = () => {
    setParticipants(prev =>
      prev.map(p => (p.room != null ? { ...p, room: null } : p))
    );
  };

  // ─────────────────────────────────────────────────────────
  // AGM 포볼 모드 핸들러 (Steps 7 & 8)
  // ─────────────────────────────────────────────────────────
  const halfCount = participants.length / 2;

  // (1) 수동 클릭 시: “1조 id”만 방 배정 → 즉시 2조 페어 매칭 + 알림 메시지 수정
  const handleAgmManualAssign = id => {
    // 1조 여부 확인
    if (!(id < halfCount)) return;
    const p1 = participants.find(p => p.id === id);
    if (!p1 || p1.room != null) return;

    // --- 1) 1조 배정용: 방당 최대 2명(candRooms) ---
    const counts = Array.from({ length: roomCount }, (_, i) =>
      participants.filter(x => x.id < halfCount && x.room === i + 1).length
    );
    const candRooms = counts.map((cnt, idx) => (cnt < 2 ? idx + 1 : null)).filter(Boolean);
    if (!candRooms.length) return;
    const choice = shuffle(candRooms)[0];

    // --- 2) 2조 후보들 중 하나 pick ---
    const cands2 = participants.filter(x => x.id >= halfCount && x.room == null);

    // --- 3) 1조+2조 한 번에 set → partner 관계도 설정 ---
    if (!cands2.length) {
      // 2조 후보가 없으면 → 1조만 배정
      setParticipants(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, room: choice, partner: null }
            : p
        )
      );
      const roomLabel = roomNames[choice - 1] || `${choice}번 방`;
      alert(`${p1.nickname}님은 ${roomLabel}에 배정되었습니다.\n팀원을 선택하려면 확인을 눌러주세요.`);
      return;
    }

    const pick  = shuffle(cands2)[0];
    setParticipants(prev =>
      prev.map(p => {
        if (p.id === id) {
          return { ...p, room: choice, partner: pick.id };
        }
        if (p.id === pick.id) {
          return { ...p, room: choice, partner: id };
        }
        return p;
      })
    );

    const roomLabel = roomNames[choice - 1] || `${choice}번 방`;
    alert(`${p1.nickname}님은 ${roomLabel}에 배정되었습니다.\n팀원을 선택하려면 확인을 눌러주세요.`);
    alert(`${p1.nickname}님은 ${participants.find(x => x.id === pick.id)?.nickname}님을 선택하였습니다.`);
  };

  // (2) 취소 시: “해당 1조 + 함께 매칭된 2조”만 해제
  const handleAgmCancel = id => {
    const p1 = participants.find(p => p.id === id);
    if (!p1 || p1.room == null) return;
    const partnerId = p1.partner;
    setParticipants(prev =>
      prev.map(p => {
        if (p.id === id || p.id === partnerId) {
          return { ...p, room: null, partner: null };
        }
        return p;
      })
    );
  };

  // (3) 자동배정: “초기” vs “수동 후 빈 자리만 채우기”
  const handleAgmAutoAssign = () => {
    setParticipants(prev => {
      const next     = [...prev];
      const roomsArr = Array.from({ length: roomCount }, (_, i) => i + 1);
      const anyAssigned = next.some(p => p.id < halfCount && p.room != null);

      if (!anyAssigned) {
        // ▶ 초기 자동: “1조 무작위 배정 + 바로 2조 페어 매칭”
        const shuffled1 = shuffle(next.filter(p => p.id < halfCount).map(p => p.id));
        const roomPool  = shuffle([...roomsArr, ...roomsArr]);
        const roomMap   = {};
        shuffled1.forEach((pid, idx) => {
          roomMap[pid] = roomPool[idx];
        });
        shuffled1.forEach(pid => {
          next[pid].room    = roomMap[pid];
          next[pid].partner = null;
        });
        roomsArr.forEach(roomNo => {
          const g1inRoom = next.filter(x => x.id < halfCount && x.room === roomNo);
          g1inRoom.forEach(g1 => {
            const candidates2 = next.filter(x => x.id >= halfCount && x.room == null);
            if (candidates2.length > 0) {
              const pick = shuffle(candidates2)[0];
              next[pick.id].room    = roomNo;
              next[pick.id].partner = g1.id;
              next[g1.id].partner   = pick.id;
            }
          });
        });
        return next;
      }

      // ▶ 수동 후 자동: 이미 배정된 상태 유지 + 빈 자리만 채우기
      let pool1 = shuffle(next.filter(p => p.id < halfCount && p.room == null).map(p => p.id));
      let pool2 = shuffle(next.filter(p => p.id >= halfCount && p.room == null).map(p => p.id));
      roomsArr.forEach(roomNo => {
        const assigned1 = next.filter(p => p.id < halfCount && p.room === roomNo).length;
        for (let i = 0; i < 2 - assigned1 && pool1.length; i++) {
          const pid1 = pool1.shift();
          next[pid1].room    = roomNo;
          next[pid1].partner = null; // 아직 짝 지정 안됨
        }
        const assigned2 = next.filter(p => p.id >= halfCount && p.room === roomNo).length;
        for (let i = 0; i < 2 - assigned2 && pool2.length; i++) {
          const pid2 = pool2.shift();
          if (next[pid2].partner != null) continue;
          const g1inRoom = next.find(x => x.id < halfCount && x.room === roomNo && x.partner == null);
          if (g1inRoom) {
            next[pid2].room    = roomNo;
            next[pid2].partner = g1inRoom.id;
            next[g1inRoom.id].partner = pid2;
          }
        }
      });
      return next;
    });
  };

  // (4) AGM 초기화: 방 배정과 partner 모두 초기화
  const handleAgmReset = () => {
    setParticipants(prev =>
      prev.map(p => ({ ...p, room: null, partner: null }))
    );
  };

  // ─────────────────────────────────────────────────────────
  // 8) 화면 렌더 분기
  // ─────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {displayStep === 1 && (
        <Step1ModeTitle
          step={1}
          mode={mode}
          setMode={setMode}
          title={title}
          setTitle={setTitle}
          setStep={goToStep}
        />
      )}

      {displayStep === 2 && (
        <Step2RoomSetup
          step={2}
          roomCount={roomCount}
          setRoomCount={setRoomCount}
          roomNames={roomNames}
          setRoomNames={setRoomNames}
          setStep={goToStep}
        />
      )}

      {displayStep === 3 && (
        <Step3UploadType
          step={3}
          uploadMethod={uploadMethod}
          setUploadMethod={setUploadMethod}
          initManual={initManual}
          handleFile={handleFile}
          setStep={goToStep}
        />
      )}

      {displayStep === 4 && (
        <Step4Participant
          step={4}
          mode={mode}
          uploadMethod={uploadMethod}
          participants={participants}
          setParticipants={setParticipants}
          roomCount={roomCount}
          handleFile={handleFile}
          setStep={goToStep}
          onNext={() => goToStep(5)}
        />
      )}

      {mode === 'stroke' && displayStep === 5 && (
        <Step5StrokeAssign
          participants={participants}
          rooms={Array.from({ length: roomCount }, (_, i) => i + 1)}
          loadingId={loadingId}
          onScoreChange={handleScoreChange}
          onManualAssign={handleManualAssign}
          onForceAssign={handleForceAssign}
          onAutoAssign={handleAutoAssign}
          onReset={handleReset}
          onPrev={() => goToStep(4)}
          onNext={() => goToStep(6)}
        />
      )}

      {mode === 'stroke' && displayStep === 6 && (
        <Step6StrokeResults
          participants={participants}
          roomCount={roomCount}
          roomNames={roomNames}
          onPrev={() => goToStep(5)}
          onNext={() => goToStep(1)}
        />
      )}

      {mode === 'agm' && displayStep === 7 && (
        <Step7StrokeAgmAssign
          participants={participants}
          rooms={Array.from({ length: roomCount }, (_, i) => i + 1)}
          roomNames={roomNames}
          onScoreChange={handleScoreChange}
          onManualAssign={handleAgmManualAssign}
          onCancel={handleAgmCancel}
          onAutoAssign={handleAgmAutoAssign}
          onReset={handleAgmReset}
          onPrev={() => goToStep(4)}
          onNext={() => goToStep(8)}
        />
      )}

      {mode === 'agm' && displayStep === 8 && (
        <Step8AgmResults
          participants={participants}
          roomCount={roomCount}
          roomNames={roomNames}
          onPrev={() => goToStep(7)}
          onNext={() => goToStep(1)}
        />
      )}
    </div>
  );
}
