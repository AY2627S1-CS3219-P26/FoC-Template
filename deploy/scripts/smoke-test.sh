#!/usr/bin/env bash
# Checks a running Relay from the outside, through the gateway like a browser: the gateway is up,
# protected routes refuse anonymous requests, and a new student can register, read the code in
# Mailpit, verify, log in and fetch the own profile. Works locally and in the cloud.
#
#   deploy/scripts/smoke-test.sh                        local k3d (http://localhost:8081)
#   deploy/scripts/smoke-test.sh https://relay.example  any other address
#   MAILBOX_AUTH=user:pass deploy/scripts/smoke-test.sh https://…   when Mailpit has a password
set -euo pipefail

BASE="${1:-http://localhost:8081}"
BASE="${BASE%/}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

failed=0
# expect <label> <expected status> <curl args...>; prints the body to stdout for the caller.
expect() {
  local label="$1" want="$2"
  shift 2
  local body status
  body="$(curl --silent --show-error --cookie "$JAR" --cookie-jar "$JAR" --write-out '\n%{http_code}' "$@")"
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$status" = "$want" ]; then
    echo "ok    $label ($status)" >&2
  else
    echo "FAIL  $label: expected $want, got $status: $body" >&2
    failed=1
  fi
  printf '%s' "$body"
}

json() { curl --silent --show-error --header 'Content-Type: application/json' "$@"; }

stamp="$(date +%s)"
email="smoke$stamp@u.nus.edu"
username="smoke$stamp"
password="smoke-test-$stamp"

expect "gateway is up" 200 "$BASE/healthz" >/dev/null
expect "profile needs a session" 401 "$BASE/api/user/users/me" >/dev/null
expect "internal routes stay closed" 404 --request POST "$BASE/api/user/internal/authorize" >/dev/null

expect "register $email" 201 --header 'Content-Type: application/json' \
  --data "{\"fullName\":\"Smoke Test\",\"email\":\"$email\",\"username\":\"$username\",\"password\":\"$password\"}" \
  "$BASE/api/user/auth/register" >/dev/null

# The user-service sends the mail in the background, so give Mailpit a few seconds.
mailbox=(--silent --show-error)
[ -n "${MAILBOX_AUTH:-}" ] && mailbox+=(--user "$MAILBOX_AUTH")
code=""
for _ in $(seq 1 15); do
  code="$(curl "${mailbox[@]}" --get --data-urlencode "query=to:$email" "$BASE/mail/api/v1/search" \
    | jq -r '.messages[0].Snippet // empty' | grep -oE '[0-9]{6}' | head -1 || true)"
  [ -n "$code" ] && break
  sleep 1
done
if [ -n "$code" ]; then
  echo "ok    verification code arrived in Mailpit" >&2
else
  echo "FAIL  no verification code for $email in Mailpit" >&2
  exit 1
fi

expect "verify the account" 200 --header 'Content-Type: application/json' \
  --data "{\"email\":\"$email\",\"code\":\"$code\"}" "$BASE/api/user/auth/verify" >/dev/null
expect "log in" 200 --header 'Content-Type: application/json' \
  --data "{\"identifier\":\"$username\",\"password\":\"$password\"}" "$BASE/api/user/auth/login" >/dev/null
me="$(expect "own profile with the session" 200 "$BASE/api/user/users/me")"
[ "$(printf '%s' "$me" | jq -r '.username // empty')" = "$username" ] \
  || { echo "FAIL  profile belongs to someone else: $me" >&2; failed=1; }

if [ "$failed" -eq 0 ]; then
  echo "All checks passed against $BASE" >&2
else
  echo "Some checks failed against $BASE" >&2
fi
exit "$failed"
