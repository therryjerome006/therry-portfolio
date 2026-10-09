const messages: Record<string, string> = {
  profil: "Le profil éditorial est créé.",
  "profil-modifie": "Le profil est mis à jour.",
  doublon: "Cet identifiant existe déjà.",
  lien: "Le lien doit commencer par https://.",
  brouillon: "Le brouillon est enregistré.",
  brouillons: "Les brouillons générés sont enregistrés. Relisez-les avant de les publier.",
  publie: "La publication est en ligne.",
  programme: "La programmation est enregistrée.",
  annule: "La programmation est annulée.",
  archive: "Le contenu est archivé.",
  duplique: "Une copie est créée en brouillon.",
  erreur: "Cette action n'a pas pu être terminée.",
  explicite: "Ce contenu n'est pas autorisé sur TY Space.",
  media: "Le fichier ne respecte pas le format ou la taille autorisés.",
  longueur: "La longueur du texte ne correspond pas au format.",
  inactif: "Le profil éditorial est inactif ou archivé.",
  horaire: "Choisissez une date future dans le fuseau de la plateforme.",
  cadence: "La limite quotidienne ou l'intervalle minimum empêche cet horaire.",
  echec: "La publication a échoué. Le détail est dans l'historique.",
  "ia-off": "Aucun fournisseur d'IA n'est configuré. L'éditeur manuel reste disponible.",
  ia: "La génération n'a pas abouti. Vous pouvez écrire le contenu à la main.",
  pause: "Les programmations automatiques sont suspendues. Rien n'a été publié.",
  dus: "Les contenus arrivés à échéance ont été traités.",
  reglages: "Les règles de diffusion sont enregistrées.",
  base: "La base de données n'est pas configurée.",
  fige: "Un contenu publié se modifie avec « Enregistrer ». Pour le republier, dupliquez-le.",
};

export function Etat({ code }: { code?: string }) {
  if (!code || !messages[code]) return null;
  return <p className="border border-line bg-white px-3 py-2 text-sm">{messages[code]}</p>;
}
