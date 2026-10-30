# Déploiement continu (VPS Contabo + Docker Hub + GitHub Actions)

> Ce projet est split en deux repos : `jande-system-back` et
> `jande-system-front` (ce repo). Chacun a son propre workflow GitHub Actions
> (`.github/workflows/deploy.yml`) qui build + push sa propre image Docker,
> puis déploie **les deux services** sur le VPS via `docker-compose.prod.yml`
> (fichier identique dans les deux repos). Un push sur l'un ou l'autre repo
> suffit à redéployer la stack.

## Vue d'ensemble

Chaque `push` sur `main` (dans back **ou** front) :

1. build l'image Docker du repo concerné
2. la pousse sur Docker Hub (`hasalpcode/school-management-backend` ou
   `hasalpcode/school-management-frontend`)
3. se connecte en SSH au VPS, copie `docker-compose.prod.yml`, puis fait
   `docker compose pull && docker compose up -d`

Le frontend (nginx) sert les fichiers statiques Angular **et** reverse-proxy
`/api/*` vers le conteneur `backend` — donc pas de CORS à gérer, un seul port
(80) exposé publiquement.

## 1. Provisionner le VPS (une seule fois)

```bash
scp deploy/setup-vps.sh root@<IP_VPS>:/root/
ssh root@<IP_VPS>
bash /root/setup-vps.sh
```

Ça installe Docker + le plugin Compose, crée un utilisateur `deploy` (sans
mot de passe, SSH par clé uniquement), prépare `/opt/school_management` et
ouvre le pare-feu (22, 80).

## 2. Générer une paire de clés SSH dédiée au déploiement

Sur ta machine (pas sur le VPS) :

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key -N ""
```

- `deploy_key.pub` → à coller dans `/home/deploy/.ssh/authorized_keys` sur le VPS
- `deploy_key` (la clé **privée**) → va dans le secret GitHub `VPS_SSH_KEY`
  **des deux repos** (back et front)

Vérifie ensuite que la connexion fonctionne :

```bash
ssh -i ./deploy_key deploy@<IP_VPS>
```

## 3. Créer le fichier `.env` sur le VPS

```bash
scp .env.example deploy@<IP_VPS>:/opt/school_management/.env
ssh deploy@<IP_VPS>
nano /opt/school_management/.env   # renseigner les vraies valeurs (mots de passe, JWT_SECRET...)
```

Ce fichier **ne doit jamais être commité** (il est dans `.gitignore`).

## 4. Créer un token Docker Hub

Sur hub.docker.com → Account Settings → Security → New Access Token
(permissions Read & Write). Note le token, il sert de `DOCKERHUB_TOKEN`.

## 5. Configurer les secrets GitHub Actions — dans LES DEUX repos

Repo → Settings → Secrets and variables → Actions, à répéter sur
`jande-system-back` **et** `jande-system-front` :

| Secret | Valeur |
|---|---|
| `DOCKERHUB_USERNAME` | `hasalpcode` |
| `DOCKERHUB_TOKEN` | le token créé à l'étape 4 |
| `VPS_HOST` | IP (ou domaine) du VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contenu de la clé **privée** `deploy_key` générée à l'étape 2 |
| `VPS_SSH_PORT` | `22` (optionnel, défaut 22) |

## 6. Premier déploiement

Depuis chaque repo (back, puis front) :

```bash
git add -A
git commit -m "Ajout du pipeline CI/CD Docker"
git push origin main
```

Le workflow `.github/workflows/deploy.yml` se déclenche automatiquement
(onglet **Actions** du repo pour suivre). Une fois les deux terminés :

```
http://<IP_VPS>
```

## Vérifications utiles sur le VPS

```bash
cd /opt/school_management
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

## Étapes suivantes (hors scope immédiat)

- Nom de domaine + HTTPS : ajouter un reverse proxy (Caddy ou Traefik) devant
  le port 80, avec certificat Let's Encrypt automatique.
- Sauvegardes régulières du volume `pgdata` (pg_dump programmé).
- Rollback rapide : redéployer un tag précédent en changeant `IMAGE_TAG` dans
  le `.env` du VPS puis `docker compose up -d`.
