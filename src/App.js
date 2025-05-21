import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

import Step1ModeTitle      from './components/Step1ModeTitle';
import Step2RoomSetup      from './components/Step2RoomSetup';
import Step3UploadType     from './components/Step3UploadType';
import Step4Participant    from './components/Step4Participant';
import Step5StrokeAssign   from './components/Step5StrokeAssign';
import Step6StrokeResults  from './components/Step6StrokeResults';

import './App.css';

// 배열을 무작위로 섞는 함수
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function App() {
  const [step, setStep]             = useState(1);
  const [mode, setMode]             = useState('stroke');
  const [title, setTitle]           = useState('');
  const [roomCount, setRoomCount]   = useState(4);
  const [roomNames, setRoomNames]   = useState(Array(4).fill(''));
  const [uploadMethod, setUploadMethod] = useState('');
  const [participants, setParticipants] = useState([]);

  // 수동배정 로딩 표시용
  const [loadingId, setLoadingId]   = useState(null);

  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
    setParticipants([]);
  }, [roomCount]);

  const initManual = () => {
    setParticipants(
      Array.from({ length: roomCount * 4 }, (_, i) => ({
        id:       i,
        group:    1,
        nickname: '',
        handicap: 0,
        score:    null,
        room:     null,
      }))
    );
  };

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
      }));
      setParticipants(rows);
    };
    reader.readAsBinaryString(file);
  };

  const handleScoreChange = (id, value) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, score: value === '' ? null : Number(value) }
          : p
      )
    );
  };

  const handleManualAssign = id => {
    const p = participants.find(x => x.id === id);
    if (!p || !p.group || p.room != null) return;

    setLoadingId(id);
    setTimeout(() => {
      const occupied = participants
        .filter(x => x.group === p.group && x.room != null)
        .map(x => x.room);
      const candidates = Array.from({ length: roomCount }, (_, i) => i + 1)
        .filter(r => !occupied.includes(r));
      if (!candidates.length) {
        setLoadingId(null);
        return;
      }
      const choice = shuffle(candidates)[0];
      setParticipants(prev =>
        prev.map(x =>
          x.id === id ? { ...x, room: choice } : x
        )
      );
      setLoadingId(null);
      alert(`${p.nickname}님은 ${choice}번 방에 배정되었습니다.`);
    }, 1200);
  };

  const handleAutoAssign = () => {
    setParticipants(prev => {
      const next = [...prev];
      const roomsArr = Array.from({ length: roomCount }, (_, i) => i + 1);
      [1,2,3,4].forEach(g => {
        const occupied = next
          .filter(p => p.group === g && p.room != null)
          .map(p => p.room);
        const freeRooms = roomsArr.filter(r => !occupied.includes(r));
        const unassignedIds = next
          .filter(p => p.group === g && p.room == null)
          .map(p => p.id);
        shuffle(unassignedIds).forEach((pid, idx) => {
          if (idx < freeRooms.length) {
            next[pid] = { ...next[pid], room: freeRooms[idx] };
          }
        });
      });
      return next;
    });
  };

  // ★ 수정된 handleForceAssign: toRoom === null 이면 단순 취소(원상복귀)
  const handleForceAssign = (id, toRoom) => {
    if (toRoom === null) {
      // 취소: 해당 참가자 방 해제
      setParticipants(prev =>
        prev.map(x =>
          x.id === id ? { ...x, room: null } : x
        )
      );
      return;
    }
    const p = participants.find(x => x.id === id);
    if (!p || !p.group) return;
    const fromRoom = p.room;
    const occ = participants.find(x => x.group === p.group && x.room === toRoom);

    setParticipants(prev =>
      prev.map(x => {
        if (x.id === id) {
          return { ...x, room: toRoom };
        }
        if (occ && x.id === occ.id) {
          return { ...x, room: fromRoom };
        }
        return x;
      })
    );
    alert(`${p.nickname}님은 ${toRoom}번 방으로 강제배정 완료`);
  };

  const handleReset = () => {
    setParticipants(prev =>
      prev.map(p => (p.room != null ? { ...p, room: null } : p))
    );
  };

  const rooms = Array.from({ length: roomCount }, (_, i) => i + 1);

  return (
    <div className="app-container">
      {step === 1 && (
        <Step1ModeTitle
          step={1}
          mode={mode} setMode={setMode}
          title={title} setTitle={setTitle}
          setStep={setStep}
        />
      )}
      {step === 2 && (
        <Step2RoomSetup
          step={2}
          roomCount={roomCount} setRoomCount={setRoomCount}
          roomNames={roomNames} setRoomNames={setRoomNames}
          setStep={setStep}
        />
      )}
      {step === 3 && (
        <Step3UploadType
          step={3}
          uploadMethod={uploadMethod} setUploadMethod={setUploadMethod}
          initManual={initManual}
          handleFile={handleFile}
          setStep={setStep}
        />
      )}
      {step === 4 && (
        <Step4Participant
          step={4}
          mode={mode}
          uploadMethod={uploadMethod}
          participants={participants} setParticipants={setParticipants}
          roomCount={roomCount}
          handleFile={handleFile}
          setStep={setStep}
        />
      )}
      {step === 5 && (
        <Step5StrokeAssign
          participants={participants}
          rooms={rooms}
          loadingId={loadingId}
          onScoreChange={handleScoreChange}
          onManualAssign={handleManualAssign}
          onForceAssign={handleForceAssign}
          onAutoAssign={handleAutoAssign}
          onReset={handleReset}
          onPrev={() => setStep(4)}
          onNext={() => setStep(6)}
        />
      )}
      {step === 6 && (
        <Step6StrokeResults
          participants={participants}
          roomCount={roomCount}
          roomNames={roomNames}
          onPrev={() => setStep(5)}
          onNext={() => setStep(1)}    // ★ "홈" 버튼 누르면 1페이지로
        />
      )}
    </div>
  );
}
