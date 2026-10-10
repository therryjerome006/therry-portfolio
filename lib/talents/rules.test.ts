import assert from "node:assert/strict";
import test from "node:test";
import {
  applyBlock,
  canPublishPaidOffer,
  canTransitionProject,
  containsOffPlatform,
  containsPrivateContact,
  estimateOffer,
  indicativePrice,
  opportunityPublishStatus,
  profileProgress,
} from "./rules.ts";

const adult = {
  actorAge: "18-22",
  clientAge: "23+",
  blocked: false,
  suspended: false,
  self: false,
  missionType: "educatif",
  openToMinors: false,
  clientKind: "membre",
  paidMinorsEnabled: false,
  orgOffersEnabled: false,
  authorizationGranted: false,
  deadlinePassed: false,
  published: true,
};

test("un adulte peut candidater à une mission éducative publiée", () => {
  assert.equal(applyBlock(adult), null);
});

test("un mineur ne candidate pas à une mission rémunérée tant que le contrôle est fermé", () => {
  assert.equal(applyBlock({ ...adult, actorAge: "16-17", clientAge: "18-22", missionType: "remuneree", openToMinors: true }), "verification");
});

test("le contrôle ouvert ne suffit pas sans autorisation enregistrée", () => {
  assert.equal(
    applyBlock({ ...adult, actorAge: "12-15", clientAge: "18-22", missionType: "remuneree", openToMinors: true, paidMinorsEnabled: true }),
    "autorisation",
  );
});

test("une personne de 23 ans ou plus ne contacte pas un mineur", () => {
  assert.equal(applyBlock({ ...adult, actorAge: "23+", clientAge: "16-17", openToMinors: true }), "contact");
});

test("un compte bloqué ou suspendu est refusé", () => {
  assert.equal(applyBlock({ ...adult, blocked: true }), "contact");
  assert.equal(applyBlock({ ...adult, suspended: true }), "suspendu");
});

test("une mission bénévole ne peut pas porter un budget", () => {
  const result = opportunityPublishStatus({
    clientKind: "membre",
    openToMinors: true,
    orgOffersEnabled: false,
    missionType: "benevole",
    budgetMode: "indicatif",
    budgetCents: 1000,
  });
  assert.equal(result.error?.includes("bénévole"), true);
});

test("une entreprise ouverte aux mineurs reste en vérification", () => {
  const result = opportunityPublishStatus({
    clientKind: "entreprise",
    openToMinors: true,
    orgOffersEnabled: false,
    missionType: "educatif",
    budgetMode: "discuter",
    budgetCents: null,
  });
  assert.equal(result.status, "pending");
  assert.equal(result.error, null);
});

test("les transitions de projet refusent un paiement et un saut interdit", () => {
  assert.equal(canTransitionProject("active", "delivered", false), true);
  assert.equal(canTransitionProject("active", "done", false), false);
  assert.equal(canTransitionProject("dispute", "done", false), false);
  assert.equal(canTransitionProject("dispute", "done", true), true);
});

test("le montant estimé additionne la formule et les options de la même devise", () => {
  const result = estimateOffer({
    packageCents: 500000,
    packageMode: "indicatif",
    currency: "HTG",
    addons: [
      { cents: 100000, currency: "HTG", selected: true },
      { cents: 5000, currency: "USD", selected: false },
    ],
  });
  assert.equal(result.label, "6 000 HTG estimé");
  assert.equal(result.error, null);
  const mixed = estimateOffer({
    packageCents: 500000,
    packageMode: "indicatif",
    currency: "HTG",
    addons: [{ cents: 1000, currency: "USD", selected: true }],
  });
  assert.equal(mixed.error?.includes("devise"), true);
});

test("le prix indicatif n'est pas présenté comme un paiement confirmé", () => {
  assert.equal(indicativePrice(150000, "indicatif", "HTG"), "1 500 HTG indicatif");
  assert.equal(indicativePrice(null, "convenir", "USD"), "Prix à convenir");
});

test("les coordonnées et les canaux privés sont détectés", () => {
  assert.equal(containsPrivateContact("écris-moi à nom@example.com"), true);
  assert.equal(containsPrivateContact("appelle le +509 44895405"), true);
  assert.equal(containsOffPlatform("passe sur whatsapp"), true);
  assert.equal(containsPrivateContact("je livre un logo"), false);
});

test("un mineur ne publie pas une offre rémunérée sans contrôle", () => {
  assert.equal(canPublishPaidOffer("16-17", false, false), "verification");
  assert.equal(canPublishPaidOffer("18-22", false, false), null);
});

test("la progression du profil compte uniquement des champs réels", () => {
  const progress = profileProgress({
    name: "Amina",
    title: "",
    bio: "court",
    categories: 1,
    skills: 0,
    availability: "",
    languages: 1,
  });
  assert.equal(progress.total, 7);
  assert.equal(progress.done, 3);
  assert.equal(progress.missing.includes("un titre"), true);
});
