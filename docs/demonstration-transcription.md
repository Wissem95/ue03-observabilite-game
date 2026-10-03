# Commentaires de la démonstration

Nouvelle capture du 8 octobre : Grafana, Prometheus et les exécutions GitHub Actions du dépôt ue03-telemetrie. Les pauses entre les prises ont été retirées. Les commentaires sont ajoutés au montage. La vidéo ne contient aucune piste audio.

## 0 s
Le service reçoit le trafic du générateur. La valeur 1 indique que Prometheus arrive à le contacter.

## 12 s
Les courbes suivent la latence de l’API et les réponses HTTP. Ici, les réponses 202 correspondent aux rapports acceptés.

## 22 s
Les logs arrivent dans Loki. En ouvrant un événement, on retrouve les champs du rapport et les labels de collecte.

## 34 s
L’export contient 2 110 rapports uniques. Parmi eux, 262 présentent la signature overlay. Les doublons sont retirés à l’import.

## 44 s
Le classement sépare les signatures. Les pics overlay se concentrent sur les builds récents ; le rapport compare aussi les configurations graphiques.

## 58 s
Les rapports incohérents sont conservés pour l’enquête. Un signal suspect ne suffit pas à prouver qu’un joueur triche.

## 70 s
L’archive contient 779 fins de partie. Parmi elles, 83 victoires sur vault finissent en 3-0 en moins de 90 secondes.

## 80 s
Les victoires courtes forment deux épisodes, les 23 et 25 septembre. Les incidents de tick serveur apparaissent à d’autres moments.

## 94 s
Prometheus interroge le service et sa propre instance. Les deux cibles sont UP : le scraping fonctionne.

## 104 s
Six règles d’alerte surveillent le trafic simulé. Elles ne rejouent pas l’archive historique ; leurs seuils et limites sont expliqués dans le rapport.

## 116 s
Le pipeline de ce dépôt a été exécuté le 8 octobre : lint, tests, build et scan réussissent, puis l’image est publiée.

## 126 s
Un test volontairement faux fait échouer npm test. Le job de publication est alors ignoré.

## 136 s
Le scan d’une image témoin vulnérable détecte des critiques et bloque aussi la publication. Les preuves sont conservées dans le dépôt.
