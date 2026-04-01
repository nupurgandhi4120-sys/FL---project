from flask import Flask, render_template, jsonify
import random
from datetime import datetime, timedelta

app = Flask(__name__)

# ─── Company metadata ────────────────────────────────────────────────────────
COMPANY_INFO = {
    "RELIANCE.NS": {
        "name": "Reliance Industries Ltd.",
        "sector": "Energy · Telecom · Retail",
        "description": (
            "Reliance Industries is India's largest conglomerate with diversified "
            "interests in petrochemicals, refining, oil & gas, retail (JioMart), "
            "and digital services (Jio). Headquartered in Mumbai, it is one of the "
            "most valuable companies on the NSE."
        ),
        "base_price": 2900,
        "emoji": "🛢️",
    },
    "TCS.NS": {
        "name": "Tata Consultancy Services Ltd.",
        "sector": "Information Technology",
        "description": (
            "TCS is India's largest IT services company and a global leader in "
            "consulting, technology services, and digital transformation. "
            "Headquartered in Mumbai, it operates in 55+ countries and serves "
            "top Fortune 500 clients worldwide."
        ),
        "base_price": 3800,
        "emoji": "💻",
    },
    "INFY.NS": {
        "name": "Infosys Ltd.",
        "sector": "Information Technology",
        "description": (
            "Infosys is a global leader in next-generation digital services and "
            "consulting. Headquartered in Bengaluru, it enables clients across "
            "46 countries to navigate their digital transformation with AI-driven "
            "solutions and cloud-native services."
        ),
        "base_price": 1700,
        "emoji": "🌐",
    },
}


def generate_mock_prices(base_price: float, days: int = 5) -> list[dict]:
    """Generate realistic simulated stock prices for the last N days."""
    prices = []
    price = base_price
    for i in range(days - 1, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%d %b")
        change_pct = random.uniform(-0.025, 0.025)          # ±2.5%
        price = round(price * (1 + change_pct), 2)
        prices.append({"date": date, "price": price})
    return prices


def get_trend(prices: list[dict]) -> dict:
    """Determine trend based on first vs last price in the list."""
    first = prices[0]["price"]
    last = prices[-1]["price"]
    diff_pct = ((last - first) / first) * 100

    if diff_pct > 0.5:
        return {"label": "Upward Trend 📈", "type": "up", "change": f"+{diff_pct:.2f}%"}
    elif diff_pct < -0.5:
        return {"label": "Downward Trend 📉", "type": "down", "change": f"{diff_pct:.2f}%"}
    else:
        return {"label": "Stable Trend ➖", "type": "stable", "change": f"{diff_pct:.2f}%"}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/stock/<ticker>")
def stock_data(ticker: str):
    ticker = ticker.upper()
    if ticker not in COMPANY_INFO:
        return jsonify({"error": "Unknown ticker"}), 404

    info = COMPANY_INFO[ticker]

    # ── Try live data first, fall back to simulation ──────────────────────────
    prices = None
    try:
        import yfinance as yf
        hist = yf.Ticker(ticker).history(period="5d")
        if not hist.empty and len(hist) >= 2:
            prices = [
                {"date": idx.strftime("%d %b"), "price": round(row["Close"], 2)}
                for idx, row in hist.iterrows()
            ]
    except Exception:
        pass

    if not prices or len(prices) < 2:
        prices = generate_mock_prices(info["base_price"])

    trend = get_trend(prices)
    current_price = prices[-1]["price"]

    return jsonify({
        "ticker": ticker,
        "name": info["name"],
        "sector": info["sector"],
        "description": info["description"],
        "emoji": info["emoji"],
        "current_price": current_price,
        "prices": prices,
        "trend": trend,
        "updated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
    })


if __name__ == "__main__":
    app.run(debug=True)
