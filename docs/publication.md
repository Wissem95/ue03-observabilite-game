# Publication et preuves

Dépôt : https://github.com/Wissem95/ue03-telemetrie

## Import de l’historique

Les dossiers sont des états reconstruits du projet, pas des sauvegardes originales authentifiées. Le script attribue des dates du 29 septembre au 2 octobre 2026 et consigne la date réelle de son exécution, le 8 octobre à 09:48:45 UTC, dans IMPORT-SNAPSHOTS.md. Cet import ne prouve pas quatre jours de développement. La vidéo, les contrôles et les livrables de cette reprise sont produits le 8 octobre.

## Contrôles de ce dépôt

Les trois exécutions portent sur e716eddb9baa39e4ff5b73936ad4c4afc72318a5 :

- Succès, qualité et publication : https://github.com/Wissem95/ue03-telemetrie/actions/runs/37759258961
- Test volontairement faux, échec à npm test et publication ignorée : https://github.com/Wissem95/ue03-telemetrie/actions/runs/37759345192
- Image témoin vulnérable, échec au scan critique et publication ignorée : https://github.com/Wissem95/ue03-telemetrie/actions/runs/37759348553

Les métadonnées et journaux complets se trouvent dans evidence/nouvelle-ci/. Le scan nominal ne signale aucune vulnérabilité critique. Le témoin contient deux critiques : CVE-2022-37434 (zlib) et CVE-2026-59873 (tar). Ces résultats valent pour la base utilisée lors de ces scans.

Image publiée : ghcr.io/wissem95/ue03-telemetrie:sha-e716eddb9baa39e4ff5b73936ad4c4afc72318a5

Digest : sha256:edc7960ef4d7f23717d272054363bca3937c4666fa35ff9ddfc111bb0e30b1f7

Le contrôle local du 8 octobre a exécuté npm ci, le lint, les 22 tests et l’analyse. docker compose up --build -d a lancé la stack, puis l’importeur a terminé avec le code 0. Les sorties sont dans evidence/nouvelle-verification/.

L’import historique a nécessité un flush manuel de Loki pour rendre les 2 110 rapports interrogeables. Avant cette opération, la requête en retrouvait 2 065. evidence/nouvelle-verification/loki.json conserve ce contrôle. npm run verify a ensuite réussi et renouvelé evidence/runtime-verification.json. L’import entièrement automatique n’est donc pas validé.

## Vidéo et rapport

La vidéo est une nouvelle capture complète du projet en fonctionnement, le 8 octobre. Elle dure 146 secondes, sans musique ni narration. Le manifeste evidence/video/sequence.json indique les prises et leurs heures réelles. Les commentaires sont dans docs/demonstration-transcription.md. Les pauses entre les prises ont été retirées.

Le rapport reprend l’analyse et ses limites. Les captures Grafana ont été renouvelées sur la stack de ce dépôt. Les règles d’alerte ne rejouent pas l’archive ; leurs limites de calibration restent décrites dans le rapport.

## Livrables

Rapport : output/pdf/rapport-observabilite.pdf. Vidéo fournie dans le ZIP, conservée localement dans output/video/demonstration.mp4. Dashboards : observability/grafana/dashboards/. Captures : evidence/screenshots/. Lien Git : LIEN_GIT.txt. Archive produite par scripts/package-delivery.py.

Le ZIP Karboub_Wissem_UE03.zip contient uniquement le rapport, la vidéo finale, LIEN_GIT.txt, les trois JSON et les cinq captures. Les MP4 sont retirés des fichiers versionnés courants.
