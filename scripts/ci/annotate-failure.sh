#!/usr/bin/env bash
# Turns the tail of a log file into a single GitHub annotation, so the reason for
# a failed step can be read from the check-run API without downloading logs.
# Usage: annotate-failure.sh "<title>" <logfile> [lines]
set -u

title="${1:-Step failed}"
file="${2:-}"
lines="${3:-50}"

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "::error title=${title}::no log file found"
  exit 0
fi

# Strip colors, keep the last N lines, escape for the workflow-command syntax.
message="$(tail -n "$lines" "$file" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g')"
message="${message//'%'/'%25'}"
message="${message//$'\r'/'%0D'}"
message="${message//$'\n'/'%0A'}"

echo "::error title=${title}::${message}"
