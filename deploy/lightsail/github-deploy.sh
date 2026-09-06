#!/usr/bin/env bash
set -euo pipefail
umask 077

archive=${1:?Release archive is required}
: "${RUNNER_TEMP:?}" "${GITHUB_SHA:?}" "${GITHUB_RUN_ID:?}" "${GITHUB_RUN_ATTEMPT:?}"
: "${LIGHTSAIL_INSTANCE:?}" "${AWS_REGION:?}"
release="$GITHUB_SHA-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
[[ $release =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || exit 1
connection="$RUNNER_TEMP/lightsail-connection"
mkdir -p "$connection"
rule="$RUNNER_TEMP/lightsail-ssh-rule.json"
cleanup() {
  status=$?
  if [ -s "$rule" ]; then
    aws lightsail close-instance-public-ports --instance-name "$LIGHTSAIL_INSTANCE" \
      --port-info "file://$rule" --output json > /dev/null || status=1
  fi
  rm -f "$connection/access.json" "$connection/key" "$connection/key-cert.pub"
  exit "$status"
}
trap cleanup EXIT

aws lightsail get-instance-access-details --instance-name "$LIGHTSAIL_INSTANCE" \
  --protocol ssh --output json > "$connection/access.json"
jq -er '.accessDetails.privateKey' "$connection/access.json" > "$connection/key"
jq -er '.accessDetails.certKey' "$connection/access.json" > "$connection/key-cert.pub"
host=$(jq -er '.accessDetails.ipAddress' "$connection/access.json")
username=$(jq -er '.accessDetails.username' "$connection/access.json")
[[ $host =~ ^[0-9.]+$ && $username =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
# Trust keys returned by the authenticated AWS API, never an unverified keyscan.
jq -er '.accessDetails as $d | $d.hostKeys[] | "\($d.ipAddress) \(.algorithm) \(.publicKey)"' \
  "$connection/access.json" > "$connection/known_hosts"
chmod 600 "$connection/key" "$connection/key-cert.pub" "$connection/known_hosts"

runner_ip=$(curl -4 --fail --silent --show-error --max-time 15 https://checkip.amazonaws.com)
[[ $runner_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1
jq -n --arg cidr "$runner_ip/32" \
  '{fromPort:22,toPort:22,protocol:"tcp",cidrs:[$cidr]}' > "$rule"
aws lightsail open-instance-public-ports --instance-name "$LIGHTSAIL_INSTANCE" \
  --port-info "file://$rule" --output json > /dev/null

options=(-i "$connection/key" -o "UserKnownHostsFile=$connection/known_hosts"
  -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes -o BatchMode=yes
  -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3)
destination="$username@$host"
for attempt in {1..12}; do
  if ssh "${options[@]}" "$destination" 'mkdir -p /opt/fabriscope/incoming'; then break; fi
  (( attempt < 12 )) || exit 1
  sleep 5
done
scp "${options[@]}" "$archive" "$destination:/opt/fabriscope/incoming/$release.tar.gz"
digest=$(sha256sum "$archive" | cut -d' ' -f1)
# These values are validated identifiers/digests and intentionally expand locally.
# shellcheck disable=SC2029
ssh "${options[@]}" "$destination" "set -eu; umask 077
  cd /opt/fabriscope/incoming
  printf '%s  %s\\n' '$digest' '$release.tar.gz' | sha256sum -c -
  mkdir '/opt/fabriscope/releases/$release'
  tar -xzf '$release.tar.gz' -C '/opt/fabriscope/releases/$release'
  cd '/opt/fabriscope/releases/$release'
  bash deploy/lightsail/deploy-release.sh '$release' '$GITHUB_SHA'" </dev/null
printf '### Deployment succeeded\n\nCommit: `%s`\n' "$GITHUB_SHA" >> "$GITHUB_STEP_SUMMARY"
