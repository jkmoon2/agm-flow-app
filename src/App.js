/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// ==============================================
// [1] 안전한 숫자 변환 함수
function toNumberSafe(val) {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

// ==============================================
// [2] 인라인 스타일 정의
const tableContainerStyle = { overflowX: 'auto', marginTop: '20px', marginBottom: '20px' };
const tableStyle = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };
const baseCellStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const headerStyle = { ...baseCellStyle, backgroundColor: '#f0f0f0', fontWeight: 'bold', fontSize: '18px' };
const footerStyle = { ...baseCellStyle, backgroundColor: '#e8e8e8', fontWeight: 'bold' };

// ==============================================
// [3] 글자 길이에 따라 폰트 크기 자동 조절 함수
function fitFontSize(text = "", maxLen = 6, baseSize = 18, minSize = 14) {
  if (text.length <= maxLen) return { fontSize: `${baseSize}px` };
  const ratio = maxLen / text.length;
  return { fontSize: `${Math.max(minSize, Math.floor(baseSize * ratio))}px` };
}

// ==============================================
// [4] G핸디 표시 함수
function displayGhandi(val) {
  return toNumberSafe(val) === 0 ? '0' : val;
}

// ==============================================
// [6] RoomAllocationTable (unchanged)
function RoomAllocationTable({ rooms, roomLabels, hiddenRooms }) {
  const rowCount = 4;
  const roomNumbers = Object.keys(roomLabels).filter(r => !hiddenRooms[r]);
  const roomHandySum = {};
  roomNumbers.forEach(room => {
    const arr = rooms[room] || [];
    let sum = 0;
    for (let i = 0; i < rowCount; i++) {
      const p = arr[i];
      if (p && p.ghandi !== '') sum += Number(p.ghandi);
    }
    roomHandySum[room] = sum;
  });

  return (
    <div style={tableContainerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {roomNumbers.map(room => (
              <th key={room} colSpan={2} style={{ ...headerStyle }}>
                {roomLabels[Number(room)]}
              </th>
            ))}
          </tr>
          <tr>
            {roomNumbers.map(room => (
              <React.Fragment key={room}>
                <th style={headerStyle}>닉네임</th>
                <th style={headerStyle}>G핸디</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {roomNumbers.map(room => {
                const p = rooms[room]?.[rowIndex];
                return (
                  <React.Fragment key={`${room}-${rowIndex}`}>
                    <td style={{ ...baseCellStyle, ...fitFontSize(p?.name || '', 6, 18, 14) }}>
                      {p?.name || ''}
                    </td>
                    <td style={{ ...baseCellStyle, color: 'blue' }}>
                      {p ? displayGhandi(p.ghandi) : ''}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {roomNumbers.map(room => (
              <React.Fragment key={room}>
                <td style={{ ...footerStyle, color: 'black' }}>합계</td>
                <td style={{ ...footerStyle, color: 'blue' }}>{roomHandySum[room]}</td>
              </React.Fragment>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ==============================================
// [7] FinalResultTable (unchanged)
function FinalResultTable({ rooms, scores, roomLabels, hiddenRooms, showScore, showBanddang, toggleRoomVisibility, setShowScore, setShowBanddang }) {
  // unchanged
  return <div>...FinalResultTable content...</div>;
}

// ==============================================
// [8] App 컴포넌트 (수정 반영)
function App() {
  const [topTitle, setTopTitle] = useState('스트로크 모드 배정');
  const [roomCount, setRoomCount] = useState(4);
  const [participants, setParticipants] = useState([]);
  const [assigned, setAssigned] = useState({});
  const [buttonClicked, setButtonClicked] = useState({});
  const [uploadKey, setUploadKey] = useState(0);
  const [forceResetKey, setForceResetKey] = useState(0);
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [scores, setScores] = useState({});
  const [tableView, setTableView] = useState('none');
  const [roomLabels, setRoomLabels] = useState([]);
  const [hiddenRooms, setHiddenRooms] = useState({});

  // 방 개수 변경 시 라벨 초기화 & assigned 초기화
  useEffect(() => {
    setRoomLabels(Array.from({ length: roomCount }, (_, i) => `${i + 1}번 방`));
    initParticipants();
  }, [roomCount]);

  // 5) 초기화: 참가자는 유지, assigned 등 상태만 초기화
  const initParticipants = () => {
    setAssigned({});
    setButtonClicked({});
    setScores({});
    setTableView('none');
    setUploadKey(prev => prev + 1);
    setForceResetKey(prev => prev + 1);
    setHiddenRooms({});
  };

  // 룸 라벨 변경
  const handleRoomLabelChange = (idx, val) => {
    const arr = [...roomLabels];
    arr[idx] = val;
    setRoomLabels(arr);
  };

  const toggleRoomVisibility = r => {
    setHiddenRooms(prev => ({ ...prev, [r]: !prev[r] }));
  };

  // 엑셀 업로드
  const handleExcel = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = evt => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const rows = data.slice(1).map(r => ({ group: r[0] || '', name: r[1] || '', ghandi: r[2] === 0 ? 0 : (r[2] || '') }));
      setParticipants(rows);
      setAssigned({});
      setButtonClicked({});
      setScores({});
      setTableView('none');
      setForceResetKey(prev => prev + 1);
      setHiddenRooms({});
    };
    r.readAsBinaryString(f);
  };

  const handleInput = (i, key, v) => {
    const c = [...participants];
    c[i][key] = key === 'group' || key === 'ghandi' ? Number(v) || '' : v;
    setParticipants(c);
  };
  const handleScoreChange = (name, val) => {
    const key = name.trim().toLowerCase();
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const shuffleArr = arr => arr.sort(() => Math.random() - 0.5);

  // 3) 수동 배정
  const assignIndividual = i => {
    const u = participants[i];
    if (!u.group || !u.name || u.ghandi === '' || buttonClicked[i]) return;
    setButtonClicked(prev => ({ ...prev, [i]: true }));
    const gidx = u.group - 1;
    const avail = [];
    for (let r = 0; r < roomCount; r++) {
      const roomArr = assigned[r] || [];
      if (!roomArr[gidx]) avail.push(r);
    }
    if (!avail.length) return;
    const choice = shuffleArr(avail)[0];
    setLoadingIdx(i);
    setTimeout(() => {
      setAssigned(prev => {
        const nx = { ...prev };
        if (!nx[choice]) nx[choice] = [];
        nx[choice][gidx] = u;
        return nx;
      });
      setLoadingIdx(null);
      alert(`${u.name} → ${roomLabels[choice]} 방배정 완료`);
    }, 1200);
  };

  // 2) 자동 배정 (기존 assigned 보존)
  const autoAssign = () => {
    const used = new Set(Object.values(assigned).flat().map(p => p?.name));
    const groups = [[], [], [], []];
    participants.forEach((p, i) => {
      if (p.group >= 1 && p.group <= 4 && !used.has(p.name)) groups[p.group - 1].push({ ...p, idx: i });
    });
    const res = { ...assigned };
    groups.forEach((grp, gidx) => {
      const sh = shuffleArr(grp);
      let ptr = 0;
      sh.forEach(u => {
        while (ptr < roomCount && res[ptr]?.[gidx]) ptr++;
        if (ptr < roomCount) {
          if (!res[ptr]) res[ptr] = [];
          res[ptr][gidx] = u;
        }
      });
    });
    setAssigned(res);
    const bc = {};
    Object.values(res).flat().forEach(p => (bc[p.idx] = true));
    setButtonClicked(bc);
  };

  // 4) 강제 배정 (swap 로직 포함)
  const forceAssign = (i, rIdx) => {
    const u = participants[i];
    if (!u.group || !u.name) return;
    const gidx = u.group - 1;
    setAssigned(prev => {
      const nx = { ...prev };
      let oldRoom = null;
      Object.entries(nx).forEach(([rk, arr]) => {
        if (arr?.[gidx]?.name === u.name) oldRoom = Number(rk);
      });
      const destArr = nx[rIdx] || [];
      const occupant = destArr[gidx];
      if (oldRoom !== null) {
        nx[oldRoom] = [...nx[oldRoom]];
        delete nx[oldRoom][gidx];
      }
      if (occupant) {
        if (oldRoom !== null) {
          if (!nx[oldRoom]) nx[oldRoom] = [];
          nx[oldRoom][gidx] = occupant;
        }
      }
      if (!nx[rIdx]) nx[rIdx] = [];
      nx[rIdx][gidx] = u;
      return nx;
    });
    setButtonClicked(prev => ({ ...prev, [i]: true }));
  };

  const calculateRoomTotal = room => (room || []).reduce((s, p) => s + (Number(scores[p.name.trim().toLowerCase()] || 0) - Number(p.ghandi || 0)), 0);

  return (
    <div style={{ padding: 20 }}>
      {/* ... UI 렌더링 부분은 기존 그대로 유지 ... */}
    </div>
  );
}

export default App;
