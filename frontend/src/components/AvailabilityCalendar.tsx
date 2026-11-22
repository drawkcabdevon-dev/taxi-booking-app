import { useEffect, useState } from 'react';
import { getAvailability } from '../services/api';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

/**
 * Month calendar for picking a trip date. Booked slots come from the
 * backend (single van). If the availability service is not configured yet
 * the calendar still works — it just can't show booked days, and says so.
 */
export default function AvailabilityCalendar({ selectedDate, onSelect }: Props) {
  const [month, setMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState(false);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  // Check each day of the visible month. Cheap while the van does few trips
  // a day; switch to a month-range endpoint if this ever gets slow.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const booked = new Set<string>();
      let failed = false;
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          const res = await getAvailability(iso);
          if (res.booked_slots.length > 0) booked.add(iso);
        } catch {
          failed = true;
          break;
        }
      }
      if (!cancelled) {
        setBookedDates(booked);
        setUnavailable(failed);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [year, monthIndex, daysInMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
  }

  const prevMonth = () => setMonth(new Date(year, monthIndex - 1, 1));
  const nextMonth = () => setMonth(new Date(year, monthIndex + 1, 1));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 420,
          marginBottom: '0.5rem',
        }}
      >
        <button type="button" className="secondary" onClick={prevMonth}>
          ‹
        </button>
        <strong>
          {month.toLocaleString('en', { month: 'long', year: 'numeric' })}
        </strong>
        <button type="button" className="secondary" onClick={nextMonth}>
          ›
        </button>
      </div>
      <div className="calendar">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
            {d}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (iso === null) return <div key={`blank-${i}`} />;
          const dayNum = Number(iso.slice(8, 10));
          const isPast = new Date(iso + 'T12:00:00') < today;
          const isBooked = bookedDates.has(iso);
          return (
            <button
              key={iso}
              type="button"
              className={`day${isBooked ? ' booked' : ''}${iso === selectedDate ? ' selected' : ''}`}
              disabled={isPast}
              title={isBooked ? 'Van already booked this day' : undefined}
              onClick={() => onSelect(iso)}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
      {unavailable && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Live availability is not connected yet — pick a date and we will
          confirm by email.
        </p>
      )}
    </div>
  );
}
