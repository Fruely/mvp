#!/bin/sh
# Проверка API site-blocks. Запуск: ./scripts/check-site-blocks.sh
# Без jq: curl -s https://freuly.de/api/site-blocks

API="${1:-https://freuly.de/api/site-blocks}"
echo "Fetching: $API"
if command -v jq >/dev/null 2>&1; then
  curl -s "$API" | jq -r '
    .blocks // [] |
    map(select(.key == "homepage_text_image")) |
    if length > 0 then
      .[0] |
      "homepage_text_image FOUND\n  title: \(.content.title // "—")\n  text: \(.content.text // "—")\n  url: \(.content.url // "—")"
    else
      "homepage_text_image NOT FOUND in blocks"
    end
  '
else
  echo "Install jq for pretty output. Raw response:"
  curl -s "$API"
fi
