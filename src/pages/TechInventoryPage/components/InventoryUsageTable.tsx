import { InventoryRow } from "../TechInventoryPage";

type Props = {
  title: string;
  rows: InventoryRow[];
  formatQty: (value: number, unit: string) => string;
};

function InventoryUsageTable({ title, rows, formatQty }: Props) {
  const usedRows = rows.filter((row) => row.usedQty > 0);

  return (
    <div className="inventory-section">
      <h2>{title}</h2>

      <div className="inventory-table-scroll">
        <table className="inventory-table inventory-table--usage">
          <thead>
            <tr>
              <th>Продукт</th>
              <th>Ед.</th>
              <th>Списано</th>
            </tr>
          </thead>

          <tbody>
            {usedRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="inventory-empty">
                  За выбранный период списаний нет
                </td>
              </tr>
            ) : (
              usedRows.map((row) => (
                <tr key={`${row.name}-${row.unit}`}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>

                  <td>{row.unit}</td>

                  <td className="used">{formatQty(row.usedQty, row.unit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryUsageTable;