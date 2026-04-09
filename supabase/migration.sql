-- Migration : table des questions pour Droit au But 3D
-- Exécuter dans l'éditeur SQL de ton projet Supabase

create table if not exists questions (
  id            text        primary key,
  question      text        not null,
  choices       jsonb       not null,
  correct_index integer     not null,
  difficulty    text        not null check (difficulty in ('simple', 'moyen', 'difficile')),
  created_at    timestamptz default now()
);

-- Sécurité : lecture publique, écriture interdite depuis le client
alter table questions enable row level security;

create policy "Questions lisibles par tous"
  on questions for select
  to anon, authenticated
  using (true);

-- ─── Questions SIMPLE ─────────────────────────────────────────────────────────

insert into questions (id, question, choices, correct_index, difficulty) values
  ('s1', 'Qu''est-ce qu''une donnée à caractère personnel ?',
   '["Toute donnée permettant d''identifier une personne directement ou indirectement","Uniquement le nom et le prénom","Seulement les données stockées sur un serveur","Les données publiques sur internet"]',
   0, 'simple'),
  ('s2', 'Quelle loi française encadre la protection des données personnelles ?',
   '["Loi Informatique et Libertés du 6 janvier 1978","Loi Hadopi","Code du travail","Loi sur le commerce électronique uniquement"]',
   0, 'simple'),
  ('s3', 'Depuis quand le RGPD est-il applicable ?',
   '["25 mai 2018","1er janvier 2017","24 mai 2016","25 mai 2020"]',
   0, 'simple'),
  ('s4', 'Selon la CNIL, qu''est-ce qu''un « traitement » de données personnelles ?',
   '["Toute opération sur des données (collecte, conservation, consultation, etc.)","Uniquement la vente de données","Seulement le stockage sur cloud","La destruction accidentelle de fichiers"]',
   0, 'simple'),
  ('s5', 'Parmi les droits des personnes, lequel est associé au « droit à l''oubli » ?',
   '["Droit à l''effacement des données","Droit de vote numérique","Droit à une connexion gratuite","Droit de copier tout site web"]',
   0, 'simple'),
  ('s6', 'Le principe de minimisation des données signifie :',
   '["Ne collecter que les données strictement nécessaires","Collecter le maximum pour mieux analyser","Limiter l''accès à une seule personne dans l''entreprise","Réduire la taille des fichiers image"]',
   0, 'simple')
on conflict (id) do nothing;

-- ─── Questions MOYEN ──────────────────────────────────────────────────────────

insert into questions (id, question, choices, correct_index, difficulty) values
  ('m1', 'Quel est le rôle principal d''un DPO (Délégué à la protection des données) ?',
   '["Informer et conseiller l''organisme sur ses obligations RGPD","Gérer uniquement le parc informatique","Signer les contrats clients","Remplacer le PDG en son absence"]',
   0, 'moyen'),
  ('m2', 'En cas de violation de données présentant un risque, sous quel délai notifier la CNIL ?',
   '["72 heures après avoir pris connaissance de la violation","30 jours","7 jours ouvrés","Un an maximum"]',
   0, 'moyen'),
  ('m3', 'La « portabilité » des données permet au titulaire de :',
   '["Recevoir ses données dans un format structuré et les transmettre à un autre responsable","Supprimer toutes les copies chez les tiers sans preuve","Interdire toute analyse statistique","Exporter uniquement en PDF papier"]',
   0, 'moyen'),
  ('m4', 'Le consentement au sens RGPD doit être :',
   '["Libre, spécifique, éclairé et univoque","Implicite dès l''entrée sur un site","Donné une fois pour toutes à vie","Remplacé par les conditions générales de vente"]',
   0, 'moyen'),
  ('m5', 'Une « analyse d''impact » (AIPD) est pertinente lorsque :',
   '["Le traitement est susceptible d''engendrer un risque élevé pour les droits et libertés","L''entreprise a moins de 5 salariés","Les données sont anonymes à 100 %","Le site n''a pas de formulaire de contact"]',
   0, 'moyen'),
  ('m6', 'Le responsable du traitement est :',
   '["Celui qui détermine les finalités et les moyens du traitement","Toujours l''hébergeur du site","Le salarié qui saisit les données","Uniquement la CNIL"]',
   0, 'moyen')
on conflict (id) do nothing;

-- ─── Questions DIFFICILE ──────────────────────────────────────────────────────
-- (Ajouter ici les questions du fichier difficile.json avec difficulty = 'difficile')
