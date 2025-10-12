// src/components/IngredientPage.jsx
import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  InputNumber,
  message,
  Upload,
  Image,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { getAll, add, update, queryIngredients, pickImage } from "../utils/ipc";

export default function IngredientPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [form] = Form.useForm();
  const [imageData, setImageData] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setIngredients(all.ingredients || []);
    })();
  }, []);

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
        category: vals.category || options?.categories?.[0] || "",
        unit: vals.unit || options?.units?.[0] || "g",
        prepLoss: Number(vals.prepLoss || 0),
        price: Number(vals.price || 0),
        weightPiece: Number(vals.weightPiece || 0),
        weightPerLiter: Number(vals.weightPerLiter || 1000),
        tspWeight: Number(vals.tspWeight || 5),
        tbspWeight: Number(vals.tbspWeight || 15),
        allergen: vals.allergen || "",
        nutrition: {
          protein: Number(vals.protein || 0),
          carbs: Number(vals.carbs || 0),
          fats: Number(vals.fats || 0),
          calories: Number(vals.calories || 0),
          fiber: Number(vals.fiber || 0),
          salt: Number(vals.salt || 0),
        },
        image: imageData || "",
      };
      const all = await getAll();
      const existing = (all.ingredients || []).find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        await update("ingredients", existing.id, obj);
        message.success(t("Save successful"));
      } else {
        await add("ingredients", obj);
        message.success(t("Save successful"));
      }
      const re = await getAll();
      setIngredients(re.ingredients || []);
      form.resetFields();
      setImageData("");
    } catch (e) {
      message.error(e.message || "Error");
    }
  }

  async function onPickImage() {
    const res = await pickImage();
    if (!res.canceled) {
      setImageData(res.data);
      message.success("Image attached");
    }
  }

  async function onQuery(q) {
    setLoadingList(true);
    try {
      const list = await queryIngredients(q);
      setIngredients(list);
    } finally {
      setLoadingList(false);
    }
  }

  return (
    <div className="page">
      <h2>{t("Ingredient")}</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 540 }} className="list">
          <Form form={form} layout="vertical">
            <Form.Item
              label={t("Name")}
              name="name"
              rules={[{ required: true }]}
            >
              <Input onChange={(e) => onQuery(e.target.value)} />
            </Form.Item>

            <Form.Item label={t("Supplier")} name="supplier">
              <Input list="suppliers" />
            </Form.Item>
            <datalist id="suppliers">
              {(options?.suppliers || []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={t("Category")} name="category">
                  <Select showSearch>
                    {(options?.categories || []).map((c) => (
                      <Select.Option key={c} value={c}>
                        {c}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("Unit")} name="unit">
                  <Select>
                    {(options?.units || []).map((u) => (
                      <Select.Option key={u} value={u}>
                        {u}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label={t("Preparation loss")} name="prepLoss">
                  <InputNumber min={0} max={100} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Price per kg")} name="price">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Weight per piece (g)")} name="weightPiece">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Weight per liter (g)" name="weightPerLiter">
                  <InputNumber min={0} defaultValue={1000} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="tsp weight (g)" name="tspWeight">
                  <InputNumber min={0} defaultValue={5} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="tbsp weight (g)" name="tbspWeight">
                  <InputNumber min={0} defaultValue={15} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label={t("Allergen")} name="allergen">
              <Select>
                {(options?.allergens || []).map((a) => (
                  <Select.Option key={a} value={a}>
                    {a}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <h4>{t("Nutrition (per 100g)")}</h4>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Protein" name="protein">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Carbs" name="carbs">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Fats" name="fats">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Calories" name="calories">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Fiber" name="fiber">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Salt" name="salt">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={() => {
                  form.resetFields();
                  setImageData("");
                }}
              >
                {t("New")}
              </Button>
              <Button type="primary" onClick={onSave}>
                {t("Save")}
              </Button>
              <Button onClick={onPickImage}>{t("Pick image")}</Button>
            </div>
          </Form>
        </div>

        <div style={{ flex: 1 }} className="list">
          <h4>Ingredients</h4>
          <Input.Search
            placeholder="Search ingredients"
            onChange={(e) => onQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 520, overflow: "auto" }}>
            {(ingredients || []).map((i) => (
              <div
                key={i.id}
                style={{
                  padding: "8px 6px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <div style={{ opacity: 0.65 }}>
                    {i.category} • {i.unit} • {i.supplier}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    onClick={() => {
                      form.setFieldsValue({
                        name: i.name,
                        supplier: i.supplier,
                        article: i.article,
                        category: i.category,
                        unit: i.unit,
                        prepLoss: i.prepLoss,
                        price: i.price,
                        weightPiece: i.weightPiece,
                        weightPerLiter: i.weightPerLiter,
                        tspWeight: i.tspWeight,
                        tbspWeight: i.tbspWeight,
                        allergen: i.allergen,
                        protein: i.nutrition?.protein,
                        carbs: i.nutrition?.carbs,
                        fats: i.nutrition?.fats,
                        calories: i.nutrition?.calories,
                        fiber: i.nutrition?.fiber,
                        salt: i.nutrition?.salt,
                      });
                      setImageData(i.image || "");
                    }}
                  >
                    Load
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
