# MarketShift Pro - Guide de Configuration du Local MT5 Bridge

Ce guide vous explique comment configurer l'architecture locale (sans passer par le cloud MetaApi) pour connecter directement l'application MarketShift Pro sur votre smartphone à votre logiciel MetaTrader 5 (MT5) tournant sur votre ordinateur Windows.

## Pourquoi utiliser le Local Bridge ?
- **Gratuit :** Pas d'abonnement mensuel MetaApi (Cloud) requis.
- **Ultra-rapide :** La latence de communication passe par votre réseau Wi-Fi local (~10ms).
- **IA Locale :** L'ordinateur exécute l'intelligence artificielle (XGBoost/MLP) en utilisant sa pleine puissance.

## ⚠️ Prérequis
1. Un ordinateur sous Windows avec **MetaTrader 5 (MT5)** installé (ex: XMGlobal).
2. Un compte de trading (Demo ou Réel) connecté sur MT5.
3. **Python 3.10 ou +** installé sur Windows (N'oubliez pas de cocher la case "Add Python to PATH" lors de l'installation).

---

## 🛠️ Étape 1 : Installation du Moteur Python

1. Ouvrez une invite de commande (PowerShell ou CMD).
2. Naviguez vers le dossier de votre projet :
   ```bash
   cd "C:\Users\VOTRE_NOM\Documents\GitHub\marketshift-pro-v3.4 apk\local-mt5-bridge"
   ```
3. Installez les dépendances requises pour l'API et l'Intelligence Artificielle :
   ```bash
   pip install -r requirements.txt
   ```
   *Note : L'installation peut prendre 2 à 5 minutes (chargement de xgboost, scikit-learn, etc).*

---

## 🚀 Étape 2 : Lancement du Serveur

1. Assurez-vous que **MetaTrader 5 est bien OUVERT** et visible à l'écran.
2. Dans votre terminal, lancez le serveur FastAPI :
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
3. Le terminal doit afficher :
   > `Connected to MetaTrader 5!`
   > `Application startup complete.`

Si vous rencontrez l'erreur `IPC timeout`, cela signifie que MT5 n'est pas ouvert ou est "gelé". Fermez MT5, rouvrez-le, et relancez la commande uvicorn.

---

## 📱 Étape 3 : Connexion sur le Smartphone

1. Pour trouver l'adresse IP de votre PC, ouvrez un deuxième terminal et tapez `ipconfig`. Cherchez la ligne **Adresse IPv4** (ex: `192.168.100.16`).
2. Ouvrez l'application MarketShift Pro sur votre téléphone Android.
3. Allez dans les **Paramètres (⚙️) > Onglet "Connexion MT5"**.
4. Activez le bouton **Local Python**.
5. Dans le champ d'adresse IP, tapez l'IP suivie du port 8000 :
   **`192.168.100.16:8000`**
6. Cliquez sur **Enregistrer**.

Le tableau de bord affichera instantanément votre vrai solde, et le moteur d'intelligence artificielle locale commencera à vous envoyer ses signaux de trading sur toutes vos paires !

---

## 🧠 Utilisation de l'Intelligence Artificielle

Le bridge local inclut désormais `ml_engine.py`.
Au démarrage (`uvicorn`), l'IA s'entraîne automatiquement sur un historique court pour s'adapter à la dynamique de marché actuelle (toutes les paires).
Si vous souhaitez **ré-entraîner le modèle** de manière approfondie sur le long terme :
- Laissez le serveur tourner, il s'ajuste périodiquement.
- (Optionnel) Un script dédié d'entraînement profond (Deep Learning) sera mis à disposition dans le futur.
