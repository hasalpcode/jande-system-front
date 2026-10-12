/** Taille max acceptée pour une pièce jointe lue en data URI (photo/PDF) côté client. */
export const TAILLE_PIECE_MAX_OCTETS = 2 * 1024 * 1024;

function dataUriVersBlob(dataUri: string): Blob {
  const [entete, base64] = dataUri.split(',');
  const mime = /data:(.*);base64/.exec(entete)?.[1] ?? 'application/octet-stream';
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: mime });
}

/** Ouvre une pièce jointe (data URI) dans un nouvel onglet - image ou PDF, le navigateur
 * choisit le rendu adapté au type MIME embarqué. window.open(dataUri) est bloqué par les
 * navigateurs (navigation top-level vers une data: URL refusée depuis Chrome 66) - il faut
 * repasser par un blob: URL, comme pour un reçu PDF ou un certificat. */
export function ouvrirDataUri(dataUri: string): void {
  const url = URL.createObjectURL(dataUriVersBlob(dataUri));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Lit un fichier (depuis un `<input type="file">`) en data URI, avec un plafond de taille -
 * `onDepassement` est appelé (et la lecture annulée) si le fichier est trop volumineux. */
export function lireFichierEnDataUri(fichier: File, onResultat: (dataUri: string) => void, onDepassement: () => void): void {
  if (fichier.size > TAILLE_PIECE_MAX_OCTETS) {
    onDepassement();
    return;
  }
  const lecteur = new FileReader();
  lecteur.onload = () => onResultat(lecteur.result as string);
  lecteur.readAsDataURL(fichier);
}
