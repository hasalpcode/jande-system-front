#!/usr/bin/env bash
# A executer UNE SEULE FOIS, en root, sur le VPS Contabo tout juste cree.
# Usage : copier ce script sur le VPS puis `bash setup-vps.sh`
set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/opt/school_management"

echo "==> Mise a jour du systeme"
apt-get update -y && apt-get upgrade -y

echo "==> Installation de Docker Engine + plugin Compose"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Creation de l'utilisateur de deploiement '${DEPLOY_USER}' (sans mot de passe, cle SSH uniquement)"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  usermod -aG docker "${DEPLOY_USER}"
fi

echo "==> Preparation du repertoire SSH de '${DEPLOY_USER}'"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"

echo ""
echo "    >>> Colle maintenant la CLE PUBLIQUE SSH du deploiement dans :"
echo "        /home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "    (cette cle doit correspondre a la cle privee stockee dans le secret"
echo "     GitHub Actions VPS_SSH_KEY, dans les DEUX repos back et front)"
echo ""

echo "==> Creation du repertoire applicatif ${APP_DIR}"
mkdir -p "${APP_DIR}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "==> Pare-feu (ufw) : ouverture de 22 (SSH) et 80 (HTTP)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw --force enable
fi

echo ""
echo "==> Termine. Prochaines etapes manuelles :"
echo "  1. Ajouter la cle publique dans /home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "  2. Copier .env.example vers ${APP_DIR}/.env et renseigner les vraies valeurs"
echo "  3. Verifier la connexion : ssh ${DEPLOY_USER}@<IP_VPS>"
echo "  4. Configurer les secrets GitHub Actions dans les DEUX repos (voir DEPLOY.md)"
