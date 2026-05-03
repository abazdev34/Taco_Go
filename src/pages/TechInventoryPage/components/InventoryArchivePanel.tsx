import { useState } from "react";
import {
  deleteInventoryReport,
  TInventoryReport,
} from "../../../api/inventory";
import { sendEmailReport } from "../../../utils/email";

type Props = {
  reports: TInventoryReport[];
  onChanged: () => Promise<void>;
};

function InventoryArchivePanel({ reports, onChanged }: Props) {
  const [selectedReport, setSelectedReport] = useState<TInventoryReport | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openPrint = (report: TInventoryReport) => {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(report.html);
    win.document.close();

    setTimeout(() => {
      win.print();
    }, 400);
  };

  const sendToEmail = (report: TInventoryReport) => {
    sendEmailReport(
      report.title,
      report.email_text || `Складской отчёт: ${report.title}`
    );
  };

  const removeReport = async (report: TInventoryReport) => {
    const ok = confirm(`Удалить архив «${report.title}»?`);
    if (!ok) return;

    try {
      setDeletingId(report.id);
      await deleteInventoryReport(report.id);

      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
      }

      await onChanged();
    } catch (e: any) {
      alert(e?.message || "Не удалось удалить архив");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="inventory-card">
      <div className="inventory-card-head">
        <div>
          <h2>Архив сверок</h2>
          <p>Здесь хранятся все подтверждённые сверки склада.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="inventory-empty">Архив пока пуст</div>
      ) : (
        <div className="inventory-archive-list">
          {reports.map((report) => (
            <div key={report.id} className="inventory-archive-card">
              <div className="inventory-archive-info">
                <strong>{report.title}</strong>
                <span>
                  {new Date(report.created_at).toLocaleString("ru-RU")}
                </span>
              </div>

              <div className="inventory-archive-actions">
                <button type="button" onClick={() => setSelectedReport(report)}>
                  Смотреть
                </button>

                <button type="button" onClick={() => openPrint(report)}>
                  PDF
                </button>

                <button type="button" onClick={() => sendToEmail(report)}>
                  Почта
                </button>

                <button
                  type="button"
                  className="danger"
                  disabled={deletingId === report.id}
                  onClick={() => removeReport(report)}
                >
                  {deletingId === report.id ? "Удаление..." : "Удалить"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="inventory-report-modal">
          <div
            className="inventory-report-modal__overlay"
            onClick={() => setSelectedReport(null)}
          />

          <div className="inventory-report-modal__card">
            <div className="inventory-report-modal__head">
              <h2>{selectedReport.title}</h2>

              <button type="button" onClick={() => setSelectedReport(null)}>
                ✕
              </button>
            </div>

            <div
              className="inventory-report-preview"
              dangerouslySetInnerHTML={{ __html: selectedReport.html }}
            />

            <div className="inventory-card-actions">
              <button type="button" onClick={() => openPrint(selectedReport)}>
                PDF
              </button>

              <button type="button" onClick={() => sendToEmail(selectedReport)}>
                Отправить на почту
              </button>

              <button
                type="button"
                className="danger"
                disabled={deletingId === selectedReport.id}
                onClick={() => removeReport(selectedReport)}
              >
                {deletingId === selectedReport.id ? "Удаление..." : "Удалить"}
              </button>

              <button type="button" onClick={() => setSelectedReport(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryArchivePanel;