import { InventoryView } from "../TechInventoryPage";

type Props = {
  view: InventoryView;
  saving: boolean;
  onView: (view: InventoryView) => void;
  onRefresh: () => Promise<void>;
};

function InventoryTopBar({ view, saving, onView, onRefresh }: Props) {
  const buttons: { key: InventoryView; label: string }[] = [
    { key: "state", label: "Склад" },
    { key: "products", label: "Товары" },
    { key: "received", label: "Приход" },
    { key: "writeOff", label: "Списание" },
    { key: "today", label: "Сегодня" },
    { key: "yesterday", label: "Вчера" },
    { key: "all", label: "Все списания" },
    { key: "check", label: "Проверка" },
    { key: "archive", label: "Архив" },
  ];

  return (
    <div className="inventory-topbar">
      {buttons.map((button) => (
        <button
          key={button.key}
          type="button"
          className={view === button.key ? "active" : ""}
          disabled={saving}
          onClick={() => onView(button.key)}
        >
          {button.label}
        </button>
      ))}

      <button type="button" disabled={saving} onClick={() => void onRefresh()}>
        Обновить
      </button>
    </div>
  );
}

export default InventoryTopBar;