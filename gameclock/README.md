# GameClock

Site multi-utilisateurs : chacun se connecte avec son compte Steam et voit ses propres
statistiques de temps de jeu (badges, heatmap, comparaisons fun, évolution dans le temps),
plus une saisie manuelle pour Epic Games / EA App / Ubisoft Connect / GOG (aucune API
publique n'existe pour ces plateformes).

## Mise en ligne (une seule fois)

### 1. Créer un dépôt GitHub

1. Allez sur github.com, connectez-vous (ou créez un compte gratuit).
2. Cliquez sur **New repository**, nommez-le `gameclock` (ou ce que vous voulez), laissez-le
   public ou privé, ne cochez rien d'autre, cliquez **Create repository**.
3. Sur la page du nouveau dépôt vide, cliquez **uploading an existing file** et glissez-y
   **tous les fichiers et dossiers de ce projet** (en gardant la structure : `netlify/`,
   `public/`, `package.json`, `netlify.toml`, `.gitignore`). Committez.

### 2. Connecter le dépôt à Netlify

1. Sur app.netlify.com, cliquez **Add new project → Import an existing project**.
2. Choisissez **GitHub**, autorisez l'accès, sélectionnez le dépôt `gameclock`.
3. Netlify détecte automatiquement `netlify.toml` (build vide, dossier `public` publié,
   fonctions dans `netlify/functions`). Cliquez **Deploy**.

### 3. Configurer les variables d'environnement

Dans le projet Netlify : **Project configuration → Environment variables → Add a variable**,
ajoutez ces trois variables :

| Variable | Valeur |
|---|---|
| `STEAM_API_KEY` | Votre clé API Steam (developer key) |
| `SESSION_SECRET` | Une longue chaîne aléatoire secrète — exemple généré : `3b78e2156a9f5b6a839abcc762e5dc13aed5dfab623424e02599df971d5b57c0` (changez-la si vous voulez, gardez-la juste secrète) |
| `SITE_URL` | L'URL exacte de votre site une fois déployé, ex: `https://gameclock.netlify.app` (sans `/` à la fin) |

Après avoir ajouté les variables, redéployez le site (**Deploys → Trigger deploy →
Deploy site**) pour qu'elles soient prises en compte.

### 4. Tester

Ouvrez votre site (`https://votre-site.netlify.app`), cliquez **Se connecter avec Steam**,
connectez-vous avec votre compte Steam sur la page qui s'ouvre, vous êtes redirigé vers
votre dashboard personnel.

## Comment ça marche

- **Connexion** : Steam OpenID (pas d'OAuth classique) — l'utilisateur se connecte sur
  steamcommunity.com, jamais sur votre site. Le site ne voit jamais son mot de passe.
- **Données** : une seule clé API Steam (la vôtre, `STEAM_API_KEY`) sert à interroger le
  profil **public** de n'importe quel utilisateur connecté — comportement normal et
  documenté de l'API Steam (`GetOwnedGames`), aucune permission spéciale nécessaire côté
  utilisateur.
- **Stockage** : chaque connexion peut déclencher un nouveau "snapshot" (au maximum un par
  jour, sauf clic sur "Actualiser"), stocké dans Netlify Blobs, indexé par SteamID. Plus
  vous avez de snapshots dans le temps, plus le graphique d'évolution devient précis
  (heures réelles jour après jour, pas juste une estimation).
- **Saisie manuelle** (Epic/EA/Ubisoft/GOG) : stockée aussi dans Netlify Blobs, par
  utilisateur connecté — persiste d'une visite à l'autre.

## Limites connues

- L'API Steam ne donne le temps de jeu détaillé (2 dernières semaines) qu'à cette
  granularité — au-delà, l'historique se reconstruit au fil des connexions au site.
- Une clé API Steam personnelle (developer key) est limitée à un usage raisonnable —
  largement suffisant pour un usage perso ou entre amis, mais à surveiller si le site
  devient très populaire.
- Epic Games, EA App, Ubisoft Connect et GOG n'ont aucune API publique : la saisie
  manuelle restera la seule option pour ces plateformes.
