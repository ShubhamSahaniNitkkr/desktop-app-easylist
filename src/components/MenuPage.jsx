// src/components/MenuPage.jsx
import React, { useEffect, useState } from "react";
import { Button, message, Select } from "antd";
import { getAll, add } from "../utils/ipc";

export default function MenuPage() {
  const [recipes, setRecipes] = useState([]);
  const [grid, setGrid] = useState({});
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const meals = ["Breakfast", "Lunch", "Snack", "Dinner"];

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecipes(all.recipes || []);
    })();
  }, []);

  function addRecipe(day, meal) {
    const pick = prompt(
      "Type recipe name (available: " +
        (recipes || []).map((r) => r.name).join(", ") +
        ")"
    );
    if (!pick) return;
    setGrid((g) => {
      const cp = { ...g };
      const key = `${day}__${meal}`;
      cp[key] = [...(cp[key] || []), pick];
      return cp;
    });
  }

  async function save() {
    const obj = { id: Date.now().toString(), name: "menu_" + Date.now(), grid };
    await add("menus", obj);
    message.success("Menu saved");
  }

  return (
    <div className="page">
      <h2>Weekly Menu</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }} className="list">
          <div style={{ display: "flex", gap: 12 }}>
            {days.map((d) => (
              <div
                key={d}
                style={{
                  minWidth: 140,
                  borderLeft: "1px solid #eee",
                  paddingLeft: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>{d}</div>
                {meals.map((m) => (
                  <div
                    key={m}
                    style={{
                      border: "1px solid #f0f0f0",
                      padding: 8,
                      marginTop: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{m}</div>
                    <div style={{ minHeight: 80 }}>
                      {(grid[`${d}__${m}`] || []).map((r, i) => (
                        <div key={i}>{r}</div>
                      ))}
                    </div>
                    <Button size="small" onClick={() => addRecipe(d, m)}>
                      +
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={save}>
              Save Menu
            </Button>
          </div>
        </div>

        <div style={{ width: 360 }} className="list">
          <h4>Shopping list</h4>
          <p>
            When saved, you can generate a shopping list from a menu by summing
            scaled ingredient quantities (future extension: generate directly
            here).
          </p>
        </div>
      </div>
    </div>
  );
}
