import { InventoryRow } from "../TechInventoryPage";

type Props = {
  rows: InventoryRow[];
  formatQty: (value: number, unit: string) => string;
};

function InventoryStateTable({ rows, formatQty }: Props) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table inventory-table--state">
        <thead>
          <tr>
            <th>Продукт</th>
            <th>Ед.</th>
            <th>Остаток</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="inventory-empty">
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryStateTable;