#!/usr/bin/env bash
B=http://localhost:3000/api/v1
J='Content-Type: application/json'
E="explorer-$RANDOM@example.test"
curl -s -XPOST $B/auth/register -H "$J" -d "{\"email\":\"$E\",\"password\":\"local-test-password\"}" >/dev/null
T=$(curl -s -XPOST $B/auth/login -H "$J" -d "{\"email\":\"$E\",\"password\":\"local-test-password\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
A="Authorization: Bearer $T"
post(){ curl -s -o /tmp/o -w "%{http_code}" -XPOST $B/tasks -H "$J" -H "$A" --data-binary "$1"; echo " $(head -c 160 /tmp/o)"; }
echo "--- 1 empty list"; curl -s $B/tasks -H "$A"; echo
echo "--- 2 long ascii 120"; post "{\"title\":\"$(python3 -c 'print("a"*120)')\"}"
echo "--- 3 61 emoji (61 visible chars)"; post "{\"title\":\"$(python3 -c 'print("😀"*61)')\"}"
echo "--- 4 60 emoji"; post "{\"title\":\"$(python3 -c 'print("😀"*60)')\"}"
echo "--- 5 blank"; post '{"title":""}'
echo "--- 6 only zero-width space"; post '{"title":"​"}'
echo "--- 7 only NBSP"; post '{"title":"  "}'
echo "--- 8 newline inside"; post '{"title":"line1\nline2"}'
echo "--- 9 rapid repeated taps (5 parallel identical POSTs)"
for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{http_code} " -XPOST $B/tasks -H "$J" -H "$A" -d '{"title":"Doble tap"}' & done; wait; echo
curl -s "$B/tasks?limit=100" -H "$A" | python3 -c 'import sys,json;d=json.load(sys.stdin)["items"];print("copies of Doble tap:",sum(1 for t in d if t["title"]=="Doble tap"))'
ID=$(curl -s "$B/tasks?limit=1" -H "$A" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
echo "--- 10 edit with server down (interrupted connectivity)"
echo "$ID" > /tmp/explore_id; echo "$T" > /tmp/explore_tok
