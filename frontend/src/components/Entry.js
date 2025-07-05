import React, { useState, useEffect } from 'react';
import MemoSection from './MemoSection';
import LrSection from './LrSection';
import SubmittedLrsTable from './SubmittedLrsTable';
import api from '../api';
import { toast } from "react-toastify";
import errorMessages from "../utils/errorMessages";
import "./EntryGlass.css"; 
import { mapLrFields } from '../utils/mapLrFields';

// For new memos, use JS Date for both dates
const emptyMemo = {
  memo_no: '',
  memo_date: new Date(),
  arrival_date: new Date(),
  truck_no: '',
  total_lorry_hire: '',
  advance_lorry_hire: '',
  balance_lorry_hire: '0.00',
  driver_owner: ''
};
const emptyLr = {
  lrNo: '',
  lrDate: new Date(),
  from: '',
  to: '',
  consignor: '',
  consignee: '',
  pkgs: '',
  content: '',
  freightType: 'Topay',
  freight: '',
  weight: '',
  ddRate: '',
  ddTotal: '0.00',
  pmNo: '',
  refund: '',
  remarks: '',
  hamali: '',
  bc: '5.00',
  landing: '',
  lc: '',
  cashMemoTotal: '0.00',
  cashMemoNo: ''
};

// Accepts currentUser as a prop
export default function Entry({ selectedYear, currentUser }) {
  const [memo, setMemo] = useState({ ...emptyMemo });
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [mode, setMode] = useState('new');
  const [lr, setLr] = useState({ ...emptyLr });
  const [submittedLrs, setSubmittedLrs] = useState([]);
  const [cashMemos, setCashMemos] = useState([]);
  const [selectedLr, setSelectedLr] = useState(null);
  const [isEditingLr, setIsEditingLr] = useState(false);

  useEffect(() => {
    setMemo({ ...emptyMemo });
    setSelectedMemo(null);
    setMode('new');
    setLr({ ...emptyLr });
    setSubmittedLrs([]);
    setCashMemos([]);
    setSelectedLr(null);
    setIsEditingLr(false);
    // eslint-disable-next-line
  }, [selectedYear]);

  const handleDeleteLr = async idx => {
    const toDel = submittedLrs[idx];
    try {
      await api.delete(`/lrs/${toDel.id}?year=${selectedYear}`);
      setSubmittedLrs(prev => prev.filter((_, i) => i !== idx));
      toast.success('L.R. deleted.');
    } catch (err) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.code === "ERR_NETWORK") {
        toast.error(errorMessages.network);
      } else {
        toast.error(errorMessages.unexpected + (err.message ? " (" + err.message + ")" : ""));
      }
    }
  };

  return (
    <div className="entry-glass-card">
      <h2
        className="entry-section-title"
        style={{
          fontWeight: 700,
          marginBottom: 20,
          fontSize: "1.5rem",
          background: "linear-gradient(90deg,#13adc7,#38ef7d)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent"
        }}
      >
        Memo & L.R. Entry
      </h2>
      <div className="entry-section">
        <MemoSection
          memo={memo}
          setMemo={setMemo}
          selectedMemo={selectedMemo}
          setSelectedMemo={setSelectedMemo}
          mode={mode}
          setMode={setMode}
          setSubmittedLrs={setSubmittedLrs}
          setCashMemos={setCashMemos}
          selectedYear={selectedYear}
          setLr={setLr}
          setSelectedLr={setSelectedLr}
          setIsEditingLr={setIsEditingLr}
        />
      </div>
      {mode === "view" && selectedMemo && (
        <div className="entry-section">
          <LrSection
            lr={lr}
            setLr={setLr}
            selectedMemo={selectedMemo}
            selectedLr={selectedLr}
            setSelectedLr={setSelectedLr}
            isEditing={isEditingLr}
            setIsEditing={setIsEditingLr}
            cashMemos={cashMemos}
            setCashMemos={setCashMemos}
            submittedLrs={submittedLrs}
            setSubmittedLrs={setSubmittedLrs}
            selectedYear={selectedYear}
            currentUser={currentUser}
          />
        </div>
      )}
      {submittedLrs.length > 0 && (
        <div className="entry-section">
          <SubmittedLrsTable
            submittedLrs={submittedLrs}
            onDelete={handleDeleteLr}
            currentUser={currentUser}
          />
        </div>
      )}
    </div>
  );
}
