import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PREVIEW_DIR = path.resolve(__dirname, '../dist/preview');
const PUBLIC_PREVIEW_DIR = path.resolve(__dirname, '../public/preview');

interface ScreenMeta {
  filename: string;
  title: string;
  category: string;
  description: string;
  route: string;
  badge: string;
}

const SCREENS: ScreenMeta[] = [
  {
    filename: 'accueil.html',
    title: 'Accueil & Découverte',
    category: 'Principal',
    description: 'Flux principal d’événements en vedette, sorties populaires, catégories dynamiques, artistes et organisateurs vérifiés.',
    route: '/',
    badge: 'Essentiel',
  },
  {
    filename: 'explorer.html',
    title: 'Explorer & Recherche',
    category: 'Découverte',
    description: 'Moteur de recherche multicritère : filtres par ville (Lomé, Cotonou, Abidjan), dates, gratuité, catégories et tri par popularité.',
    route: '/explore',
    badge: 'Recherche',
  },
  {
    filename: 'detail-evenement.html',
    title: 'Détail d’Événement',
    category: 'Événement',
    description: 'Fiche descriptive détaillée : programmation, artistes, tarifs en FCFA (Accès Libre, Standard, VIP), lieu géolocalisé et réservation.',
    route: '/events/:id',
    badge: 'Fiche Complète',
  },
  {
    filename: 'paiement.html',
    title: 'Paiement Mobile Money',
    category: 'Transaction',
    description: 'Tunnel de réservation et de paiement sécurisé adapté à l’Afrique de l’Ouest : T-Money, Moov Flooz et MTN MoMo.',
    route: '/checkout',
    badge: 'Fintech XOF',
  },
  {
    filename: 'confirmation.html',
    title: 'Confirmation & Billet QR Code',
    category: 'Transaction',
    description: 'Écran de confirmation d’achat, pass d’accès digitalisé avec QR Code infalsifiable sécurisé, téléchargement PDF et synchronisation calendrier.',
    route: '/confirmation',
    badge: 'Billet Digital',
  },
  {
    filename: 'mes-billets.html',
    title: 'Mes Billets & Pass d’Accès',
    category: 'Utilisateur',
    description: 'Portefeuille de billets actifs et passés, statut de validation aux portes, détails des concerts et contrôle d’accès sans connexion.',
    route: '/tickets',
    badge: 'Portefeuille',
  },
  {
    filename: 'favoris.html',
    title: 'Favoris & Abonnements',
    category: 'Utilisateur',
    description: 'Espace personnel regroupant les événements likés, les artistes préférés suivis et les organisations abonnées avec alertes billetterie.',
    route: '/favorites',
    badge: 'Interactions',
  },
  {
    filename: 'abonnements.html',
    title: 'Abonnements & Suivis',
    category: 'Social',
    description: 'Gestion des artistes, créateurs et organisateurs ouest-africains suivis avec options de notifications et statistiques de communauté.',
    route: '/subscriptions',
    badge: 'Communauté',
  },
  {
    filename: 'profil.html',
    title: 'Profil & Compte',
    category: 'Utilisateur',
    description: 'Espace utilisateur : badges d’organisateur/artiste vérifié, compteurs réels de billets et abonnements, préférences linguistiques et thème.',
    route: '/profile',
    badge: 'Compte',
  },
  {
    filename: 'connexion.html',
    title: 'Authentification & Accès Invité',
    category: 'Accès',
    description: 'Formulaire de connexion et d’inscription par email, sélecteur de rôle (Participant, Organisateur, Artiste) et mode invité sans compte.',
    route: '/login',
    badge: 'Sécurité',
  },
  {
    filename: 'creer-evenement.html',
    title: 'Création d’Événement',
    category: 'Organisateur',
    description: 'Assistant multi-étapes pour les organisateurs : informations générales, dates et horaires, lieu à Lomé/Cotonou, grille tarifaire et affiche.',
    route: '/events/create',
    badge: 'Créateur',
  },
  {
    filename: 'tableau-de-bord-organisateur.html',
    title: 'Tableau de Bord Organisateur',
    category: 'Organisateur',
    description: 'Console d’administration pour les créateurs d’événements : chiffre d’affaires en FCFA, jauges de billets vendus et lanceur de scanner QR.',
    route: '/dashboard/organizer',
    badge: 'Analytics',
  },
];

const CSS_STYLES = `
  :root {
    --primary: #6600FF;
    --primary-hover: #5500D9;
    --primary-light: #F2ECFF;
    --success: #10B981;
    --bg-light: #F8F7FC;
    --surface-light: #FFFFFF;
    --text-dark: #14121F;
    --text-muted: #645E73;
    --border-light: rgba(20, 18, 31, 0.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-light: #0D0B14;
      --surface-light: #161322;
      --text-dark: #F5F3FC;
      --text-muted: #9E97B0;
      --border-light: rgba(255, 255, 255, 0.08);
      --primary-light: rgba(102, 0, 255, 0.15);
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-light);
    color: var(--text-dark);
    line-height: 1.6;
    padding: 24px 16px 64px 16px;
    -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 960px; margin: 0 auto; }
  header.site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 32px;
  }
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
    background: var(--primary-light);
    padding: 6px 12px;
    border-radius: 999px;
    text-decoration: none;
  }
  .nav-back {
    color: var(--text-muted);
    font-size: 14px;
    text-decoration: none;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .nav-back:hover { color: var(--primary); }
  h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 12px; color: var(--text-dark); }
  h2 { font-size: 20px; font-weight: 700; margin-top: 28px; margin-bottom: 16px; color: var(--text-dark); }
  h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text-dark); }
  p { color: var(--text-muted); font-size: 15px; margin-bottom: 16px; }
  .card {
    background: var(--surface-light);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
  .pill {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: var(--primary-light);
    color: var(--primary);
  }
  .pill-green { background: rgba(16, 185, 129, 0.12); color: #059669; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: #FFFFFF;
    font-weight: 700;
    font-size: 15px;
    padding: 12px 24px;
    border-radius: 999px;
    border: none;
    text-decoration: none;
    cursor: default;
    gap: 8px;
  }
  .btn-outline {
    background: transparent;
    color: var(--text-dark);
    border: 1px solid var(--border-light);
  }
  .stat-val { font-size: 24px; font-weight: 800; color: var(--text-dark); }
  .stat-lbl { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; color: var(--text-dark); }
  input, select, textarea {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border-light);
    background: var(--surface-light);
    color: var(--text-dark);
    font-size: 14px;
    outline: none;
  }
  ul.feature-list { list-style: none; }
  ul.feature-list li {
    padding: 10px 0;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  ul.feature-list li:last-child { border-bottom: none; }
  footer.site-footer {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--border-light);
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
  }
`;

function wrapHtml(title: string, bodyContent: string, currentRoute?: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Aperçu Statique Gbaigbance</title>
  <meta name="description" content="Snapshot HTML statique sémantique de l'écran ${title} pour Gbaigbance." />
  <meta name="robots" content="noindex, nofollow" />
  <style>${CSS_STYLES}</style>
</head>
<body>
  <div class="container">
    <header class="site-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="brand-badge">⚡ GBAIGBANCE PREVIEW</span>
        ${currentRoute ? `<span class="pill" style="font-size: 11px;">Route : ${currentRoute}</span>` : ''}
      </div>
      <nav>
        <a href="index.html" class="nav-back">← Sommaire des Écrans</a>
      </nav>
    </header>

    <main>
      ${bodyContent}
    </main>

    <footer class="site-footer">
      <p>Gbaigbance — Aperçu HTML Statique Sémantique généré pour agents IA & moteurs d’indexation sans JavaScript.</p>
      <p>Devise : Franc CFA (XOF) · Villes couvertes : Lomé (Togo), Cotonou (Bénin), Abidjan (Côte d’Ivoire).</p>
    </footer>
  </div>
</body>
</html>`;
}

// 1. Écran Accueil
function generateAccueilHtml(): string {
  return wrapHtml('Accueil & Découverte', `
    <!-- En-tête officiel de l'application -->
    <header class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 16px; letter-spacing: -0.01em;">GBAIGBANCE</strong>
            <span class="pill" style="font-size: 10px;">Billetterie & Événements</span>
          </div>
          <h1 style="margin-top: 10px; font-size: 22px;">Bonjour Invité 👋</h1>
          <p style="font-size: 13px; margin-bottom: 0; color: var(--text-muted);">Trouve ta prochaine sortie</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="profil.html" class="btn btn-outline" style="font-size: 12px; padding: 6px 14px;">Profil</a>
        </div>
      </div>

      <!-- Barre de recherche -->
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <input type="search" placeholder="Concerts, soirées, festivals..." value="" style="flex: 1;" readonly />
        <a href="explorer.html" class="btn" style="padding: 10px 18px; font-size: 13px;">Rechercher</a>
      </div>
    </header>

    <!-- Section En Vedette -->
    <h2>En Vedette</h2>
    <section class="card" style="background: linear-gradient(135deg, rgba(102,0,255,0.08) 0%, rgba(16,185,129,0.05) 100%);">
      <span class="pill pill-green">Concert Officiel Vérifié</span>
      <h2 style="margin-top: 12px; font-size: 20px;">Concert Live Démo</h2>
      <p>Grande soirée musicale live au Palais des Congrès de Lomé avec des prestations d'artistes en direct.</p>
      <div style="display: flex; gap: 16px; align-items: center; margin-top: 12px; flex-wrap: wrap; font-size: 14px;">
        <div><strong>Date :</strong> Samedi 24 Octobre 2026 à 18h00</div>
        <div><strong>Lieu :</strong> Palais des Congrès de Lomé, Togo</div>
        <div><strong>Tarif :</strong> À partir de 5 000 FCFA</div>
      </div>
      <div style="margin-top: 18px;">
        <a href="detail-evenement.html" class="btn">Prendre un billet →</a>
      </div>
    </section>

    <!-- Catégories d'Événements -->
    <h2>Catégories d'Événements</h2>
    <div class="grid-3">
      <div class="card" style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">🎵</div>
        <h3>Concerts & Live</h3>
        <p style="font-size: 13px; margin-bottom: 0;">Performances live & scènes ouvertes</p>
      </div>
      <div class="card" style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">🎪</div>
        <h3>Festivals</h3>
        <p style="font-size: 13px; margin-bottom: 0;">Festivals artistiques et culturels</p>
      </div>
      <div class="card" style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">💼</div>
        <h3>Conférences & Tech</h3>
        <p style="font-size: 13px; margin-bottom: 0;">Rencontres professionnelles & ateliers</p>
      </div>
    </div>

    <!-- Sorties populaires à Lomé -->
    <h2>Sorties populaires à Lomé</h2>
    <div class="grid-2">
      <article class="card">
        <span class="pill pill-green">5 000 FCFA</span>
        <h3 style="margin-top: 10px;">Concert Live Démo</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">📍 Palais des Congrès de Lomé · Samedi 24 Octobre 2026 à 18h00</p>
        <p style="font-size: 13px;">Soirée musicale en direct réunissant Artiste Démo 1 et Artiste Démo 2.</p>
        <a href="detail-evenement.html" class="btn btn-outline" style="width: 100%; margin-top: 8px; justify-content: center;">Voir l'événement</a>
      </article>

      <article class="card">
        <span class="pill">Gratuit</span>
        <h3 style="margin-top: 10px;">Forum Démo Culture & Innovation</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">📍 Centre Culturel de Lomé · Vendredi 23 Octobre 2026</p>
        <p style="font-size: 13px;">Tables rondes et expositions interactives ouvertes au grand public.</p>
        <a href="detail-evenement.html" class="btn btn-outline" style="width: 100%; margin-top: 8px; justify-content: center;">Voir l'événement</a>
      </article>
    </div>

    <!-- Artistes en vogue -->
    <h2>Artistes en vogue</h2>
    <div class="grid-2">
      <div class="card">
        <h3>Artiste Démo 1</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 0;">Musique Live · Lomé, Togo</p>
      </div>
      <div class="card">
        <h3>Artiste Démo 2</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 0;">Afro Fusion · Cotonou, Bénin</p>
      </div>
    </div>

    <!-- Barre de Navigation Inférieure (BottomNav) -->
    <nav class="card" style="margin-top: 32px; background: var(--surface-light); border-top: 2px solid var(--primary-light);">
      <div style="display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: 700;">
        <a href="accueil.html" style="color: var(--primary); text-decoration: none;">🏠 Accueil</a>
        <a href="explorer.html" style="color: var(--text-muted); text-decoration: none;">🔍 Explorer</a>
        <a href="mes-billets.html" style="color: var(--text-muted); text-decoration: none;">🎟️ Billets</a>
        <a href="favoris.html" style="color: var(--text-muted); text-decoration: none;">❤️ Favoris</a>
        <a href="profil.html" style="color: var(--text-muted); text-decoration: none;">👤 Profil</a>
      </div>
    </nav>
  `, '/');
}

// 2. Écran Explorer & Recherche
function generateExplorerHtml(): string {
  return wrapHtml('Explorer & Recherche', `
    <h1>Rechercher une sortie</h1>
    <p>Trouve des concerts, festivals et conférences en Afrique de l'Ouest selon tes critères.</p>

    <div class="card">
      <form action="#" method="get">
        <div class="form-group">
          <label for="search-input">Mots-clés, artiste, lieu ou événement</label>
          <input type="text" id="search-input" name="q" placeholder="Ex: Concert live, Palais des Congrès..." value="Concert Lomé" />
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label for="city-select">Ville</label>
            <select id="city-select" name="city">
              <option value="lome" selected>Lomé (Togo)</option>
              <option value="cotonou">Cotonou (Bénin)</option>
              <option value="abidjan">Abidjan (Côte d'Ivoire)</option>
              <option value="all">Toutes les villes</option>
            </select>
          </div>

          <div class="form-group">
            <label for="category-select">Catégorie</label>
            <select id="category-select" name="category">
              <option value="all" selected>Toutes catégories</option>
              <option value="concert">Concert & Musique</option>
              <option value="festival">Festival & Culture</option>
              <option value="nightlife">Soirée & Nightlife</option>
              <option value="conference">Conférence & Formation</option>
            </select>
          </div>

          <div class="form-group">
            <label for="price-select">Tarif</label>
            <select id="price-select" name="price">
              <option value="all" selected>Tous les prix</option>
              <option value="free">Gratuit</option>
              <option value="under_5000">Moins de 5 000 FCFA</option>
              <option value="vip">Pass VIP</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn" style="margin-top: 8px;">Filtrer les événements</button>
      </form>
    </div>

    <h2>Résultats de Recherche (4 Événements Trouvés)</h2>
    <div class="grid-2">
      <article class="card">
        <span class="pill pill-green">5 000 FCFA</span>
        <h3 style="margin-top: 10px;">Afro Fusion Festival 2026</h3>
        <p style="font-size: 14px;">Grande scène extérieure avec les meilleurs DJs togolais et béninois.</p>
        <p style="font-size: 12px; color: var(--text-muted);">Vendredi 18 Septembre 2026 · Plage de Lomé (Face Hôtel de la Paix)</p>
      </article>

      <article class="card">
        <span class="pill">Gratuit</span>
        <h3 style="margin-top: 10px;">Exposition d’Art Contemporain Vodoun & Modernité</h3>
        <p style="font-size: 14px;">Vernissage et visite guidée au Centre Culturel Français de Cotonou.</p>
        <p style="font-size: 12px; color: var(--text-muted);">Du 10 au 15 Octobre 2026 · Cotonou, Bénin</p>
      </article>
    </div>
  `, '/explore');
}

// 3. Écran Détail d'un événement
function generateDetailEvenementHtml(): string {
  return wrapHtml('Détail d’Événement', `
    <article class="card">
      <span class="pill pill-green">Concert Officiel Vérifié</span>
      <h1 style="margin-top: 12px;">Concert Live Démo</h1>
      <p style="font-size: 16px; color: var(--text-dark); font-weight: 500;">
        Grande soirée musicale live au Palais des Congrès de Lomé avec des prestations d'artistes en direct, son immersif et scénographie soignée.
      </p>

      <hr style="border: 0; border-top: 1px solid var(--border-light); margin: 20px 0;" />

      <div class="grid-3">
        <div>
          <div class="stat-lbl">📅 Date & Heure</div>
          <div style="font-weight: 700; margin-top: 4px;">Samedi 24 Octobre 2026</div>
          <div style="font-size: 13px; color: var(--text-muted);">Ouverture des portes : 18h00</div>
        </div>
        <div>
          <div class="stat-lbl">📍 Lieu & Ville</div>
          <div style="font-weight: 700; margin-top: 4px;">Palais des Congrès de Lomé</div>
          <div style="font-size: 13px; color: var(--text-muted);">Avenue de la Libération, Lomé, Togo</div>
        </div>
        <div>
          <div class="stat-lbl">🎟️ Organisateur</div>
          <div style="font-weight: 700; margin-top: 4px;">Organisateur Démo</div>
          <div style="font-size: 13px; color: var(--success);">✓ Organisateur Vérifié</div>
        </div>
      </div>

      <h2 style="margin-top: 32px;">Options de Billets Disponibles</h2>
      <ul class="feature-list">
        <li>
          <div>
            <strong>Pass Standard</strong>
            <div style="font-size: 13px; color: var(--text-muted);">Accès fosse générale, écran géant et zone bar</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 18px; color: var(--primary);">5 000 FCFA</div>
            <a href="paiement.html" class="btn" style="padding: 6px 16px; font-size: 13px; margin-top: 4px;">Réserver</a>
          </div>
        </li>
        <li>
          <div>
            <strong>Pass VIP</strong>
            <div style="font-size: 13px; color: var(--text-muted);">Place assise réservée au premier rang, coupe-file & boisson offerte</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 18px; color: var(--primary);">15 000 FCFA</div>
            <a href="paiement.html" class="btn" style="padding: 6px 16px; font-size: 13px; margin-top: 4px;">Réserver</a>
          </div>
        </li>
      </ul>

      <h2 style="margin-top: 28px;">Artistes Confirmés</h2>
      <div class="grid-2">
        <div style="padding: 12px; border: 1px solid var(--border-light); border-radius: 12px;">
          <strong>Artiste Démo 1</strong>
          <p style="font-size: 13px; margin-bottom: 0;">Performeur Live · Lomé, Togo</p>
        </div>
        <div style="padding: 12px; border: 1px solid var(--border-light); border-radius: 12px;">
          <strong>Artiste Démo 2</strong>
          <p style="font-size: 13px; margin-bottom: 0;">Afro Fusion · Cotonou, Bénin</p>
        </div>
      </div>

      <!-- Barre d'action sticky en bas d'écran conforme au vrai EventDetailScreen -->
      <div style="margin-top: 32px; padding: 16px; border-radius: 16px; background: var(--surface-light); border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">À partir de</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-dark);">5 000 FCFA</div>
        </div>
        <a href="paiement.html" class="btn">Prendre un billet</a>
      </div>
    </article>
  `, '/events/:id');
}

// 4. Écran Tunnel de Paiement & Mobile Money
function generatePaiementHtml(): string {
  return wrapHtml('Paiement Mobile Money', `
    <h1>Réserver votre place</h1>
    <p>Sélectionnez votre billet et réglez instantanément via votre compte Mobile Money habituel.</p>

    <div class="card">
      <h2>Récapitulatif de la commande</h2>
      <ul class="feature-list">
        <li>
          <span>Événement : Concert Live Démo</span>
          <strong>Palais des Congrès de Lomé</strong>
        </li>
        <li>
          <span>Date : Samedi 24 Octobre 2026 à 18h00</span>
          <strong>Lomé, Togo</strong>
        </li>
        <li>
          <span>Catégorie sélectionnée : Pass Standard (x2)</span>
          <strong>10 000 FCFA</strong>
        </li>
        <li>
          <span>Frais de service billetterie</span>
          <strong style="color: var(--success);">Inclus (0 FCFA)</strong>
        </li>
        <li style="font-size: 18px; font-weight: 800;">
          <span>Total à payer</span>
          <span style="color: var(--primary);">10 000 FCFA</span>
        </li>
      </ul>

      <h2 style="margin-top: 24px;">Coordonnées de l'acheteur</h2>
      <form action="confirmation.html" method="get">
        <div class="grid-2">
          <div class="form-group">
            <label for="buyer-name">Nom et Prénom</label>
            <input type="text" id="buyer-name" name="name" value="Koffi Mensah" required />
          </div>
          <div class="form-group">
            <label for="buyer-email">Adresse Email (pour recevoir le billet)</label>
            <input type="email" id="buyer-email" name="email" value="koffi.mensah@example.com" required />
          </div>
        </div>

        <h2 style="margin-top: 16px;">Choisissez votre moyen de paiement Mobile Money</h2>
        <div class="grid-3" style="margin-bottom: 24px;">
          <label style="border: 2px solid var(--primary); border-radius: 12px; padding: 14px; display: block; cursor: pointer; background: var(--primary-light);">
            <input type="radio" name="payment_method" value="tmoney" checked style="width: auto; margin-right: 6px;" />
            <strong>T-Money</strong>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Togocom (Togo)</div>
          </label>

          <label style="border: 1px solid var(--border-light); border-radius: 12px; padding: 14px; display: block; cursor: pointer;">
            <input type="radio" name="payment_method" value="flooz" style="width: auto; margin-right: 6px;" />
            <strong>Moov Flooz</strong>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Moov (Togo, Bénin & CI)</div>
          </label>

          <label style="border: 1px solid var(--border-light); border-radius: 12px; padding: 14px; display: block; cursor: pointer;">
            <input type="radio" name="payment_method" value="momo" style="width: auto; margin-right: 6px;" />
            <strong>MTN MoMo</strong>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">MTN Mobile Money (Bénin)</div>
          </label>
        </div>

        <div class="form-group">
          <label for="phone-number">Numéro de téléphone Mobile Money</label>
          <input type="tel" id="phone-number" name="phone" value="+228 90 00 00 00" />
        </div>

        <div style="display: flex; gap: 12px; align-items: center; margin-top: 24px;">
          <a href="confirmation.html" class="btn" style="flex: 1; text-align: center;">Confirmer la réservation (10 000 FCFA)</a>
        </div>
      </form>
    </div>
  `, '/checkout');
}

// 5. Écran Confirmation & Billet QR Code
function generateConfirmationHtml(): string {
  return wrapHtml('Confirmation & Billet QR Code', `
    <div class="card" style="text-align: center; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.02);">
      <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
      <span class="pill pill-green">Paiement Validé avec Succès</span>
      <h1 style="margin-top: 12px;">Votre réservation est confirmée !</h1>
      <p>Un email de confirmation avec votre billet électronique a été envoyé à <strong>koffi.mensah@example.com</strong>.</p>
      <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: var(--primary); margin: 12px 0;">
        RÉFÉRENCE BILLET : GBA-DEMO-2026-001
      </div>
    </div>

    <div class="card">
      <h2>Votre Billet d'Entrée Sécurisé</h2>
      <div class="grid-2" style="align-items: center;">
        <div style="text-align: center; padding: 24px; border: 2px dashed var(--border-light); border-radius: 16px;">
          <div style="font-size: 72px;">📱</div>
          <div style="font-weight: 800; font-size: 14px; margin-top: 8px;">PASS D'ACCÈS NUMÉRIQUE</div>
          <div style="font-size: 12px; color: var(--text-muted);">QR Code crypté valide pour 2 entrées</div>
        </div>

        <div>
          <h3>Concert Live Démo</h3>
          <p style="font-size: 14px; margin-bottom: 8px;"><strong>Date :</strong> Samedi 24 Octobre 2026 à 18h00</p>
          <p style="font-size: 14px; margin-bottom: 8px;"><strong>Lieu :</strong> Palais des Congrès de Lomé, Togo</p>
          <p style="font-size: 14px; margin-bottom: 8px;"><strong>Titulaire :</strong> Koffi Mensah (2 places Pass Standard)</p>
          <p style="font-size: 14px; margin-bottom: 16px;"><strong>Statut :</strong> <span class="pill pill-green">VALIDE</span></p>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="mes-billets.html" class="btn">Accéder à mes billets</a>
            <button type="button" class="btn btn-outline">Télécharger le PDF</button>
          </div>
        </div>
      </div>
    </div>
  `, '/confirmation');
}

// 6. Écran Mes Billets
function generateMesBilletsHtml(): string {
  return wrapHtml('Mes Billets & Pass', `
    <h1>Mes Billets & Réservations</h1>
    <p>Retrouvez vos titres d'accès sécurisés, prêts pour le scan à l'entrée des salles même sans réseau Internet.</p>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
        <span class="pill pill-green">VALIDE</span>
        <span style="font-family: monospace; font-size: 12px; color: var(--text-muted);">REF: GBA-DEMO-2026-001</span>
      </div>
      <h2>Concert Live Démo</h2>
      <p style="font-size: 14px; margin-bottom: 8px;">📍 Palais des Congrès de Lomé · Samedi 24 Octobre 2026 à 18h00</p>
      <p style="font-size: 14px; margin-bottom: 16px;">Tarif : 2 x Pass Standard (10 000 FCFA)</p>
      <div style="display: flex; gap: 12px;">
        <a href="confirmation.html" class="btn" style="font-size: 13px; padding: 8px 16px;">Afficher le QR Code</a>
        <button type="button" class="btn btn-outline" style="font-size: 13px; padding: 8px 16px;">Ajouter à l'agenda</button>
      </div>
    </div>

    <h2>Historique des Sorties Passées</h2>
    <div class="card" style="opacity: 0.85;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="pill" style="background: rgba(100,94,115,0.12); color: var(--text-muted);">Terminé</span>
        <span style="font-size: 12px; color: var(--text-muted);">12 Juillet 2026</span>
      </div>
      <h3>Festival Démo Culturel</h3>
      <p style="font-size: 13px; margin-bottom: 0;">Centre Culturel de Lomé · Billet utilisé</p>
    </div>
  `, '/tickets');
}

// 7. Écran Favoris
function generateFavorisHtml(): string {
  return wrapHtml('Favoris & Abonnements', `
    <h1>Vos Favoris & Suivis</h1>
    <p>Toutes vos sorties coup de cœur, artistes et organisateurs suivis au même endroit.</p>

    <div style="display: flex; gap: 8px; margin-bottom: 24px;">
      <span class="pill" style="padding: 8px 16px; font-size: 14px; background: var(--primary); color: white;">Événements (2)</span>
      <span class="pill" style="padding: 8px 16px; font-size: 14px; background: var(--primary-light); color: var(--primary);">Artistes (2)</span>
      <span class="pill" style="padding: 8px 16px; font-size: 14px; background: var(--primary-light); color: var(--primary);">Organisateurs (1)</span>
    </div>

    <h2>Événements Enregistrés</h2>
    <div class="grid-2">
      <article class="card">
        <span class="pill">Samedi 24 Octobre 2026 à 18h00</span>
        <h3 style="margin-top: 10px;">Concert Live Démo</h3>
        <p style="font-size: 13px;">Palais des Congrès de Lomé · À partir de 5 000 FCFA</p>
        <a href="detail-evenement.html" class="btn btn-outline" style="width: 100%; margin-top: 8px;">Voir la billetterie</a>
      </article>

      <article class="card">
        <span class="pill pill-green">Gratuit</span>
        <h3 style="margin-top: 10px;">Forum Démo Culture & Innovation</h3>
        <p style="font-size: 13px;">Centre Culturel de Lomé · Entrée libre</p>
        <a href="detail-evenement.html" class="btn btn-outline" style="width: 100%; margin-top: 8px;">Voir la billetterie</a>
      </article>
    </div>

    <h2>Artistes & Créateurs Suivis</h2>
    <div class="grid-2">
      <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h3>Artiste Démo 1</h3>
          <p style="font-size: 13px; margin-bottom: 0;">Lomé, Togo</p>
        </div>
        <span class="pill pill-green">Abonné ✓</span>
      </div>

      <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h3>Artiste Démo 2</h3>
          <p style="font-size: 13px; margin-bottom: 0;">Cotonou, Bénin</p>
        </div>
        <span class="pill pill-green">Abonné ✓</span>
      </div>
    </div>
  `, '/favorites');
}

// 8. Écran Abonnements
function generateAbonnementsHtml(): string {
  return wrapHtml('Abonnements & Suivis', `
    <h1>Abonnements de la Communauté</h1>
    <p>Gérez vos notifications de billetterie pour être averti dès la sortie des préventes de vos créateurs préférés.</p>

    <div class="card">
      <ul class="feature-list">
        <li>
          <div>
            <strong>Artiste Démo 1</strong>
            <div style="font-size: 13px; color: var(--text-muted);">Performeur Live · Lomé, Togo</div>
          </div>
          <div>
            <span class="pill pill-green">Notifications Actives</span>
          </div>
        </li>
        <li>
          <div>
            <strong>Organisateur Démo</strong>
            <div style="font-size: 13px; color: var(--text-muted);">Organisateur d'Événements · Lomé, Togo</div>
          </div>
          <div>
            <span class="pill pill-green">Notifications Actives</span>
          </div>
        </li>
      </ul>
    </div>
  `, '/subscriptions');
}

// 9. Écran Profil
function generateProfilHtml(): string {
  return wrapHtml('Profil & Compte', `
    <div class="card">
      <div style="display: flex; gap: 20px; align-items: center;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800;">
          KM
        </div>
        <div>
          <h1>Koffi Mensah</h1>
          <p style="margin-bottom: 4px;">koffi.mensah@example.com · Lomé, Togo</p>
          <span class="pill pill-green">Compte Participant Vérifié</span>
        </div>
      </div>

      <div class="grid-3" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light);">
        <div style="text-align: center;">
          <div class="stat-val">1</div>
          <div class="stat-lbl">Billet Actif</div>
        </div>
        <div style="text-align: center;">
          <div class="stat-val">2</div>
          <div class="stat-lbl">Sorties Favorites</div>
        </div>
        <div style="text-align: center;">
          <div class="stat-val">2</div>
          <div class="stat-lbl">Abonnements</div>
        </div>
      </div>
    </div>

    <h2>Préférences & Paramètres</h2>
    <div class="card">
      <ul class="feature-list">
        <li>
          <span>Langue de l'application</span>
          <strong>Français (Afrique de l'Ouest)</strong>
        </li>
        <li>
          <span>Devise par défaut</span>
          <strong>Franc CFA (XOF)</strong>
        </li>
        <li>
          <span>Thème visuel</span>
          <strong>Automatique (Système)</strong>
        </li>
        <li>
          <span>Sécurité et Données Personnelles</span>
          <span style="color: var(--success);">Session Cryptée</span>
        </li>
      </ul>
    </div>
  `, '/profile');
}

// 10. Écran Connexion
function generateConnexionHtml(): string {
  return wrapHtml('Connexion & Inscription', `
    <div class="card" style="max-width: 480px; margin: 0 auto;">
      <h1>Bienvenue sur Gbaigbance</h1>
      <p>Connectez-vous pour retrouver vos billets, synchroniser vos favoris et accéder à vos pass.</p>

      <form action="profil.html" method="get">
        <div class="form-group">
          <label for="login-email">Adresse Email</label>
          <input type="email" id="login-email" name="email" placeholder="votre.email@domaine.com" value="koffi.mensah@example.com" required />
        </div>

        <div class="form-group">
          <label for="login-password">Mot de passe</label>
          <input type="password" id="login-password" name="password" placeholder="••••••••••••" value="motdepasse123" required />
        </div>

        <button type="submit" class="btn" style="width: 100%; margin-top: 8px;">Se connecter</button>
      </form>

      <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-light);">
        <p style="font-size: 13px;">Pas encore de compte ?</p>
        <a href="accueil.html" class="nav-back">Explorer en tant qu'invité →</a>
      </div>
    </div>
  `, '/login');
}

// 11. Écran Création d'Événement
function generateCreerEvenementHtml(): string {
  return wrapHtml('Création d’Événement', `
    <h1>Publier un nouvel événement</h1>
    <p>Créez votre billetterie en ligne en quelques minutes avec encaissement Mobile Money automatisé.</p>

    <div class="card">
      <h2>1. Informations Générales</h2>
      <form action="tableau-de-bord-organisateur.html" method="get">
        <div class="form-group">
          <label for="event-title">Titre de l'événement</label>
          <input type="text" id="event-title" name="title" value="Grande Nuit du Conte & des Rythmes Traditionnels" />
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="event-category">Catégorie</label>
            <select id="event-category" name="category">
              <option value="festival" selected>Festival Culturel</option>
              <option value="concert">Concert Live</option>
              <option value="theatre">Spectacle & Théâtre</option>
            </select>
          </div>
          <div class="form-group">
            <label for="event-city">Ville</label>
            <select id="event-city" name="city">
              <option value="lome" selected>Lomé (Togo)</option>
              <option value="cotonou">Cotonou (Bénin)</option>
            </select>
          </div>
        </div>

        <h2 style="margin-top: 24px;">2. Date, Lieu et Capacité</h2>
        <div class="grid-2">
          <div class="form-group">
            <label for="event-date">Date de l'événement</label>
            <input type="date" id="event-date" name="date" value="2026-12-19" />
          </div>
          <div class="form-group">
            <label for="event-venue">Nom de la Salle ou du Lieu</label>
            <input type="text" id="event-venue" name="venue" value="Institut Français du Togo, Lomé" />
          </div>
        </div>

        <h2 style="margin-top: 24px;">3. Tarification des Billets (FCFA)</h2>
        <div class="grid-2">
          <div class="form-group">
            <label for="ticket-std-price">Prix Billet Standard (FCFA)</label>
            <input type="number" id="ticket-std-price" name="std_price" value="3000" />
          </div>
          <div class="form-group">
            <label for="ticket-vip-price">Prix Billet VIP (FCFA)</label>
            <input type="number" id="ticket-vip-price" name="vip_price" value="10000" />
          </div>
        </div>

        <button type="submit" class="btn" style="margin-top: 16px;">Créer la billetterie de l'événement</button>
      </form>
    </div>
  `, '/events/create');
}

// 12. Écran Tableau de Bord Organisateur
function generateTableauDeBordOrganisateurHtml(): string {
  return wrapHtml('Tableau de Bord Organisateur', `
    <h1>Console Organisateur & Analytics</h1>
    <p>Suivi en temps réel des ventes de billets, recettes en FCFA et contrôle d'accès aux portes.</p>

    <div class="grid-3">
      <div class="card">
        <div class="stat-lbl">Recettes Totales Ventes</div>
        <div class="stat-val" style="color: var(--primary); margin-top: 4px;">2 450 000 FCFA</div>
        <div style="font-size: 12px; color: var(--success); margin-top: 4px;">+18% cette semaine</div>
      </div>
      <div class="card">
        <div class="stat-lbl">Billets Émis & Payés</div>
        <div class="stat-val" style="margin-top: 4px;">490 Billets</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Jauge occupée à 82%</div>
      </div>
      <div class="card">
        <div class="stat-lbl">Contrôle Entrée QR Code</div>
        <div class="stat-val" style="margin-top: 4px;">Prêt</div>
        <div style="font-size: 12px; color: var(--success); margin-top: 4px;">Scanner actif aux portes</div>
      </div>
    </div>

    <h2>Événements Actifs Sous Gestion</h2>
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 12px;">
        <div>
          <h3>Concert Live Démo</h3>
          <p style="font-size: 13px; margin-bottom: 0;">24 Octobre 2026 à 18h00 · Palais des Congrès de Lomé</p>
        </div>
        <div style="text-align: right;">
          <span class="pill pill-green">Ventes Ouvertes</span>
          <div style="font-weight: 700; margin-top: 4px;">340 / 400 vendus</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn" style="font-size: 13px; padding: 8px 16px;">Ouvrir le Scanner QR d'Entrée</button>
        <button type="button" class="btn btn-outline" style="font-size: 13px; padding: 8px 16px;">Exporter la Liste des Participants</button>
      </div>
    </div>
  `, '/dashboard/organizer');
}

// 13. Index général des écrans
function generateIndexHtml(): string {
  const listItems = SCREENS.map(
    (s) => `
    <article class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span class="pill">${s.category}</span>
        <span class="pill pill-green">${s.badge}</span>
      </div>
      <h2><a href="${s.filename}" style="color: var(--text-dark); text-decoration: none;">${s.title}</a></h2>
      <p style="margin-bottom: 12px;">${s.description}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <code style="font-size: 12px; background: var(--primary-light); color: var(--primary); padding: 4px 8px; border-radius: 6px;">${s.route}</code>
        <a href="${s.filename}" class="btn" style="padding: 8px 18px; font-size: 13px;">Ouvrir l'écran →</a>
      </div>
    </article>
  `
  ).join('\n');

  return wrapHtml('Sommaire des Écrans', `
    <div class="card" style="background: linear-gradient(135deg, rgba(102,0,255,0.06) 0%, rgba(16,185,129,0.04) 100%);">
      <span class="brand-badge">ARCHIVES STATIQUES SÉMANTIQUES (NON-JS)</span>
      <h1 style="margin-top: 14px;">Cartographie Complète de Gbaigbance</h1>
      <p style="font-size: 16px; margin-bottom: 16px;">
        Ce répertoire fournit un instantané HTML sémantique pur de l'ensemble des parcours applicatifs de <strong>Gbaigbance</strong>.
        Conçu spécifiquement pour les assistants d'intelligence artificielle, les outils d'inspection réseau (ex: <code>web_fetch</code>)
        et les navigateurs sans moteur JavaScript.
      </p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <a href="app-manifest.json" class="btn btn-outline" style="font-size: 13px; padding: 8px 16px;">📄 Consulter le Manifeste IA (app-manifest.json)</a>
        <a href="/llms.txt" class="btn btn-outline" style="font-size: 13px; padding: 8px 16px;">🤖 Contexte LLM (llms.txt)</a>
      </div>
    </div>

    <h2>Catalogue des 12 Écrans</h2>
    ${listItems}
  `);
}

// 14. Manifeste machine-readable pour IA
function generateAppManifestJson(): string {
  const manifest = {
    name: 'Gbaigbance',
    tagline: "L'événementiel africain premium",
    version: '1.0.0',
    targetRegions: ['TG (Togo)', 'BJ (Bénin)', 'CI (Côte d’Ivoire)'],
    currency: 'XOF (Franc CFA)',
    paymentMethods: [
      'T-Money (Togocom Togo)',
      'Moov Flooz (Moov Togo / Bénin / CI)',
      'MTN Mobile Money (Bénin)',
    ],
    designSystem: {
      primaryColor: '#6600FF',
      secondaryColor: '#10B981',
      backgroundColorLight: '#F8F7FC',
      backgroundColorDark: '#0D0B14',
      fontFamily: 'Manrope, -apple-system, sans-serif',
      borderRadiusStandard: '12px-16px',
      borderRadiusPill: '999px',
    },
    screens: SCREENS.map((s) => ({
      title: s.title,
      route: s.route,
      category: s.category,
      staticHtmlFile: `/preview/${s.filename}`,
      description: s.description,
    })),
    userFlows: [
      {
        flowName: 'Réservation de billet',
        steps: [
          'Accueil (/preview/accueil.html)',
          'Sélection événement (/preview/detail-evenement.html)',
          'Choix tarif et moyen Mobile Money (/preview/paiement.html)',
          'Pass QR Code émis instantanément (/preview/confirmation.html)',
          'Consultation hors-ligne (/preview/mes-billets.html)',
        ],
      },
      {
        flowName: 'Création et gestion événement par organisateur',
        steps: [
          'Connexion / Rôle Organisateur (/preview/connexion.html)',
          'Formulaire de création d’événement (/preview/creer-evenement.html)',
          'Console de vente et scanner QR (/preview/tableau-de-bord-organisateur.html)',
        ],
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

// Main execution
export function buildPreview() {
  if (!fs.existsSync(DIST_PREVIEW_DIR)) {
    fs.mkdirSync(DIST_PREVIEW_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_PREVIEW_DIR)) {
    fs.mkdirSync(PUBLIC_PREVIEW_DIR, { recursive: true });
  }

  const screens: { name: string; content: string }[] = [
    { name: 'index.html', content: generateIndexHtml() },
    { name: 'accueil.html', content: generateAccueilHtml() },
    { name: 'explorer.html', content: generateExplorerHtml() },
    { name: 'detail-evenement.html', content: generateDetailEvenementHtml() },
    { name: 'paiement.html', content: generatePaiementHtml() },
    { name: 'confirmation.html', content: generateConfirmationHtml() },
    { name: 'mes-billets.html', content: generateMesBilletsHtml() },
    { name: 'favoris.html', content: generateFavorisHtml() },
    { name: 'abonnements.html', content: generateAbonnementsHtml() },
    { name: 'profil.html', content: generateProfilHtml() },
    { name: 'connexion.html', content: generateConnexionHtml() },
    { name: 'creer-evenement.html', content: generateCreerEvenementHtml() },
    { name: 'tableau-de-bord-organisateur.html', content: generateTableauDeBordOrganisateurHtml() },
    { name: 'app-manifest.json', content: generateAppManifestJson() },
  ];

  for (const s of screens) {
    fs.writeFileSync(path.join(DIST_PREVIEW_DIR, s.name), s.content, 'utf-8');
    fs.writeFileSync(path.join(PUBLIC_PREVIEW_DIR, s.name), s.content, 'utf-8');
  }

  console.log(`✅ [Gbaigbance Preview] ${screens.length} fichiers statiques synchronisés avec succès dans public/preview/ et dist/preview/`);
}

// Run when executed directly
buildPreview();
