import { paymentNotice } from "@/lib/talents/copy";

export const dynamic = "force-dynamic";

export default function TalentHelpPage() {
  return (
    <article className="grid gap-4 text-sm leading-6">
      <h1 className="text-3xl font-bold">Aide et sécurité</h1>
      <p>{paymentNotice}</p>
      <p>TY Space n'est pas une agence de recrutement, un employeur, ni un service qui garantit l'exécution d'un contrat.</p>
      <p>Les niveaux de compétence sont déclarés par les membres. Ils ne sont pas des certifications.</p>
      <p>Un projet marqué comme exercice fictif n'a pas été réalisé pour un vrai client.</p>
      <p>Les moins de 18 ans ne voient pas les missions qui leur sont fermées. Les missions rémunérées restent bloquées pour eux tant que le contrôle serveur n'est pas ouvert, et une demande d'autorisation ne suffit pas à elle seule.</p>
      <p>Les personnes de 23 ans et plus ne peuvent pas engager une mission avec un membre de 12 à 17 ans. Un blocage empêche aussi les messages du projet.</p>
      <p>N'écrivez pas d'adresse électronique, de numéro, de mot de passe ou d'invitation à continuer sur WhatsApp, Telegram ou un autre service.</p>
      <p>Les fichiers de mission restent privés. Les images publiques de portfolio ne doivent pas contenir de documents personnels.</p>
      <p>Utilisez Signaler sur un profil, un service, une mission, une réalisation ou un avis. Un signalement pour exploitation, menace ou danger doit être traité en priorité par l'administrateur. TY Space ne promet pas une surveillance humaine permanente.</p>
      <p>Pour supprimer le compte, utilisez les réglages du profil social. Les contenus Talents liés au compte suivent la suppression du profil.</p>
    </article>
  );
}
