import { InventoryRow } from "../TechInventoryPage";

type Props = {
  rows: InventoryRow[];
  formatQty: (value: number, unit: string) => string;
  onDelete?: (row: InventoryRow) => void;
};

function InventoryStateTable({ rows, formatQty, onDelete }: Props) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table inventory-table--state">
        <thead>
          <tr>
            <th>Продукт</th>
            <th>Ед.</th>
            <th>Остаток</th>
            <th>Действие</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="inventory-empty">
                Товары не найдены
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.name}-${row.unit}`}>
                <td>
                  <strong>{row.name}</strong>
                </td>

                <td>{row.unit}</td>

                <td
                  className={
                    row.systemLeft < 0
                      ? "minus"
                      : row.systemLeft > 0
                      ? "plus"
                      : "zero"
                  }
                >
                  {formatQty(row.systemLeft, row.unit)}
                </td>

                <td>
                  <button
                    type="button"
                    className="inventory-delete-btn"
                    onClick={() => onDelete?.(row)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryStateTable;