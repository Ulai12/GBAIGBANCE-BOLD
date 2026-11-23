# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD.

## Tâche active

**P0** — Restaurer HomeScreen.tsx **intégral** depuis commit `7387901` (blob `ba5e0ad6`).

## Contexte

- Dernière version complète (~49,5 ko / 1117 lignes) : **7387901** (`src/screens/HomeScreen.tsx`).
- Les commits i18n 7d917cc3 / c1ba934e n’ont touché que les JSON locales.
- Le commit 7964b19 a tronqué le TS (placeholder).
- Le connecteur GitHub plafonne ~17 ko par push de fichier → impossible de re-pousser les 50 ko via l’API outil.

## Restauration manuelle (propriétaire)

```bash
git fetch origin FRONTEND-iA
git checkout FRONTEND-iA
git checkout 7387901 -- src/screens/HomeScreen.tsx
git commit -m "fix(home): restaurer HomeScreen intégral depuis 7387901"
git push origin FRONTEND-iA
```

Fichier local de secours (sandbox) : `artifacts/HomeScreen.tsx.full_from_7387901`

## État actuel distant

Version stabilité ~16–17 ko (salutations + sections principales + catégories explorer + chargement). **Pas** le fichier complet d’origine.

## Prochaine étape

1. Propriétaire : exécuter les 5 commandes git ci-dessus.
2. Ensuite seulement : re-appliquer i18n des salutations/en-têtes sans tronquer.

## Historique

- 2026-11-19 — Tentatives de restore via connecteur (limite taille).
- 2026-11-19 — Clés homeScreen FR/EN OK.
- 2026-11-18 — ProfileScreen / TicketsScreen.
