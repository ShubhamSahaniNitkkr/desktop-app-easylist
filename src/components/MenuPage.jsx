import React, { useEffect, useState } from "react";
import { Button, message, Select, Modal, Input } from "antd";
import { getAll, add } from "../utils/ipc";

export default function MenuPage() {
  const [recipes, setRecipes] = useState([]);
  const [grid, setGrid] = useState({});
  const [menus, setMenus] = useState(["Menu 1", "Menu 2"]);
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

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecipes(all.recipes || []);
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
    const obj = {
      id: Date.now().toString(),
      name: `${activeMenu}_W${weekOffset}`,
      weekOffset,
      menu: activeMenu,
      grid,
    };
    await add("menus", obj);
    message.success(`Menu saved: ${obj.name}`);
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

        <div
          style={{
            width: 500,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
          }}
          className="list"
        >
          <h4>Shopping List</h4>
          <p>
            Each menu and week is saved separately. Generate shopping lists
            later by combining recipe ingredient quantities.
          </p>
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
