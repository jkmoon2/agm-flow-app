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
  return arr.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [step, setStep]             = useState(1);
  const [mode, setMode]             = useState('stroke');
  const [title, setTitle]           = useState('');
  const [roomCount, setRoomCount]   = useState(4);
  const [roomNames, setRoomNames]   = useState(Array(4).fill(''));
  const [uploadMethod, setUploadMethod] = useState('');
  const [participants, setParticipants] = useState([]);

  // 방 개수 변경 시, 룸네임 초기화 & 참가자 배정 리셋
  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
    setParticipants([]); // 참가자 자체는 지우고 3단계에서 다시 세팅
  }, [roomCount]);

  // 3단계 수동 진입
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
      const parsed = data.slice(1).map((r, i) => ({
        id:       i,
        group:    Number(r[0]) || 1,
        nickname: r[1] || '',
        handicap: Number(r[2]) || 0,
        score:    null,
        room:     null
      }));
      setParticipants(parsed);
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

  // 5단계: 수동 배정 → participants.room에 직접 기록
  const handleManualAssign = id => {
    setParticipants(prev => {
      const p = prev.find(x => x.id === id);
      if (!p || !p.group) return prev;

      // 같은 조 이미 배정된 방들
      const occupied = prev
        .filter(x => x.group === p.group && x.room != null)
        .map(x => x.room);
      // 빈 방 후보
      const candidates = Array.from({ length: roomCount }, (_, i) => i + 1)
        .filter(r => !occupied.includes(r));
      if (!candidates.length) return prev;

      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      alert(`${p.nickname} → ${roomNames[choice - 1]} 방배정 완료`);

      return prev.map(x =>
        x.id === id
          ? { ...x, room: choice }
          : x
      );
    });
  };

  // 5단계: 자동 배정 → participants.room에 남은 슬롯만 채우기
  const handleAutoAssign = () => {
    setParticipants(prev => {
      // 그룹별 남은 ID
      const byGroup = {};
      prev.forEach(p => {
        if (p.room == null && p.group >= 1 && p.group <= 4) {
          (byGroup[p.group] ||= []).push(p.id);
        }
      });

      // 새 복사본
      const next = [...prev];
      Object.values(byGroup).forEach(idArr => {
        shuffle(idArr).forEach((pid, idx) => {
          const roomNum = (idx % roomCount) + 1;
          next[pid] = { ...next[pid], room: roomNum };
        });
      });
      return next;
    });
  };

  // 5단계: 강제 배정 → swap 또는 move
  const handleForceAssign = (id, toRoom) => {
    setParticipants(prev => {
      const next = [...prev];
      const p = next.find(x => x.id === id);
      if (!p || !p.group) return prev;

      const gidx = p.group;
      // occupant 찾기
      const occupant = next.find(x => x.group === gidx && x.room === toRoom);

      // 본인 이전 방
      const fromRoom = p.room;

      // swap or move
      next[id] = { ...p, room: toRoom };
      if (occupant) {
        next[occupant.id] = { ...occupant, room: fromRoom };
      }
      alert(`${p.nickname} → ${roomNames[toRoom - 1]} 강제배정 완료`);
      return next;
    });
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
          step={5}
          participants={participants}
          rooms={rooms}
          onScoreChange={handleScoreChange}
          onManualAssign={handleManualAssign}
          onForceAssign={handleForceAssign}
          onAutoAssign={handleAutoAssign}
          onReset={initManual}
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
