"""
AWS Lambda function (Python) for API Gateway.

Queries the Amplify (AppSync) GraphQL backend, joins Location with Track on
the "track" field, keeps only locations whose track has geometry == "line",
computes a per-point "timestamps" value (days since 2026-06-01, from
date + time), groups points by track, and returns JSON like:

  [
    {
      "track": 1,
      "color": "purple",
      "type": "24 inch pipe",
      "timestamps": [1.0, 2.5, 3.1],
      "path": [[lng1, lat1], [lng2, lat2], [lng3, lat3]]
    },
    ...
  ]
"""

import json
import os
import urllib.request
from datetime import datetime, date, time

GRAPHQL_URL = os.environ.get(
    "GRAPHQL_URL",
    "https://euhxsprquzc6zk2rrrlgy3qdky.appsync-api.us-east-1.amazonaws.com/graphql",
)
API_KEY = os.environ.get("GRAPHQL_API_KEY", "da2-spnpofbvbvcxdebfm23rltvk4q")

REFERENCE_DATE = datetime(2026, 6, 1)

LIST_TRACKS_QUERY = """
query ListTracks($nextToken: String) {
  listTracks(limit: 1000, nextToken: $nextToken) {
    items { track geometry color type }
    nextToken
  }
}
"""

LIST_LOCATIONS_QUERY = """
query ListLocations($nextToken: String) {
  listLocations(limit: 1000, nextToken: $nextToken) {
    items { track date time lat lng }
    nextToken
  }
}
"""


def graphql(query, variables=None):
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=payload,
        headers={"Content-Type": "application/json", "x-api-key": API_KEY},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    return body["data"]


def list_all(query, root_field):
    """Fetch every page of a list query."""
    items, next_token = [], None
    while True:
        data = graphql(query, {"nextToken": next_token})
        page = data[root_field]
        items.extend(page["items"])
        next_token = page.get("nextToken")
        if not next_token:
            return items


def parse_datetime(date_str, time_str):
    """Combine AWSDate (YYYY-MM-DD) and AWSTime (HH:MM[:SS[.fff]]) fields."""
    d = date.fromisoformat(date_str)
    t = time(0, 0)
    if time_str:
        try:
            t = time.fromisoformat(time_str.rstrip("Z"))
        except ValueError:
            pass
    return datetime.combine(d, t)


def lambda_handler(event, context):
    tracks = list_all(LIST_TRACKS_QUERY, "listTracks")
    locations = list_all(LIST_LOCATIONS_QUERY, "listLocations")

    # Tracks with geometry == "line", keyed by track number
    line_tracks = {
        t["track"]: t for t in tracks
        if t.get("geometry") == "line" and t.get("track") is not None
    }

    # Group line-track locations by track number
    groups = {}
    for loc in locations:
        track_no = loc.get("track")
        if track_no not in line_tracks:
            continue
        if loc.get("date") is None or loc.get("lat") is None or loc.get("lng") is None:
            continue
        dt = parse_datetime(loc["date"], loc.get("time"))
        timestamp_days = (dt - REFERENCE_DATE).total_seconds() / 86400.0
        groups.setdefault(track_no, []).append(
            {"dt": dt, "timestamp": round(timestamp_days, 4),
             "lng": loc["lng"], "lat": loc["lat"]}
        )

    result = []
    for track_no in sorted(groups):
        pts = sorted(groups[track_no], key=lambda p: p["dt"])
        track = line_tracks[track_no]
        track_type = track.get("type")
        result.append({
            "track": track_no,
            "color": track.get("color"),
            "type": track_type.replace("'", "").replace('"', "") if track_type else track_type,
            "timestamps": [p["timestamp"] for p in pts],
            "path": [[p["lng"], p["lat"]] for p in pts],
        })

    return result


if __name__ == "__main__":
    # Local test
    print(json.dumps(lambda_handler({}, None)))
