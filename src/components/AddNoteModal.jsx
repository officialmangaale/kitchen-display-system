import { useState, useEffect, useRef } from 'react';
import { X, StickyNote, Loader2 } from 'lucide-react';
import { NOTE_MAX_LENGTH } from '../utils/constants';

export default function AddNoteModal({ order, onSubmit, onClose }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed || trimmed.length > NOTE_MAX_LENGTH) return;

    setSubmitting(true);
    try {
      await onSubmit(order.id, trimmed);
      onClose();
    } catch {
      // Error handled by parent toast
      setSubmitting(false);
    }
  };

  const remaining = NOTE_MAX_LENGTH - note.length;
  const overLimit = remaining < 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header__left">
            <StickyNote size={18} />
            <h2>Add Kitchen Note</h2>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="modal-order-label">
          Order <strong>#{order?.number || order?.id}</strong>
          {order?.table && <> · Table {order.table}</>}
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className={`modal-textarea ${overLimit ? 'modal-textarea--over' : ''}`}
            placeholder="e.g. Customer has nut allergy, extra spicy…"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX_LENGTH + 50}
            aria-label="Kitchen note"
          />

          <div className="modal-meta">
            <span className={`modal-counter ${overLimit ? 'modal-counter--over' : ''}`}>
              {remaining} characters remaining
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn modal-btn--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn--submit"
              disabled={!note.trim() || overLimit || submitting}
              aria-label="Submit note"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Saving…
                </>
              ) : (
                'Add Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
