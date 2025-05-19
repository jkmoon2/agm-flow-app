// src/App.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

import Step1ModeTitle      from './components/Step1ModeTitle';
import Step2RoomSetup      from './components/Step2RoomSetup';
import Step3UploadType     from './components/Step3UploadType';
import Step4Participant    from './components/Step4Participant';
import Step5StrokeAssign   from './components/Step5StrokeAssign';
import Step6StrokeResults  from './components/Step6StrokeResults';

import './App.css';

// 배열 무작위 섞기
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

  // 수동배정 로딩 인덱스
  const [loadingId, setLoadingId]   = useState(null);

  // 방 개수 변경 시 룸네임 초기화
  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
    setParticipants([]); // 3단계 init에서 재설정
  }, [roomCount]);

  // 3단계 수동 진입: 빈 슬롯 세팅
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

  // 3단계 엑셀 업로드
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
        group:    Number(r[0])    || 1,
        nickname:            r[1] || '',
        handicap: Number(r[2])    || 0,
        score:    null,
        room:     null,
      }));
      setParticipants(rows);
    };
    reader.readAsBinaryString(file);
  };

  // 5단계: 점수 입력
  const handleScoreChange = (id, value) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, score: value === '' ? null : Number(value) }
          : p
      )
    );
  };

  // 5단계: 수동 배정 (1회, 1~2초 딜레이, 단일 alert)
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
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      setParticipants(prev =>
        prev.map(x => (x.id === id ? { ...x, room: choice } : x))
      );
      setLoadingId(null);
      alert(`${choice}방 배정 완료`);
    }, 1200);
  };

  // 5단계: 자동 배정 (기존 수동 보존 후 빈 슬롯만 채움)
  const handleAutoAssign = () => {
    setParticipants(prev => {
      const next = [...prev];
      const byGroup = {};
      // 그룹별 아직 배정되지 않은 사람 ID 수집
      next.forEach(p => {
        if (p.room == null && p.group >= 1 && p.group <= 4) {
          (byGroup[p.group] ||= []).push(p.id);
        }
      });
      // 각 그룹별 무작위로 뽑아 방 번호 반복할당
      Object.values(byGroup).forEach(arr => {
        shuffle(arr).forEach((pid, idx) => {
          const roomNum = (idx % roomCount) + 1;
          next[pid] = { ...next[pid], room: roomNum };
        });
      });
      return next;
    });
  };

  // 5단계: 강제 배정 (토글 메뉴에서 번호 선택, 단일 alert)
  const handleForceAssign = (id, roomNum) => {
    const p = participants.find(x => x.id === id);
    if (!p || !p.group) return;

    setParticipants(prev =>
      prev.map(x => (x.id === id ? { ...x, room: roomNum } : x))
    );
    alert(`${roomNum}방으로 강제배정 완료`);
  };

  // 5단계: 초기화 (room 필드만 null로)
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
          roomNames={roomNames}
          roomCount={roomCount}
          onPrev={() => setStep(5)}
          onNext={() => setStep(mode === 'stroke' ? 7 : 8)}
        />
      )}
    </div>
  );
}
