import { useState, useEffect } from "react";

const PRODUCTS = {
  goat: { name: "Goat Meat", unit: "kg", sellPrice: 750, futurePrice: 800, type: "slaughter" },
  mutton: { name: "Mutton", unit: "kg", sellPrice: 750, futurePrice: 800, type: "slaughter" },
  beef: { name: "Beef", unit: "kg", sellPrice: 800, costPrice: 650, type: "resale" },
  chicken_small: { name: "Chicken (Small)", unit: "bird", sellPrice: 1000, costPrice: 500, type: "chicken" },
  chicken_medium: { name: "Chicken (Medium)", unit: "bird", sellPrice: 1500, costPrice: 800, type: "chicken" },
  chicken_large: { name: "Chicken (Large)", unit: "bird", sellPrice: 2000, costPrice: 1300, type: "chicken" },
};

const DELIVERY_CYCLES = [
  { id: "mar5", label: "5th March 2026" },
  { id: "mar12", label: "12th March 2026" },
  { id: "mar19", label: "19th March 2026" },
  { id: "apr2", label: "2nd April 2026" },
];

const initialAnimalEntries = () => ({
  goat: [],
  mutton: [],
  beef: { kgOrdered: 0, kgDelivered: 0 },
  chicken_small: { count: 0 },
  chicken_medium: { count: 0 },
  chicken_large: { count: 0 },
});

export default function EnkanaMarginTracker() {
  const [selectedCycle, setSelectedCycle] = useState("mar5");
  const [cycles, setCycles] = useState(() => {
    const obj = {};
    DELIVERY_CYCLES.forEach(c => { obj[c.id] = { animals: initialAnimalEntries(), orders: {} }; });
    // Pre-populate mar5 with the existing order
    obj.mar5.orders = {
      mutton: 5,
      chicken_large: 5,
    };
    return obj;
  });
  const [activeTab, setActiveTab] = useState("requisition");
  const [sellPriceOverride, setSellPriceOverride] = useState({});

  const cycle = cycles[selectedCycle];

  const updateCycle = (updater) => {
    setCycles(prev => ({ ...prev, [selectedCycle]: updater(prev[selectedCycle]) }));
  };

  // Animal entries for slaughter products
  const addAnimal = (product) => {
    updateCycle(c => ({
      ...c,
      animals: {
        ...c.animals,
        [product]: [...(c.animals[product] || []), { cost: "", yieldKg: "", id: Date.now() }]
      }
    }));
  };

  const updateAnimal = (product, id, field, value) => {
    updateCycle(c => ({
      ...c,
      animals: {
        ...c.animals,
        [product]: c.animals[product].map(a => a.id === id ? { ...a, [field]: value } : a)
      }
    }));
  };

  const removeAnimal = (product, id) => {
    updateCycle(c => ({
      ...c,
      animals: {
        ...c.animals,
        [product]: c.animals[product].filter(a => a.id !== id)
      }
    }));
  };

  const updateResale = (product, field, value) => {
    updateCycle(c => ({
      ...c,
      animals: { ...c.animals, [product]: { ...c.animals[product], [field]: value } }
    }));
  };

  const updateOrder = (product, value) => {
    updateCycle(c => ({
      ...c,
      orders: { ...c.orders, [product]: parseFloat(value) || 0 }
    }));
  };

  // Calculations
  const calcSlaughter = (product) => {
    const animals = cycle.animals[product] || [];
    const totalCost = animals.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
    const totalYield = animals.reduce((s, a) => s + (parseFloat(a.yieldKg) || 0), 0);
    const costPerKg = totalYield > 0 ? totalCost / totalYield : 0;
    const ordered = cycle.orders[product] || 0;
    const sp = sellPriceOverride[product] !== undefined ? parseFloat(sellPriceOverride[product]) : PRODUCTS[product].sellPrice;
    const revenue = ordered * sp;
    const cost = ordered * costPerKg;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { totalCost, totalYield, costPerKg, revenue, cost, margin, marginPct, ordered, animals: animals.length, sp };
  };

  const calcResale = (product) => {
    const data = cycle.animals[product] || {};
    const kgDelivered = parseFloat(data.kgDelivered) || 0;
    const costPrice = PRODUCTS[product].costPrice;
    const sp = sellPriceOverride[product] !== undefined ? parseFloat(sellPriceOverride[product]) : PRODUCTS[product].sellPrice;
    const ordered = cycle.orders[product] || 0;
    const revenue = ordered * sp;
    const cost = ordered * costPrice;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPct, ordered, costPerKg: costPrice, sp };
  };

  const calcChicken = (product) => {
    const count = parseFloat(cycle.orders[product]) || 0;
    const costPrice = PRODUCTS[product].costPrice;
    const sp = sellPriceOverride[product] !== undefined ? parseFloat(sellPriceOverride[product]) : PRODUCTS[product].sellPrice;
    const revenue = count * sp;
    const cost = count * costPrice;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPct, count, costPerUnit: costPrice, sp };
  };

  const goatCalc = calcSlaughter("goat");
  const muttonCalc = calcSlaughter("mutton");
  const beefCalc = calcResale("beef");
  const csCalc = calcChicken("chicken_small");
  const cmCalc = calcChicken("chicken_medium");
  const clCalc = calcChicken("chicken_large");

  const totalRevenue = goatCalc.revenue + muttonCalc.revenue + beefCalc.revenue + csCalc.revenue + cmCalc.revenue + clCalc.revenue;
  const totalCost = goatCalc.cost + muttonCalc.cost + beefCalc.cost + csCalc.cost + cmCalc.cost + clCalc.cost;
  const totalMargin = totalRevenue - totalCost;
  const totalMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Requisition calculations
  const YIELD_MID = 11;
  const goatKgOrdered = cycle.orders["goat"] || 0;
  const muttonKgOrdered = cycle.orders["mutton"] || 0;
  const goatAnimalsNeeded = Math.ceil(goatKgOrdered / YIELD_MID);
  const muttonAnimalsNeeded = Math.ceil(muttonKgOrdered / YIELD_MID);

  const fmt = (n) => `KES ${Math.round(n).toLocaleString()}`;
  const pct = (n) => `${n.toFixed(1)}%`;

  const marginColor = (p) => p >= 40 ? "#2d6a4f" : p >= 20 ? "#e9a82a" : "#c0392b";

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#f5f0e8", minHeight: "100vh", color: "#2c2c2c" }}>
      {/* Header */}
      <div style={{ background: "#1a3a2a", color: "#f5f0e8", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.6, textTransform: "uppercase", marginBottom: 4 }}>Enkana Fresh</div>
          <div style={{ fontSize: 22, fontWeight: "bold" }}>Profit Margin Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {DELIVERY_CYCLES.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c.id)}
              style={{ padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif",
                background: selectedCycle === c.id ? "#e9a82a" : "rgba(255,255,255,0.1)",
                color: selectedCycle === c.id ? "#1a3a2a" : "#f5f0e8", fontWeight: selectedCycle === c.id ? "bold" : "normal" }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      <div style={{ background: "#1a3a2a", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px 32px", display: "flex", gap: 32 }}>
        {[
          { label: "Total Revenue", value: fmt(totalRevenue) },
          { label: "Total Cost", value: fmt(totalCost) },
          { label: "Gross Margin", value: fmt(totalMargin) },
          { label: "Margin %", value: pct(totalMarginPct), color: marginColor(totalMarginPct) },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", opacity: 0.5, color: "#f5f0e8", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: s.color || "#e9a82a" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", background: "#f5f0e8", borderBottom: "2px solid #ddd", display: "flex", gap: 0 }}>
        {["requisition", "actuals", "summary"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "14px 24px", border: "none", background: "none", cursor: "pointer", fontSize: 13,
              fontFamily: "Georgia, serif", textTransform: "capitalize", letterSpacing: 1,
              color: activeTab === tab ? "#1a3a2a" : "#888",
              borderBottom: activeTab === tab ? "2px solid #1a3a2a" : "2px solid transparent",
              fontWeight: activeTab === tab ? "bold" : "normal", marginBottom: -2 }}>
            {tab === "requisition" ? "📋 Requisition" : tab === "actuals" ? "⚖️ Actuals (Post-Slaughter)" : "📊 Margin Summary"}
          </button>
        ))}
      </div>

      <div style={{ padding: "32px", maxWidth: 900 }}>

        {/* REQUISITION TAB */}
        {activeTab === "requisition" && (
          <div>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>Enter orders to calculate animals and quantities needed for sourcing.</p>

            {/* Orders Input */}
            <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ marginBottom: 16, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#1a3a2a" }}>Orders for {DELIVERY_CYCLES.find(c => c.id === selectedCycle)?.label}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { key: "goat", label: "Goat Meat (kg)" },
                  { key: "mutton", label: "Mutton (kg)" },
                  { key: "beef", label: "Beef (kg)" },
                  { key: "chicken_small", label: "Chicken Small (birds)" },
                  { key: "chicken_medium", label: "Chicken Medium (birds)" },
                  { key: "chicken_large", label: "Chicken Large (birds)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>{label}</label>
                    <input type="number" min="0" value={cycle.orders[key] || ""} onChange={e => updateOrder(key, e.target.value)}
                      placeholder="0"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 16, fontFamily: "Georgia, serif", boxSizing: "border-box", background: "#fafafa" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Requisition Table */}
            <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "16px 24px", background: "#1a3a2a", color: "#f5f0e8" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Sourcing Requisition</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f7f3" }}>
                    {["Animal / Product", "Orders", "Required", "Est. Cost", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#888", fontWeight: "normal", borderBottom: "1px solid #eee" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {goatKgOrdered > 0 && (
                    <tr style={{ borderBottom: "1px solid #f0ece4" }}>
                      <td style={{ padding: "14px 20px", fontWeight: "bold" }}>🐐 Goats</td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>{goatKgOrdered} kg</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#e8f4ed", color: "#1a3a2a", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold" }}>{goatAnimalsNeeded} animals</span></td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>KES {(goatAnimalsNeeded * 6750).toLocaleString()} – {(goatAnimalsNeeded * 7500).toLocaleString()}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#fff3cd", color: "#856404", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>Pending</span></td>
                    </tr>
                  )}
                  {muttonKgOrdered > 0 && (
                    <tr style={{ borderBottom: "1px solid #f0ece4" }}>
                      <td style={{ padding: "14px 20px", fontWeight: "bold" }}>🐑 Sheep</td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>{muttonKgOrdered} kg</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#e8f4ed", color: "#1a3a2a", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold" }}>{muttonAnimalsNeeded} animals</span></td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>KES {(muttonAnimalsNeeded * 6750).toLocaleString()} – {(muttonAnimalsNeeded * 7500).toLocaleString()}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#fff3cd", color: "#856404", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>Pending</span></td>
                    </tr>
                  )}
                  {(cycle.orders["beef"] || 0) > 0 && (
                    <tr style={{ borderBottom: "1px solid #f0ece4" }}>
                      <td style={{ padding: "14px 20px", fontWeight: "bold" }}>🥩 Beef (Butcher)</td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>{cycle.orders["beef"]} kg</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#e8f4ed", color: "#1a3a2a", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold" }}>{cycle.orders["beef"]} kg</span></td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>KES {((cycle.orders["beef"] || 0) * 650).toLocaleString()}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#fff3cd", color: "#856404", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>Order Butcher</span></td>
                    </tr>
                  )}
                  {[["chicken_small", "🐔 Chicken Small"], ["chicken_medium", "🐔 Chicken Medium"], ["chicken_large", "🐔 Chicken Large"]].map(([key, label]) => (
                    (cycle.orders[key] || 0) > 0 && (
                      <tr key={key} style={{ borderBottom: "1px solid #f0ece4" }}>
                        <td style={{ padding: "14px 20px", fontWeight: "bold" }}>{label}</td>
                        <td style={{ padding: "14px 20px", color: "#666" }}>{cycle.orders[key]} birds</td>
                        <td style={{ padding: "14px 20px" }}><span style={{ background: "#e8f4ed", color: "#1a3a2a", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold" }}>{cycle.orders[key]} birds</span></td>
                        <td style={{ padding: "14px 20px", color: "#666" }}>KES {((cycle.orders[key] || 0) * PRODUCTS[key].costPrice).toLocaleString()}</td>
                        <td style={{ padding: "14px 20px" }}><span style={{ background: "#fff3cd", color: "#856404", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>Pending</span></td>
                      </tr>
                    )
                  ))}
                  {totalCost === 0 && (
                    <tr><td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Enter orders above to generate requisition</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTUALS TAB */}
        {activeTab === "actuals" && (
          <div>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>After slaughter, enter the actual animal cost and kg yielded per animal. This calculates your real cost per kg and margin.</p>

            {/* Goat Actuals */}
            {["goat", "mutton"].map(product => (
              <div key={product} style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#1a3a2a", margin: 0 }}>
                    {product === "goat" ? "🐐 Goat Meat" : "🐑 Mutton"} — Animals Slaughtered
                  </h3>
                  <button onClick={() => addAnimal(product)}
                    style={{ padding: "8px 16px", background: "#1a3a2a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>
                    + Add Animal
                  </button>
                </div>

                {(cycle.animals[product] || []).length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>No animals logged yet. Click "Add Animal" after slaughter.</p>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                      {["Animal #", "Cost (KES)", "Yield (kg)", ""].map(h => (
                        <div key={h} style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>{h}</div>
                      ))}
                    </div>
                    {(cycle.animals[product] || []).map((animal, i) => (
                      <div key={animal.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <div style={{ padding: "10px 12px", background: "#f9f7f3", borderRadius: 8, fontSize: 14, color: "#666" }}>Animal {i + 1}</div>
                        <input type="number" placeholder="e.g. 6750" value={animal.cost}
                          onChange={e => updateAnimal(product, animal.id, "cost", e.target.value)}
                          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif" }} />
                        <input type="number" placeholder="e.g. 13" value={animal.yieldKg}
                          onChange={e => updateAnimal(product, animal.id, "yieldKg", e.target.value)}
                          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif" }} />
                        <button onClick={() => removeAnimal(product, animal.id)}
                          style={{ padding: "10px", background: "#fee2e2", color: "#c0392b", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>✕</button>
                      </div>
                    ))}

                    {/* Slaughter summary */}
                    {(() => {
                      const c = calcSlaughter(product);
                      return c.animals > 0 ? (
                        <div style={{ marginTop: 16, padding: 16, background: "#f9f7f3", borderRadius: 8, display: "flex", gap: 24 }}>
                          <div><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>Total Cost</div><div style={{ fontWeight: "bold" }}>{fmt(c.totalCost)}</div></div>
                          <div><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>Total Yield</div><div style={{ fontWeight: "bold" }}>{c.totalYield} kg</div></div>
                          <div><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>Cost/kg</div><div style={{ fontWeight: "bold" }}>{fmt(c.costPerKg)}</div></div>
                          <div><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>Ordered</div><div style={{ fontWeight: "bold" }}>{c.ordered} kg</div></div>
                          <div><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#aaa" }}>Margin/kg</div><div style={{ fontWeight: "bold", color: marginColor((c.sp - c.costPerKg) / c.sp * 100) }}>{fmt(c.sp - c.costPerKg)}</div></div>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            ))}

            {/* Beef */}
            <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#1a3a2a", marginBottom: 16 }}>🥩 Beef — Butcher Order</h3>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, letterSpacing: 1, color: "#aaa", marginBottom: 6, textTransform: "uppercase" }}>Kg Ordered from Butcher</label>
                  <input type="number" value={cycle.animals.beef?.kgOrdered || ""} placeholder="0"
                    onChange={e => updateResale("beef", "kgOrdered", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1, color: "#aaa", marginBottom: 6, textTransform: "uppercase" }}>Fixed Cost/kg</div>
                  <div style={{ padding: "10px 12px", background: "#f9f7f3", borderRadius: 8, fontSize: 14 }}>KES 650</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1, color: "#aaa", marginBottom: 6, textTransform: "uppercase" }}>Margin/kg</div>
                  <div style={{ padding: "10px 12px", background: "#e8f4ed", borderRadius: 8, fontSize: 14, color: "#1a3a2a", fontWeight: "bold" }}>KES 150</div>
                </div>
              </div>
            </div>

            {/* Chickens */}
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#1a3a2a", marginBottom: 16 }}>🐔 Chickens — Confirmed Counts</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { key: "chicken_small", label: "Small (KES 500 cost)", margin: 500 },
                  { key: "chicken_medium", label: "Medium (KES 800 cost)", margin: 700 },
                  { key: "chicken_large", label: "Large (KES 1,300 cost)", margin: 700 },
                ].map(({ key, label, margin }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 11, letterSpacing: 1, color: "#aaa", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
                    <input type="number" value={cycle.orders[key] || ""} placeholder="0"
                      onChange={e => updateOrder(key, e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                    <div style={{ marginTop: 6, fontSize: 12, color: "#1a3a2a" }}>Margin: KES {margin}/bird</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY TAB */}
        {activeTab === "summary" && (
          <div>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>Full profit breakdown for {DELIVERY_CYCLES.find(c => c.id === selectedCycle)?.label}</p>

            {/* Per product breakdown */}
            <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1a3a2a", color: "#f5f0e8" }}>
                    {["Product", "Qty", "Revenue", "Cost", "Gross Margin", "Margin %"].map(h => (
                      <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "🐐 Goat Meat", calc: goatCalc, qty: `${goatCalc.ordered} kg` },
                    { label: "🐑 Mutton", calc: muttonCalc, qty: `${muttonCalc.ordered} kg` },
                    { label: "🥩 Beef", calc: beefCalc, qty: `${beefCalc.ordered} kg` },
                    { label: "🐔 Chicken Small", calc: csCalc, qty: `${csCalc.count} birds` },
                    { label: "🐔 Chicken Medium", calc: cmCalc, qty: `${cmCalc.count} birds` },
                    { label: "🐔 Chicken Large", calc: clCalc, qty: `${clCalc.count} birds` },
                  ].filter(r => r.calc.revenue > 0 || r.calc.ordered > 0 || r.calc.count > 0).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0ece4", background: i % 2 === 0 ? "white" : "#faf9f6" }}>
                      <td style={{ padding: "14px 20px", fontWeight: "bold" }}>{row.label}</td>
                      <td style={{ padding: "14px 20px", color: "#666" }}>{row.qty}</td>
                      <td style={{ padding: "14px 20px" }}>{fmt(row.calc.revenue)}</td>
                      <td style={{ padding: "14px 20px", color: "#c0392b" }}>{fmt(row.calc.cost)}</td>
                      <td style={{ padding: "14px 20px", fontWeight: "bold", color: "#1a3a2a" }}>{fmt(row.calc.margin)}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ background: marginColor(row.calc.marginPct) + "22", color: marginColor(row.calc.marginPct), padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: "bold" }}>
                          {pct(row.calc.marginPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f9f7f3", borderTop: "2px solid #1a3a2a" }}>
                    <td colSpan={2} style={{ padding: "16px 20px", fontWeight: "bold", fontSize: 15 }}>TOTAL</td>
                    <td style={{ padding: "16px 20px", fontWeight: "bold" }}>{fmt(totalRevenue)}</td>
                    <td style={{ padding: "16px 20px", fontWeight: "bold", color: "#c0392b" }}>{fmt(totalCost)}</td>
                    <td style={{ padding: "16px 20px", fontWeight: "bold", color: "#1a3a2a", fontSize: 16 }}>{fmt(totalMargin)}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ background: marginColor(totalMarginPct) + "22", color: marginColor(totalMarginPct), padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold" }}>
                        {pct(totalMarginPct)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Price override section */}
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#1a3a2a", marginBottom: 4 }}>Price Simulator</h3>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>Test the impact of moving to KES 800 for goat/mutton on this cycle's margin.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {["goat", "mutton"].map(p => (
                  <div key={p}>
                    <label style={{ display: "block", fontSize: 11, letterSpacing: 1, color: "#aaa", marginBottom: 6, textTransform: "uppercase" }}>
                      {p === "goat" ? "Goat Meat" : "Mutton"} sell price (KES/kg)
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="number" value={sellPriceOverride[p] !== undefined ? sellPriceOverride[p] : PRODUCTS[p].sellPrice}
                        onChange={e => setSellPriceOverride(prev => ({ ...prev, [p]: e.target.value }))}
                        style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif" }} />
                      <button onClick={() => setSellPriceOverride(prev => ({ ...prev, [p]: PRODUCTS[p].futurePrice }))}
                        style={{ padding: "10px 14px", background: "#e8f4ed", color: "#1a3a2a", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>
                        Set 800
                      </button>
                      <button onClick={() => setSellPriceOverride(prev => { const n = {...prev}; delete n[p]; return n; })}
                        style={{ padding: "10px 14px", background: "#f9f7f3", color: "#888", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
