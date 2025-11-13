import React, { useEffect, useState, useCallback } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  InputNumber,
  message,
  Typography,
  Divider,
  Card,
} from "antd";
import { useTranslation } from "react-i18next";
import { getAll, add, update, queryIngredients } from "../utils/ipc";

const { Title, Text } = Typography;

export default function IngredientPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [form] = Form.useForm();
  const [loadingList, setLoadingList] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);

  // ---------- LOAD ALL DATA ----------
  useEffect(() => {
    (async () => {
      const all = await getAll();

      // ensure options always exist
      const opts = {
        languages: all.options?.languages || ["en"],
        units: all.options?.units || ["g", "kg"],
        categories: all.options?.categories || [],
        allergens: all.options?.allergens || [],
        suppliers: all.options?.suppliers || [],
      };

      setOptions(opts);
      setIngredients(all.ingredients || []);
    })();
  }, []);

  // ---------- DEBOUNCED SEARCH ----------
  const onQuery = useCallback(
    (q) => {
      if (searchTimer) clearTimeout(searchTimer);
      const timer = setTimeout(async () => {
        setLoadingList(true);
        try {
          const list = await queryIngredients(q);
          // Parse JSON fields
          list.forEach((i) => {
            i.allergens = JSON.parse(i.allergens || "[]");
            i.nutrition = JSON.parse(i.nutrition || "{}");
          });
          setIngredients(list);
        } finally {
          setLoadingList(false);
        }
      }, 300);
      setSearchTimer(timer);
    },
    [searchTimer]
  );

  // ---------- SAVE INGREDIENT ----------
  async function onSave() {
    try {
      const vals = await form.validateFields();
      const name = vals.name.trim();

      if (!name) return message.error("Name required");
      if (/^\d+$/.test(name))
        return message.error("Name cannot be only numbers");

      const obj = {
        name,
        supplier: vals.supplier || "",
        article: vals.article || "",
        category: vals.category || options.categories[0] || "",
        unit: vals.unit || options.units[0] || "g",

        ingredientLoss: Number(vals.ingredientLoss || 0),
        prepLoss: Number(vals.prepLoss || 0),
        cookingLoss: Number(vals.cookingLoss || 0),

        price: Number(vals.price || 0),
        weightPiece: Number(vals.weightPiece || 0),
        weightPerLiter: Number(vals.weightPerLiter || 1000),
        tspWeight: Number(vals.tspWeight || 5),
        tbspWeight: Number(vals.tbspWeight || 15),

        allergens: vals.allergens || [],

        nutrition: {
          protein: Number(vals.protein || 0),
          carbs: Number(vals.carbs || 0),
          fats: Number(vals.fats || 0),
          calories: Number(vals.calories || 0),
          fiber: Number(vals.fiber || 0),
          salt: Number(vals.salt || 0),
        },
      };

      // check if exists
      const all = await getAll();
      const exist = (all.ingredients || []).find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );

      if (exist) {
        await update("ingredients", exist.id, obj);
      } else {
        await add("ingredients", obj);
      }

      message.success("Ingredient saved");

      const re = await getAll();
      setIngredients(re.ingredients || []);
      form.resetFields();
    } catch (e) {
      message.error(e.message || "Error saving ingredient");
    }
  }

  // ---------- UI ----------
  return (
    <div className="page" style={{ padding: "24px 32px" }}>
      <Title level={3}>{t("Ingredient Management")}</Title>
      <Divider />

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* LEFT SIDE FORM */}
        <Card
          title="Add / Edit Ingredient"
          bordered={false}
          style={{
            width: 560,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
          }}
        >
          <Form form={form} layout="vertical">
            {/* NAME */}
            <Form.Item
              label={t("Name")}
              name="name"
              rules={[{ required: true }]}
            >
              <Input
                placeholder="Carrot, Egg, Tomato…"
                onChange={(e) => onQuery(e.target.value)}
              />
            </Form.Item>

            {/* SUPPLIER / ITEM NUMBER */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Supplier" name="supplier">
                  <Input
                    list="suppliers"
                    placeholder="Select or type supplier"
                  />
                </Form.Item>
                <datalist id="suppliers">
                  {(options?.suppliers || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Col>
              <Col span={12}>
                <Form.Item label="Item Number" name="article">
                  <Input placeholder="e.g., 356477" />
                </Form.Item>
              </Col>
            </Row>

            {/* CATEGORY / UNIT */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Category" name="category">
                  <Select placeholder="Select category" showSearch>
                    {(options?.categories || []).map((c) => (
                      <Select.Option key={c} value={c}>
                        {c}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Unit" name="unit">
                  <Select>
                    {(options?.units || ["g"]).map((u) => (
                      <Select.Option key={u} value={u}>
                        {u}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* LOSSES */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Ingredient loss (%)" name="ingredientLoss">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Prep loss (%)" name="prepLoss">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Cooking loss (%)" name="cookingLoss">
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            {/* WEIGHTS */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Price per kg" name="price">
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Weight per piece (g)" name="weightPiece">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Weight per liter (g)" name="weightPerLiter">
                  <InputNumber
                    min={0}
                    defaultValue={1000}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Tsp weight (g)" name="tspWeight">
                  <InputNumber
                    min={0}
                    defaultValue={5}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Tbsp weight (g)" name="tbspWeight">
                  <InputNumber
                    min={0}
                    defaultValue={15}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* ALLERGENS */}
            <Form.Item label={t("Allergens")} name="allergens">
              <Select mode="multiple" allowClear>
                {(options?.allergens || []).map((a) => (
                  <Select.Option key={a} value={a}>
                    {a}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* NUTRITION */}
            <Divider orientation="left">Nutrition (per 100g)</Divider>

            <Row gutter={12}>
              {["protein", "carbs", "fats"].map((k) => (
                <Col span={8} key={k}>
                  <Form.Item label={k} name={k}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              ))}
            </Row>

            <Row gutter={12}>
              {["calories", "fiber", "salt"].map((k) => (
                <Col span={8} key={k}>
                  <Form.Item label={k} name={k}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              ))}
            </Row>

            {/* BUTTONS */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={() => form.resetFields()}>{t("New")}</Button>
              <Button type="primary" onClick={onSave}>
                {t("Save")}
              </Button>
            </div>
          </Form>
        </Card>

        {/* RIGHT SIDE LIST */}
        <Card
          title="Ingredients"
          bordered={false}
          style={{
            flex: 1,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: 12,
          }}
        >
          <Input.Search
            placeholder="Search ingredients"
            onChange={(e) => onQuery(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <div style={{ maxHeight: 560, overflow: "auto" }}>
            {(ingredients || []).map((i) => (
              <div
                key={i.id}
                style={{
                  padding: "10px 8px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text strong>{i.name}</Text>
                  <div style={{ opacity: 0.65, fontSize: 13 }}>
                    {i.category} • {i.unit} • {i.supplier}{" "}
                    {i.article && (
                      <Text type="secondary" style={{ marginLeft: 6 }}>
                        #{i.article}
                      </Text>
                    )}
                  </div>
                </div>

                <Button
                  size="small"
                  onClick={() =>
                    form.setFieldsValue({
                      name: i.name,
                      supplier: i.supplier,
                      article: i.article,
                      category: i.category,
                      unit: i.unit,
                      ingredientLoss: i.ingredientLoss,
                      prepLoss: i.prepLoss,
                      cookingLoss: i.cookingLoss,
                      price: i.price,
                      weightPiece: i.weightPiece,
                      weightPerLiter: i.weightPerLiter,
                      tspWeight: i.tspWeight,
                      tbspWeight: i.tbspWeight,
                      allergens: i.allergens || [],
                      protein: i.nutrition?.protein,
                      carbs: i.nutrition?.carbs,
                      fats: i.nutrition?.fats,
                      calories: i.nutrition?.calories,
                      fiber: i.nutrition?.fiber,
                      salt: i.nutrition?.salt,
                    })
                  }
                >
                  Load
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
