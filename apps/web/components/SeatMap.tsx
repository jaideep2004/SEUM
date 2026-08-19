"use client";

import styles from "./SeatMap.module.css";

interface SeatMapProps {
  capacity: number;
  occupied: number[];
  selected: number[];
  maxSelectable: number;
  onToggle: (seat: number) => void;
}

export default function SeatMap({ capacity, occupied, selected, maxSelectable, onToggle }: SeatMapProps) {
  const occupiedSet = new Set(occupied);
  const selectedSet = new Set(selected);
  const seats: number[] = [];
  for (let i = 1; i <= capacity; i++) seats.push(i);

  return (
    <div className={styles.seatMap}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendAvailable}`} /> Available
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendSelected}`} /> Selected
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendOccupied}`} /> Occupied
        </span>
      </div>
      <div className={styles.grid}>
        {seats.map((seat) => {
          const isOccupied = occupiedSet.has(seat);
          const isSelected = selectedSet.has(seat);
          const disabled = isOccupied || (!isSelected && selected.length >= maxSelectable);
          const cls = [
            styles.seat,
            isOccupied ? styles.occupied : "",
            isSelected ? styles.selected : "",
            !isOccupied && !isSelected ? styles.available : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={seat}
              type="button"
              className={cls}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={isOccupied ? `Seat ${seat} occupied` : `Seat ${seat} ${isSelected ? "selected" : "available"}`}
              onClick={() => onToggle(seat)}
            >
              {seat}
            </button>
          );
        })}
      </div>
      <p className={styles.count}>
        {selected.length} of {maxSelectable} seats selected
      </p>
    </div>
  );
}
