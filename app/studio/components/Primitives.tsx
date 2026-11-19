'use client';

import React, { useEffect, useRef, useState } from 'react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="gf-section-label-wrap">
    <span className="gf-section-label">{children}</span>
  </div>
);

export const PillButton: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ icon, children, variant = 'filled', onClick, disabled, className = '', type = 'button' }) => (
  <button
    type={type}
    className={`gf-pill-btn gf-pill-btn-${variant} ${className}`.trim()}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="gf-pill-icon">{icon}</span>}
    <span>{children}</span>
  </button>
);

export const FieldDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  className?: string;
}> = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    <div ref={ref} className={`gf-dropdown ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="gf-field-box gf-dropdown-trigger"
      >
        <p className="gf-field-label">{label}</p>
        <div className="gf-dropdown-value-row">
          <span className="gf-field-value">{value}</span>
          <span className={`material-symbols-outlined gf-dropdown-arrow ${isOpen ? 'is-open' : ''}`}>
            keyboard_arrow_down
          </span>
        </div>
      </button>
      {isOpen && (
        <div className="gf-dropdown-menu">
          <div className="gf-dropdown-list dark-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`gf-dropdown-option ${value === opt ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const TextInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, rows, className = '' }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={rows ? { height: 'auto' } : undefined}
    className={`gf-textarea ${className}`.trim()}
  />
);

export const SegmentedToggle: React.FC<{
  value: string;
  items: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ value, items, onChange }) => (
  <div className="gf-segmented">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={`gf-segmented-btn ${value === item.value ? 'is-active' : ''}`}
      >
        <span>{item.label}</span>
      </button>
    ))}
  </div>
);

export const DragNumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (val: number) => void;
  className?: string;
}> = ({ label, value, min = 0, max = 999, step = 1, suffix = 'px', onChange, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; startValue: number; moved: boolean } | null>(null);

  const clampAndStep = (num: number) => {
    const stepped = Math.round(num / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const commitEdit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(clampAndStep(parsed));
    }
    setIsEditing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    dragStartRef.current = { x: e.clientX, startValue: value, moved: false };
    const onMove = (moveEvt: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.x;
      if (Math.abs(dx) >= 4) {
        dragStartRef.current.moved = true;
        const deltaSteps = Math.round(dx / 8);
        onChange(clampAndStep(dragStartRef.current.startValue + deltaSteps * step));
      }
    };
    const onUp = () => {
      const wasMoved = dragStartRef.current?.moved ?? false;
      dragStartRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!wasMoved) {
        setEditValue(String(value));
        setIsEditing(true);
        window.setTimeout(() => inputRef.current?.select(), 0);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className={`gf-field-box gf-number-field ${className}`.trim()}
      onPointerDown={handlePointerDown}
    >
      <p className="gf-field-label">{label}</p>
      <div className="gf-number-row">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(editValue);
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={() => commitEdit(editValue)}
            className="gf-number-input"
            autoFocus
          />
        ) : (
          <span className="gf-number-display">
            {value}
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export const PromptModal: React.FC<{
  isOpen: boolean;
  title: string;
  onAccept: (value: string) => void;
  onCancel: () => void;
}> = ({ isOpen, title, onAccept, onCancel }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="gf-modal-backdrop" onClick={onCancel}>
      <div className="gf-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="gf-modal-title">{title}</h3>
        <textarea
          autoFocus
          className="gf-modal-textarea"
          placeholder="Type here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="gf-modal-actions">
          <PillButton variant="outline" onClick={onCancel}>
            Cancel
          </PillButton>
          <PillButton
            variant="solid"
            onClick={() => {
              onAccept(value);
              setValue('');
            }}
          >
            Add
          </PillButton>
        </div>
      </div>
    </div>
  );
};
