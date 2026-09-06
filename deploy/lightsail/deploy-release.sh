#!/usr/bin/env bash
set -euo pipefail
umask 077

release=${1:?Release identifier is required}
revision=${2:?Commit SHA is required}
[[ $release =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || exit 1
[[ $revision =~ ^[0-9a-f]{40}$ ]] || exit 1
root=$(realpath "${FABRISCOPE_ROOT:-/opt/fabriscope}")
test "$PWD" = "$root/releases/$release"
test -s "$root/.env"

exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
previous=$(readlink -f "$root/current")
if [[ $previous != "$root/releases/"* ]] || [ ! -d "$previous" ]; then
  echo 'The previous release must be inside the deployment directory.' >&2
  exit 1
fi
previous_image=$(sudo docker inspect --format '{{.Image}}' fabriscope-api-1)
site_host=$(sed -n 's/^SITE_HOST=//p' "$root/.env")
[[ $site_host =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
origin="https://$site_host"
switched=0

dc() { sudo docker compose --env-file "$root/.env" -f "$PWD/deploy/lightsail/compose.yaml" "$@"; }
recover() {
  status=$?
  if (( status != 0 && switched == 1 )); then
    echo 'Deployment failed; restoring the previous application image.' >&2
    sudo docker tag "$previous_image" fabriscope-mes:local
    sudo docker compose --env-file "$root/.env" \
      -f "$previous/deploy/lightsail/compose.yaml" \
      up -d --no-deps --wait --wait-timeout 90 api caddy </dev/null || \
      echo 'Automatic application recovery failed; operator attention is required.' >&2
  fi
  exit "$status"
}
trap recover EXIT

dc config --quiet </dev/null
available_kb=$(df -Pk "$root" | awk 'NR==2 {print $4}')
(( available_kb > 2097152 )) || { echo 'Less than 2 GiB free; keeping the current release.' >&2; exit 1; }
sudo docker tag "$previous_image" "fabriscope-mes:before-$release"
dc --profile tools build api maintenance </dev/null

mkdir -p "$root/backups"
backup="$root/backups/before-$release.dump"
dc exec -T postgres pg_dump -U sensor_mes -d sensor_mes -Fc </dev/null > "$backup"
dc exec -T postgres pg_restore --list < "$backup" > "$backup.contents"
test -s "$backup"
# Seed is deliberately excluded: visitors share the existing demo database.
dc --profile tools run -T --rm maintenance \
  node node_modules/prisma/build/index.js migrate deploy </dev/null

switched=1
dc up -d --no-deps --wait --wait-timeout 90 api caddy </dev/null
curl --fail --silent --show-error --retry 8 --retry-delay 3 --retry-all-errors \
  --max-time 15 "$origin/api/health" > /dev/null
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors \
  --max-time 15 "$origin/version.json" | \
  python3 -c 'import json,sys; assert json.load(sys.stdin)["commit"] == sys.argv[1]' "$revision"
ln -sfn "$PWD" "$root/current"
printf '{"commit":"%s","release":"%s","previous":"%s"}\n' \
  "$revision" "$release" "$previous" > "$root/deployment.json"
switched=0
echo "Deployed $revision to $origin"
