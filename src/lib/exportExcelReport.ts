import ExcelJS from 'exceljs';
import {
  buildDailyReportSummary,
  buildProfitLossReport,
  buildSettlementAndDelaySummary,
  getDispatchStatusInfo,
  hasHighRtoTag,
  hasOrderTrackingAdded,
  type CostAssumptions,
} from './orderRules';
import { renderExcelReportCharts } from './renderChartsToPng';
import type { AppSettings, OrderRecord } from './types';

const INR_NUM_FMT = '"₹"#,##0.00;-"₹"#,##0.00;"₹"0.00';

const COLORS = {
  navy: 'FF0F172A',
  slateDark: 'FF1E293B',
  slateMuted: 'FF475569',
  slateText: 'FF0F172A',
  white: 'FFFFFFFF',
  zebra: 'FFF8FAFC',
  border: 'FFCBD5E1',
  emeraldFill: 'FFD1FAE5',
  emeraldSoft: 'FFECFDF5',
  emeraldText: 'FF065F46',
  roseFill: 'FFFFE4E6',
  roseSoft: 'FFFFF1F2',
  roseText: 'FFBE123C',
  indigoFill: 'FFE0E7FF',
  indigoSoft: 'FFEEF2FF',
  indigoText: 'FF3730A3',
  amberFill: 'FFFEF3C7',
  amberSoft: 'FFFFFBEB',
  amberText: 'FFB45309',
  cyanFill: 'FFCFFAFE',
  cyanSoft: 'FFECFEFF',
  cyanText: 'FF0E7490',
  slateBadgeFill: 'FFF1F5F9',
  slateBadgeText: 'FF475569',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

function solidFill(argb: string): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function styleBannerRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  maxCol: number,
  title: string,
  subtitle: string
) {
  ws.mergeCells(rowIdx, 1, rowIdx, maxCol);
  const titleRow = ws.getRow(rowIdx);
  titleRow.height = 30;
  const c1 = ws.getCell(rowIdx, 1);
  c1.value = title;
  c1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.white } };
  c1.fill = solidFill(COLORS.navy);
  c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws.mergeCells(rowIdx + 1, 1, rowIdx + 1, maxCol);
  const subRow = ws.getRow(rowIdx + 1);
  subRow.height = 20;
  const c2 = ws.getCell(rowIdx + 1, 1);
  c2.value = subtitle;
  c2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFE2E8F0' } };
  c2.fill = solidFill(COLORS.slateDark);
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function styleHeaderRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  headers: string[],
  rightAlignedCols: Set<number> = new Set(),
  bgColor = COLORS.navy
) {
  const row = ws.getRow(rowIdx);
  row.height = 26;
  headers.forEach((h, i) => {
    const colIdx = i + 1;
    const cell = row.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = solidFill(bgColor);
    cell.alignment = {
      vertical: 'middle',
      horizontal: rightAlignedCols.has(colIdx) ? 'right' : 'left',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.navy } },
      bottom: { style: 'medium', color: { argb: 'FF059669' } },
      left: { style: 'thin', color: { argb: COLORS.slateDark } },
      right: { style: 'thin', color: { argb: COLORS.slateDark } },
    };
  });
}

export interface MonthlyExcelExportParams {
  orders: OrderRecord[];
  settings: AppSettings;
  costAssumptions: CostAssumptions;
  periodAdSpend: number;
  adDaysCount?: number;
  periodLabel: string;
}

/**
 * Builds a richly styled, color-coded 5-sheet ExcelJS workbook with live Excel formulas,
 * conditional outcome highlights, frozen headers, auto-filters, and embedded retina charts.
 */
export function buildMonthlyExcelWorkbook({
  orders,
  settings,
  costAssumptions,
  periodAdSpend,
  adDaysCount,
  periodLabel,
}: MonthlyExcelExportParams): { workbook: ExcelJS.Workbook; filename: string } {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.shopName || 'OrderPulse';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const displayShop = settings.shopName || 'OrderPulse';
  const safeShopSlug = displayShop
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safePeriodSlug = (periodLabel || new Date().toISOString().slice(0, 7))
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const pnl = buildProfitLossReport(orders, costAssumptions, periodAdSpend, adDaysCount);
  const daily = buildDailyReportSummary(orders);
  const settleDelay = buildSettlementAndDelaySummary(orders, settings);
  const nowStr = new Date().toLocaleString('en-IN');

  // Render high-res charts when running in browser
  const charts = renderExcelReportCharts({ pnl, daily, periodLabel });
  const chartImgIds = new Map<string, number>();
  for (const ch of charts) {
    const imgId = wb.addImage({
      base64: ch.base64Png,
      extension: 'png',
    });
    chartImgIds.set(ch.id, imgId);
  }

  // ===========================================================================
  // SHEET 1: P&L Summary (Colorful KPI Cards + Waterfall Statement + Embedded Charts)
  // ===========================================================================
  const wsSummary = wb.addWorksheet('P&L Summary', {
    properties: { tabColor: { argb: 'FF059669' } },
    views: [{ showGridLines: true }],
  });

  styleBannerRow(
    wsSummary,
    1,
    6,
    `${displayShop} — Monthly & Period Profit & Loss Executive Report`,
    `Period: ${periodLabel}  |  Generated: ${nowStr}  |  Delhivery Synced: ${pnl.delhiverySyncedCount}/${pnl.totalOrders} AWBs  |  COGS ${costAssumptions.cogsPercent}%  |  Pack ₹${costAssumptions.packagingCostPerOrder}`
  );

  // Row 3 spacer
  wsSummary.getRow(3).height = 8;

  // Rows 4-5: 6 Executive KPI Cards
  const kpiCards = [
    {
      label: 'DELIVERED REVENUE',
      value: pnl.realizedRevenue,
      fill: COLORS.emeraldSoft,
      text: COLORS.emeraldText,
      isCurrency: true,
    },
    {
      label: pnl.netRealizedProfit >= 0 ? 'NET REALIZED PROFIT' : 'NET REALIZED LOSS',
      value: pnl.netRealizedProfit,
      fill: pnl.netRealizedProfit >= 0 ? COLORS.emeraldFill : COLORS.roseFill,
      text: pnl.netRealizedProfit >= 0 ? COLORS.emeraldText : COLORS.roseText,
      isCurrency: true,
    },
    {
      label: 'PROJECTED NET (W/ TRANSIT)',
      value: pnl.projectedNetProfit,
      fill: COLORS.indigoSoft,
      text: COLORS.indigoText,
      isCurrency: true,
    },
    {
      label: 'TOTAL REALIZED COSTS',
      value: pnl.totalRealizedCosts,
      fill: COLORS.amberSoft,
      text: COLORS.amberText,
      isCurrency: true,
    },
    {
      label: 'RTO DIRECT LOSS',
      value: -pnl.totalRtoLoss,
      fill: COLORS.roseSoft,
      text: COLORS.roseText,
      isCurrency: true,
    },
    {
      label: 'WHATSAPP RTO SAVED',
      value: pnl.whatsappRtoSavings,
      fill: COLORS.cyanSoft,
      text: COLORS.cyanText,
      isCurrency: true,
    },
  ];

  wsSummary.getRow(4).height = 18;
  wsSummary.getRow(5).height = 26;
  kpiCards.forEach((card, i) => {
    const col = i + 1;
    const topCell = wsSummary.getCell(4, col);
    const valCell = wsSummary.getCell(5, col);

    topCell.value = card.label;
    topCell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLORS.slateMuted } };
    topCell.fill = solidFill(card.fill);
    topCell.alignment = { vertical: 'middle', horizontal: 'center' };
    topCell.border = {
      top: { style: 'medium', color: { argb: card.text } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    };

    valCell.value = round2(card.value);
    valCell.numFmt = INR_NUM_FMT;
    valCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: card.text } };
    valCell.fill = solidFill(card.fill);
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    valCell.border = {
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    };
  });

  wsSummary.getRow(6).height = 10;

  // Row 7: Section 1 Waterfall Header (Columns A-D)
  const waterfallHeaders = [
    '1. PROFIT & LOSS WATERFALL STATEMENT',
    `Amount (${pnl.currency})`,
    'Share of Delivered Rev',
    'Operational Notes',
  ];
  const r7 = wsSummary.getRow(7);
  r7.height = 24;
  waterfallHeaders.forEach((h, i) => {
    const cell = r7.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = solidFill(COLORS.navy);
    cell.alignment = { vertical: 'middle', horizontal: i === 1 ? 'right' : i === 2 ? 'center' : 'left' };
  });

  const sharePctStr = (val: number) =>
    pnl.realizedRevenue > 0 ? `${Math.round((val / pnl.realizedRevenue) * 100)}%` : '0%';

  const waterfallData: Array<{
    rowIdx: number;
    label: string;
    value: number | ExcelJS.CellFormulaValue;
    share: string;
    note: string;
    fill?: string;
    text?: string;
    bold?: boolean;
    doubleBottom?: boolean;
  }> = [
    {
      rowIdx: 8,
      label: 'Delivered Revenue (+)',
      value: round2(pnl.realizedRevenue),
      share: '100%',
      note: `${pnl.deliveredCount} Delivered orders`,
      fill: COLORS.emeraldSoft,
      text: COLORS.emeraldText,
      bold: true,
    },
    {
      rowIdx: 9,
      label: `Less: Product COGS (${costAssumptions.cogsPercent}%)`,
      value: round2(pnl.totalCogs),
      share: sharePctStr(pnl.totalCogs),
      note: 'Calculated on delivered order value',
      fill: COLORS.zebra,
      text: COLORS.amberText,
    },
    {
      rowIdx: 10,
      label: 'Less: Forward Shipping',
      value: round2(pnl.totalForwardShipping),
      share: sharePctStr(pnl.totalForwardShipping),
      note: 'Delivered + RTO forward freight (incl. GST)',
      text: COLORS.slateText,
    },
    {
      rowIdx: 11,
      label: 'Less: RTO Return Freight',
      value: round2(pnl.totalRtoShippingCost),
      share: sharePctStr(pnl.totalRtoShippingCost),
      note: `${pnl.rtoCount} RTO orders return leg`,
      fill: COLORS.zebra,
      text: COLORS.roseText,
    },
    {
      rowIdx: 12,
      label: 'Less: Packaging & Boxes',
      value: round2(pnl.totalPackagingCost),
      share: sharePctStr(pnl.totalPackagingCost),
      note: 'Delivered + RTO parcels',
      text: COLORS.slateText,
    },
    {
      rowIdx: 13,
      label: 'Less: COD & Gateway Fees',
      value: round2(pnl.totalPaymentFees),
      share: sharePctStr(pnl.totalPaymentFees),
      note: 'Delhivery COD fee + Prepaid PG %',
      fill: COLORS.zebra,
      text: COLORS.slateText,
    },
    {
      rowIdx: 14,
      label: 'Less: Meta Ads & Marketing Spend',
      value: round2(pnl.totalMarketingCost),
      share: sharePctStr(pnl.totalMarketingCost),
      note:
        pnl.dailyMetaAdsRate > 0
          ? `Meta Ads ${pnl.currency} ${pnl.dailyMetaAdsRate}/day × ${pnl.metaAdDaysCount}d = ${pnl.currency} ${pnl.totalDailyMetaAds}${periodAdSpend > 0 ? ` + Extra ${pnl.currency} ${periodAdSpend}` : ''}`
          : `Includes Monthly Ad Spend ${pnl.currency} ${periodAdSpend}`,
      text: COLORS.amberText,
    },
    {
      rowIdx: 15,
      label: 'Total Realized Costs (-)',
      value: { formula: 'SUM(B9:B14)', result: round2(pnl.totalRealizedCosts) },
      share: sharePctStr(pnl.totalRealizedCosts),
      note: 'All realized deductions',
      fill: COLORS.amberFill,
      text: COLORS.amberText,
      bold: true,
    },
    {
      rowIdx: 16,
      label: 'NET REALIZED PROFIT / LOSS',
      value: { formula: 'B8-B15', result: round2(pnl.netRealizedProfit) },
      share: `${pnl.netMarginPct}% Margin`,
      note: `${pnl.currency} ${pnl.avgProfitPerDelivered} avg per delivered order`,
      fill: pnl.netRealizedProfit >= 0 ? COLORS.emeraldFill : COLORS.roseFill,
      text: pnl.netRealizedProfit >= 0 ? COLORS.emeraldText : COLORS.roseText,
      bold: true,
      doubleBottom: true,
    },
  ];

  for (const item of waterfallData) {
    const r = wsSummary.getRow(item.rowIdx);
    r.height = item.bold ? 22 : 19;
    const vals = [item.label, item.value, item.share, item.note];
    vals.forEach((v, idx) => {
      const c = r.getCell(idx + 1);
      c.value = v;
      if (idx === 1) c.numFmt = INR_NUM_FMT;
      c.font = {
        name: 'Calibri',
        size: item.bold ? 10.5 : 10,
        bold: Boolean(item.bold),
        color: { argb: idx === 0 || idx === 1 ? item.text || COLORS.slateText : COLORS.slateMuted },
      };
      if (item.fill) c.fill = solidFill(item.fill);
      c.alignment = {
        vertical: 'middle',
        horizontal: idx === 1 ? 'right' : idx === 2 ? 'center' : 'left',
      };
      c.border = item.doubleBottom
        ? {
            top: { style: 'thin', color: { argb: COLORS.border } },
            bottom: { style: 'double', color: { argb: COLORS.navy } },
            left: { style: 'thin', color: { argb: COLORS.border } },
            right: { style: 'thin', color: { argb: COLORS.border } },
          }
        : THIN_BORDER;
    });
  }

  wsSummary.getRow(17).height = 8;

  const extraPnlRows: Array<{
    rowIdx: number;
    label: string;
    value: number | ExcelJS.CellFormulaValue;
    note: string;
    fill: string;
    text: string;
    bold?: boolean;
  }> = [
    {
      rowIdx: 18,
      label: 'In-Transit Expected Revenue',
      value: round2(pnl.inTransitExpectedRevenue),
      note: `${pnl.inTransitCount} active orders in transit / pickup`,
      fill: COLORS.indigoSoft,
      text: COLORS.indigoText,
    },
    {
      rowIdx: 19,
      label: 'Projected Transit Profit (If Delivered)',
      value: round2(pnl.projectedTransitProfit),
      note: 'Estimated profit from active in-transit orders',
      fill: COLORS.indigoSoft,
      text: COLORS.indigoText,
    },
    {
      rowIdx: 20,
      label: 'PROJECTED NET PROFIT (Realized + Transit)',
      value: { formula: 'B16+B19', result: round2(pnl.projectedNetProfit) },
      note: 'If all in-transit parcels deliver successfully',
      fill: COLORS.indigoFill,
      text: COLORS.indigoText,
      bold: true,
    },
    {
      rowIdx: 21,
      label: 'RTO Direct Loss (2-Way Freight + Pack)',
      value: round2(pnl.totalRtoLoss),
      note: `${pnl.rtoCount} RTO orders`,
      fill: COLORS.roseSoft,
      text: COLORS.roseText,
    },
    {
      rowIdx: 22,
      label: 'WhatsApp RTO Savings (Pre-Ship Cancelled)',
      value: round2(pnl.whatsappRtoSavings),
      note: `${pnl.cancelledCount} cancelled before dispatch`,
      fill: COLORS.cyanSoft,
      text: COLORS.cyanText,
    },
  ];

  for (const item of extraPnlRows) {
    const r = wsSummary.getRow(item.rowIdx);
    r.height = item.bold ? 22 : 19;
    [item.label, item.value, '', item.note].forEach((v, idx) => {
      const c = r.getCell(idx + 1);
      c.value = v;
      if (idx === 1) c.numFmt = INR_NUM_FMT;
      c.font = {
        name: 'Calibri',
        size: 10,
        bold: Boolean(item.bold || idx === 1),
        color: { argb: idx <= 1 ? item.text : COLORS.slateMuted },
      };
      c.fill = solidFill(item.fill);
      c.alignment = { vertical: 'middle', horizontal: idx === 1 ? 'right' : 'left' };
      c.border = THIN_BORDER;
    });
  }

  wsSummary.getRow(23).height = 10;

  // Section 2: Orders, WhatsApp & Courier Summary (Rows 24-32)
  const r24 = wsSummary.getRow(24);
  r24.height = 24;
  ['2. ORDERS, WHATSAPP & COURIER SUMMARY', 'Count', `Order Value (${pnl.currency})`, 'Share / Notes'].forEach(
    (h, idx) => {
      const c = r24.getCell(idx + 1);
      c.value = h;
      c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
      c.fill = solidFill(COLORS.slateDark);
      c.alignment = { vertical: 'middle', horizontal: idx === 1 || idx === 2 ? 'right' : 'left' };
    }
  );

  const opsRows = [
    ['Total Orders Aaye', daily.totals.totalOrders, round2(daily.totals.totalValue), '100%', COLORS.white, COLORS.slateText],
    ['WhatsApp Confirmed', daily.totals.confirmedOrders, round2(daily.totals.confirmedValue), `${daily.totals.confirmationRate}% Confirm Rate`, COLORS.emeraldSoft, COLORS.emeraldText],
    ['No WhatsApp Confirm (Pending)', daily.totals.notConfirmedOnWhatsApp, round2(daily.totals.notConfirmedValue), 'Follow-up needed', COLORS.amberSoft, COLORS.amberText],
    ['Cancelled on WhatsApp', daily.totals.cancelledOrders, round2(daily.totals.cancelledValue), 'Prevented wasted shipping', COLORS.roseSoft, COLORS.roseText],
    ['Tracking Added (Fulfilled)', daily.totals.trackingAddedTotal, null, `${daily.totals.trackingPendingPickup} awaiting pickup`, COLORS.cyanSoft, COLORS.cyanText],
    ['In Transit (Active Courier)', daily.totals.inTransitCount, null, 'Picked up / Out for delivery', COLORS.indigoSoft, COLORS.indigoText],
    ['Delivered Successfully', daily.totals.deliveredCount, null, 'Completed deliveries', COLORS.emeraldSoft, COLORS.emeraldText],
    ['RTO Return', daily.totals.rtoReturnCount, null, `${daily.totals.highRtoCount} High RTO flagged overall`, COLORS.roseSoft, COLORS.roseText],
  ] as const;

  opsRows.forEach((rowVals, i) => {
    const r = wsSummary.getRow(25 + i);
    r.height = 19;
    const [label, cnt, val, note, bg, fg] = rowVals;
    [label, cnt, val ?? '', note].forEach((v, idx) => {
      const c = r.getCell(idx + 1);
      c.value = v;
      if (idx === 2 && val !== null) c.numFmt = INR_NUM_FMT;
      c.fill = solidFill(bg);
      c.font = {
        name: 'Calibri',
        size: 10,
        bold: idx <= 1,
        color: { argb: idx <= 2 ? fg : COLORS.slateMuted },
      };
      c.alignment = { vertical: 'middle', horizontal: idx === 1 || idx === 2 ? 'right' : 'left' };
      c.border = THIN_BORDER;
    });
  });

  wsSummary.getRow(33).height = 10;

  // Section 3: Payment Settlement & Delay Monitor (Rows 34-39)
  const r34 = wsSummary.getRow(34);
  r34.height = 24;
  ['3. PAYMENT SETTLEMENT & DELAY MONITOR', 'Amount / Count', 'Cashflow / SLA Status', 'Details'].forEach(
    (h, idx) => {
      const c = r34.getCell(idx + 1);
      c.value = h;
      c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
      c.fill = solidFill('FF0E7490');
      c.alignment = { vertical: 'middle', horizontal: idx === 1 ? 'right' : 'left' };
    }
  );

  const settleRows = [
    ['Settled Cashflow (Prepaid + Settled COD)', round2(settleDelay.settledTotal), 'Settled', `${settleDelay.settledCount} orders (COD: ${settleDelay.codSettledCount}, Prepaid: ${settleDelay.prepaidSettledCount})`, COLORS.emeraldSoft, COLORS.emeraldText, true],
    ['COD Pending Bank Remittance', round2(settleDelay.pendingCodRemittanceTotal), 'Pending UTR', `${settleDelay.pendingCodRemittanceCount} delivered COD awaiting remittance`, COLORS.amberSoft, COLORS.amberText, true],
    ['COD In Transit (Expected)', round2(settleDelay.inTransitCodTotal), 'In Transit', `${settleDelay.inTransitCodCount} COD orders in transit`, COLORS.indigoSoft, COLORS.indigoText, true],
    ['Active Delayed Shipments (SLA Breach)', settleDelay.activeDelayedCount, 'Alert', `${settleDelay.pickupDelayedCount} pickup lag · ${settleDelay.transitDelayedCount} transit SLA · ${settleDelay.ndrAttemptCount} NDR`, COLORS.roseSoft, COLORS.roseText, false],
    ['On-Time Delivery Rate', `${settleDelay.onTimeDeliveryRate}%`, 'SLA KPI', `${settleDelay.deliveredOnTimeCount} on-time vs ${settleDelay.deliveredLateCount} late`, COLORS.cyanSoft, COLORS.cyanText, false],
  ] as const;

  settleRows.forEach((rowVals, i) => {
    const r = wsSummary.getRow(35 + i);
    r.height = 19;
    const [label, amtOrCnt, badge, details, bg, fg, isMoney] = rowVals;
    [label, amtOrCnt, badge, details].forEach((v, idx) => {
      const c = r.getCell(idx + 1);
      c.value = v;
      if (idx === 1 && isMoney) c.numFmt = INR_NUM_FMT;
      c.fill = solidFill(bg);
      c.font = {
        name: 'Calibri',
        size: 10,
        bold: idx <= 2,
        color: { argb: idx <= 2 ? fg : COLORS.slateMuted },
      };
      c.alignment = { vertical: 'middle', horizontal: idx === 1 ? 'right' : idx === 2 ? 'center' : 'left' };
      c.border = THIN_BORDER;
    });
  });

  wsSummary.columns = [
    { width: 42 },
    { width: 22 },
    { width: 24 },
    { width: 42 },
    { width: 22 },
    { width: 24 },
  ];

  // Embed Waterfall & Donut Charts right next to P&L Summary (Columns G-M)
  const waterfallImgId = chartImgIds.get('waterfall_margin');
  if (waterfallImgId !== undefined) {
    wsSummary.addImage(waterfallImgId, {
      tl: { col: 6.5, row: 6.2 },
      ext: { width: 580, height: 290 },
    });
  }
  const donutImgId = chartImgIds.get('cost_donut');
  if (donutImgId !== undefined) {
    wsSummary.addImage(donutImgId, {
      tl: { col: 6.5, row: 23.2 },
      ext: { width: 580, height: 336 },
    });
  }

  // ===========================================================================
  // SHEET 2: Order-wise P&L (Frozen Headers + Color-Coded Status + Live Formulas)
  // ===========================================================================
  const wsOrderPnl = wb.addWorksheet('Order-wise P&L', {
    properties: { tabColor: { argb: 'FF0891B2' } },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const orderPnlHeaders = [
    'Order #',
    'Date (IST)',
    'Customer',
    'Phone',
    'Payment Mode',
    'Outcome',
    'Settlement Status',
    'UTR / Ref',
    'AWB / Courier',
    'Billable Wt (g)',
    'Rate Source',
    'Order Value',
    'Realized Rev',
    'In-Transit Exp Rev',
    'COGS',
    'Packaging',
    'Forward Ship',
    'RTO Freight',
    'COD / PG Fee',
    'Ad Spend',
    'Total Cost (Formula)',
    'Net Profit / Loss (Formula)',
    'Delay Status',
    'Remarks / Note',
  ];

  styleBannerRow(
    wsOrderPnl,
    1,
    orderPnlHeaders.length,
    `${displayShop} — Order-wise Profit & Loss Audit (${periodLabel})`,
    'Edit COGS, Shipping, Packaging, or Ad Spend columns directly in Excel — Total Cost (Col U) & Net Profit (Col V) update automatically via formulas!'
  );

  const moneyColsOrder = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  styleHeaderRow(wsOrderPnl, 3, orderPnlHeaders, new Set([10, ...moneyColsOrder]), COLORS.navy);

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const settleById = new Map(settleDelay.rows.map((r) => [r.order.id, r]));

  pnl.orderRows.forEach((row, idx) => {
    const excelRow = 4 + idx;
    const raw = orderById.get(row.orderId);
    const sd = settleById.get(row.orderId);
    const sourceLabel =
      row.chargeSource === 'delhivery_wallet'
        ? 'Wallet CSV (Exact)'
        : row.chargeSource === 'delhivery_api'
          ? 'Delhivery Tariff'
          : row.chargeSource === 'estimated'
            ? 'Est. Fallback'
            : '—';

    const rowBg = idx % 2 === 1 ? COLORS.zebra : COLORS.white;
    const r = wsOrderPnl.getRow(excelRow);
    r.height = 20;

    const values: Array<string | number | ExcelJS.CellFormulaValue> = [
      row.orderNumber,
      row.dateLabel,
      row.customerName,
      raw?.customerPhone || '',
      row.paymentMethod,
      row.outcomeLabel,
      sd?.settlement.label || '',
      sd?.settlement.reference || '',
      raw?.trackingNumber
        ? [raw.trackingCompany || 'Delhivery', raw.trackingNumber].filter(Boolean).join(' · ')
        : '—',
      row.chargedWeightGrams || 0,
      sourceLabel,
      round2(row.orderValue),
      round2(row.realizedRevenue),
      round2(row.expectedRevenue),
      round2(row.cogsCost),
      round2(row.packagingCost),
      round2(row.forwardShippingCost),
      round2(row.rtoShippingCost),
      round2(row.paymentOrCodFee),
      round2(row.marketingCost),
      { formula: `SUM(O${excelRow}:T${excelRow})`, result: round2(row.totalCost) },
      {
        formula: `IF(OR(F${excelRow}="In Transit",F${excelRow}="Tracking Added"),N${excelRow}-U${excelRow},M${excelRow}-U${excelRow})`,
        result: round2(row.netProfit),
      },
      sd?.delay.label || '',
      raw?.orderNote || '',
    ];

    values.forEach((v, colZero) => {
      const col = colZero + 1;
      const c = r.getCell(col);
      c.value = v;
      c.fill = solidFill(rowBg);
      c.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slateText } };
      c.alignment = {
        vertical: 'middle',
        horizontal: col === 10 || moneyColsOrder.has(col) ? 'right' : 'left',
      };
      c.border = THIN_BORDER;

      if (moneyColsOrder.has(col)) c.numFmt = INR_NUM_FMT;

      if (col === 1) c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.navy } };

      // Outcome color pill
      if (col === 6) {
        if (row.outcome === 'delivered') {
          c.fill = solidFill(COLORS.emeraldFill);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
        } else if (row.outcome === 'rto_return') {
          c.fill = solidFill(COLORS.roseFill);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
        } else if (row.outcome === 'in_transit') {
          c.fill = solidFill(COLORS.indigoFill);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.indigoText } };
        } else {
          c.fill = solidFill(COLORS.slateBadgeFill);
          c.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slateBadgeText } };
        }
      }

      // Rate source badge
      if (col === 11) {
        if (row.chargeSource === 'delhivery_wallet') {
          c.fill = solidFill(COLORS.cyanFill);
          c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.cyanText } };
        } else if (row.chargeSource === 'delhivery_api') {
          c.fill = solidFill(COLORS.emeraldSoft);
          c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.emeraldText } };
        } else if (row.chargeSource === 'estimated') {
          c.fill = solidFill(COLORS.amberSoft);
          c.font = { name: 'Calibri', size: 9.5, color: { argb: COLORS.amberText } };
        }
      }

      // Net profit cell styling
      if (col === 22) {
        if (row.netProfit > 0) {
          c.fill = solidFill(row.outcome === 'in_transit' ? COLORS.indigoSoft : COLORS.emeraldSoft);
          c.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: row.outcome === 'in_transit' ? COLORS.indigoText : COLORS.emeraldText },
          };
        } else if (row.netProfit < 0) {
          c.fill = solidFill(COLORS.roseSoft);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
        }
      }
    });
  });

  if (pnl.orderRows.length > 0) {
    const firstDataRow = 4;
    const lastDataRow = 3 + pnl.orderRows.length;
    const totalRowIdx = lastDataRow + 1;
    const tr = wsOrderPnl.getRow(totalRowIdx);
    tr.height = 24;

    const sumCol = (colLetter: string, val: number): ExcelJS.CellFormulaValue => ({
      formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})`,
      result: round2(val),
    });

    const sumOrderField = (
      colLetter: string,
      selector: (row: (typeof pnl.orderRows)[number]) => number
    ): ExcelJS.CellFormulaValue =>
      sumCol(
        colLetter,
        pnl.orderRows.reduce((s, r) => s + selector(r), 0)
      );

    const footerNoteParts: string[] = [];
    if (pnl.inTransitCount > 0) {
      footerNoteParts.push(`Includes ${pnl.inTransitCount} In-Transit Est. rows`);
    }
    if (pnl.totalDailyMetaAds + periodAdSpend > 0) {
      footerNoteParts.push(
        `Meta Ads (${pnl.currency} ${pnl.totalDailyMetaAds})${periodAdSpend > 0 ? ` + Extra (${pnl.currency} ${periodAdSpend})` : ''} deducted in Sheet 1`
      );
    }

    const totalValues: Array<string | ExcelJS.CellFormulaValue> = [
      `TOTAL (${pnl.orderRows.length} Orders)`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      sumCol('L', pnl.grossOrderValue),
      sumCol('M', pnl.realizedRevenue),
      sumCol('N', pnl.inTransitExpectedRevenue),
      sumOrderField('O', (r) => r.cogsCost),
      sumOrderField('P', (r) => r.packagingCost),
      sumOrderField('Q', (r) => r.forwardShippingCost),
      sumOrderField('R', (r) => r.rtoShippingCost),
      sumOrderField('S', (r) => r.paymentOrCodFee),
      sumOrderField('T', (r) => r.marketingCost),
      sumOrderField('U', (r) => r.totalCost),
      sumOrderField('V', (r) => r.netProfit),
      '',
      footerNoteParts.join(' · '),
    ];

    totalValues.forEach((v, colZero) => {
      const col = colZero + 1;
      const c = tr.getCell(col);
      c.value = v;
      c.fill = solidFill(COLORS.navy);
      c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
      c.alignment = {
        vertical: 'middle',
        horizontal: moneyColsOrder.has(col) ? 'right' : 'left',
      };
      if (moneyColsOrder.has(col)) c.numFmt = INR_NUM_FMT;
    });

    wsOrderPnl.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: lastDataRow, column: orderPnlHeaders.length },
    };
  }

  wsOrderPnl.columns = [
    { width: 12 },
    { width: 13 },
    { width: 21 },
    { width: 15 },
    { width: 12 },
    { width: 16 },
    { width: 22 },
    { width: 16 },
    { width: 24 },
    { width: 13 },
    { width: 18 },
    { width: 13 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 13 },
    { width: 12 },
    { width: 13 },
    { width: 12 },
    { width: 17 },
    { width: 21 },
    { width: 19 },
    { width: 30 },
  ];

  // ===========================================================================
  // SHEET 3: Daily Breakdown (Styled Table + Totals Formulas + Daily Chart Below)
  // ===========================================================================
  const wsDaily = wb.addWorksheet('Daily Breakdown', {
    properties: { tabColor: { argb: 'FF4F46E5' } },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const dailyHeaders = [
    'Date (IST)',
    'Orders Aaye',
    'WA Confirmed',
    'No WA Confirm',
    'Cancelled',
    'Confirm %',
    'Tracking Added',
    'In Transit',
    'Delivered',
    'RTO Return',
    'High RTO',
    'Gross Order Value',
    'Delivered Rev',
    'In-Transit Exp Rev',
    'Realized Costs',
    'RTO Loss',
    'Net Realized Profit',
    'Projected Net Profit',
  ];

  styleBannerRow(
    wsDaily,
    1,
    dailyHeaders.length,
    `${displayShop} — Daily Operations & Profit Ledger (${periodLabel})`,
    'Day-by-day IST (+05:30) Orders, WhatsApp Confirmations, Courier Movement & Daily Profit/Loss'
  );

  const dailyMoneyCols = new Set([12, 13, 14, 15, 16, 17, 18]);
  const dailyNumCols = new Set([2, 3, 4, 5, 7, 8, 9, 10, 11]);
  styleHeaderRow(wsDaily, 3, dailyHeaders, new Set([...dailyNumCols, ...dailyMoneyCols]), 'FF312E81');

  const dailyPnlMap = new Map(pnl.dailyPnlRows.map((d) => [d.dateKey, d]));

  daily.dailyRows.forEach((d, idx) => {
    const excelRow = 4 + idx;
    const dp = dailyPnlMap.get(d.dateKey);
    const rowBg = idx % 2 === 1 ? COLORS.zebra : COLORS.white;
    const r = wsDaily.getRow(excelRow);
    r.height = 20;

    const netReal = dp?.netRealizedProfit ?? 0;
    const projNet = dp?.projectedNetProfit ?? 0;

    const rowVals = [
      d.dateLabel,
      d.totalOrders,
      d.confirmedOrders,
      d.notConfirmedOnWhatsApp,
      d.cancelledOrders,
      `${d.confirmationRate}%`,
      d.trackingAddedTotal,
      d.inTransitCount,
      d.deliveredCount,
      d.rtoReturnCount,
      d.highRtoCount,
      round2(d.totalValue),
      round2(dp?.realizedRevenue ?? 0),
      round2(dp?.expectedTransitRevenue ?? 0),
      round2(dp?.totalCosts ?? 0),
      round2(dp?.rtoLoss ?? 0),
      round2(netReal),
      round2(projNet),
    ];

    rowVals.forEach((v, colZero) => {
      const col = colZero + 1;
      const c = r.getCell(col);
      c.value = v;
      c.fill = solidFill(rowBg);
      c.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slateText } };
      c.alignment = {
        vertical: 'middle',
        horizontal: dailyMoneyCols.has(col) || dailyNumCols.has(col) ? 'right' : col === 6 ? 'center' : 'left',
      };
      c.border = THIN_BORDER;

      if (dailyMoneyCols.has(col)) c.numFmt = INR_NUM_FMT;
      if (col === 1) c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.navy } };
      if (col === 3) c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
      if (col === 4 && d.notConfirmedOnWhatsApp > 0) {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } };
      }
      if (col === 5 && d.cancelledOrders > 0) {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
      }
      if (col === 6) {
        c.fill = solidFill(d.confirmationRate >= 60 ? COLORS.emeraldSoft : COLORS.amberSoft);
        c.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: d.confirmationRate >= 60 ? COLORS.emeraldText : COLORS.amberText },
        };
      }
      if (col === 17) {
        c.fill = solidFill(netReal > 0 ? COLORS.emeraldSoft : netReal < 0 ? COLORS.roseSoft : rowBg);
        c.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: netReal > 0 ? COLORS.emeraldText : netReal < 0 ? COLORS.roseText : COLORS.slateMuted },
        };
      }
      if (col === 18) {
        c.fill = solidFill(projNet > 0 ? COLORS.indigoSoft : projNet < 0 ? COLORS.roseSoft : rowBg);
        c.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: projNet > 0 ? COLORS.indigoText : projNet < 0 ? COLORS.roseText : COLORS.slateMuted },
        };
      }
    });
  });

  const dailyTotalRowIdx = 4 + daily.dailyRows.length;
  if (daily.dailyRows.length > 0) {
    const firstR = 4;
    const lastR = dailyTotalRowIdx - 1;
    const tr = wsDaily.getRow(dailyTotalRowIdx);
    tr.height = 24;

    const sumCol = (colLetter: string, val: number): ExcelJS.CellFormulaValue => ({
      formula: `SUM(${colLetter}${firstR}:${colLetter}${lastR})`,
      result: round2(val),
    });

    const footerVals: Array<string | ExcelJS.CellFormulaValue> = [
      `TOTAL (${daily.dailyRows.length} Days)`,
      sumCol('B', daily.totals.totalOrders),
      sumCol('C', daily.totals.confirmedOrders),
      sumCol('D', daily.totals.notConfirmedOnWhatsApp),
      sumCol('E', daily.totals.cancelledOrders),
      `${daily.totals.confirmationRate}%`,
      sumCol('G', daily.totals.trackingAddedTotal),
      sumCol('H', daily.totals.inTransitCount),
      sumCol('I', daily.totals.deliveredCount),
      sumCol('J', daily.totals.rtoReturnCount),
      sumCol('K', daily.totals.highRtoCount),
      sumCol('L', daily.totals.totalValue),
      sumCol('M', pnl.realizedRevenue),
      sumCol('N', pnl.inTransitExpectedRevenue),
      sumCol('O', pnl.dailyPnlRows.reduce((s, r) => s + r.totalCosts, 0)),
      sumCol('P', pnl.totalRtoLoss),
      sumCol('Q', pnl.dailyPnlRows.reduce((s, r) => s + r.netRealizedProfit, 0)),
      sumCol('R', pnl.dailyPnlRows.reduce((s, r) => s + r.projectedNetProfit, 0)),
    ];

    footerVals.forEach((v, colZero) => {
      const col = colZero + 1;
      const c = tr.getCell(col);
      c.value = v;
      c.fill = solidFill('FF312E81');
      c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
      c.alignment = {
        vertical: 'middle',
        horizontal: dailyMoneyCols.has(col) || dailyNumCols.has(col) ? 'right' : col === 6 ? 'center' : 'left',
      };
      if (dailyMoneyCols.has(col)) c.numFmt = INR_NUM_FMT;
    });

    wsDaily.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: lastR, column: dailyHeaders.length },
    };
  }

  wsDaily.columns = [
    { width: 15 },
    { width: 13 },
    { width: 14 },
    { width: 14 },
    { width: 11 },
    { width: 11 },
    { width: 15 },
    { width: 11 },
    { width: 11 },
    { width: 12 },
    { width: 10 },
    { width: 17 },
    { width: 15 },
    { width: 18 },
    { width: 15 },
    { width: 13 },
    { width: 18 },
    { width: 19 },
  ];

  // Embed Daily P&L Chart & Daily WA Chart right below the table
  const chartAnchorRow = (daily.dailyRows.length > 0 ? dailyTotalRowIdx : 3) + 2;
  const dailyPnlImg = chartImgIds.get('daily_pnl');
  if (dailyPnlImg !== undefined) {
    wsDaily.addImage(dailyPnlImg, {
      tl: { col: 0, row: chartAnchorRow },
      ext: { width: 640, height: 305 },
    });
  }
  const dailyWaImg = chartImgIds.get('daily_wa_funnel');
  if (dailyWaImg !== undefined) {
    wsDaily.addImage(dailyWaImg, {
      tl: { col: 8, row: chartAnchorRow },
      ext: { width: 610, height: 305 },
    });
  }

  // ===========================================================================
  // SHEET 4: Order Register (Color-Coded WA, Dispatch, High RTO, Delay & Settlement)
  // ===========================================================================
  const wsRegister = wb.addWorksheet('Order Register', {
    properties: { tabColor: { argb: 'FFD97706' } },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const regHeaders = [
    'Order #',
    'Created At (IST)',
    'Customer',
    'Phone',
    'Email',
    'Items',
    'Payment',
    'Order Value',
    'WhatsApp Reply',
    'Dispatch Status',
    'High RTO?',
    'Tracking / AWB',
    'Tracking URL',
    'Delivery Delay',
    'Settlement Status',
    'Destination PIN',
    'Shopify Tags',
    'Remarks / Note',
  ];

  styleBannerRow(
    wsRegister,
    1,
    regHeaders.length,
    `${displayShop} — Full Order, Tracking, Settlement & Remarks Register (${periodLabel})`,
    'Complete line-by-line operational ledger with High-RTO warnings, SLA Delay flags & Bank Remittance statuses'
  );

  styleHeaderRow(wsRegister, 3, regHeaders, new Set([8]), 'FF92400E');

  orders.forEach((order, idx) => {
    const excelRow = 4 + idx;
    const dispatch = getDispatchStatusInfo(order);
    const sd = settleById.get(order.id);
    const hasTrack = hasOrderTrackingAdded(order);
    const isHighRto = hasHighRtoTag(order.shopifyTags);
    const parsedDate = new Date(order.createdAt);
    const dateTime = Number.isNaN(parsedDate.getTime())
      ? order.createdAt
      : parsedDate.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        });

    const waStatus =
      order.pollStatus === 'confirmed'
        ? 'Confirmed'
        : order.pollStatus === 'cancelled_by_user'
          ? 'Cancelled'
          : order.pollStatus === 'poll_sent'
            ? 'Poll Sent (No Reply)'
            : order.pollStatus === 'failed'
              ? 'Failed'
              : 'Queued';

    const rowBg = idx % 2 === 1 ? COLORS.zebra : COLORS.white;
    const r = wsRegister.getRow(excelRow);
    r.height = 20;

    const orderVal = Number.parseFloat(order.totalPrice || '0') || 0;
    const vals: Array<string | number> = [
      order.orderNumber,
      dateTime,
      order.customerName,
      order.customerPhone || '',
      order.customerEmail || '',
      order.lineItemsSummary || '',
      sd?.settlement.paymentMode || order.paymentMethod || '',
      round2(orderVal),
      waStatus,
      dispatch.label,
      isHighRto ? 'HIGH RTO' : 'No',
      hasTrack
        ? [order.trackingCompany, order.trackingNumber].filter(Boolean).join(' · ') || 'Fulfilled'
        : '—',
      order.trackingUrl || '',
      sd?.delay.label || '',
      sd?.settlement.label || '',
      order.destinationPincode || '',
      order.shopifyTags || '',
      order.orderNote || '',
    ];

    vals.forEach((v, colZero) => {
      const col = colZero + 1;
      const c = r.getCell(col);
      c.value = v;
      c.fill = solidFill(rowBg);
      c.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slateText } };
      c.alignment = { vertical: 'middle', horizontal: col === 8 ? 'right' : col === 11 ? 'center' : 'left' };
      c.border = THIN_BORDER;

      if (col === 1) c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.navy } };
      if (col === 8) c.numFmt = INR_NUM_FMT;

      if (col === 9) {
        if (order.pollStatus === 'confirmed') {
          c.fill = solidFill(COLORS.emeraldSoft);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
        } else if (order.pollStatus === 'cancelled_by_user' || order.pollStatus === 'failed') {
          c.fill = solidFill(COLORS.roseSoft);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
        } else {
          c.fill = solidFill(COLORS.amberSoft);
          c.font = { name: 'Calibri', size: 10, color: { argb: COLORS.amberText } };
        }
      }

      if (col === 10) {
        if (dispatch.code === 'delivered') {
          c.fill = solidFill(COLORS.emeraldFill);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
        } else if (dispatch.code === 'rto_return') {
          c.fill = solidFill(COLORS.roseFill);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
        } else if (dispatch.code === 'in_transit' || dispatch.code === 'tracking_added') {
          c.fill = solidFill(COLORS.indigoSoft);
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.indigoText } };
        }
      }

      if (col === 11 && isHighRto) {
        c.fill = solidFill(COLORS.roseFill);
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.roseText } };
      }

      if (col === 14 && sd?.delay.isActiveDelay) {
        c.fill = solidFill(COLORS.amberFill);
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } };
      }

      if (col === 15 && sd) {
        if (sd.settlement.status === 'settled') {
          c.fill = solidFill(COLORS.emeraldSoft);
          c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.emeraldText } };
        } else if (sd.settlement.status === 'pending_remittance') {
          c.fill = solidFill(COLORS.amberSoft);
          c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.amberText } };
        }
      }
    });
  });

  if (orders.length > 0) {
    wsRegister.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + orders.length, column: regHeaders.length },
    };
  }

  wsRegister.columns = [
    { width: 11 },
    { width: 20 },
    { width: 21 },
    { width: 15 },
    { width: 24 },
    { width: 34 },
    { width: 10 },
    { width: 13 },
    { width: 20 },
    { width: 16 },
    { width: 12 },
    { width: 24 },
    { width: 34 },
    { width: 19 },
    { width: 23 },
    { width: 15 },
    { width: 34 },
    { width: 28 },
  ];

  // ===========================================================================
  // SHEET 5: Visual Charts (Full-Width 2x2 Boardroom Analytics Gallery)
  // ===========================================================================
  const wsCharts = wb.addWorksheet('Visual Charts', {
    properties: { tabColor: { argb: 'FF7C3AED' } },
    views: [{ showGridLines: false }],
  });

  styleBannerRow(
    wsCharts,
    1,
    18,
    `${displayShop} — Visual Charts & Executive Analytics (${periodLabel})`,
    'High-resolution Profit & Loss, Cost Mix, Daily Performance & WhatsApp Confirmation Charts'
  );

  wsCharts.columns = Array.from({ length: 18 }, () => ({ width: 12 }));

  if (waterfallImgId !== undefined) {
    wsCharts.addImage(waterfallImgId, {
      tl: { col: 0.3, row: 3.3 },
      ext: { width: 640, height: 320 },
    });
  }
  if (donutImgId !== undefined) {
    wsCharts.addImage(donutImgId, {
      tl: { col: 9.5, row: 3.3 },
      ext: { width: 580, height: 320 },
    });
  }
  if (dailyPnlImg !== undefined) {
    wsCharts.addImage(dailyPnlImg, {
      tl: { col: 0.3, row: 21.5 },
      ext: { width: 640, height: 320 },
    });
  }
  if (dailyWaImg !== undefined) {
    wsCharts.addImage(dailyWaImg, {
      tl: { col: 9.5, row: 21.5 },
      ext: { width: 580, height: 320 },
    });
  }

  const filename = `${safeShopSlug || 'OrderPulse'}-Excel-Report-${safePeriodSlug}.xlsx`;
  return { workbook: wb, filename };
}

/**
 * Generates the colorful ExcelJS workbook with embedded charts and downloads it in the browser.
 */
export async function exportMonthlyReportToExcel(
  params: MonthlyExcelExportParams
): Promise<string> {
  const { workbook, filename } = buildMonthlyExcelWorkbook(params);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}
