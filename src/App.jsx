// src/App.jsx
import React, { useEffect, useState } from "react";
import { Layout, Menu, Dropdown, Button, ConfigProvider } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import HomePage from "./components/HomePage";
import IngredientPage from "./components/IngredientPage";
import RecipePage from "./components/RecipePage";
import MenuPage from "./components/MenuPage";
import OptionsPage from "./components/OptionsPage";
import { useTranslation } from "react-i18next";
import { getAll } from "./utils/ipc";
import HelpPage from "./components/HelpPage";

const { Header, Content } = Layout;

export default function App() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState("home");
  const [options, setOptions] = useState(null);

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      if (all.options && all.options.defaultLang)
        i18n.changeLanguage(all.options.defaultLang);
    })();
  }, []);

  const langMenu = (
    <Menu
      onClick={({ key }) => {
        i18n.changeLanguage(key);
      }}
    >
      <Menu.Item key="en">EN</Menu.Item>
      <Menu.Item key="fr">FR</Menu.Item>
    </Menu>
  );

  return (
    <ConfigProvider>
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "white", fontWeight: 700, fontSize: 20 }}>
            EasyList
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Dropdown overlay={langMenu}>
              <Button>{i18n.language.toUpperCase()}</Button>
            </Dropdown>
            <Button onClick={() => setPage("home")}>Home</Button>
            <Button onClick={() => setPage("ingredient")}>
              {t("Ingredient")}
            </Button>
            <Button onClick={() => setPage("recipe")}>{t("Recipe")}</Button>
            <Button onClick={() => setPage("menu")}>{t("Menu")}</Button>
            <Button onClick={() => setPage("options")}>{t("Options")}</Button>
            <Button onClick={() => setPage("help")}>{t("Help")}</Button>
          </div>
        </Header>

        <Content style={{ padding: 18, overflow: "auto" }}>
          {page === "home" && <HomePage navigate={setPage} />}
          {page === "ingredient" && <IngredientPage />}
          {page === "recipe" && <RecipePage />}
          {page === "menu" && <MenuPage />}
          {page === "options" && (
            <OptionsPage refreshOptions={(o) => setOptions(o)} />
          )}
          {page === "help" && <HelpPage />}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
