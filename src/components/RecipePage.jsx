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
  Tooltip,
  Space,
  Form,
} from "antd";
import { getAll, add, pickImage, printToPDF } from "../utils/ipc";

const { Title, Text } = Typography;

export default function RecipePage() {
  const [form] = Form.useForm();
  const [options, setOptions] = useState(null);
  const [ingredientsDb, setIngredientsDb] = useState([]);
  const [recipe, setRecipe] = useState({
    ingredients: [],
    steps: [],
    image: "",
    rating: 50,
    asIngredient: false,
    cookingMethod: "stovetop",
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
      await add("recipes", recipe);
      message.success("Recipe saved");
    } catch (e) {
      message.error(e.message || "Error");
    }
  }

  async function pickImg() {
    const res = await pickImage();
    if (!res.canceled) setRecipe((r) => ({ ...r, image: res.data }));
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
            {/* Recipe Name + Meta */}
            <Row gutter={12} align="middle">
              <Col span={14}>
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
              </Col>
              <Col span={5}>
                <Text strong>Cooking Method</Text>
                <Select
                  style={{ width: "100%", marginTop: 4 }}
                  value={recipe.cookingMethod || "stovetop"}
                  onChange={(v) =>
                    setRecipe((r) => ({ ...r, cookingMethod: v }))
                  }
                >
                  {["stovetop", "oven", "grill", "fry", "steam"].map((m) => (
                    <Select.Option key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>

            <Divider />

            {/* Ingredients Section */}
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
                  <Col span={1}>{/* <Text type="secondary">—</Text> */}</Col>
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
                  <Input
                    value={ing.name}
                    onChange={(e) => updateIng(idx, "name", e.target.value)}
                    placeholder="Ingredient"
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

            {/* Steps Section */}
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
                    placeholder="Method"
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
              <Button
                onClick={() => {
                  const html = `<html><body><h1>${
                    recipe.name || ""
                  }</h1><h3>Ingredients</h3><ul>${(recipe.ingredients || [])
                    .map((i) => `<li>${i.qty} ${i.unit} ${i.name}</li>`)
                    .join("")}</ul></body></html>`;
                  printToPDF(html);
                }}
              >
                Print
              </Button>
              <Checkbox
                checked={recipe.asIngredient}
                onChange={(e) =>
                  setRecipe((r) => ({ ...r, asIngredient: e.target.checked }))
                }
              >
                Recipe can be used as ingredient
              </Checkbox>
            </Space>
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
            <div style={{ maxHeight: 260, overflow: "auto", marginTop: 8 }}>
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

            <Text strong>Rating</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                min={0}
                max={100}
                value={recipe.rating || 50}
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
