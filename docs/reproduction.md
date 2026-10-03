# Reproduire les preuves

## Installation et lancement

Docker Engine et Compose v2 suffisent à lancer la stack : `docker compose up --build -d`. Pour l'analyse locale : Node.js 22.13 minimum (Node 24 dans les conteneurs), puis `npm ci` et `npm run analyze`. Les dépendances JavaScript sont verrouillées dans package-lock.json.

## Contrôles

```bash
npm test
npm run lint
npm run analyze
npm run verify
docker compose exec -T prometheus promtool test rules /etc/prometheus/rules.test.yml
docker compose exec -T alloy alloy validate /etc/alloy/config.alloy
```

Attendre que l'application soit healthy et que `docker compose logs history` indique 2889 événements importés avant `npm run verify`. Après un redémarrage, attendre aussi au moins deux cycles de scraping Prometheus (environ 30 secondes) afin que le trafic soit mesuré. Cette vérification échoue si les nombres diffèrent, si un scraping est down, si une règle échoue ou si une requête de panneau est invalide. Elle écrit evidence/runtime-verification.json. Elle ne remplace pas le contrôle visuel. Si le premier import ne restitue que 2 065 rapports au lieu de 2 110, le contournement observé est `curl -X POST http://localhost:13100/flush`, suivi d’une nouvelle vérification. Ce défaut de démarrage reste ouvert ; voir evidence/loki-backfill-diagnostic.md.

L'analyse reconstruit analysis/events.sqlite, analysis/events.jsonl, analysis/audit.json et analysis/results.json. Chaque entrée Q01 à Q34 contient sa requête SQL et ses résultats. La base est lisible par SQLite : `sqlite3 analysis/events.sqlite` puis exécuter la requête souhaitée. Le brut demeure inchangé.

## Comparer avec une autre version

Comparer d'abord : hash du brut, fuseau, inclusion du 27 septembre local, déduplication, population utilisée comme dénominateur. Des chiffres calculés avant et après suppression des doublons ne sont pas directement comparables. Les métriques directes proviennent d'une simulation aléatoire : elles ne reproduisent pas les fréquences exactes de l'historique.

## Démontrer les blocages

Le workflow accepte deux entrées workflow_dispatch, toutes deux fausses par défaut. Le test volontairement faux est conservé en .txt pour ne pas contaminer la suite normale. L'image vulnérable node:18.0.0-alpine est uniquement scannée, jamais lancée ni publiée.

```bash
cp ci/failing-test.js.txt /tmp/ue3-negative.test.cjs
node --test /tmp/ue3-negative.test.cjs
# attendu : code de sortie 1

docker image save ue3-telemetry:local -o /tmp/ue3-current.tar
docker run --rm -v /tmp:/work aquasec/trivy:0.67.2 image --input /work/ue3-current.tar --scanners vuln --severity CRITICAL --exit-code 1
```

Pour le contrôle critique, remplacer l'image sauvegardée par node:18.0.0-alpine après docker pull. Une indisponibilité de la base Trivy n'est pas une preuve de vulnérabilité : vérifier le JSON et les CVE, en plus du code de sortie. Le résultat du scan peut changer avec la base de vulnérabilités.

## Arrêt

`docker compose stop` conserve les données. `docker compose down` supprime les conteneurs du projet et conserve les volumes. Ne pas utiliser `down -v` si les preuves du trafic en direct doivent être conservées.

## Limites assumées

Démo locale : interfaces liées à 127.0.0.1, Grafana anonyme en lecture seule, aucun TLS ni authentification de l'ingestion. Le journal applicatif n'est pas rotaté : arrêter la charge après usage. Ne pas exposer cette configuration sur Internet. Les alertes sont évaluées dans Prometheus, sans destinataire de notification configuré.

Les exécutions GitHub Actions sont accessibles dans l'onglet Actions du dépôt. Chaque image publiée porte le SHA complet du commit validé. Le lien du dépôt figure dans LIEN_GIT.txt.

Dans certains journaux publiés, les chemins absolus locaux sont abrégés en `<projet>`. Les résultats, les dates et les messages restent inchangés.

## Reconstruire le rapport et la vidéo

Python 3.11 ou ultérieur et les dépendances de requirements-report.txt sont nécessaires au rapport. Le montage vidéo utilise aussi ffmpeg/ffprobe. L’enregistrement source est conservé localement dans evidence/video/projet-en-fonctionnement.mp4 ; il n’est pas versionné. Il montre le navigateur pendant la consultation du projet ; les pauses entre les prises sont coupées. La vidéo finale ajoute des commentaires et ne contient aucune piste audio. Les captures conservées dans evidence/screenshots sont des captures du navigateur de la session de vérification, pas des images de tableaux reconstituées.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-report.txt
npm run analyze
.venv/bin/python scripts/build-report.py
.venv/bin/python scripts/build-video.py
```

Les textes et les repères sont dans evidence/video/sequence.json. scripts/build-video.py les superpose à l’enregistrement source et exporte docs/demonstration-transcription.md. Pour montrer une autre manipulation, il faut enregistrer une nouvelle prise. La vidéo déjà exportée reste lisible sans ces outils.

Le PDF final est versionné. La vidéo et ses sources restent locales ; seule la vidéo finale est incluse dans le ZIP de livraison. Le ZIP et les sorties intermédiaires sont exclus de Git. Les bases SQLite et les JSONL peuvent être reconstruits par npm run analyze.

Pour préparer l’archive : `.venv/bin/python scripts/package-delivery.py --nom Karboub --prenom Wissem --matiere UE03`. Elle contient le PDF, la vidéo finale, LIEN_GIT.txt, les trois JSON et les cinq captures. Le script relit chaque fichier du ZIP et le compare à son original. Les journaux et le code restent dans le dépôt.
