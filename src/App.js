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

export default function App() {
  const [step, setStep] = useState(1);

  // 1~4단계 공통 상태
  const [mode, setMode]             = useState('stroke');
  const [title, setTitle]           = useState('');
  const [roomCount, setRoomCount]   = useState(4);
  const [roomNames, setRoomNames]   = useState(Array(4).fill(''));
  const [uploadMethod, setUploadMethod] = useState('');

  // 참가자 목록: { id, group, nickname, handicap, score, room }
  const [participants, setParticipants] = useState([]);

  // 방 개수 변경 시 이름 초기화
  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
  }, [roomCount]);

  // 3단계 수동 진입: 빈 slot 세팅
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
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const rows = data.slice(1).map(r => ({
        group:    Number(r[0])    || 1,
        nickname:            r[1] || '',
        handicap: Number(r[2])    || 0,
      }));
      setParticipants(
        rows.map((p, i) => ({
          id:       i,
          group:    p.group,
          nickname: p.nickname,
          handicap: p.handicap,
          score:    null,
          room:     null,
        }))
      );
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

  // 5단계: 수동 배정
  const handleManualAssign = id => {
    const p = participants.find(x => x.id === id);
    if (!p || !p.group) return;
    // 이미 배정된 같은 조 슬롯 수집
    const occupied = participants
      .filter(x => x.room !== null && x.group === p.group)
      .map(x => x.room);
    // 빈 방 후보
    const candidates = Array.from({ length: roomCount }, (_, i) => i + 1)
      .filter(r => !occupied.includes(r));
    if (!candidates.length) return;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    // 애니메이션 대기 후 실제 반영
    setTimeout(() => {
      alert(`${p.nickname} → ${roomNames[choice - 1]} 방배정 완료`);
      setParticipants(prev =>
        prev.map(x => x.id === id ? { ...x, room: choice } : x)
      );
    }, 800);
  };

  // 5단계: 강제 배정
  const handleForceAssign = id => {
    const p = participants.find(x => x.id === id);
    const choice = Number(prompt(`몇 번 방으로 강제 이동하시겠습니까? (1~${roomCount})`));
    if (!p || !choice || choice < 1 || choice > roomCount) return;
    setParticipants(prev =>
      prev.map(x => x.id === id ? { ...x, room: choice } : x)
    );
    alert(`${p.nickname} → ${roomNames[choice - 1]} 강제 배정 완료`);
  };

  // 5단계: 자동 배정 (스트로크 방식)
  const handleAutoAssign = () => {
    // 그룹별로 남은 사람 ID 리스트
    const byGroup = {};
    participants.forEach(p => {
      if (p.room === null && p.group >= 1 && p.group <= 4) {
        (byGroup[p.group] ||= []).push(p.id);
      }
    });

    // 방마다 한 명씩 뽑아서 무작위 배정
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    let updated = [...participants];

    Object.keys(byGroup).forEach(groupKey => {
      const grp = shuffle(byGroup[groupKey]);
      grp.forEach((pid, idx) => {
        const roomNum = (idx % roomCount) + 1;
        updated = updated.map(x =>
          x.id === pid ? { ...x, room: roomNum } : x
        );
      });
    });

    setParticipants(updated);
  };

  // 방 번호 배열
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
