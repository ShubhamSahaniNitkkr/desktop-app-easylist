// src/components/HomePage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import {
  AppstoreOutlined,
  FireOutlined,
  CoffeeOutlined,
  SettingOutlined,
} from "@ant-design/icons";

export default function HomePage({ navigate }) {
  const { t } = useTranslation();

  const iconStyle = {
    fontSize: "48px",
    marginBottom: "10px",
  };

  return (
    <div className="page">
      <h2 style={{ textAlign: "center" }}>{t("Home")}</h2>
      <div className="card-grid">
        <div
          className="big-tile tile-ingredient"
          onClick={() => navigate("ingredient")}
        >
          <div style={{ textAlign: "center" }}>
            <AppstoreOutlined style={{ ...iconStyle, color: "white" }} />
            <br />
            {t("Ingredient")}
          </div>
        </div>
        <div
          className="big-tile tile-recipe"
          onClick={() => navigate("recipe")}
        >
          <div style={{ textAlign: "center" }}>
            <FireOutlined style={{ ...iconStyle, color: "white" }} />
            <br />
            {t("Recipe")}
          </div>
        </div>

        <div className="big-tile tile-menu" onClick={() => navigate("menu")}>
          <div style={{ textAlign: "center" }}>
            <CoffeeOutlined style={{ ...iconStyle, color: "white" }} />
            <br />
            {t("Menu")}
          </div>
        </div>
        <div
          className="big-tile tile-options"
          onClick={() => navigate("options")}
        >
          <div style={{ textAlign: "center" }}>
            <SettingOutlined style={{ ...iconStyle, color: "white" }} />
            <br />
            {t("Options")}
          </div>
        </div>
      </div>
    </div>
  );
}
