# Vérification du backfill

Observation initiale : l'import répond 204, 2 889 événements envoyés, mais la requête ne restitue que 2 065 rapports et 779 fins de partie. Comparaison hash par hash : 45 rapports absents, tous dans le dernier intervalle de l'export.

Test discriminant : POST /flush, sans modifier ni réimporter les données. La même requête restitue alors 2 110 rapports et 779 fins de partie. Les données étaient présentes mais le dernier chunk en mémoire n'était pas interrogé pour cette période ancienne.

Réglage essayé lors du premier diagnostic : querier.query_ingesters_within=0s pour inclure les ingesters sur les requêtes historiques. La documentation officielle indique un défaut de 3h et 0 pour toutes les requêtes : https://grafana.com/docs/loki/latest/configure/ .


## Nouveau contrôle du 8 octobre 2026

Un démarrage isolé sur volumes neufs, au commit 267edd4, reproduit le résultat incomplet malgré query_ingesters_within=0s. Seuls les ports hôte, le nom du projet et le tag de l'image ont été adaptés pour ne pas utiliser les volumes de la stack déjà ouverte.

Requête, identique avant et après :

```logql
sum by(event)(count_over_time({job="game",source="historical"}[8d]))
```

Évaluation à `2026-09-27T00:00:00Z`. Avant : 779 fins de partie et 2 065 rapports. Après POST /flush, sans réimportation : 779 et 2 110. Les réponses utiles sont conservées dans loki-query-comparison-2026-10-08.json, extraites des réponses brutes de cet essai.

PROUVÉ : le flush rend les 45 rapports visibles. Le réglage essayé n'est pas une correction durable démontrée. La cause interne complète reste à isoler ; l'observation initiale ne suffit pas à l'attribuer au seul paramètre query_ingesters_within.

Le contournement sur la stack standard est `curl -X POST http://localhost:13100/flush`, puis `npm run verify`. Un contrôle réussi après ce contournement ne prouve pas que le premier démarrage fonctionne sans intervention.
