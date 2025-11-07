import React, { useEffect, useState } from "react";
import { Button, message, Select, Modal, Input, List, Radio } from "antd";
import { getAll, add, printToPDF } from "../utils/ipc";

export default function MenuPage() {
  const [recipes, setRecipes] = useState([]);
  const [grid, setGrid] = useState({});
  const [menus, setMenus] = useState(["Menu 1", "Menu 2"]);
  const [savedMenus, setSavedMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState("Menu 1");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAddingMenu, setIsAddingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");

  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState("");

  const [shoppingScope, setShoppingScope] = useState("week");
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeDay, setScopeDay] = useState("");
  const [scopeMeal, setScopeMeal] = useState("");
  const [options, setOptions] = useState(null);

  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];
  const meals = ["Breakfast", "Lunch", "Snack", "Dinner"];

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecipes(all.recipes || []);
      setSavedMenus(all.menus || []);
      setProfiles(all.options?.profiles || []);
      setOptions(all.options || {});

      // Auto-select default profile if available
      const defaultProfile = all.options?.profiles?.[0]?.name || "";
      if (defaultProfile) setSelectedProfile(defaultProfile);
    })();
  }, []);

  function weekLabel() {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + weekOffset * 7
    );
    return `Week of ${start.toLocaleDateString()}`;
  }

  function addRecipe(day, meal) {
    setSelectedDay(day);
    setSelectedMeal(meal);
    setSelectedRecipe("");
    setIsAddRecipeModalOpen(true);
  }

  function confirmAddRecipe() {
    if (!selectedRecipe) return message.error("Please select a recipe");
    setGrid((g) => {
      const cp = { ...g };
      const key = `${activeMenu}__W${weekOffset}__${selectedDay}__${selectedMeal}`;
      cp[key] = [...(cp[key] || []), selectedRecipe];
      return cp;
    });
    setIsAddRecipeModalOpen(false);
    message.success(`Added ${selectedRecipe}`);
  }

  function removeRecipe(day, meal, recipeName) {
    setGrid((g) => {
      const cp = { ...g };
      const key = `${activeMenu}__W${weekOffset}__${day}__${meal}`;
      cp[key] = (cp[key] || []).filter((r) => r !== recipeName);
      return cp;
    });
  }

  async function save() {
    const existing = savedMenus.find(
      (m) => m.menu === activeMenu && m.weekOffset === weekOffset
    );
    const obj = {
      id: existing?.id || Date.now().toString(),
      name: `${activeMenu}_W${weekOffset}`,
      weekOffset,
      menu: activeMenu,
      grid,
    };
    await add("menus", obj);
    setSavedMenus((prev) => {
      const filtered = prev.filter((m) => m.id !== obj.id);
      return [...filtered, obj];
    });
    message.success(`Menu saved: ${obj.name}`);
  }

  function loadMenu(menu) {
    setActiveMenu(menu.menu);
    setWeekOffset(menu.weekOffset);
    setGrid(menu.grid || {});
    message.info(`Loaded ${menu.name}`);
  }

  function openAddMenuModal() {
    setNewMenuName("");
    setIsAddingMenu(true);
  }

  function confirmAddMenu() {
    if (!newMenuName.trim()) return message.error("Enter a menu name");
    if (menus.includes(newMenuName.trim()))
      return message.warning("Menu already exists");
    setMenus((prev) => [...prev, newMenuName.trim()]);
    setActiveMenu(newMenuName.trim());
    setIsAddingMenu(false);
    message.success("Added menu: " + newMenuName);
  }

  // Load selected profile (info only)
  function loadProfileCounts() {
    if (!selectedProfile) return message.warning("Select a profile");
    const prof = profiles.find((p) => p.name === selectedProfile);
    if (!prof) return message.warning("Profile not found");
    message.success(`Profile "${selectedProfile}" loaded`);
  }

  // -------- SHOPPING LIST (with weights) --------
  function handleScopeSelection() {
    if (shoppingScope === "week") {
      generateShoppingList("week");
    } else {
      setIsScopeModalOpen(true);
    }
  }

  function confirmScopeSelection() {
    generateShoppingList(shoppingScope, scopeDay, scopeMeal);
    setIsScopeModalOpen(false);
  }

  function getStandardPortion(category, ageGroup) {
    const list = options?.standardPortions || [];
    const found = list.find(
      (p) => p.ageGroup === ageGroup && p.category === category
    );
    return found ? found.grams || 0 : 0;
  }

  function generateShoppingList(scope = "week", day, meal) {
    let keys = [];
    if (scope === "week") {
      keys = Object.keys(grid).filter((k) =>
        k.startsWith(`${activeMenu}__W${weekOffset}`)
      );
    } else if (scope === "day") {
      if (!day) return message.warning("Please select a day");
      keys = Object.keys(grid).filter((k) =>
        k.startsWith(`${activeMenu}__W${weekOffset}__${day}`)
      );
    } else if (scope === "meal") {
      if (!day || !meal) return message.warning("Select day and meal");
      keys = [
        `${activeMenu}__W${weekOffset}__${day}__${meal}`,
      ].filter((k) => grid[k]);
    }

    const items = keys.flatMap((k) => grid[k] || []);
    if (items.length === 0) return message.info("No recipes found for this selection");

    // Fetch all recipe details with ingredients
    const recipeMap = {};
    for (const r of recipes) recipeMap[r.name] = r;

    // Get selected profile
    const prof = profiles.find((p) => p.name === selectedProfile);
    const counts = {};
    if (prof?.table) {
      for (const d of Object.keys(prof.table)) {
        for (const m of Object.keys(prof.table[d])) {
          for (const a of Object.keys(prof.table[d][m])) {
            counts[a] = (counts[a] || 0) + Number(prof.table[d][m][a] || 0);
          }
        }
      }
    }

    const ageGroups = options?.ageGroups || [];
    const weights = {};

    // --- NEW: Actual ingredient-based aggregation ---
    for (const recipeName of items) {
      const recipe = recipeMap[recipeName];
      if (!recipe || !recipe.ingredients) continue;

      for (const ing of recipe.ingredients) {
        const key = ing.name || "Unnamed";
        const baseQty = Number(ing.qty || 0);
        const unit = ing.unit || "g";

        // Convert to grams
        let grams = baseQty;
        if (unit === "kg") grams = baseQty * 1000;
        if (unit === "l") grams = baseQty * (ing.weightPerLiter || 1000);

        // Apply simple portion multiplier based on total people
        let multiplier = 1;
        for (const ag of ageGroups) {
          multiplier += counts[ag] ? counts[ag] / 10 : 0;
        }

        weights[key] = (weights[key] || 0) + grams * multiplier;
      }
    }

    if (Object.keys(weights).length === 0)
      return message.info("No ingredient data found for these recipes");

    const txt = Object.entries(weights)
      .map(
        ([name, weight]) =>
          `• ${name} — ${weight > 0 ? weight.toFixed(1) + " g" : "No data"}`
      )
      .join("<br>");

    const html = `<h1>Shopping List (${scope})</h1><p>${txt}</p>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    } else {
      printToPDF(html);
    }
    message.success("Shopping list ready");
  }

  // -------- PRINT MENU --------
  function printMenu() {
    let html = `<h1>${activeMenu} - ${weekLabel()}</h1>`;
    days.forEach((d) => {
      html += `<h3>${d}</h3><ul>`;
      meals.forEach((m) => {
        const key = `${activeMenu}__W${weekOffset}__${d}__${m}`;
        const items = grid[key] || [];
        html += `<li><b>${m}:</b> ${items.join(", ") || "-"}</li>`;
      });
      html += `</ul>`;
    });

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    } else {
      printToPDF(html);
    }
    message.success("Print ready");
  }

  return (
    <div className="page">
      <h2>Weekly Menus</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ marginRight: 6 }}>Menu:</span>
          <Select
            value={activeMenu}
            onChange={(v) => setActiveMenu(v)}
            style={{ width: 130 }}
          >
            {menus.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
          <Button size="small" onClick={openAddMenuModal} style={{ marginLeft: 8 }}>
            + Add Menu
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={() => setWeekOffset((w) => w - 1)}>◀</Button>
          <div style={{ minWidth: 130, textAlign: "center" }}>{weekLabel()}</div>
          <Button onClick={() => setWeekOffset((w) => w + 1)}>▶</Button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span>Profile:</span>
          <Select
            value={selectedProfile}
            onChange={(v) => setSelectedProfile(v)}
            placeholder="Select Profile"
            style={{ width: 160 }}
          >
            {(profiles || []).map((p) => (
              <Select.Option key={p.name} value={p.name}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
          <Button onClick={loadProfileCounts}>Load</Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            flex: 1,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: 8,
          }}
        >
          <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
            {days.map((d) => (
              <div
                key={d}
                style={{
                  minWidth: 130,
                  borderLeft: "1px solid #eee",
                  paddingLeft: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d}</div>
                {meals.map((m) => {
                  const key = `${activeMenu}__W${weekOffset}__${d}__${m}`;
                  return (
                    <div
                      key={m}
                      style={{
                        border: "1px solid #f0f0f0",
                        padding: 8,
                        marginTop: 8,
                        borderRadius: 6,
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{m}</span>
                        <Button
                          size="small"
                          onClick={() => addRecipe(d, m)}
                          style={{
                            fontWeight: "bold",
                            padding: "0 6px",
                            lineHeight: "1",
                          }}
                        >
                          +
                        </Button>
                      </div>

                      <div style={{ minHeight: 80, marginTop: 4 }}>
                        {(grid[key] || []).map((r, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "white",
                              padding: "4px 6px",
                              borderRadius: 4,
                              marginTop: 4,
                              boxShadow: "0 0 2px #ccc",
                            }}
                          >
                            <span>{r}</span>
                            <Button
                              type="link"
                              size="small"
                              danger
                              onClick={() => removeRecipe(d, m, r)}
                            >
                              x
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="primary" onClick={save}>
              Save Menu
            </Button>
            <Radio.Group
              value={shoppingScope}
              onChange={(e) => setShoppingScope(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <Radio.Button value="week">Whole Week</Radio.Button>
              <Radio.Button value="day">One Day</Radio.Button>
              <Radio.Button value="meal">One Meal</Radio.Button>
            </Radio.Group>
            <Button onClick={handleScopeSelection}>Shopping List</Button>
            <Button onClick={printMenu}>Print</Button>
          </div>
        </div>

        <div
          style={{
            width: 400,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <h3>Saved Menus</h3>
          {savedMenus.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No saved menus yet.</p>
          ) : (
            <List
              size="small"
              dataSource={[...savedMenus].reverse()}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button size="small" onClick={() => loadMenu(item)}>
                      Load
                    </Button>,
                  ]}
                >
                  <span>
                    <b>{item.menu}</b> — Week {item.weekOffset}
                  </span>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>

      {/* Add Recipe Modal */}
      <Modal
        title={`Add Recipe for ${selectedMeal} (${selectedDay})`}
        open={isAddRecipeModalOpen}
        onOk={confirmAddRecipe}
        onCancel={() => setIsAddRecipeModalOpen(false)}
        okText="Add"
      >
        <Select
          placeholder="Select recipe"
          value={selectedRecipe}
          onChange={(v) => setSelectedRecipe(v)}
          style={{ width: "100%", marginTop: 8 }}
          showSearch
          options={(recipes || []).map((r) => ({
            label: r.name,
            value: r.name,
          }))}
        />
      </Modal>

      {/* Add Menu Modal */}
      <Modal
        title="Add New Menu"
        open={isAddingMenu}
        onCancel={() => setIsAddingMenu(false)}
        onOk={confirmAddMenu}
        okText="Add"
      >
        <Input
          placeholder="Enter menu name (e.g., Menu 3)"
          value={newMenuName}
          onChange={(e) => setNewMenuName(e.target.value)}
        />
      </Modal>

      {/* Scope Selection Modal */}
      <Modal
        title="Select Scope"
        open={isScopeModalOpen}
        onCancel={() => setIsScopeModalOpen(false)}
        onOk={confirmScopeSelection}
        okText="Generate"
      >
        {shoppingScope !== "week" && (
          <>
            <div style={{ marginBottom: 8 }}>
              <span>Day:</span>
              <Select
                value={scopeDay}
                onChange={setScopeDay}
                style={{ width: "100%", marginTop: 4 }}
                options={days.map((d) => ({ label: d, value: d }))}
              />
            </div>
            {shoppingScope === "meal" && (
              <div>
                <span>Meal:</span>
                <Select
                  value={scopeMeal}
                  onChange={setScopeMeal}
                  style={{ width: "100%", marginTop: 4 }}
                  options={meals.map((m) => ({ label: m, value: m }))}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
