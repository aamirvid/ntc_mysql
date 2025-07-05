import React, { useEffect, useRef, useState } from 'react';
import { TextField, List, ListItem, Paper } from '@mui/material';
import api from '../api';

export default function SuggestInput({
  label,
  type,
  value,
  onChange,
  required,
  disabled,
  fullWidth,
  className // <-- new!
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [inputValue, setInputValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef();
  const timeoutRef = useRef();

  useEffect(() => {
    if (!isFocused) setInputValue(value || '');
  }, [value, isFocused]);

  useEffect(() => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }
    if (!isFocused) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/suggestions/${type}?q=${inputValue}`);
        setSuggestions(data);
        setShowDropdown(true);
        setSelectedIdx((!data.length && inputValue) ? 0 : 1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 200);
    return () => clearTimeout(timeoutRef.current);
  }, [inputValue, type, isFocused]);

  const alreadySuggested = suggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase());

  const handleKeyDown = e => {
    if (!showDropdown) return;
    const hasAddRow = !alreadySuggested && inputValue;
    const totalRows = (hasAddRow ? 1 : 0) + suggestions.length;

    if (e.key === 'ArrowDown') {
      setSelectedIdx(i => Math.min(i + 1, totalRows - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIdx(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (hasAddRow && selectedIdx === 0) {
        handleAdd(true);
        e.preventDefault();
      } else if (suggestions[selectedIdx - (hasAddRow ? 1 : 0)]) {
        selectSuggestion(suggestions[selectedIdx - (hasAddRow ? 1 : 0)]);
        e.preventDefault();
      }
    } else if (e.key === 'Tab') {
      if (hasAddRow && selectedIdx === 0) {
        selectSuggestion(inputValue);
      } else if (suggestions[selectedIdx - (hasAddRow ? 1 : 0)]) {
        selectSuggestion(suggestions[selectedIdx - (hasAddRow ? 1 : 0)]);
      }
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectSuggestion = val => {
    setInputValue(val);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIdx(0);
    onChange(val);
    setTimeout(() => {
      const formElements = Array.from(document.querySelectorAll('input,textarea,select,button'));
      const idx = formElements.indexOf(inputRef.current);
      if (idx !== -1 && formElements[idx + 1]) {
        formElements[idx + 1].focus();
      }
    }, 10);
  };

  const handleAdd = async (save = false) => {
    if (save && inputValue) {
      try {
        await api.post(`/suggestions/${type}`, { name: inputValue });
        setSuggestions([inputValue, ...suggestions]);
      } catch (err) {
        alert('Error saving suggestion');
      }
    }
    selectSuggestion(inputValue);
  };

  const highlightMatch = (text, search) => {
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ fontWeight: 700, background: '#000000', color: '#ffffff' }}>
          {text.slice(idx, idx + search.length)}
        </span>
        {text.slice(idx + search.length)}
      </>
    );
  };

  const renderDropdown = () => {
    if (!showDropdown || (!suggestions.length && alreadySuggested)) return null;
    const items = [];
    const hasAddRow = !alreadySuggested && inputValue;
    if (hasAddRow) {
      items.push(
        <ListItem
          key="add"
          button
          selected={selectedIdx === 0}
          onMouseDown={e => handleAdd(true)}
          style={{
            background: selectedIdx === 0 ? '#f0f0f0' : undefined,
            fontStyle: 'italic',
            color: '#1976d2'
          }}
        >
          + Add "{inputValue}"
        </ListItem>
      );
    }
    suggestions.forEach((s, idx) =>
      items.push(
        <ListItem
          key={s}
          button
          selected={selectedIdx === idx + (hasAddRow ? 1 : 0)}
          onMouseDown={() => selectSuggestion(s)}
          style={{
            background:
              selectedIdx === idx + (hasAddRow ? 1 : 0)
                ? '#f0f0f0'
                : undefined
          }}
        >
          {highlightMatch(s, inputValue)}
        </ListItem>
      )
    );
    return (
      <Paper style={{
        position: 'absolute',
        left: 0, right: 0, zIndex: 10, maxHeight: 150, overflowY: 'auto'
      }}>
        <List dense>{items}</List>
      </Paper>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <TextField
        inputRef={inputRef}
        label={label}
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          setIsFocused(true);
          setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            setShowDropdown(false);
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        autoComplete="off"
        className={className} // <-- add the glass style!
      />
      {renderDropdown()}
    </div>
  );
}
