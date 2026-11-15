import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildDailyReportSummary,
  getDispatchStatusInfo,
  hasHighRtoTag,
  hasOrderTrackingAdded,
  isOrderNotConfirmedOnWhatsApp,
} from './orderRules';
import type { OrderRecord } from './types';

function formatMoney(amount: number, currency = 'INR'): string {
  return `${currency} ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function drawSectionHeading(doc: jsPDF, title: string, subtitle: string, y: number) {
  // Emerald vertical accent bar
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(36, y - 10, 4, 15, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 46, y);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 46 + doc.getTextWidth(title) + 10, y);
  }
}

export function exportDailyReportToPdf(
  orders: OrderRecord[],
  shopName: string,
  periodLabel: string
): string {
  const { totals, dailyRows } = buildDailyReportSummary(orders);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10);
  const safeShopSlug = (shopName || 'OrderPulse')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const displayShop = shopName || 'OrderPulse';

  // Branded Executive Top Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, 'F');

  // Emerald Accent Stripe along bottom of header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 65, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${displayShop} — Daily Order, WhatsApp & Tracking Report`, 36, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Report Period: ${periodLabel}   |   Orders Included: ${totals.totalOrders}   |   Timezone: IST (+05:30)`,
    36,
    49
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(110, 231, 183);
  const generatedText = `Generated: ${now.toLocaleString('en-IN')}`;
  doc.text(generatedText, pageWidth - 36 - doc.getTextWidth(generatedText), 49);

  // Section 1: Executive KPI Cards Strip (6 visual summary cards)
  const kpiTopY = 84;
  drawSectionHeading(
    doc,
    '1. Executive Summary & Revenue Split',
    `${totals.confirmationRate}% WhatsApp Confirm Rate`,
    kpiTopY
  );

  const cardsStartY = kpiTopY + 10;
  const cardGap = 8;
  const cardWidth = (pageWidth - 72 - cardGap * 5) / 6;
  const cardHeight = 48;

  const cards = [
    {
      label: 'TOTAL ORDERS AAYE',
      value: String(totals.totalOrders),
      sub: formatMoney(totals.totalValue, totals.currency),
      bg: [241, 245, 249] as const,
      border: [203, 213, 225] as const,
      accent: [15, 23, 42] as const,
    },
    {
      label: 'WA CONFIRMED',
      value: `${totals.confirmedOrders} (${totals.confirmationRate}%)`,
      sub: formatMoney(totals.confirmedValue, totals.currency),
      bg: [236, 253, 245] as const,
      border: [110, 231, 183] as const,
      accent: [4, 120, 87] as const,
    },
    {
      label: 'NO WA CONFIRM',
      value: String(totals.notConfirmedOnWhatsApp),
      sub: formatMoney(totals.notConfirmedValue, totals.currency),
      bg: [255, 251, 235] as const,
      border: [252, 211, 77] as const,
      accent: [180, 83, 9] as const,
    },
    {
      label: 'CANCELLED BY USER',
      value: String(totals.cancelledOrders),
      sub: formatMoney(totals.cancelledValue, totals.currency),
      bg: [254, 242, 242] as const,
      border: [252, 165, 165] as const,
      accent: [185, 28, 28] as const,
    },
    {
      label: 'TRACKING ADDED',
      value: String(totals.trackingAddedTotal),
      sub: `${totals.trackingPendingPickup} Wait Pickup · ${totals.readyToDispatch} Ready`,
      bg: [236, 254, 255] as const,
      border: [103, 232, 249] as const,
      accent: [14, 116, 144] as const,
    },
    {
      label: 'TRANSIT / DEL / RTO',
      value: `${totals.inTransitCount} / ${totals.deliveredCount} / ${totals.rtoReturnCount}`,
      sub: `${totals.highRtoCount} High RTO Flagged`,
      bg: [238, 242, 255] as const,
      border: [165, 180, 252] as const,
      accent: [67, 56, 202] as const,
    },
  ];

  cards.forEach((card, idx) => {
    const x = 36 + idx * (cardWidth + cardGap);
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, cardsStartY, cardWidth, cardHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, x + 7, cardsStartY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(card.accent[0], card.accent[1], card.accent[2]);
    doc.text(card.value, x + 7, cardsStartY + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(card.sub, x + 7, cardsStartY + 41);
  });

  // Section 2: Date-Wise Breakdown Table with Grand Total Footer
  const section2Y = cardsStartY + cardHeight + 22;
  drawSectionHeading(
    doc,
    '2. Date-Wise Breakdown Ledger (IST)',
    `${dailyRows.length} ${dailyRows.length === 1 ? 'Day' : 'Days'}`,
    section2Y
  );

  autoTable(doc, {
    startY: section2Y + 8,
    margin: { left: 36, right: 36 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 74 },
      11: { halign: 'right', fontStyle: 'bold', cellWidth: 72 },
    },
    head: [
      [
        'Date (IST)',
        'Orders Aaye',
        'Confirmed',
        'Cancelled',
        'No WA Confirm',
        'Tracking Added',
        'Ready Dispatch',
        'In Transit',
        'Delivered',
        'RTO Return',
        'Confirm %',
        'Order Value',
      ],
    ],
    body: dailyRows.map((row) => [
      row.dateLabel,
      String(row.totalOrders),
      String(row.confirmedOrders),
      String(row.cancelledOrders),
      String(row.notConfirmedOnWhatsApp),
      String(row.trackingAddedTotal),
      String(row.readyToDispatch),
      String(row.inTransitCount),
      String(row.deliveredCount),
      String(row.rtoReturnCount),
      `${row.confirmationRate}%`,
      formatMoney(row.totalValue, row.currency),
    ]),
    foot:
      dailyRows.length > 1
        ? [
            [
              'TOTAL',
              String(totals.totalOrders),
              String(totals.confirmedOrders),
              String(totals.cancelledOrders),
              String(totals.notConfirmedOnWhatsApp),
              String(totals.trackingAddedTotal),
              String(totals.readyToDispatch),
              String(totals.inTransitCount),
              String(totals.deliveredCount),
              String(totals.rtoReturnCount),
              `${totals.confirmationRate}%`,
              formatMoney(totals.totalValue, totals.currency),
            ],
          ]
        : undefined,
    didParseCell(hookData) {
      if (hookData.section !== 'body') return;
      const col = hookData.column.index;
      if (col === 2) hookData.cell.styles.textColor = [4, 120, 87];
      else if (col === 3 || col === 9) hookData.cell.styles.textColor = [185, 28, 28];
      else if (col === 4) hookData.cell.styles.textColor = [180, 83, 9];
      else if (col === 5) hookData.cell.styles.textColor = [14, 116, 144];
    },
  });

  const afterDailyY =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 260) + 20;

  // Section 3: Order-by-Order Audit Register
  drawSectionHeading(
    doc,
    `3. Order-by-Order Register (${orders.length} Orders)`,
    'Yellow row = High RTO Risk',
    afterDailyY
  );

  const orderMetaList = orders.map((order) => {
    const dispatchInfo = getDispatchStatusInfo(order);
    const notConfirmed = isOrderNotConfirmedOnWhatsApp(order);
    const hasTracking = hasOrderTrackingAdded(order);
    const highRto = hasHighRtoTag(order.shopifyTags);

    const waStatus =
      order.pollStatus === 'confirmed'
        ? 'Confirmed'
        : order.pollStatus === 'cancelled_by_user'
          ? 'Cancelled'
          : order.pollStatus === 'poll_sent'
            ? 'No Reply (Poll Sent)'
            : order.pollStatus === 'failed'
              ? 'No Reply (Failed)'
              : 'No Reply (Queued)';

    const parsedDate = new Date(order.createdAt);
    const dateTime = Number.isNaN(parsedDate.getTime())
      ? order.createdAt
      : parsedDate.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

    const awbInfo = hasTracking
      ? [order.trackingCompany, order.trackingNumber].filter(Boolean).join(' · ') || 'Fulfilled'
      : '—';

    return {
      orderNumber: highRto ? `${order.orderNumber}\n[HIGH RTO]` : order.orderNumber,
      dateTime,
      customer: `${order.customerName}\n${order.customerPhone || 'No phone'}`,
      items: order.lineItemsSummary || '—',
      amount: `${order.currency} ${order.totalPrice}`,
      waStatus,
      dispatchLabel: dispatchInfo.label,
      dispatchCode: dispatchInfo.code,
      awbInfo,
      tags: order.shopifyTags || '—',
      notConfirmed,
      highRto,
    };
  });

  autoTable(doc, {
    startY: afterDailyY + 8,
    margin: { left: 36, right: 36, bottom: 36 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      fontSize: 7.8,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.45,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold' },
      1: { cellWidth: 66 },
      2: { cellWidth: 96 },
      3: { cellWidth: 118 },
      4: { cellWidth: 58, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 82, fontStyle: 'bold' },
      6: { cellWidth: 74, fontStyle: 'bold' },
      7: { cellWidth: 90 },
      8: { cellWidth: 'auto' },
    },
    head: [
      [
        'Order #',
        'Date & Time',
        'Customer & Phone',
        'Item Name',
        'Amount',
        'WhatsApp Reply',
        'Dispatch / Courier',
        'Tracking / AWB',
        'Shopify Tags',
      ],
    ],
    body: orderMetaList.map((m) => [
      m.orderNumber,
      m.dateTime,
      m.customer,
      m.items,
      m.amount,
      m.waStatus,
      m.dispatchLabel,
      m.awbInfo,
      m.tags,
    ]),
    didParseCell(hookData) {
      if (hookData.section !== 'body') return;
      const meta = orderMetaList[hookData.row.index];
      if (!meta) return;

      if (meta.highRto && hookData.column.index !== 5 && hookData.column.index !== 6) {
        hookData.cell.styles.fillColor = [254, 249, 195];
      }

      if (hookData.column.index === 5) {
        if (meta.waStatus === 'Confirmed') {
          hookData.cell.styles.fillColor = [209, 250, 229];
          hookData.cell.styles.textColor = [4, 120, 87];
        } else if (meta.waStatus === 'Cancelled') {
          hookData.cell.styles.fillColor = [254, 226, 226];
          hookData.cell.styles.textColor = [185, 28, 28];
        } else {
          hookData.cell.styles.fillColor = [254, 243, 199];
          hookData.cell.styles.textColor = [146, 64, 14];
        }
      }

      if (hookData.column.index === 6) {
        if (meta.dispatchCode === 'tracking_added' || meta.dispatchCode === 'dispatched') {
          hookData.cell.styles.fillColor = [207, 250, 254];
          hookData.cell.styles.textColor = [14, 116, 144];
        } else if (meta.dispatchCode === 'in_transit') {
          hookData.cell.styles.fillColor = [224, 231, 255];
          hookData.cell.styles.textColor = [55, 48, 163];
        } else if (meta.dispatchCode === 'delivered') {
          hookData.cell.styles.fillColor = [204, 251, 241];
          hookData.cell.styles.textColor = [17, 94, 89];
        } else if (meta.dispatchCode === 'rto_return') {
          hookData.cell.styles.fillColor = [254, 226, 226];
          hookData.cell.styles.textColor = [153, 27, 27];
        } else if (meta.dispatchCode === 'ready') {
          hookData.cell.styles.fillColor = [209, 250, 229];
          hookData.cell.styles.textColor = [6, 95, 70];
        }
      }
    },
  });

  // Consistent Executive Page Footer with Page X of Y on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(36, pageHeight - 24, pageWidth - 36, pageHeight - 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${displayShop} · Period: ${periodLabel} · Confidential Dispatch Report`, 36, pageHeight - 12);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - 36 - doc.getTextWidth(pageStr), pageHeight - 12);
  }

  const filename = `${safeShopSlug || 'OrderPulse'}-Report-${dateStamp}.pdf`;
  doc.save(filename);
  return filename;
}
