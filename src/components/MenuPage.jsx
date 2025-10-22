// src/components/MenuPage.jsx
import React, { useEffect, useState } from "react";
import { Button, message, Select, Modal, Input, List } from "antd";
import { getAll, add } from "../utils/ipc";

export default function MenuPage() {
  const [recipes, setRecipes] = useState([]);
  const [grid, setGrid] = useState({});
  const [menus, setMenus] = useState(["Menu 1", "Menu 2"]);
  const [savedMenus, setSavedMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState("Menu 1");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAddingMenu, setIsAddingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");

  // 🆕 For recipe selection modal
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

  // ✅ Load recipes & saved menus from DB
  useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecipes(all.recipes || []);
      setSavedMenus(all.menus || []);
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

  // 🆕 Add recipe (controlled modal)
  function addRecipe(day, meal) {
    setSelectedDay(day);
    setSelectedMeal(meal);
    setSelectedRecipe("");
    setIsAddRecipeModalOpen(true);
  }

  function confirmAddRecipe() {
    if (!selectedRecipe) {
      message.error("Please select a recipe");
      return;
    }
    setGrid((g) => {
      const cp = { ...g };
      const key = `${activeMenu}__W${weekOffset}__${selectedDay}__${selectedMeal}`;
      cp[key] = [...(cp[key] || []), selectedRecipe];
      return cp;
    });
    setIsAddRecipeModalOpen(false);
    message.success(
      `Added ${selectedRecipe} to ${selectedMeal} (${selectedDay})`
    );
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

    // Update local list (replace if exists)
    setSavedMenus((prev) => {
      const filtered = prev.filter((m) => m.id !== obj.id);
      return [...filtered, obj];
    });

    message.success(`Menu saved: ${obj.name}`);
  }

  // ✅ Load saved menu for editing
  function loadMenu(menu) {
    setActiveMenu(menu.menu);
    setWeekOffset(menu.weekOffset);
    setGrid(menu.grid || {});
    message.info(`Loaded ${menu.name} for editing`);
  }

  function openAddMenuModal() {
    setNewMenuName("");
    setIsAddingMenu(true);
  }

  function confirmAddMenu() {
    if (!newMenuName.trim()) {
      message.error("Please enter a menu name");
      return;
    }
    if (menus.includes(newMenuName.trim())) {
      message.warning("Menu already exists");
      return;
    }
    setMenus((prev) => [...prev, newMenuName.trim()]);
    setActiveMenu(newMenuName.trim());
    setIsAddingMenu(false);
    message.success("Menu added: " + newMenuName);
  }

  return (
    <div className="page">
      <h2>Weekly Menus</h2>

      {/* Menu + Week selector */}
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
            style={{ width: 130 }}
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
          <div style={{ minWidth: 130, textAlign: "center" }}>
            {weekLabel()}
          </div>
          <Button onClick={() => setWeekOffset((w) => w + 1)}>▶</Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* LEFT: Week Grid */}
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

          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={save}>
              Save Menu
            </Button>
          </div>
        </div>

        {/* RIGHT: Saved Menus List */}
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
