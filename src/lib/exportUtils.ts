export interface ExportColumn {
  header: string;
  key: string;
}

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportToCsv(
  filenameBase: string,
  columns: ExportColumn[],
  rows: ExportRow[]
) {
  const header = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escapeCsv(r[c.key])).join(','))
    .join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `${filenameBase}-${stamp()}.csv`
  );
}

export async function exportToPdf(
  filenameBase: string,
  title: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  options?: { subtitle?: string; exportedBy?: string; landscape?: boolean }
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({
    orientation: options?.landscape === false ? 'portrait' : 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const exportedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (options?.subtitle) doc.text(options.subtitle, 40, 56);
  doc.text(
    `Exported: ${exportedAt}${options?.exportedBy ? `  |  By: ${options.exportedBy}` : ''}`,
    pageWidth - 40,
    40,
    { align: 'right' }
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: options?.subtitle ? 70 : 60,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) =>
      columns.map((c) => {
        const v = r[c.key];
        return v === null || v === undefined ? '' : String(v);
      })
    ),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageWidth - 40, h - 20, {
        align: 'right',
      });
      doc.setTextColor(0);
    },
  });

  doc.save(`${filenameBase}-${stamp()}.pdf`);
}
