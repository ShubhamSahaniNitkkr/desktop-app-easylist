// src/components/RecipePage.jsx
import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Checkbox,
  Card,
  Typography,
  Divider,
  Space,
  Image,
} from "antd";
import { getAll, add, pickImage, printToPDF } from "../utils/ipc";

const { Title, Text } = Typography;

export default function RecipePage() {
  const [options, setOptions] = useState(null);
  const [ingredientsDb, setIngredientsDb] = useState([]);
  const [recipe, setRecipe] = useState({
    name: "",
    ingredients: [],
    steps: [],
    image: "",
    rating: 100, // default 100%
    asIngredient: false,
    youtube: "",
  });
  const [ageCounts, setAgeCounts] = useState({});

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setIngredientsDb(all.ingredients || []);
    })();
  }, []);

  function addIngredientRow() {
    setRecipe((r) => ({
      ...r,
      ingredients: [
        ...(r.ingredients || []),
        {
          name: "",
          qty: 0,
          unit: options?.units?.[0] || "g",
          prepLoss: 0,
          cookingLoss: 0,
        },
      ],
    }));
  }

  function updateIng(i, field, v) {
    setRecipe((r) => {
      const cp = JSON.parse(JSON.stringify(r));
      cp.ingredients[i][field] = v;
      return cp;
    });
  }

  // When selecting an ingredient from DB autocomplete, fill unit automatically
  function selectIngredient(i, name) {
    const meta = (ingredientsDb || []).find(
      (x) => x.name.toLowerCase() === (name || "").toLowerCase()
    );
    setRecipe((r) => {
      const cp = JSON.parse(JSON.stringify(r));
      cp.ingredients[i].name = name;
      if (meta && meta.unit) cp.ingredients[i].unit = meta.unit;
      // copy some defaults if present
      if (meta && meta.prepLoss != null)
        cp.ingredients[i].prepLoss = meta.prepLoss;
      return cp;
    });
  }

  function addStep() {
    setRecipe((r) => ({
      ...r,
      steps: [
        ...(r.steps || []),
        { text: "", time: 0, temperature: "", method: "" },
      ],
    }));
  }

  function updateStep(i, field, v) {
    setRecipe((r) => {
      const cp = JSON.parse(JSON.stringify(r));
      cp.steps[i][field] = v;
      return cp;
    });
  }

  async function saveRecipe() {
    try {
      const name = (recipe.name || "").trim();
      if (!name) return message.error("Recipe name required");
      // Ensure rating default
      if (!recipe.rating && recipe.rating !== 0) recipe.rating = 100;
      await add("recipes", recipe);
      message.success("Recipe saved");
    } catch (e) {
      message.error(e.message || "Error saving recipe");
    }
  }

  async function pickImg() {
    try {
      const res = await pickImage();
      if (!res.canceled) {
        setRecipe((r) => ({ ...r, image: res.data }));
        message.success("Image attached");
      }
    } catch (e) {
      message.error("Image pick failed");
    }
  }

  function setAgeCount(label, count) {
    setAgeCounts((ac) => ({ ...ac, [label]: Number(count) }));
  }

  // scaling logic (unchanged)
  function computeScaledIngredients() {
    const std = options?.standardPortions || [];
    const ingredientsList = recipe.ingredients || [];
    if (ingredientsList.length === 0) return [];

    const ref = ingredientsList[0];
    const refIngredientMeta = (ingredientsDb || []).find(
      (i) => i.name.toLowerCase() === (ref.name || "").toLowerCase()
    );
    const refCategory = refIngredientMeta?.category || options?.categories?.[0];
    let totalRefGrams = 0;

    (std || []).forEach((s) => {
      if (s.category === refCategory) {
        const cnt = Number(ageCounts[s.label] || 0);
        totalRefGrams += (s.grams || 0) * cnt;
      }
    });

    if (totalRefGrams === 0) {
      const totalPeople = Object.values(ageCounts).reduce(
        (a, b) => a + Number(b || 0),
        0
      );
      const adultPortion =
        (std.find((s) => s.label.toLowerCase().includes("adult")) || {})
          .grams || 150;
      totalRefGrams = totalPeople * adultPortion;
    }

    const refQty = Number(ref.qty) || 0;
    const unitRef = ref.unit || "g";
    const refQtyInGrams =
      unitRef === "kg"
        ? refQty * 1000
        : unitRef === "l"
        ? refQty * (refIngredientMeta?.weightPerLiter || 1000)
        : refQty;
    const ratio = refQtyInGrams > 0 ? totalRefGrams / refQtyInGrams : 1;

    return ingredientsList.map((i) => {
      const qty = Number(i.qty || 0);
      const unit = i.unit || "g";
      const qtyInGrams =
        unit === "kg"
          ? qty * 1000
          : unit === "l"
          ? qty *
            (ingredientsDb.find(
              (ii) => ii.name.toLowerCase() === i.name?.toLowerCase()
            )?.weightPerLiter || 1000)
          : qty;
      const scaledInGrams = qtyInGrams * ratio;
      let scaledQty = scaledInGrams;
      if (unit === "kg") scaledQty = scaledInGrams / 1000;
      if (unit === "l")
        scaledQty =
          scaledInGrams /
          (ingredientsDb.find(
            (ii) => ii.name.toLowerCase() === i.name?.toLowerCase()
          )?.weightPerLiter || 1000);
      return { ...i, scaledQty, scaledInGrams };
    });
  }

  const scaled = computeScaledIngredients();

  // compute recipe nutrition totals from ingredients' nutrition per 100g
  function computeNutritionTotals() {
    const totals = {
      protein: 0,
      carbs: 0,
      fats: 0,
      calories: 0,
      fiber: 0,
      salt: 0,
    };
    for (const ing of recipe.ingredients || []) {
      const meta = (ingredientsDb || []).find(
        (x) => x.name.toLowerCase() === (ing.name || "").toLowerCase()
      );
      if (!meta) continue;
      // compute qty in grams
      const qty = Number(ing.qty || 0);
      const unit = ing.unit || "g";
      let qtyGrams =
        unit === "kg"
          ? qty * 1000
          : unit === "l"
          ? qty * (meta.weightPerLiter || 1000)
          : qty;
      // nutrition fields are per 100g in ingredient meta (assumption used in your data model)
      const factor = qtyGrams / 100;
      const n = meta.nutrition || {};
      totals.protein += (n.protein || 0) * factor;
      totals.carbs += (n.carbs || 0) * factor;
      totals.fats += (n.fats || 0) * factor;
      totals.calories += (n.calories || 0) * factor;
      totals.fiber += (n.fiber || 0) * factor;
      totals.salt += (n.salt || 0) * factor;
    }
    // round
    Object.keys(totals).forEach(
      (k) => (totals[k] = Math.round((totals[k] + Number.EPSILON) * 100) / 100)
    );
    return totals;
  }

  const nutritionTotals = computeNutritionTotals();

  // print handler (await result and show message)
  async function onPrint() {
    try {
      const html = `<html><body><h1>${
        recipe.name || ""
      }</h1><h3>Ingredients</h3><ul>${(recipe.ingredients || [])
        .map((i) => `<li>${i.qty} ${i.unit} ${i.name}</li>`)
        .join("")}</ul></body></html>`;
      const res = await printToPDF(html);
      if (res && res.canceled === false)
        message.success("PDF saved: " + res.path);
      else if (res && res.canceled) message.info("PDF cancelled");
    } catch (e) {
      message.error("Print failed: " + (e.message || ""));
    }
  }

  return (
    <div className="page" style={{ padding: 20 }}>
      <Title level={3}>Recipe</Title>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            bodyStyle={{ padding: 18 }}
            style={{
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              borderRadius: 12,
            }}
          >
            <Row gutter={12} align="middle">
              <Col span={10}>
                <Text strong>Recipe Name</Text>
                <Input
                  placeholder="e.g. 'Fried Squid' or supplier code"
                  value={recipe.name || ""}
                  onChange={(e) =>
                    setRecipe((r) => ({ ...r, name: e.target.value }))
                  }
                  style={{ marginTop: 4 }}
                />
                <Text type="secondary">
                  Keep it short & unique for menus & reports.
                </Text>
              </Col>
              <Col span={5}>
                <Text strong>Category</Text>
                <Select
                  style={{ width: "100%", marginTop: 4 }}
                  value={recipe.category || "main"}
                  onChange={(v) => setRecipe((r) => ({ ...r, category: v }))}
                >
                  {[
                    "starter",
                    "main",
                    "dessert",
                    "vegetable",
                    "protein",
                    "starch",
                  ].map((c) => (
                    <Select.Option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Select.Option>
                  ))}
                </Select>
                <Text type="secondary" style={{ display: "block" }}>
                  Choose Category
                </Text>
              </Col>

              <Col span={9}>
                <Text strong>YouTube link</Text>
                <Input
                  placeholder="https://youtube.com/..."
                  value={recipe.youtube || ""}
                  onChange={(e) =>
                    setRecipe((r) => ({ ...r, youtube: e.target.value }))
                  }
                  style={{ marginTop: 4 }}
                />
                <Text type="secondary" style={{ display: "block" }}>
                  (optional)
                </Text>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Ingredients</Title>

            <Row gutter={8} style={{ marginBottom: 6 }}>
              {recipe.ingredients.length !== 0 && (
                <>
                  <Col span={7}>
                    <Text type="secondary">Ingredient Name</Text>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Quantity</Text>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Unit</Text>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Prep Loss (%)</Text>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Cooking Loss (%)</Text>
                  </Col>
                  <Col span={1} />
                </>
              )}
            </Row>

            {(recipe.ingredients || []).map((ing, idx) => (
              <Row
                key={idx}
                gutter={8}
                style={{ marginBottom: 10 }}
                align="middle"
              >
                <Col span={7}>
                  {/* Autocomplete: choose existing ingredient to auto-fill unit */}
                  <Select
                    showSearch
                    allowClear
                    placeholder="Ingredient (type to search)"
                    value={ing.name || undefined}
                    onSearch={() => {}}
                    onChange={(value) => selectIngredient(idx, value)}
                    style={{ width: "100%" }}
                    filterOption={(input, option) =>
                      option?.value
                        ?.toLowerCase()
                        .includes((input || "").toLowerCase())
                    }
                    options={(ingredientsDb || []).map((it) => ({
                      label: `${it.name} — ${it.unit || ""}`,
                      value: it.name,
                    }))}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={ing.qty}
                    onChange={(v) => updateIng(idx, "qty", v)}
                  />
                </Col>
                <Col span={4}>
                  <Select
                    style={{ width: "100%" }}
                    value={ing.unit}
                    onChange={(v) => updateIng(idx, "unit", v)}
                  >
                    {(options?.units || ["g", "kg"]).map((u) => (
                      <Select.Option key={u} value={u}>
                        {u}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={ing.prepLoss}
                    onChange={(v) => updateIng(idx, "prepLoss", v)}
                    min={0}
                    max={100}
                    placeholder="%"
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={ing.cookingLoss}
                    onChange={(v) => updateIng(idx, "cookingLoss", v)}
                    min={0}
                    max={100}
                    placeholder="%"
                  />
                </Col>
                <Col span={1}>
                  <Button
                    danger
                    size="small"
                    onClick={() =>
                      setRecipe((r) => ({
                        ...r,
                        ingredients: r.ingredients.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    X
                  </Button>
                </Col>
              </Row>
            ))}
            <Button onClick={addIngredientRow}>Add Ingredient</Button>

            <Divider />

            <Title level={5}>Preparation Steps</Title>
            {recipe.steps.length !== 0 && (
              <Row gutter={8} style={{ marginBottom: 6 }}>
                <Col span={10}>
                  <Text type="secondary">Step Description</Text>
                </Col>
                <Col span={3}>
                  <Text type="secondary">Time (min)</Text>
                </Col>
                <Col span={3}>
                  <Text type="secondary">Temp (°C)</Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Method</Text>
                </Col>
                <Col span={2}>
                  <Text type="secondary">Action</Text>
                </Col>
              </Row>
            )}

            {(recipe.steps || []).map((s, i) => (
              <Row
                key={i}
                gutter={8}
                style={{ marginBottom: 8 }}
                align="middle"
              >
                <Col span={10}>
                  <Input
                    value={s.text}
                    onChange={(e) => updateStep(i, "text", e.target.value)}
                    placeholder="Describe step"
                  />
                </Col>
                <Col span={3}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={s.time}
                    onChange={(v) => updateStep(i, "time", v)}
                    min={0}
                  />
                </Col>
                <Col span={3}>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={s.temperature}
                    onChange={(v) => updateStep(i, "temperature", v)}
                    placeholder="°C"
                    min={0}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    style={{ width: "100%" }}
                    value={s.method || ""}
                    onChange={(v) => updateStep(i, "method", v)}
                  >
                    {["sear", "boil", "bake", "fry", "steam"].map((m) => (
                      <Select.Option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={2}>
                  <Button
                    danger
                    size="small"
                    onClick={() =>
                      setRecipe((r) => ({
                        ...r,
                        steps: r.steps.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </Col>
              </Row>
            ))}
            <Button onClick={addStep}>Add Step</Button>

            <Divider />

            <Space style={{ marginTop: 12 }}>
              <Button type="primary" onClick={saveRecipe}>
                Save
              </Button>
              <Button onClick={pickImg}>Pick image</Button>
              <Button onClick={onPrint}>Print</Button>
              <Checkbox
                checked={recipe.asIngredient}
                onChange={(e) =>
                  setRecipe((r) => ({ ...r, asIngredient: e.target.checked }))
                }
              >
                Recipe can be used as ingredient
              </Checkbox>
            </Space>

            {/* image preview */}
            {recipe.image ? (
              <div style={{ marginTop: 12 }}>
                <Text strong>Image preview</Text>
                <div style={{ marginTop: 6 }}>
                  <Image src={recipe.image} alt="recipe" width={180} />
                </div>
              </div>
            ) : null}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={8}>
          <Card
            title="Scaling & Metadata"
            style={{
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              borderRadius: 12,
            }}
          >
            <Text strong>Age Group Counts</Text>
            <div style={{ marginTop: 8 }}>
              {(options?.standardPortions || []).map((sp) => (
                <div
                  key={sp.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ width: 160 }}>
                    {sp.label} ({sp.grams} g)
                  </div>
                  <InputNumber
                    min={0}
                    value={ageCounts[sp.label] || 0}
                    onChange={(v) => setAgeCount(sp.label, v)}
                  />
                </div>
              ))}
            </div>

            <Divider />

            <Text strong>Scaled Ingredients</Text>
            <div style={{ maxHeight: 200, overflow: "auto", marginTop: 8 }}>
              {scaled.length === 0 && (
                <div style={{ opacity: 0.7 }}>
                  Add ingredients & age counts to see scaled quantities
                </div>
              )}
              {scaled.map((s, idx) => (
                <div
                  key={idx}
                  style={{ padding: 6, borderBottom: "1px solid #eee" }}
                >
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ opacity: 0.75 }}>
                    {(s.scaledQty || 0).toFixed(2)} {s.unit} —{" "}
                    {(s.scaledInGrams || 0).toFixed(1)} g
                  </div>
                </div>
              ))}
            </div>

            <Divider />

            <Text strong>Totals (nutrition)</Text>
            <div style={{ marginTop: 8 }}>
              <div>Calories: {nutritionTotals.calories} kcal</div>
              <div>Protein: {nutritionTotals.protein} g</div>
              <div>Carbs: {nutritionTotals.carbs} g</div>
              <div>Fats: {nutritionTotals.fats} g</div>
              <div>Fiber: {nutritionTotals.fiber} g</div>
              <div>Salt: {nutritionTotals.salt} g</div>
            </div>

            <Divider />

            <Text strong>Rating</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                min={0}
                max={100}
                value={recipe.rating || 100}
                onChange={(v) => setRecipe((r) => ({ ...r, rating: v }))}
              />{" "}
              %
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
