// src/components/MenuPage.jsx
import React, { useEffect, useState } from "react";
import { Button, message, Select, Modal, Input, List, InputNumber } from "antd";
import { getAll, add, printToPDF } from "../utils/ipc";

export default function MenuPage() {
  const [recipes, setRecipes] = useState([]);
  const [grid, setGrid] = useState({});
  const [peopleGrid, setPeopleGrid] = useState({});
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
  const ageGroups = ["3–5 years", "6–10 years", "Adults"]; 

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecipes(all.recipes || []);
      setSavedMenus(all.menus || []);
      setPeopleGrid(all.peopleGrid || {});
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

  function updatePeople(day, meal, group, value) {
    // ✅ added
    setPeopleGrid((pg) => {
      const cp = JSON.parse(JSON.stringify(pg));
      const key = `${activeMenu}__W${weekOffset}__${day}__${meal}`;
      cp[key] = cp[key] || {};
      cp[key][group] = Number(value || 0);
      return cp;
    });
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
      peopleGrid, // ✅ store people counts
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
    setPeopleGrid(menu.peopleGrid || {}); // ✅ restore
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

  function generateShoppingList() {
    // ✅ now includes age counts
    let lines = [];
    Object.keys(grid).forEach((key) => {
      const items = grid[key] || [];
      const people = peopleGrid[key] || {};
      items.forEach((r) => {
        lines.push(
          `${r} — ${ageGroups
            .map((g) => `${g}: ${people[g] || 0}`)
            .join(" | ")}`
        );
      });
    });

    if (!lines.length) return message.info("Menu is empty.");

    const html = `<h1>Shopping List</h1><p>${lines.join("<br>")}</p>`;
    printToPDF(html);
    message.success("Shopping list generated");
  }

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
    printToPDF(html);
    message.success("Menu PDF generated");
  }

  return (
    <div className="page">
      <h2>Weekly Menus</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <span style={{ marginRight: 6 }}>Menu:</span>
          <Select
            value={activeMenu}
            onChange={(v) => setActiveMenu(v)}
            style={{ width: 160 }}
          >
            {menus.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
          <Button
            size="small"
            onClick={openAddMenuModal}
            style={{ marginLeft: 8 }}
          >
            + Add Menu
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={() => setWeekOffset((w) => w - 1)}>◀</Button>
          <div style={{ minWidth: 160, textAlign: "center" }}>
            {weekLabel()}
          </div>
          <Button onClick={() => setWeekOffset((w) => w + 1)}>▶</Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            flex: 1,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
          }}
          className="list"
        >
          <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
            {days.map((d) => (
              <div
                key={d}
                style={{
                  minWidth: 160,
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

                      {ageGroups.map((g) => (
                        <div key={g} style={{ marginTop: 4 }}>
                          <small>{g}:</small>
                          <InputNumber
                            size="small"
                            min={0}
                            style={{ width: "100%" }}
                            value={(peopleGrid[key] && peopleGrid[key][g]) || 0}
                            onChange={(v) => updatePeople(d, m, g, v)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Button type="primary" onClick={save}>
              Save Menu
            </Button>
            <Button onClick={generateShoppingList}>Shopping List</Button>{" "}
            <Button onClick={printMenu}>Print</Button>
          </div>
        </div>

        <div
          style={{
            width: 700,
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
    </div>
  );
}
