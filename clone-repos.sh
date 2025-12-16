#!/bin/bash
# Usage: ./clone-repos.sh <org> <prefix>

ORG="$1"
PREFIX="$2"

if [ -z "$ORG" ] || [ -z "$PREFIX" ]; then
  echo "Usage: $0 <org> <prefix>"
  exit 1
fi

repos=$(gh api --paginate "/orgs/$ORG/repos?per_page=100" --jq ".[] | select(.name | startswith(\"$PREFIX\")) | select(.archived == false) | .ssh_url")

while IFS= read -r url; do
  echo "Cloning $url"
  git clone "$url"
done <<< "$repos"

echo "Done! Cloned all repos starting with '$PREFIX' from org '$ORG'"
