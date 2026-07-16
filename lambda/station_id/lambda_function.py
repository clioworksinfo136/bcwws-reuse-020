"""
AWS Lambda function (Python) — nearest-station lookup.

Given a point's latitude and longitude, finds the closest point in
station-id.json and returns that point's "STA" field.

Implementation notes
--------------------
* Nearest-neighbor search uses a KD-tree: O(log n) per query (~15
  comparisons) instead of O(n) brute force across all 19,315 stations.
* The tree is built once and cached in a module global, so warm Lambda
  invocations reuse it and only pay the build cost on a cold start.
* Pure standard library (no numpy/scipy), matching the project's other
  Python Lambda (trip_path). The only thing faster in absolute terms
  would be scipy.spatial.cKDTree, but that needs a Lambda Layer.
* Distance is flat-plane squared distance (no sqrt in the hot loop).
  Longitude is scaled by cos(mean latitude) so the result approximates
  true great-circle distance; this is accurate because every station
  sits in a tiny area (~0.02 deg) around lat 26.26.

Event (API Gateway / direct invocation)
---------------------------------------
    {"lat": 26.260735, "lng": -80.154182}
Optional: {"k": 5} returns the k nearest stations instead of just one.

Response
--------
    {"sta": "10+26", "distance_m": 12.34, "lat": ..., "lng": ...}
or, when "k" is provided:
    {"nearest": [{"sta": "10+26", "distance_m": ..., "lat": ..., "lng": ...}, ...]}
"""

import json
import math
import os
from typing import List, Optional, Tuple

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "station-id.json")

# Mean latitude of the station cluster, used to scale longitude so flat-plane
# distance approximates true surface distance near this latitude.
_MEAN_LAT = 26.2607
_LNG_SCALE = math.cos(math.radians(_MEAN_LAT))

# Approximate meters per degree (latitude). Longitude is pre-scaled, so the
# same factor converts both axes. Used only to give a human-readable distance_m.
_M_PER_DEG = 111_320.0


def _load_points() -> List[Tuple[float, float, str]]:
    """Read station-id.json and return [(lng_scaled, lat, sta), ...]."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    pts: List[Tuple[float, float, str]] = []
    for feat in data.get("features", []):
        try:
            lng, lat = feat["geometry"]["coordinates"]
            sta = feat.get("properties", {}).get("STA")
        except (KeyError, TypeError, ValueError):
            continue
        if sta is None:
            continue
        pts.append((lng * _LNG_SCALE, lat, sta))
    return pts


def _load_sta_fklh() -> dict:
    """Build a {STA: max FKLH} map from station-id.json.

    STA is not unique — one STA label can appear at many points along the line,
    each with its own FKLH (footage/chainage). We keep the maximum FKLH per STA
    so the lookup yields a single, monotonic-with-stationing value.
    """
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    m: dict = {}
    for feat in data.get("features", []):
        try:
            props = feat.get("properties", {})
            sta = props.get("STA")
            fklh = props.get("FKLH")
        except (AttributeError, TypeError):
            continue
        if sta is None or fklh is None:
            continue
        if sta not in m or fklh > m[sta]:
            m[sta] = fklh
    return m


# ---------------------------------------------------------------------------
# KD-tree (2-D) — pure standard library.
# ---------------------------------------------------------------------------
# Each node is a tuple:
#   (axis, point, left_child, right_child)
# where `point` is (lng_scaled, lat, sta).

def _build_kdtree(points: List[Tuple[float, float, str]], depth: int = 0):
    if not points:
        return None
    axis = depth % 2  # 0 -> lng_scaled, 1 -> lat
    points.sort(key=lambda p: p[axis])
    mid = len(points) // 2
    return (
        axis,
        points[mid],
        _build_kdtree(points[:mid], depth + 1),
        _build_kdtree(points[mid + 1:], depth + 1),
    )


def _dist_sq(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Squared flat-plane distance between two (lng_scaled, lat) pairs."""
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return dx * dx + dy * dy


def _nearest_k(node, target: Tuple[float, float], k: int) -> List[Tuple[float, Tuple]]:
    """Return the k nearest points as a max-heap-like list of (dist_sq, point)."""
    # Simple priority list kept at length <= k; the worst (largest) entry sits
    # at index 0. k is small (default 1), so the linear scan is negligible.
    best: List[Tuple[float, Tuple]] = []

    def consider(d_sq: float, point: Tuple):
        if len(best) < k:
            best.append((d_sq, point))
            best.sort(key=lambda t: t[0])
        elif d_sq < best[k - 1][0]:
            best[k - 1] = (d_sq, point)
            best.sort(key=lambda t: t[0])

    def walk(n):
        if n is None:
            return
        axis, point, left, right = n
        d_sq = _dist_sq(target, (point[0], point[1]))
        consider(d_sq, point)

        diff = target[axis] - point[axis]
        first, second = (left, right) if diff < 0 else (right, left)
        walk(first)

        # Only cross the splitting plane if it could still hold a closer point
        # than the current k-th best.
        worst = best[k - 1][0] if len(best) == k else float("inf")
        if diff * diff < worst:
            walk(second)

    walk(node)
    return best


# Cached state (rebuilt only on cold starts).
_CACHE: dict = {"tree": None, "sta_fklh": None}


def _get_tree():
    if _CACHE["tree"] is None:
        _CACHE["tree"] = _build_kdtree(_load_points())
    return _CACHE["tree"]


def _get_sta_fklh():
    if _CACHE["sta_fklh"] is None:
        _CACHE["sta_fklh"] = _load_sta_fklh()
    return _CACHE["sta_fklh"]


def _format_hit(d_sq: float, point: Tuple[float, float, str]) -> dict:
    _lng_scaled, lat, sta = point
    dist_m = math.sqrt(d_sq) * _M_PER_DEG
    # Recover the original longitude from the scaled value.
    lng = point[0] / _LNG_SCALE
    fklh = _get_sta_fklh().get(sta)
    return {"sta": sta, "distance_m": round(dist_m, 2),
            "lat": lat, "lng": lng, "fklh": fklh}


def _get_query(event):
    """Pull lat/lng/k from a direct-invoke dict or an API Gateway event.

    Supports three input shapes uniformly:
      * direct invoke:  {"lat": .., "lng": .., "k": ..}
      * REST/HTTP API body:        {"body": "{\"lat\":..}"}
      * REST/HTTP API query string: {"queryStringParameters": {"lat": ".."}}
    """
    if not isinstance(event, dict):
        return {}
    merged = dict(event)  # covers direct invocation (top-level lat/lng/k)
    merged.update(event.get("queryStringParameters") or {})
    raw = event.get("body")
    if isinstance(raw, str):
        try:
            merged.update(json.loads(raw))
        except (ValueError, TypeError):
            pass
    elif isinstance(raw, dict):
        merged.update(raw)
    # Drop envelope keys that are not real query parameters.
    merged.pop("queryStringParameters", None)
    merged.pop("body", None)
    return merged


def _respond(status_code: int, payload: dict) -> dict:
    """Wrap a payload as an API Gateway response with CORS headers.

    CORS headers are required so browsers can call this API cross-origin
    (the frontend is served from a different domain than execute-api).
    Applied to every response, including errors, so the browser always
    receives them.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(payload),
    }


def lambda_handler(event, context):
    # Answer the CORS preflight request directly so the browser can proceed
    # to the real GET. (event is sometimes {} on direct invoke -> skip.)
    if isinstance(event, dict) and event.get("httpMethod") == "OPTIONS":
        return _respond(204, {})

    body = _get_query(event)

    try:
        lat = float(body["lat"])
        lng = float(body["lng"])
    except (KeyError, TypeError, ValueError):
        return _respond(
            400, {"error": "Request must include numeric 'lat' and 'lng'."}
        )

    k = body.get("k")
    try:
        k = max(1, int(k)) if k is not None else 1
    except (TypeError, ValueError):
        k = 1

    tree = _get_tree()
    if tree is None:
        return _respond(500, {"error": "No station data loaded."})

    target = (lng * _LNG_SCALE, lat)
    hits = _nearest_k(tree, target, k)

    if k == 1:
        result = _format_hit(*hits[0])
    else:
        result = {"nearest": [_format_hit(d, p) for d, p in hits]}

    return _respond(200, result)


if __name__ == "__main__":
    # Local smoke test against a known station coordinate.
    print(json.dumps(lambda_handler({"lat": 26.260735, "lng": -80.154182}, None), indent=2))
