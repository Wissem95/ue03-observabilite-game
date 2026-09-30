#!/bin/sh
# Vérifie les deux refus attendus, sans changer le code normal.
set -eu
mkdir -p tmp evidence
cp ci/failing-test.js.txt tmp/negative.test.cjs
if node --test tmp/negative.test.cjs > evidence/ci-negative-test.txt 2>&1; then
  echo 'ERREUR : le test négatif a réussi'; exit 1
else
  result=$?
  printf 'exit_code=%s\n' "$result" >> evidence/ci-negative-test.txt
  test "$result" -eq 1
fi
docker pull node:18.0.0-alpine
docker image save node:18.0.0-alpine -o tmp/vulnerable-image.tar
if docker run --rm -v "$PWD/tmp:/work" -v ue3-trivy-cache:/root/.cache/trivy aquasec/trivy:0.67.2 image --input /work/vulnerable-image.tar --scanners vuln --severity CRITICAL --exit-code 1 --format json --output /work/trivy-negative.json > evidence/trivy-negative.txt 2>&1; then
  echo 'ERREUR : la barrière critique ne bloque plus ce témoin'; exit 1
else
  result=$?
  printf 'exit_code=%s\n' "$result" >> evidence/trivy-negative.txt
  test "$result" -eq 1
fi
cp tmp/trivy-negative.json evidence/trivy-negative.json
node -e 'const r=require("./evidence/trivy-negative.json"); if(!r.Results.some(x=>(x.Vulnerabilities??[]).some(v=>v.Severity==="CRITICAL"))) process.exit(1)'
