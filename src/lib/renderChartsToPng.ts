import type {
  DailyPnlRow,
  DailyReportSummary,
  ProfitLossReportSummary,
} from './orderRules';

export interface RenderedChartImage {
  id: 'waterfall_margin' | 'cost_donut' | 'daily_pnl' | 'daily_wa_funnel';
  title: string;
  base64Png: string;
  width: number;
  height: number;
}

function formatCompactInr(val: number, currency = 'INR'): string {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  const abs = Math.abs(Math.round(val));
  const prefix = val < 0 ? '-' : '';
  if (abs >= 100000) {
    return `${prefix}${sym}${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${prefix}${sym}${abs.toLocaleString('en-IN')}`;
  }
  return `${prefix}${sym}${abs}`;
}

function createHiDpiCanvas(
  logicalW: number,
  logicalH: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCardFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  subtitle: string
) {
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 0, 0, w, h, 10);
  ctx.fill();

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 1, 1, w - 2, h - 2, 10);
  ctx.stroke();

  // Top accent strip
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, 1, 1, w - 2, 46, 8);
  ctx.fill();
  ctx.fillRect(1, 36, w - 2, 11);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 14px Inter, Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 18, 23);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(subtitle, 18, 39);
}

/**
 * Chart 1: Revenue-to-Net-Profit Waterfall Bar Chart (Light Boardroom Theme for Excel/PDF)
 */
function renderWaterfallChart(
  pnl: ProfitLossReportSummary,
  periodLabel: string
): RenderedChartImage | null {
  const w = 720;
  const h = 360;
  const setup = createHiDpiCanvas(w, h);
  if (!setup) return null;
  const { canvas, ctx } = setup;

  drawCardFrame(
    ctx,
    w,
    h,
    `Revenue to Net Profit Breakdown (${periodLabel})`,
    `${pnl.deliveredCount} Delivered · ${pnl.inTransitCount} In Transit · ${pnl.rtoCount} RTO · ${pnl.cancelledCount} Cancelled`
  );

  const items = [
    { label: 'Delivered Rev', value: pnl.realizedRevenue, color: '#059669' },
    { label: 'COGS', value: pnl.totalCogs, color: '#D97706' },
    { label: 'Fwd Ship', value: pnl.totalForwardShipping, color: '#0284C7' },
    { label: 'RTO Freight', value: pnl.totalRtoShippingCost, color: '#E11D48' },
    { label: 'Packaging', value: pnl.totalPackagingCost, color: '#6366F1' },
    { label: 'COD/PG Fee', value: pnl.totalPaymentFees, color: '#0891B2' },
    { label: 'Ad Spend', value: pnl.totalMarketingCost, color: '#EA580C' },
    {
      label: pnl.netRealizedProfit >= 0 ? 'Net Profit' : 'Net Loss',
      value: Math.abs(pnl.netRealizedProfit),
      rawValue: pnl.netRealizedProfit,
      color: pnl.netRealizedProfit >= 0 ? '#10B981' : '#DC2626',
    },
  ];

  const chartLeft = 56;
  const chartRight = w - 24;
  const chartTop = 76;
  const chartBottom = 296;
  const plotW = chartRight - chartLeft;
  const plotH = chartBottom - chartTop;

  const maxVal = Math.max(
    100,
    ...items.map((it) => Math.abs(it.value))
  );

  // Horizontal grid lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = chartBottom - ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.fillText(formatCompactInr(maxVal * ratio, pnl.currency), chartLeft - 6, y + 3);
  }

  const slotW = plotW / items.length;
  const barW = Math.min(48, slotW * 0.56);

  items.forEach((item, idx) => {
    const cx = chartLeft + idx * slotW + slotW / 2;
    const barH = item.value > 0 ? Math.max(5, (item.value / maxVal) * plotH) : 2;
    const barY = chartBottom - barH;

    ctx.fillStyle = item.color;
    drawRoundedRect(ctx, cx - barW / 2, barY, barW, barH, 5);
    ctx.fill();

    const displayVal = 'rawValue' in item && item.rawValue !== undefined ? item.rawValue : item.value;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10.5px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatCompactInr(displayVal, pnl.currency), cx, barY - 6);

    ctx.fillStyle = '#334155';
    ctx.font = '10.5px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(item.label, cx, chartBottom + 16);
  });

  // Footer insights strip
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(14, 322, w - 28, 26);
  ctx.fillStyle = '#334155';
  ctx.font = '11px Inter, Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Net Margin: ${pnl.netMarginPct}%   |   In-Transit Projected Net: ${formatCompactInr(pnl.projectedNetProfit, pnl.currency)}   |   WA RTO Saved: ${formatCompactInr(pnl.whatsappRtoSavings, pnl.currency)}`,
    24,
    339
  );

  return {
    id: 'waterfall_margin',
    title: 'Revenue to Net Profit Waterfall',
    base64Png: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

/**
 * Chart 2: Cost Structure & Margin Donut Chart
 */
function renderCostDonutChart(
  pnl: ProfitLossReportSummary,
  periodLabel: string
): RenderedChartImage | null {
  const w = 620;
  const h = 360;
  const setup = createHiDpiCanvas(w, h);
  if (!setup) return null;
  const { canvas, ctx } = setup;

  drawCardFrame(
    ctx,
    w,
    h,
    `Cost & Margin Mix (${periodLabel})`,
    'Share of Delivered Revenue & Costs'
  );

  const slices = [
    { label: 'Product COGS', value: pnl.totalCogs, color: '#F59E0B' },
    { label: 'Forward Shipping', value: pnl.totalForwardShipping, color: '#0284C7' },
    { label: 'RTO Return Freight', value: pnl.totalRtoShippingCost, color: '#E11D48' },
    { label: 'Packaging & Boxes', value: pnl.totalPackagingCost, color: '#6366F1' },
    { label: 'COD / PG Fees', value: pnl.totalPaymentFees, color: '#0891B2' },
    { label: 'Marketing / Ads', value: pnl.totalMarketingCost, color: '#EA580C' },
    {
      label: 'Net Profit Retained',
      value: Math.max(0, pnl.netRealizedProfit),
      color: '#10B981',
    },
  ].filter((s) => s.value > 0);

  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = 170;
  const cy = 205;
  const outerR = 104;
  const innerR = 58;

  if (total <= 0) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No Delivered Data', cx, cy + 4);
  } else {
    let startAngle = -Math.PI / 2;
    for (const s of slices) {
      const sliceAngle = (s.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += sliceAngle;
    }

    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NET MARGIN', cx, cy - 6);

    ctx.fillStyle = pnl.netRealizedProfit >= 0 ? '#059669' : '#DC2626';
    ctx.font = 'bold 20px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(`${pnl.netMarginPct}%`, cx, cy + 16);
  }

  // Right Legend Table
  const legendX = 320;
  let legendY = 92;
  const displayRows =
    slices.length > 0
      ? slices
      : [
          { label: 'Delivered Revenue', value: pnl.realizedRevenue, color: '#10B981' },
          { label: 'In-Transit Expected', value: pnl.inTransitExpectedRevenue, color: '#6366F1' },
        ];

  displayRows.forEach((s) => {
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
    ctx.fillStyle = s.color;
    drawRoundedRect(ctx, legendX, legendY - 10, 12, 12, 3);
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.font = '600 12px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, legendX + 20, legendY);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${formatCompactInr(s.value, pnl.currency)} (${pct}%)`,
      w - 26,
      legendY
    );

    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 10);
    ctx.lineTo(w - 26, legendY + 10);
    ctx.stroke();

    legendY += 34;
  });

  return {
    id: 'cost_donut',
    title: 'Cost & Margin Breakdown Donut',
    base64Png: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

/**
 * Chart 3: Daily Revenue vs Costs & Net Profit Combo Chart
 */
function renderDailyPnlChart(
  dailyPnlRows: DailyPnlRow[],
  currency: string,
  periodLabel: string
): RenderedChartImage | null {
  const w = 760;
  const h = 360;
  const setup = createHiDpiCanvas(w, h);
  if (!setup) return null;
  const { canvas, ctx } = setup;

  const days = [...dailyPnlRows].reverse().slice(-14);
  drawCardFrame(
    ctx,
    w,
    h,
    `Daily Revenue, Costs & Projected Profit (${periodLabel})`,
    `Showing up to last ${days.length || 0} active days in chronological order`
  );

  // Legend
  const legendItems = [
    { label: 'Delivered Rev', color: '#10B981' },
    { label: 'In-Transit Exp', color: '#6366F1' },
    { label: 'Total Costs', color: '#F43F5E' },
  ];
  let lx = w - 300;
  legendItems.forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, 60, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.font = '11px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(l.label, lx + 14, 69);
    lx += 96;
  });

  const chartLeft = 58;
  const chartRight = w - 24;
  const chartTop = 88;
  const chartBottom = 296;
  const plotW = chartRight - chartLeft;
  const plotH = chartBottom - chartTop;

  if (days.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '13px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No daily rows available in selected period', w / 2, 200);
    return {
      id: 'daily_pnl',
      title: 'Daily Revenue vs Costs Chart',
      base64Png: canvas.toDataURL('image/png'),
      width: w,
      height: h,
    };
  }

  const maxVal = Math.max(
    100,
    ...days.flatMap((d) => [d.realizedRevenue, d.expectedTransitRevenue, d.totalCosts])
  );

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = chartBottom - ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.fillText(formatCompactInr(maxVal * ratio, currency), chartLeft - 6, y + 3);
  }

  const slotW = plotW / days.length;
  const barW = Math.max(6, Math.min(16, (slotW - 12) / 3));

  days.forEach((d, idx) => {
    const cx = chartLeft + idx * slotW + slotW / 2;
    const revH = d.realizedRevenue > 0 ? Math.max(3, (d.realizedRevenue / maxVal) * plotH) : 0;
    const trH =
      d.expectedTransitRevenue > 0
        ? Math.max(3, (d.expectedTransitRevenue / maxVal) * plotH)
        : 0;
    const costH = d.totalCosts > 0 ? Math.max(3, (d.totalCosts / maxVal) * plotH) : 0;

    if (revH > 0) {
      ctx.fillStyle = '#10B981';
      drawRoundedRect(ctx, cx - barW * 1.6, chartBottom - revH, barW, revH, 2);
      ctx.fill();
    }
    if (trH > 0) {
      ctx.fillStyle = '#6366F1';
      drawRoundedRect(ctx, cx - barW * 0.5, chartBottom - trH, barW, trH, 2);
      ctx.fill();
    }
    if (costH > 0) {
      ctx.fillStyle = '#F43F5E';
      drawRoundedRect(ctx, cx + barW * 0.6, chartBottom - costH, barW, costH, 2);
      ctx.fill();
    }

    const netVal =
      d.realizedRevenue > 0 || d.rtoLoss > 0 ? d.netRealizedProfit : d.projectedNetProfit;
    const topBarY = Math.min(
      revH > 0 ? chartBottom - revH : chartBottom,
      trH > 0 ? chartBottom - trH : chartBottom,
      costH > 0 ? chartBottom - costH : chartBottom
    );
    ctx.fillStyle = netVal >= 0 ? '#047857' : '#BE123C';
    ctx.font = 'bold 9.5px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatCompactInr(netVal, currency), cx, Math.max(chartTop - 4, topBarY - 6));

    ctx.fillStyle = '#334155';
    ctx.font = '10px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(d.dateLabel.replace(/ \d{4}$/, ''), cx, chartBottom + 16);
    ctx.fillStyle = '#64748B';
    ctx.font = '9px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(`${d.totalOrders} ord`, cx, chartBottom + 29);
  });

  return {
    id: 'daily_pnl',
    title: 'Daily Revenue vs Costs Chart',
    base64Png: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

/**
 * Chart 4: Daily Orders & WhatsApp Confirmation Stacked Chart
 */
function renderDailyWaFunnelChart(
  daily: DailyReportSummary,
  periodLabel: string
): RenderedChartImage | null {
  const w = 720;
  const h = 360;
  const setup = createHiDpiCanvas(w, h);
  if (!setup) return null;
  const { canvas, ctx } = setup;

  const days = [...daily.dailyRows].reverse().slice(-14);
  drawCardFrame(
    ctx,
    w,
    h,
    `Daily Orders & WhatsApp Confirmation Trend (${periodLabel})`,
    `Overall Confirm Rate: ${daily.totals.confirmationRate}% (${daily.totals.confirmedOrders}/${daily.totals.totalOrders} orders)`
  );

  const legendItems = [
    { label: 'Confirmed', color: '#10B981' },
    { label: 'Pending WA', color: '#F59E0B' },
    { label: 'Cancelled', color: '#F43F5E' },
  ];
  let lx = w - 285;
  legendItems.forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, 60, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.font = '11px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(l.label, lx + 14, 69);
    lx += 90;
  });

  const chartLeft = 44;
  const chartRight = w - 24;
  const chartTop = 88;
  const chartBottom = 296;
  const plotW = chartRight - chartLeft;
  const plotH = chartBottom - chartTop;

  if (days.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '13px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No daily order records in selected range', w / 2, 200);
    return {
      id: 'daily_wa_funnel',
      title: 'Daily Orders & WhatsApp Confirmations',
      base64Png: canvas.toDataURL('image/png'),
      width: w,
      height: h,
    };
  }

  const maxOrders = Math.max(4, ...days.map((d) => d.totalOrders));

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = chartBottom - ratio * plotH;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(maxOrders * ratio)), chartLeft - 6, y + 3);
  }

  const slotW = plotW / days.length;
  const barW = Math.min(34, slotW * 0.56);

  days.forEach((d, idx) => {
    const cx = chartLeft + idx * slotW + slotW / 2;
    let curY = chartBottom;

    const segments = [
      { count: d.confirmedOrders, color: '#10B981' },
      { count: d.notConfirmedOnWhatsApp, color: '#F59E0B' },
      { count: d.cancelledOrders, color: '#F43F5E' },
    ];

    for (const seg of segments) {
      if (seg.count <= 0) continue;
      const segH = Math.max(3, (seg.count / maxOrders) * plotH);
      ctx.fillStyle = seg.color;
      ctx.fillRect(cx - barW / 2, curY - segH, barW, segH);
      curY -= segH;
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px Inter, Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${d.totalOrders} (${d.confirmationRate}%)`, cx, Math.max(chartTop - 4, curY - 6));

    ctx.fillStyle = '#334155';
    ctx.font = '10px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(d.dateLabel.replace(/ \d{4}$/, ''), cx, chartBottom + 16);
  });

  return {
    id: 'daily_wa_funnel',
    title: 'Daily Orders & WhatsApp Confirmations',
    base64Png: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

/**
 * Renders 4 crisp light-theme charts as base64 PNGs for Excel embedding.
 * Gracefully returns [] when executed in headless Node tests (no document/canvas).
 */
export function renderExcelReportCharts(params: {
  pnl: ProfitLossReportSummary;
  daily: DailyReportSummary;
  periodLabel: string;
}): RenderedChartImage[] {
  if (typeof document === 'undefined') return [];
  const candidates = [
    renderWaterfallChart(params.pnl, params.periodLabel),
    renderCostDonutChart(params.pnl, params.periodLabel),
    renderDailyPnlChart(params.pnl.dailyPnlRows, params.pnl.currency, params.periodLabel),
    renderDailyWaFunnelChart(params.daily, params.periodLabel),
  ];
  return candidates.filter((c): c is RenderedChartImage => c !== null);
}
