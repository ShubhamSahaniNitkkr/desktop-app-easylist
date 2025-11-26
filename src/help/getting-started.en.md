# 🌟 Welcome to EasyList

EasyList is a simple and powerful tool to manage **Ingredients**, create **Recipes**, plan **Weekly Menus**, and generate **Shopping Lists** automatically.  
This guide explains every page, button, and feature in a clean and easy-to-follow way.

---

# 🧭 Navigation Overview

At the top of the app, you will find:

- **Home**
- **Ingredient**
- **Recipe**
- **Menu**
- **Options**
- **Help**
- **Language Selector (EN / FR)**

Each section is explained in detail below.

---

# 🏠 Home Page

The Home page is the starting dashboard.  
It contains shortcuts to quickly open:

- Ingredients
- Recipes
- Weekly Menus
- Options

This page is mainly for quick navigation.

---

# 🥕 Ingredient Page

This section is where you store and manage all your raw ingredients.

## What you can do here:

- Add new ingredients
- Edit existing ingredients
- Delete ingredients
- Load ingredient details into the form
- Import ingredients using SQL

## Fields you can fill:

- **Name**
- **Supplier**
- **Item Number (Article)**
- **Category**
- **Unit** (g, kg, ml, L, tsp, tbsp, piece, etc.)
- **Ingredient Loss (%)**
- **Preparation Loss (%)**
- **Cooking Loss (%)**
- **Price per kg**
- **Weight per piece**
- **Weight per liter**
- **Allergens (list)**
- **Nutrition per 100g:** Protein / Carbs / Fat / Calories

## Buttons available:

- **Save** – Save ingredient
- **New** – Clear the form
- **Load** – Load an ingredient
- **Delete** – Remove ingredient

---

# 🍳 Recipe Page

Create and manage recipes easily.

## What you can do:

- Create new recipes
- Add ingredients to recipes
- Adjust ingredient quantities
- Add cooking steps
- Add YouTube links
- Upload an image
- Adjust recipe rating
- Scale recipe to a target weight
- Print the recipe
- Save recipe as an ingredient

## Buttons:

- **New Recipe**
- **Add Ingredient**
- **Add Step**
- **Save**
- **Pick Image**
- **Print**
- **Use as Ingredient**

## Important Features:

### ⭐ Rating (%)

Controls recipe scaling:

- **100%** = normal
- **50%** = half
- **150%** = 1.5×

### ⭐ Target Output Weight

Enter a final cooked weight, and EasyList recalculates ingredients automatically.

---

# 📅 Weekly Menu Page

Plan your weekly meals and generate shopping lists.

## What you can do:

- Assign recipes to each day
- Select meals per day
- Save multiple weekly menus
- Load saved menus
- Delete menus
- Print menus
- Generate shopping lists

## Shopping List Options:

You can generate lists for:

- Whole week
- Single day
- Single meal

Calculation considers:

- Ingredient losses
- Recipe scaling
- Unit conversions
- Recipe rating
- People count (Profiles)

---

# ⚙️ Options Page

This is where you configure EasyList.

## You can customize:

- Languages
- Default Language
- Units
- Unit Conversion Table
- Categories
- Allergens
- Suppliers
- Profiles (people per meal)
- Age Groups and Standard Portions
- Currency Symbol

## Import / Export:

- Export all settings
- Import all settings
- Import ingredients using SQL
- Use the **SQL Console** for direct database editing

---

# 🌐 Language

You can change language anytime:

- **Options → Default Language**
- **Top-right EN/FR selector**

---

# 📘 Help Page

This page shows the help guide you are reading right now.  
You can edit it by modifying the help.md file.

---

# 🧩 SQL Console (Advanced)

EasyList includes a **full SQLite Console** located at:

> **Options → Advanced → SQL Console**

This lets you run **any SQL command**, including:

- SELECT
- INSERT
- UPDATE
- DELETE
- CREATE TABLE
- DROP TABLE
- ALTER TABLE
- PRAGMA
- VACUUM
- SHOW TABLES (shortcut)

---

# 📊 Database Tables Overview

EasyList uses these tables:

| Table           | Purpose                |
| --------------- | ---------------------- |
| **ingredients** | All ingredient data    |
| **recipes**     | Recipes stored as JSON |
| **menus**       | Weekly menus           |
| **options**     | App settings (JSON)    |

---

# 🧾 Table Structures

## 1) ingredients

| Column         | Type                | Description       |
| -------------- | ------------------- | ----------------- |
| id             | INTEGER PRIMARY KEY | Auto ID           |
| name           | TEXT UNIQUE         | Ingredient name   |
| supplier       | TEXT                | Supplier          |
| article        | TEXT                | Item number       |
| category       | TEXT                | Category          |
| unit           | TEXT                | g, kg, ml, etc    |
| ingredientLoss | REAL                | % loss            |
| prepLoss       | REAL                | % loss            |
| cookingLoss    | REAL                | % loss            |
| price          | REAL                | price/kg          |
| weightPiece    | REAL                | weight per piece  |
| weightPerLiter | REAL                | weight per liter  |
| tspWeight      | REAL                | teaspoon weight   |
| tbspWeight     | REAL                | tablespoon weight |
| allergens      | TEXT(JSON)          | list              |
| nutrition      | TEXT(JSON)          | per 100g          |

---

## 2) recipes

| Column | Type        |
| ------ | ----------- |
| id     | INTEGER     |
| name   | TEXT UNIQUE |
| data   | TEXT(JSON)  |

---

## 3) menus

| Column | Type        |
| ------ | ----------- |
| id     | INTEGER     |
| name   | TEXT UNIQUE |
| data   | TEXT(JSON)  |

---

## 4) options

| Column | Type               |
| ------ | ------------------ |
| id     | INTEGER (always 1) |
| data   | TEXT(JSON)         |

---

# 🧪 Supported SQL Commands

## ✔ Show all tables

```
SHOW TABLES;
```

## ✔ Select everything

```
SELECT * FROM ingredients;
```

## ✔ Insert data

```
INSERT INTO ingredients (name, category, unit)
VALUES ('Rice', 'grain', 'g');
```

## ✔ Update data

```
UPDATE ingredients SET price = 3.2 WHERE name='Rice';
```

## ✔ Delete data

```
DELETE FROM ingredients WHERE name='Rice';
```

## ✔ Create a table

```
CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);
```

## ✔ Drop a table

```
DROP TABLE test;
```

## ✔ View schema

```
PRAGMA table_info(ingredients);
```

## ✔ Vacuum database

```
VACUUM;
```

---

# 🍏 CRUD Examples Per Table

---

## INGREDIENTS

### ➕ Insert

```
INSERT INTO ingredients
(name, supplier, category, unit, price, allergens, nutrition)
VALUES
('Milk', 'Metro', 'dairy', 'ml', 1.8, '["milk"]', '{"protein":3,"fat":1}');
```

### 📝 Update

```
UPDATE ingredients SET price=2.0 WHERE name='Milk';
```

### ❌ Delete

```
DELETE FROM ingredients WHERE name='Milk';
```

### 🔍 Filter

```
SELECT * FROM ingredients WHERE category='meat';
```

---

## RECIPES

### ➕ Insert

```
INSERT INTO recipes (name, data)
VALUES ('Pasta', '{"ingredients":[{"name":"Pasta","qty":200}],"steps":["Boil pasta"],"rating":100}');
```

### 📝 Update

```
UPDATE recipes SET data='{"ingredients":[{"name":"Pasta","qty":250}]}' WHERE name='Pasta';
```

### ❌ Delete

```
DELETE FROM recipes WHERE name='Pasta';
```

### 🔍 Read

```
SELECT * FROM recipes;
```

---

## MENUS

### ➕ Insert

```
INSERT INTO menus (name, data)
VALUES ('Menu_Week_1', '{"weekOffset":0,"grid":{}}');
```

### 📝 Update

```
UPDATE menus SET data='{"weekOffset":1}' WHERE name='Menu_Week_1';
```

### ❌ Delete

```
DELETE FROM menus WHERE name='Menu_Week_1';
```

### 🔍 Read

```
SELECT * FROM menus;
```

---

## OPTIONS

### 🔍 View

```
SELECT * FROM options;
```

### 📝 Update

```
UPDATE options SET data='{"defaultLang":"en"}' WHERE id=1;
```

---

# ⚠️ Notes & Safety

- SQL edits are **instant** — no undo.
- Always double-check JSON fields for recipes/ingredients.
- Do not drop core EasyList tables unless you know what you're doing.
- If something breaks, you can **Import Settings** to restore.

---

# 🎉 Done!

If you want:

✔ A downloadable PDF help guide  
✔ A collapsible HTML version  
✔ Add screenshots/icons to the help  
✔ Auto-detection of SQL errors and suggestions

Just tell me — I can generate it!
