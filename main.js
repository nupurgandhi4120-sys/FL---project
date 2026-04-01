/* ═══════════════════════════════════════════════════════
   SmartStockInsight — main.js
   Handles: API fetch · DOM update · Chart.js · Controls
   ═══════════════════════════════════════════════════════ */

"use strict";

// ── DOM References ────────────────────────────────────────
const stockSelect    = document.getElementById("stockSelect");
const refreshBtn     = document.getElementById("refreshBtn");
const loadingOverlay = document.getElementById("loadingOverlay");

const companyEmoji   = document.getElementById("companyEmoji");
const companyName    = document.getElementById("companyName");
const companySector  = document.getElementById("companySector");
const companyDesc    = document.getElementById("companyDesc");
const currentPrice   = document.getElementById("currentPrice");
const updatedAt      = document.getElementById("updatedAt");

const trendBadge     = document.getElementById("trendBadge");
const trendChange    = document.getElementById("trendChange");
const trendHistory   = document.getElementById("trendHistory");

// ── Chart Setup ───────────────────────────────────────────
const ctx = document.getElementById("priceChart").getContext("2d");

const chartGradient  = ctx.createLinearGradient(0, 0, 0, 260);
chartGradient.addColorStop(0, "rgba(59,130,246,0.35)");
chartGradient.addColorStop(1, "rgba(59,130,246,0)");

let priceChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Closing Price (₹)",
      data: [],
      borderColor: "#3b82f6",
      backgroundColor: chartGradient,
      borderWidth: 2.5,
      pointBackgroundColor: "#fff",
      pointBorderColor: "#3b82f6",
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.4,
      fill: true,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a2133",
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        borderColor: "#1f2d45",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: ctx => ` ₹ ${ctx.parsed.y.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid:  { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid:  { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: v => "₹" + v.toLocaleString("en-IN"),
        },
      },
    },
  },
});

// ── Main Data Fetcher ─────────────────────────────────────
async function loadStock(ticker) {
  showLoading(true);

  try {
    const res  = await fetch(`/api/stock/${ticker}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    renderStock(data);
  } catch (err) {
    console.error("Failed to load stock:", err);
    showError("Could not fetch data. Please check if the Flask server is running.");
  } finally {
    showLoading(false);
  }
}

// ── Render DOM ────────────────────────────────────────────
function renderStock(data) {
  // Company Info
  animateChange(companyEmoji, data.emoji);
  animateChange(companyName,  data.name);
  animateChange(companySector, data.sector);
  animateChange(companyDesc,  data.description);
  animateChange(updatedAt,    "🕐 " + data.updated_at);

  // Price (animate counter)
  animatePrice(data.current_price);

  // Trend Badge
  const t = data.trend;
  trendBadge.textContent = t.label;
  trendBadge.className   = "trend-badge " + t.type;
  trendChange.textContent = t.change;
  trendChange.className   = "trend-change " + t.type;

  // Trend History Table
  renderTrendHistory(data.prices);

  // Chart
  updateChart(data.prices, data.name, t.type);
}

function renderTrendHistory(prices) {
  trendHistory.innerHTML = "";
  prices.forEach((p, i) => {
    const prev      = i > 0 ? prices[i - 1].price : p.price;
    const diff      = p.price - prev;
    const diffPct   = i > 0 ? ((diff / prev) * 100).toFixed(2) : "—";
    const changeStr = i === 0 ? "—" : (diff >= 0 ? `+${diffPct}%` : `${diffPct}%`);
    const cls       = i === 0 ? "neu" : diff > 0 ? "pos" : diff < 0 ? "neg" : "neu";

    const row = document.createElement("div");
    row.className = "trend-row";
    row.innerHTML = `
      <span class="date">${p.date}</span>
      <span class="price">₹ ${p.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      <span class="change ${cls}">${changeStr}</span>
    `;
    trendHistory.appendChild(row);
  });
}

function updateChart(prices, companyName, trendType) {
  // Pick colour based on trend
  const borderColor = trendType === "up"   ? "#10b981"
                    : trendType === "down" ? "#ef4444"
                    :                        "#3b82f6";

  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  const baseRgb = trendType === "up"   ? "16,185,129"
                : trendType === "down" ? "239,68,68"
                :                        "59,130,246";
  grad.addColorStop(0, `rgba(${baseRgb},0.35)`);
  grad.addColorStop(1, `rgba(${baseRgb},0)`);

  priceChart.data.labels        = prices.map(p => p.date);
  priceChart.data.datasets[0].data            = prices.map(p => p.price);
  priceChart.data.datasets[0].borderColor     = borderColor;
  priceChart.data.datasets[0].backgroundColor = grad;
  priceChart.data.datasets[0].label           = `${companyName} (₹)`;
  priceChart.update("active");
}

// ── Helpers ───────────────────────────────────────────────
function animateChange(el, newText) {
  el.style.opacity = "0";
  el.style.transform = "translateY(6px)";
  setTimeout(() => {
    el.textContent = newText;
    el.style.transition = "opacity .35s ease, transform .35s ease";
    el.style.opacity  = "1";
    el.style.transform = "translateY(0)";
  }, 80);
}

function animatePrice(target) {
  const duration = 800;
  const start    = performance.now();
  const from     = parseFloat(currentPrice.textContent.replace(/[^0-9.]/g, "")) || target;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const val      = from + (target - from) * eased;
    currentPrice.textContent = "₹ " + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showLoading(visible) {
  loadingOverlay.classList.toggle("hidden", !visible);
}

function showError(msg) {
  companyName.textContent = "Error";
  companyDesc.textContent = msg;
  currentPrice.textContent = "₹ —";
  trendBadge.textContent  = "No Data";
  trendBadge.className    = "trend-badge";
}

// ── Event Listeners ───────────────────────────────────────
stockSelect.addEventListener("change", () => {
  loadStock(stockSelect.value);
});

refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("spinning");
  setTimeout(() => refreshBtn.classList.remove("spinning"), 700);
  loadStock(stockSelect.value);
});

// ── Initial Load ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadStock(stockSelect.value);
});
