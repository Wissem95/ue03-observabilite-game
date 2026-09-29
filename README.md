# UE03 · Observabilité d'un jeu multijoueur

Le projet reçoit les rapports du jeu, suit l'état du service et analyse les saccades et les parties suspectes dans l'export fourni. Il utilise Node.js, Alloy, Loki, Prometheus et Grafana.

[Dépôt](https://github.com/Wissem95/ue03-telemetrie) · [Pipeline](https://github.com/Wissem95/ue03-telemetrie/actions)

## Lancer le projet

Avec Docker et Compose v2 :

```bash
docker compose up --build -d
```

Ouvrir [Grafana](http://localhost:13000). Le dashboard de santé montre le trafic simulé actuel. Les deux autres montrent les données de septembre. L'importeur s'arrête après son travail, les autres services restent actifs.

Le service répond sur http://localhost:18080/healthz et expose ses métriques sur http://localhost:18080/metrics. Prometheus est sur http://localhost:19090 et Loki sur http://localhost:13100/ready.

## Vérifier les résultats

Pour les commandes locales, utiliser Node.js 22.13 ou plus récent :

```bash
npm ci
npm test
npm run lint
npm run analyze
npm run verify
```

Attendre la fin de l'import et le démarrage des services avant `verify`. Le résultat attendu est de 2 110 rapports et 779 fins de partie.

**Limite connue :** sur un premier démarrage testé, Loki ne retrouvait que 2 065 rapports. Un flush manuel a rendu les 45 autres visibles. Le démarrage automatique reste à corriger. Le [diagnostic](evidence/loki-backfill-diagnostic.md) et le [protocole de reproduction](docs/reproduction.md) donnent les détails.

## Où retrouver les fichiers

Le code est dans `src/`, les configurations et dashboards dans `observability/`. Les requêtes Q01 à Q34 et leurs résultats sont dans `analysis/`. Les tests, scans et captures sont conservés dans `evidence/`.

Le [rapport](output/pdf/rapport-observabilite.pdf) explique les conclusions et leurs limites. Sa [source](docs/rapport.md) et les [commentaires de la démonstration](docs/demonstration-transcription.md) sont disponibles. La vidéo est fournie dans le ZIP de remise, avec des commentaires à l’écran et sans son. Le contrat de l'API est dans [OpenAPI](docs/openapi.yaml).

Pour arrêter la stack en gardant les données : `docker compose down`. Ne pas ajouter `-v` si les volumes doivent être conservés.

## Origine et vérifications

L’historique a été reconstruit par import de quatre dossiers le 8 octobre 2026. Les dates attribuées aux imports ne prouvent pas quatre jours de développement. Voir [Import des snapshots](IMPORT-SNAPSHOTS.md) et [Publication](docs/publication.md).

## Archive de remise

Le ZIP contient le rapport, la vidéo finale, LIEN_GIT.txt, trois JSON de dashboards et cinq captures. Le code et les journaux restent dans ce dépôt. Pour préparer l’archive avec les livrables locaux : `python3 scripts/package-delivery.py --nom Karboub --prenom Wissem --matiere UE03`.
