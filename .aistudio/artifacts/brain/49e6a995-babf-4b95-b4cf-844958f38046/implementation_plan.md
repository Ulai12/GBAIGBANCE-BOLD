# Scanner de Billets Caméra Organisateur, Data Saver & Notifications Web Push PWA

Déploiement complet des trois piliers demandés pour Gbaigbance : le scanner de billets caméra continu pour le guichet organisateur avec retours sonore et haptique, le mode adaptatif Économie de Données (Data Saver) avec compression WebP/AVIF et suspension des animations lourdes, et le système de notifications Web Push PWA avec alertes in-app pour les rappels de billets (24h et 2h) et les nouvelles dates d'artistes suivis.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Les trois choix stratégiques ont été confirmés par l'utilisateur lors de la phase de clarification :
> 1. **Scanner de billets** : Mode continu rapide avec bip sonore et vibration haptique automatique après validation.
> 2. **Économie de données (Data Saver)** : Détection automatique intelligente (`navigator.connection.saveData` et réseaux 2G/3G) couplée à un bouton de contrôle manuel visible dans l'interface et les réglages.
> 3. **Notifications PWA & Rappels** : Double canal synchrone : Notifications Web Push natives (Service Worker) accompagnées du centre de notifications in-app pour un suivi sans faille.

---

### 1. Overview & Core Concept

- **Scanner Caméra Organisateur** : Un terminal de contrôle d'accès sur mobile et tablette permettant aux organisateurs d'événements de scanner les QR codes des billets à l'entrée avec auto-reprise fluide en 1.5s, haptique vibratoire, signaux audio Web Audio API, contrôle hors-ligne instantané avec cache préchargé et détection anti-doublon.
- **Performance & Économie de Données (Data Saver)** : Réduction drastique de la consommation réseau sur les connexions mobiles d'Afrique de l'Ouest (forfaits limités, 3G, Edge) : bascule automatique vers des images WebP/AVIF hautement compressées, désactivation des flous CSS complexes et animations gourmandes, avec indicateur visuel et interrupteur immédiat.
- **Notifications Web Push PWA & Rappels** : Engagement proactif des festivaliers et acheteurs de billets avec des rappels automatiques programmés (24h et 2h avant le début du concert ou festival) et des notifications push dès qu'un artiste favori annonce une nouvelle date.

---

### 2. User Experience & Visual Design

#### A. Scanner Caméra Organisateur
- **Accessibilité immédiate** : Tuile d'action rapide dans le Tableau de Bord Organisateur, bouton contextuel "Scanner le guichet" directement sur chaque carte d'événement avec présélection de l'événement, et raccourci dans la gestion d'événement.
- **Viseur tactile plein écran immersif** : Fenêtre de scan avec repères laser animés, sélecteur de caméra avant/arrière, commande torche/flash, indicateur de connexion direct (Vert = En ligne, Ambre = Mode Guichet Hors-ligne ⚡).
- **Feedback sensoriel instantané** :
  - **Billet Valide** : Chime mélodieux harmonieux (Web Audio API) + vibration courte de confirmation (`navigator.vibrate([60, 40, 60])`) + carte participant verte avec compte à rebours de reprise de scan rapide (1.5s).
  - **Billet Déjà Utilisé** : Double buzz avertisseur + flash ambre + heure du premier scan.
  - **Billet Faux ou Mauvais Événement** : Tonalité grave d'erreur + vibration longue d'alerte.
- **Outils de secours** : Onglet saisie manuelle du code à 8 caractères et importation photo de secours pour les écrans endommagés.

#### B. Mode Économie de Données (Data Saver)
- **Détection & Badge discret** : Détecte l'en-tête navigateur `navigator.connection.saveData` ou `effectiveType === '3g' | '2g' | 'slow-2g'`. Un badge discret "Mode Éco Data" s'affiche avec un switch rapide.
- **Optimisation des ressources graphiques** :
  - Les requêtes d'images Unsplash, Pexels et Cloudinary injectent automatiquement `q=45&fm=webp` avec des largeurs réduites (largeur max 480px au lieu de 1280px).
  - La balise `<picture>` active les variantes AVIF/WebP ultra-légères.
- **Suspension d'animations & allègement du DOM** :
  - Application de la classe globale `.gba-data-saver` qui désactive les particules de fond, gèle les canvas WebGL/Liquid Glass non essentiels et réduit les filtres `backdrop-blur`.

#### C. Notifications Web Push PWA & Rappels
- **Centre de Réglages Dédié** : Dans `NotificationSettingsScreen`, switch interactif Web Push PWA avec bouton "Activer les notifications du téléphone" déclenchant `Notification.requestPermission()`.
- **Rappels automatiques 24h & 2h** :
  - Analyse locale et périodique des billets actifs de l'utilisateur.
  - Déclenchement d'une notification push native du navigateur ("Rappel : Votre concert commence dans 2h !") avec deep link direct vers le billet interactif.
- **Alerte Artiste Suivi** :
  - Écoute temps-réel des nouveaux événements : si l'artiste ou le co-organisateur figure dans `followedArtistIds`, envoi immédiat d'une notification push et insertion dans le tiroir de notifications.

---

### 3. Key Product Decisions & Trade-Offs

- **Résolution du Scanner dans le Dashboard** :
  - *Constat* : `TicketScannerModal` était déjà importé dans `OrganizerDashboardScreen.tsx` mais n'était pas monté dans le JSX de retour, empêchant l'ouverture du modal lors du clic sur le bouton "Ouvrir".
  - *Solution* : Monter le composant avec ses props complètes (`open`, `onClose`, `events`, `initialEventId`, `onToast`), et ajouter un bouton de scan direct sur chaque carte d'événement.
- **Synthèse Sonore Zéro Dépendance Lourde** :
  - *Choix* : Utiliser l'API native `AudioContext` (oscillateurs sinusoïdaux synthétisés) sans nécessiter de fichiers MP3 distants qui risqueraient d'échouer hors-ligne ou sur réseau 2G/3G lent.
- **Contrôle Data Saver Hybride** :
  - *Choix* : Détection automatique par défaut, mais avec persistance locale du choix forcé par l'utilisateur (`auto`, `forced_on`, `forced_off`) via un hook `useDataSaver` et un toggle accessible dans l'en-tête et les paramètres.
- **Compatibilité Web Push Multi-Navigateurs** :
  - *Choix* : Gestion conjointe du Service Worker (`self.registration.showNotification`) et du constructeur direct `new Notification()` avec fallbacks fluides pour les appareils ne supportant pas les Push API en environnement sandboxed.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GBAIGBANCE APP SHELL                              │
└───────┬──────────────────────────────────┬──────────────────────────┬───────┘
        │                                  │                          │
        ▼                                  ▼                          ▼
┌──────────────────┐             ┌──────────────────┐       ┌─────────────────┐
│ TicketScanner    │             │ DataSaverContext │       │ WebPushService  │
│ (Caméra/Guichet) │             │ (Économie Data)  │       │ & Reminders     │
└───────┬──────────┘             └─────────┬────────┘       └────────┬────────┘
        │                                  │                         │
   ┌────┴──────────────────────────┐       │                         │
   │ • Web Audio Chime             │       │                         │
   │ • Fast Scan Loop (1.5s resume)│       │                         │
   │ • Offline SQLite/LS Cache     │       │                         │
   │ • Flashlight & Haptics        │       │                         │
   └───────────────────────────────┘       │                         │
                                           ▼                         ▼
                           ┌────────────────────────┐  ┌───────────────────────┐
                           │ • SmartImage (q=45)    │  │ • Push Worker         │
                           │ • CSS reduced motion   │  │ • 24h & 2h Reminders  │
                           │ • navigator.connection │  │ • Artist Date Alerts  │
                           └────────────────────────┘  └───────────────────────┘
```

#### Fichiers et Composants Clés Impactés
1. **`src/components/TicketScannerModal.tsx`** :
   - Ajout du mode continu ultra-rapide (délais 1.5s configurables), signaux haptiques consolidés, indicateur visuel de flash et boutons de filtrage d'événements.
2. **`src/screens/OrganizerDashboardScreen.tsx`** :
   - Intégration et montage du composant `TicketScannerModal`, liaison des boutons d'ouverture rapide et raccourci par événement.
3. **`src/contexts/DataSaverContext.tsx` & `src/hooks/useDataSaver.ts`** :
   - Détection réseau (`saveData`, `effectiveType`), gestion de l'état, synchronisation avec le document DOM.
4. **`src/components/SmartImage.tsx` & `src/utils/imageOptimizer.ts`** :
   - Prise en compte du mode Data Saver pour charger des résolutions et qualités compressées WebP/AVIF.
5. **`src/components/DataSaverToggle.tsx`** :
   - Bouton de bascule intuitif et discret accessible dans l'interface et l'écran des paramètres.
6. **`src/services/pushNotificationService.ts` & `src/services/eventReminderService.ts`** :
   - Gestion des permissions Web Push, enregistrement du Service Worker, déclencheur de rappels automatiques (24h et 2h) et surveillance des nouvelles dates des artistes suivis.
7. **`src/screens/NotificationSettingsScreen.tsx`** :
   - Toggle interactif Web Push PWA avec bouton de test en direct.
