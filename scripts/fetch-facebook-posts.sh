#!/usr/bin/env bash
# Fetch Irene's Travel Facebook Page posts and write data/facebook-posts.json.
# Requires: FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID in the environment (GitHub Secrets).
# Safety rules:
#   - Never print the token. Never write it to the JSON file.
#   - On any API error, exit non-zero WITHOUT overwriting the existing JSON,
#     so the site keeps showing the last good posts.
#   - Requires jq and curl (both present on GitHub-hosted ubuntu runners).
set -euo pipefail

: "${FB_PAGE_ACCESS_TOKEN:?FB_PAGE_ACCESS_TOKEN is not set}"
: "${FB_PAGE_ID:=87861582927}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# URL-encode the fields list by passing it as a query parameter via curl --data-urlencode
# with -G (GET). The token goes in the query string of a server-side call only;
# it never reaches a browser.
curl -sS -G "https://graph.facebook.com/v26.0/${FB_PAGE_ID}/feed" \
  --data-urlencode "fields=id,message,created_time,permalink_url,full_picture,attachments" \
  --data-urlencode "limit=10" \
  --data-urlencode "access_token=${FB_PAGE_ACCESS_TOKEN}" \
  -o "$TMP"

# If Facebook returned an error object, stop here — do not touch the live JSON.
if jq -e '.error' "$TMP" >/dev/null 2>&1; then
  echo "Graph API error:" >&2
  jq -r '.error.message' "$TMP" >&2
  exit 1
fi

mkdir -p data

# Keep the newest 6 posts, in the shape the homepage renderer expects.
# type: "video" when attachments mention a video, otherwise "photo" if an image
# exists, otherwise "text". Missing images stay null — the renderer handles that.
jq --arg fetched_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  {
    fetched_at: $fetched_at,
    page: "irenestravel",
    page_url: "https://www.facebook.com/irenestravel",
    posts: [
      (.data // [])[0:6][] |
      {
        id: .id,
        message: (.message // .story // ""),
        created_time: .created_time,
        permalink_url: .permalink_url,
        full_picture: (.full_picture // null),
        type: (
          if ((.attachments.data // []) | map(.type // "") | any(test("video"; "i")))
          then "video"
          elif .full_picture then "photo"
          else "text" end
        )
      }
    ]
  }' "$TMP" > data/facebook-posts.json

echo "Wrote data/facebook-posts.json with $(jq '.posts | length' data/facebook-posts.json) posts."
