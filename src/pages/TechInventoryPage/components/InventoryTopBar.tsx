import { useRef } from "react";
import { InventoryView } from "../TechInventoryPage";

type Props = {
  view: InventoryView;
  saving: boolean;
  onView: (view: InventoryView) => void;
  onRefresh: () => void;
};

function InventoryTopBar({ view, saving, onView, onRefresh }: Props) {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollSlider = (direction: "left" | "right") => {
    sliderRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  return (
    <div className="inventory-top-slider">
      <button
        type="button"
        className="inventory-slider-arrow"
        onClick={() => scrollSlider("left")}
      >
        ‹
      </button>

      <div
        ref={sliderRef}
        className="inventory-actions inventory-actions--slider"
      >
        <button
          type="button"
          className={view === "state" ? "active" : ""}
          onClick={() => onView("state")}
        >
          Состояние
        </button>

        <button
          type="button"
          className={view === "today" ? "active" : ""}
          onClick={() => onView("today")}
        >
          Сегодня
        </button>

        <button
          type="button"
          className={view === "yesterday" ? "active" : ""}
          onClick={() => onView("yesterday")}
        >
          Вчера
        </button>

        <button
          type="button"
          className={view === "all" ? "active" : ""}
          onClick={() => onView("all")}
        >
          Всё
        </button>

        <button
          type="button"
          className={view === "received" ? "active success" : "success"}
          onClick={() => onView("received")}
        >
          Приход
        </button>

        <button
          type="button"
          className={view === "writeOff" ? "active warning" : "warning"}
          onClick={() => onView("writeOff")}
        >
          Списание
        </button>

        <button
          type="button"
          className={view === "check" ? "active confirm" : "confirm"}
          onClick={() => onView("check")}
        >
          Сверка
        </button>

        <button
          type="button"
          className={view === "archive" ? "active archive" : "archive"}
          onClick={() => onView("archive")}
        >
          Архив
        </button>

        <button type="button" onClick={onRefresh} disabled={saving}>
          Обновить
        </button>
      </div>

      <button
        type="button"
        className="inventory-slider-arrow"
        onClick={() => scrollSlider("right")}
      >
        ›
      </button>
    </div>
  );
}

export default InventoryTopBar;