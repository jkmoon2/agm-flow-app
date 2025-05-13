// src/App.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';                           // ← 추가
import Step1ModeTitle    from './components/Step1ModeTitle';
import Step2RoomSetup    from './components/Step2RoomSetup';
import Step3UploadType   from './components/Step3UploadType';
import Step4Participant  from './components/Step4Participant';
import './App.css';

export default function App() {
  const [step, setStep]                 = useState(1);
  const [mode, setMode]                 = useState('stroke');
  const [title, setTitle]               = useState('');
  const [roomCount, setRoomCount]       = useState(4);
  const [roomNames, setRoomNames]       = useState(Array(roomCount).fill(''));
  const [uploadMethod, setUploadMethod] = useState('');
  const [participants, setParticipants] = useState([]);

  // roomCount 변경 시 방 이름 초기화
  useEffect(() => {
    setRoomNames(Array(roomCount).fill(''));
  }, [roomCount]);

  // 수동 입력 모드 진입 시 슬롯만큼 빈 참가자 세팅
  const initManual = () => {
    setParticipants(
      Array.from({ length: roomCount * 4 }, () => ({
        group: 1, nickname: '', handicap: 0, selected: false
      }))
    );
  };

  // ← 여기를 실제 파일 읽기/파싱 로직으로 교체
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      // 바이너리 스트링으로 읽어서 워크북 생성
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      // 행 단위 배열로 변환 (첫 줄 헤더, 두 번째 줄부터 데이터)
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const parsed = rows.slice(1).map((row) => ({
        group:   Number(row[0]) || 1,       // A열: 조
        nickname: row[1]   || '',          // B열: 닉네임
        handicap: Number(row[2])|| 0,       // C열: G핸디
        selected: false
      }));
      setParticipants(parsed);
    };
    reader.readAsBinaryString(file);
  };

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
          handleFile={handleFile}               // ← 이걸 넘겨줍니다
          setStep={setStep}
        />
      )}
    </div>
  );
}
