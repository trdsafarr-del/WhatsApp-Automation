import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildOrdersPdfSummaryAndRows } from './orderRules';
import type { OrderRecord } from './types';

export function exportOrdersToPdf(
  orders: OrderRecord[],
  shopName: string,
  filterLabel: string
): string {
  const report = buildOrdersPdfSummaryAndRows(orders);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10);
  const safeShopSlug = (shopName || 'OrderPulse')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Report Header
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shopName || 'OrderPulse'} — Orders & Today Dispatch Sheet`, 36, 40);

  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `View: ${filterLabel}   |   Generated: ${now.toLocaleString('en-IN')}`,
    36,
    58
  );

  // Summary Metrics Strip
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Total: ${report.total}   |   Confirmed: ${report.confirmed}   |   Today Dispatch: ${report.readyToDispatch}   |   In Transit: ${report.inTransit}   |   Delivered: ${report.delivered}   |   RTO Return: ${report.rtoReturn}   |   Cancelled: ${report.cancelled}`,
    36,
    78
  );

  autoTable(doc, {
    startY: 94,
    margin: { left: 36, right: 36, bottom: 32 },
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 72 },
      2: { cellWidth: 108 },
      3: { cellWidth: 138 },
      4: { cellWidth: 64, halign: 'right' },
      5: { cellWidth: 70 },
      6: { cellWidth: 84, fontStyle: 'bold' },
      7: { cellWidth: 120 },
      8: { cellWidth: 'auto' },
    },
    head: [
      [
        'Order #',
        'Time',
        'Customer & Phone',
        'Item Name',
        'Amount',
        'Confirm Status',
        'Today Dispatch',
        'Delivery Address',
        'Shopify Tags',
      ],
    ],
    body: report.rows.map((r) => [
      r.orderNumber,
      r.dateTimeLabel,
      r.customerLabel,
      r.itemsSummary,
      r.amountLabel,
      r.confirmStatus,
      r.dispatchStatus,
      r.deliverySummary,
      r.shopifyTags,
    ]),
    didParseCell(hookData) {
      if (hookData.section !== 'body') return;
      const rowMeta = report.rows[hookData.row.index];
      if (!rowMeta) return;

      if (rowMeta.highRto && hookData.column.index !== 6) {
        hookData.cell.styles.fillColor = [254, 249, 195];
      }

      if (hookData.column.index === 6) {
        if (rowMeta.dispatchCode === 'ready') {
          hookData.cell.styles.fillColor = [209, 250, 229];
          hookData.cell.styles.textColor = [6, 95, 70];
        } else if (rowMeta.dispatchCode === 'delivered') {
          hookData.cell.styles.fillColor = [204, 251, 241];
          hookData.cell.styles.textColor = [17, 94, 89];
        } else if (rowMeta.dispatchCode === 'in_transit') {
          hookData.cell.styles.fillColor = [224, 231, 255];
          hookData.cell.styles.textColor = [55, 48, 163];
        } else if (rowMeta.dispatchCode === 'dispatched') {
          hookData.cell.styles.fillColor = [224, 242, 254];
          hookData.cell.styles.textColor = [7, 89, 133];
        } else if (rowMeta.dispatchCode === 'rto_return' || rowMeta.dispatchCode === 'cancelled') {
          hookData.cell.styles.fillColor = [254, 226, 226];
          hookData.cell.styles.textColor = [153, 27, 27];
        } else {
          hookData.cell.styles.fillColor = [254, 243, 199];
          hookData.cell.styles.textColor = [146, 64, 14];
        }
      }

      if (hookData.column.index === 5) {
        if (rowMeta.confirmStatus === 'Confirmed') {
          hookData.cell.styles.textColor = [4, 120, 87];
          hookData.cell.styles.fontStyle = 'bold';
        } else if (rowMeta.confirmStatus === 'Cancelled') {
          hookData.cell.styles.textColor = [185, 28, 28];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }

      if (hookData.column.index === 8 && rowMeta.highRto) {
        hookData.cell.styles.textColor = [133, 77, 14];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const filename = `${safeShopSlug || 'OrderPulse'}-Dispatch-${dateStamp}.pdf`;
  doc.save(filename);
  return filename;
}
