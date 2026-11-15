import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildDailyReportSummary,
  buildProfitLossReport,
  type CostAssumptions,
} from './orderRules';
import { renderExcelReportCharts } from './renderChartsToPng';
import type { OrderRecord } from './types';

function formatInrPdf(amount: number, currency = 'INR'): string {
  const prefix = currency === 'INR' ? 'Rs. ' : `${currency} `;
  const rounded = Math.round(amount);
  const absStr = Math.abs(rounded).toLocaleString('en-IN');
  return rounded < 0 ? `-${prefix}${absStr}` : `${prefix}${absStr}`;
}

function drawSectionHeading(doc: jsPDF, title: string, subtitle: string, y: number) {
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

export interface ProfitLossPdfExportParams {
  orders: OrderRecord[];
  shopName: string;
  periodLabel: string;
  costAssumptions: CostAssumptions;
  periodAdSpend: number;
  adDaysCount?: number;
}

/**
 * Generates an executive Landscape A4 Profit & Loss PDF statement including KPI cards,
 * Revenue-to-Net-Profit waterfall, Date-wise P&L table, and Order-by-Order P&L audit register.
 */
export function exportProfitLossReportToPdf({
  orders,
  shopName,
  periodLabel,
  costAssumptions,
  periodAdSpend,
  adDaysCount,
}: ProfitLossPdfExportParams): string {
  const pnl = buildProfitLossReport(orders, costAssumptions, periodAdSpend, adDaysCount);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const safeShopSlug = (shopName || 'OrderPulse')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safePeriodSlug = (periodLabel || now.toISOString().slice(0, 10))
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const displayShop = shopName || 'OrderPulse';

  // Branded Top Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 65, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${displayShop} — Monthly & Period Profit & Loss Statement`, 36, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Period: ${periodLabel}   |   Orders: ${pnl.totalOrders} (${pnl.delhiverySyncedCount} Delhivery Synced)   |   COGS ${costAssumptions.cogsPercent}% · Pack ${formatInrPdf(costAssumptions.packagingCostPerOrder, pnl.currency)}`,
    36,
    49
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(110, 231, 183);
  const generatedText = `Generated: ${now.toLocaleString('en-IN')}`;
  doc.text(generatedText, pageWidth - 36 - doc.getTextWidth(generatedText), 49);

  // Section 1: 5 Financial KPI Cards
  const kpiTopY = 84;
  drawSectionHeading(
    doc,
    '1. Financial Summary & Unit Economics',
    `${pnl.netMarginPct}% Realized Net Margin`,
    kpiTopY
  );

  const cardsStartY = kpiTopY + 10;
  const cardGap = 8;
  const cardWidth = (pageWidth - 72 - cardGap * 4) / 5;
  const cardHeight = 48;
  const isProfitPos = pnl.netRealizedProfit >= 0;

  const cards = [
    {
      label: isProfitPos ? 'NET REALIZED PROFIT' : 'NET REALIZED LOSS',
      value: formatInrPdf(pnl.netRealizedProfit, pnl.currency),
      sub: `${pnl.netMarginPct}% margin · ${formatInrPdf(pnl.avgProfitPerDelivered, pnl.currency)}/delv`,
      bg: isProfitPos ? ([236, 253, 245] as const) : ([254, 242, 242] as const),
      border: isProfitPos ? ([110, 231, 183] as const) : ([252, 165, 165] as const),
      accent: isProfitPos ? ([4, 120, 87] as const) : ([185, 28, 28] as const),
    },
    {
      label: 'DELIVERED REVENUE',
      value: formatInrPdf(pnl.realizedRevenue, pnl.currency),
      sub: `+${formatInrPdf(pnl.inTransitExpectedRevenue, pnl.currency)} transit (${pnl.inTransitCount})`,
      bg: [241, 245, 249] as const,
      border: [203, 213, 225] as const,
      accent: [15, 23, 42] as const,
    },
    {
      label: 'TOTAL COSTS DEDUCTED',
      value: formatInrPdf(pnl.totalRealizedCosts, pnl.currency),
      sub: `COGS ${formatInrPdf(pnl.totalCogs, pnl.currency)} · Ship ${formatInrPdf(pnl.totalForwardShipping, pnl.currency)}`,
      bg: [255, 251, 235] as const,
      border: [252, 211, 77] as const,
      accent: [180, 83, 9] as const,
    },
    {
      label: 'RTO DIRECT LOSS',
      value: formatInrPdf(-pnl.totalRtoLoss, pnl.currency),
      sub: `${pnl.rtoCount} RTO (2-way freight + pack)`,
      bg: [254, 242, 242] as const,
      border: [252, 165, 165] as const,
      accent: [185, 28, 28] as const,
    },
    {
      label: 'WHATSAPP RTO SAVED',
      value: formatInrPdf(pnl.whatsappRtoSavings, pnl.currency),
      sub: `${pnl.cancelledCount} cancelled pre-ship`,
      bg: [236, 254, 255] as const,
      border: [103, 232, 249] as const,
      accent: [14, 116, 144] as const,
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
    doc.setFontSize(11.5);
    doc.setTextColor(card.accent[0], card.accent[1], card.accent[2]);
    doc.text(card.value, x + 7, cardsStartY + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(card.sub, x + 7, cardsStartY + 41);
  });

  // Section 2: Waterfall Profit & Loss Statement
  const section2Y = cardsStartY + cardHeight + 22;
  drawSectionHeading(
    doc,
    '2. Revenue to Net Profit Statement',
    `Projected Net Profit incl. In-Transit: ${formatInrPdf(pnl.projectedNetProfit, pnl.currency)}`,
    section2Y
  );

  const sharePct = (amt: number) =>
    pnl.realizedRevenue > 0 ? `${Math.round((amt / pnl.realizedRevenue) * 100)}%` : '0%';

  autoTable(doc, {
    startY: section2Y + 8,
    margin: { left: 36, right: 36 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 220, fontStyle: 'bold' },
      1: { cellWidth: 110, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 90, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
    head: [['P&L Component', `Amount (${pnl.currency})`, '% of Rev', 'Basis']],
    body: [
      ['Delivered Revenue (+)', formatInrPdf(pnl.realizedRevenue, pnl.currency), '100%', `${pnl.deliveredCount} Delivered orders`],
      [`Product COGS (${costAssumptions.cogsPercent}%)`, formatInrPdf(-pnl.totalCogs, pnl.currency), sharePct(pnl.totalCogs), 'Calculated on delivered order value'],
      ['Forward Shipping Freight', formatInrPdf(-pnl.totalForwardShipping, pnl.currency), sharePct(pnl.totalForwardShipping), 'Delhivery Tariff / Wallet CSV (incl. GST)'],
      ['RTO Return Freight', formatInrPdf(-pnl.totalRtoShippingCost, pnl.currency), sharePct(pnl.totalRtoShippingCost), `${pnl.rtoCount} RTO return legs`],
      ['Packaging & Boxes', formatInrPdf(-pnl.totalPackagingCost, pnl.currency), sharePct(pnl.totalPackagingCost), `${formatInrPdf(costAssumptions.packagingCostPerOrder, pnl.currency)} per shipped parcel`],
      ['COD & Payment Gateway Fees', formatInrPdf(-pnl.totalPaymentFees, pnl.currency), sharePct(pnl.totalPaymentFees), `Delhivery COD fee + ${costAssumptions.prepaidGatewayPercent}% Prepaid PG`],
      [
        'Meta Ads & Marketing Spend',
        formatInrPdf(-pnl.totalMarketingCost, pnl.currency),
        sharePct(pnl.totalMarketingCost),
        pnl.dailyMetaAdsRate > 0
          ? `Meta Ads ${formatInrPdf(pnl.dailyMetaAdsRate, pnl.currency)}/day × ${pnl.metaAdDaysCount}d = ${formatInrPdf(pnl.totalDailyMetaAds, pnl.currency)}${periodAdSpend > 0 ? ` + Extra ${formatInrPdf(periodAdSpend, pnl.currency)}` : ''}`
          : `Per-order ads + Extra spend ${formatInrPdf(periodAdSpend, pnl.currency)}`,
      ],
      ['NET REALIZED PROFIT / LOSS', formatInrPdf(pnl.netRealizedProfit, pnl.currency), `${pnl.netMarginPct}%`, `${formatInrPdf(pnl.avgProfitPerDelivered, pnl.currency)} average profit per delivered order`],
    ],
    didParseCell(hookData) {
      if (hookData.section !== 'body') return;
      if (hookData.row.index === 0) {
        hookData.cell.styles.fillColor = [236, 253, 245];
        hookData.cell.styles.textColor = [4, 120, 87];
      } else if (hookData.row.index === 7) {
        hookData.cell.styles.fillColor = isProfitPos ? [209, 250, 229] : [254, 226, 226];
        hookData.cell.styles.textColor = isProfitPos ? [6, 95, 70] : [153, 27, 27];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Section 3: Date-Wise P&L Table
  const afterWaterfallY =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 280) + 18;
  drawSectionHeading(
    doc,
    '3. Date-Wise Profit & Loss Ledger (IST)',
    `${pnl.dailyPnlRows.length} ${pnl.dailyPnlRows.length === 1 ? 'Day' : 'Days'}`,
    afterWaterfallY
  );

  autoTable(doc, {
    startY: afterWaterfallY + 8,
    margin: { left: 36, right: 36 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      fontSize: 7.8,
      cellPadding: 4,
      halign: 'right',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.45,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 74 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    head: [
      [
        'Date (IST)',
        'Orders',
        'Delv',
        'Transit',
        'RTO',
        'Delivered Rev',
        'Transit Exp Rev',
        'Realized Costs',
        'RTO Loss',
        'Net Profit',
        'Projected Net',
      ],
    ],
    body: pnl.dailyPnlRows.map((d) => [
      d.dateLabel,
      String(d.totalOrders),
      String(d.deliveredOrders),
      String(d.inTransitOrders),
      String(d.rtoOrders),
      formatInrPdf(d.realizedRevenue, pnl.currency),
      formatInrPdf(d.expectedTransitRevenue, pnl.currency),
      formatInrPdf(d.totalCosts, pnl.currency),
      formatInrPdf(d.rtoLoss, pnl.currency),
      formatInrPdf(d.netRealizedProfit, pnl.currency),
      formatInrPdf(d.projectedNetProfit, pnl.currency),
    ]),
    foot:
      pnl.dailyPnlRows.length > 1
        ? [
            [
              'TOTAL',
              String(pnl.totalOrders),
              String(pnl.deliveredCount),
              String(pnl.inTransitCount),
              String(pnl.rtoCount),
              formatInrPdf(pnl.realizedRevenue, pnl.currency),
              formatInrPdf(pnl.inTransitExpectedRevenue, pnl.currency),
              formatInrPdf(pnl.totalRealizedCosts, pnl.currency),
              formatInrPdf(pnl.totalRtoLoss, pnl.currency),
              formatInrPdf(pnl.netRealizedProfit, pnl.currency),
              formatInrPdf(pnl.projectedNetProfit, pnl.currency),
            ],
          ]
        : undefined,
  });

  // Section 4: Order-by-Order P&L Register
  const afterDailyPnlY =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 420) + 18;
  drawSectionHeading(
    doc,
    `4. Order-by-Order Profit & Loss Audit (${pnl.orderRows.length} Orders)`,
    'In-Transit shows projected profit if delivered',
    afterDailyPnlY
  );

  autoTable(doc, {
    startY: afterDailyPnlY + 8,
    margin: { left: 36, right: 36, bottom: 36 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.45,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { cellWidth: 108 },
      3: { cellWidth: 74, fontStyle: 'bold' },
      4: { cellWidth: 88 },
      5: { cellWidth: 58, halign: 'right' },
      6: { cellWidth: 54, halign: 'right' },
      7: { cellWidth: 66, halign: 'right' },
      8: { cellWidth: 68, halign: 'right' },
      9: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
    },
    head: [
      [
        'Order #',
        'Date',
        'Customer / Mode',
        'Outcome',
        'Rate Source',
        'Value',
        'COGS',
        'Ship + RTO',
        'Pack + Fee/Ad',
        'Net Profit / Loss',
      ],
    ],
    body: pnl.orderRows.map((row) => [
      row.orderNumber,
      row.dateLabel,
      `${row.customerName}\n${row.paymentMethod}`,
      row.outcomeLabel,
      row.chargeSource === 'delhivery_wallet'
        ? 'Wallet CSV (Exact)'
        : row.chargeSource === 'delhivery_api'
          ? `Tariff${row.chargedWeightGrams ? ` · ${row.chargedWeightGrams}g` : ''}`
          : row.chargeSource === 'estimated'
            ? 'Est. Fallback'
            : '—',
      formatInrPdf(row.orderValue, row.currency),
      formatInrPdf(row.cogsCost, row.currency),
      formatInrPdf(row.forwardShippingCost + row.rtoShippingCost, row.currency),
      formatInrPdf(row.packagingCost + row.paymentOrCodFee + row.marketingCost, row.currency),
      `${row.outcome === 'in_transit' ? 'Est. ' : ''}${formatInrPdf(row.netProfit, row.currency)}`,
    ]),
    didParseCell(hookData) {
      if (hookData.section !== 'body') return;
      const row = pnl.orderRows[hookData.row.index];
      if (!row) return;
      if (hookData.column.index === 9) {
        if (row.outcome === 'in_transit') {
          hookData.cell.styles.textColor = [67, 56, 202];
        } else if (row.netProfit > 0) {
          hookData.cell.styles.textColor = [4, 120, 87];
        } else if (row.netProfit < 0) {
          hookData.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  // Visual Analytics Charts Page (embedded 2x2 HiDPI canvas charts)
  const dailySummary = buildDailyReportSummary(orders);
  const renderedCharts = renderExcelReportCharts({
    pnl,
    daily: dailySummary,
    periodLabel,
  });
  if (renderedCharts.length > 0) {
    doc.addPage();
    drawSectionHeading(
      doc,
      '5. Executive Visual Charts & Cost Analytics',
      `${periodLabel} (${pnl.totalOrders} Orders)`,
      36
    );
    const chartW = (pageWidth - 88) / 2;
    const chartH = 220;
    const placements = [
      { x: 36, y: 56 },
      { x: 36 + chartW + 16, y: 56 },
      { x: 36, y: 56 + chartH + 18 },
      { x: 36 + chartW + 16, y: 56 + chartH + 18 },
    ];
    renderedCharts.slice(0, 4).forEach((ch, idx) => {
      const pos = placements[idx];
      if (!pos) return;
      doc.addImage(ch.base64Png, 'PNG', pos.x, pos.y, chartW, chartH);
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(36, pageHeight - 24, pageWidth - 36, pageHeight - 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${displayShop} · Period: ${periodLabel} · Confidential Profit & Loss Report`, 36, pageHeight - 12);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - 36 - doc.getTextWidth(pageStr), pageHeight - 12);
  }

  const filename = `${safeShopSlug || 'OrderPulse'}-PnL-Report-${safePeriodSlug}.pdf`;
  doc.save(filename);
  return filename;
}
