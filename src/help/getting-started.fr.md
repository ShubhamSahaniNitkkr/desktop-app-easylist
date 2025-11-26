# 🌟 Bienvenue sur EasyList

EasyList est un outil simple et puissant pour gérer les **Ingrédients**, créer des **Recettes**, planifier des **Menus Hebdomadaires**, et générer automatiquement des **Listes de Courses**.  
Ce guide explique chaque page, bouton et fonctionnalité de manière claire et facile.

---

# 🧭 Navigation

En haut de l’application, vous trouverez :

- **Accueil**
- **Ingrédient**
- **Recette**
- **Menu**
- **Options**
- **Aide**
- **Sélecteur de langue (EN / FR)**

---

# 🏠 Page d’accueil

Page principale avec accès rapide à :

- Ingrédients  
- Recettes  
- Menus  
- Options  

---

# 🥕 Page Ingrédient

Gérez tous vos ingrédients bruts.

## Actions possibles :

- Ajouter un ingrédient  
- Modifier un ingrédient  
- Supprimer un ingrédient  
- Charger un ingrédient  
- Importer via SQL  

## Champs :

- Nom  
- Fournisseur  
- Numéro d’article  
- Catégorie  
- Unité (g, kg, ml, L, tsp, tbsp, pièce, etc.)  
- Perte d’ingrédient (%)  
- Perte de préparation (%)  
- Perte de cuisson (%)  
- Prix par kg  
- Poids par pièce  
- Poids par litre  
- Allergènes  
- Nutrition (Protéines, Glucides, Lipides, Calories)  

## Boutons :

- **Enregistrer**  
- **Nouveau**  
- **Charger**  
- **Supprimer**  

---

# 🍳 Page Recette

Créez et gérez vos recettes facilement.

## Actions possibles :

- Ajouter des ingrédients  
- Modifier les quantités  
- Ajouter des étapes de préparation  
- Ajouter des liens YouTube  
- Importer une image  
- Modifier la notation (rating)  
- Mettre la recette à l’échelle  
- Imprimer la recette  
- Sauvegarder une recette en tant qu’ingrédient  

## Boutons :

- **Nouvelle Recette**  
- **Ajouter Ingrédient**  
- **Ajouter Étape**  
- **Enregistrer**  
- **Choisir Image**  
- **Imprimer**  
- **Utiliser comme Ingrédient**  

## Notation (%)

Contrôle la quantité finale :

- **100 %** = normal  
- **50 %** = moitié  
- **150 %** = une fois et demie  

## Poids final

Entrez un poids final → EasyList ajuste automatiquement les quantités.

---

# 📅 Page Menu

Planifiez vos repas pour toute la semaine.

## Vous pouvez :

- Ajouter des recettes pour chaque jour  
- Ajouter des recettes par repas  
- Sauvegarder plusieurs menus  
- Charger des menus enregistrés  
- Supprimer des menus  
- Imprimer les menus  
- Générer des listes de courses  

## Options de liste de courses :

- Semaine entière  
- Un seul jour  
- Un seul repas  

Les calculs prennent en compte :

- Pertes  
- Conversion d’unités  
- Portions (profils)  
- Notation des recettes  
- Poids final  

---

# ⚙️ Page Options

Personnalisez EasyList selon vos besoins.

## Vous pouvez modifier :

- Langue  
- Langue par défaut  
- Unités  
- Table de conversion  
- Catégories  
- Allergènes  
- Fournisseurs  
- Profils (nombre de personnes par repas)  
- Groupes d’âge  
- Portions standard  
- Symbole de devise  

## Import / Export :

- Exporter tous les paramètres  
- Importer les paramètres  
- Importer des ingrédients via SQL  
- Utiliser la **Console SQL avancée**  

---

# 🌐 Langue

Changer la langue :

- **Options → Langue par défaut**  
- **Sélecteur EN/FR (en haut à droite)**  

---

# 📘 Page Aide

Affiche ce guide.  
Vous pouvez modifier ce fichier (help-fr.md) pour adapter l’aide.

---

# 🧩 Console SQL (Avancée)

Accessible dans :

> **Options → Avancé → Console SQL**

Elle permet d’exécuter **toutes les commandes SQLite**, notamment :

- SELECT  
- INSERT  
- UPDATE  
- DELETE  
- CREATE TABLE  
- DROP TABLE  
- ALTER TABLE  
- PRAGMA  
- VACUUM  
- SHOW TABLES (commande spéciale)  

---

# 📊 Structure de la Base de Données

EasyList utilise 4 tables :

| Table | Description |
|-------|-------------|
| **ingredients** | Tous les ingrédients |
| **recipes** | Recettes (JSON) |
| **menus** | Menus hebdomadaires |
| **options** | Paramètres de l’application |

---

# 📦 Détails des Tables

## 1) ingredients

| Colonne | Type | Description |
|---------|-------|-------------|
| id | INTEGER | ID auto |
| name | TEXT UNIQUE | Nom |
| supplier | TEXT | Fournisseur |
| article | TEXT | Numéro d’article |
| category | TEXT | Catégorie |
| unit | TEXT | Unité |
| ingredientLoss | REAL | Perte (%) |
| prepLoss | REAL | Perte préparation (%) |
| cookingLoss | REAL | Perte cuisson (%) |
| price | REAL | Prix/kg |
| weightPiece | REAL | Poids par pièce |
| weightPerLiter | REAL | Poids par litre |
| tspWeight | REAL | Poids cuillère à café |
| tbspWeight | REAL | Poids cuillère à soupe |
| allergens | TEXT(JSON) | Liste d’allergènes |
| nutrition | TEXT(JSON) | Nutrition |

---

## 2) recipes

| Colonne | Type |
|---------|------|
| id | INTEGER |
| name | TEXT UNIQUE |
| data | TEXT (JSON) |

---

## 3) menus

| Colonne | Type |
|---------|------|
| id | INTEGER |
| name | TEXT UNIQUE |
| data | TEXT (JSON) |

---

## 4) options

| Colonne | Type |
|---------|------|
| id | INTEGER |
| data | TEXT(JSON) |

---

# 🧪 Commandes SQL Supportées

## ✔ Afficher toutes les tables
```
SHOW TABLES;
```

## ✔ Sélectionner des données
```
SELECT * FROM ingredients;
```

## ✔ Insérer un ingrédient
```
INSERT INTO ingredients 
(name, category, unit)
VALUES ('Riz', 'céréale', 'g');
```

## ✔ Mettre à jour
```
UPDATE ingredients SET price = 2.5 WHERE name='Riz';
```

## ✔ Supprimer
```
DELETE FROM ingredients WHERE name='Riz';
```

## ✔ Créer une table
```
CREATE TABLE test (id INTEGER PRIMARY KEY, nom TEXT);
```

## ✔ Supprimer une table
```
DROP TABLE test;
```

## ✔ Voir le schéma
```
PRAGMA table_info(ingredients);
```

## ✔ Nettoyer la base
```
VACUUM;
```

---

# 🍏 Exemples CRUD par Table

## INGREDIENTS

### ➕ Insérer
```
INSERT INTO ingredients
(name, supplier, unit, price, allergens, nutrition)
VALUES
('Lait', 'Metro', 'ml', 1.6, '["lait"]', '{"protein":3,"fat":1}');
```

### 📝 Mettre à jour
```
UPDATE ingredients SET price=1.8 WHERE name='Lait';
```

### ❌ Supprimer
```
DELETE FROM ingredients WHERE name='Lait';
```

### 🔍 Filtrer
```
SELECT * FROM ingredients WHERE category='viande';
```

---

## RECIPES (Recettes)

### ➕ Insérer
```
INSERT INTO recipes (name, data)
VALUES ('Pâtes', '{"ingredients":[{"name":"Pâtes","qty":200}]}');
```

### 📝 Mettre à jour
```
UPDATE recipes SET data='{"ingredients":[{"name":"Pâtes","qty":250}]}' WHERE name='Pâtes';
```

### ❌ Supprimer
```
DELETE FROM recipes WHERE name='Pâtes';
```

### 🔍 Lire
```
SELECT * FROM recipes;
```

---

## MENUS

### ➕ Insérer
```
INSERT INTO menus (name, data)
VALUES ('Menu_Semaine_1', '{"weekOffset":0,"grid":{}}');
```

### 📝 Mettre à jour
```
UPDATE menus SET data='{"weekOffset":1}' WHERE name='Menu_Semaine_1';
```

### ❌ Supprimer
```
DELETE FROM menus WHERE name='Menu_Semaine_1';
```

---

## OPTIONS

### 🔍 Lire
```
SELECT * FROM options;
```

### 📝 Mettre à jour
```
UPDATE options SET data='{"defaultLang":"fr"}' WHERE id=1;
```

---

# ⚠️ Conseils et Sécurité

- Les commandes SQL sont **immédiates** (aucun retour en arrière).  
- Vérifiez toujours les champs JSON.  
- Ne supprimez pas les tables principales sauf si vous savez ce que vous faites.  
- En cas de problème, utilisez **Importer Paramètres** pour restaurer.  

---

# 🎉 Félicitations !

Votre guide EasyList en français est prêt.

Si vous souhaitez :  
📄 une version PDF  
🌍 une version bilingue  
🖼 une version avec images  

Je peux vous la générer !
