#!/usr/bin/env python3
"""
check_ministry_tariffs.py - Compare GTFS feed from data.gov.il with local tariffs.json

This script:
1. Fetches the latest GTFS feed from data.gov.il (Ministry of Transport)
2. Extracts fare values from the feed
3. Compares with local data/tariffs.json
4. Outputs diff results to data/feed_snapshot.json

Usage:
    python scripts/check_ministry_tariffs.py
"""

import json
import os
import sys
import zipfile
import io
import csv
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

SCRIPT_DIR = Path(__file__).parent.parent
TARIFFS_FILE = SCRIPT_DIR / "data" / "tariffs.json"
SNAPSHOT_FILE = SCRIPT_DIR / "data" / "feed_snapshot.json"

# data.gov.il GTFS feed URL for Ministry of Transport tariff data
GTFS_FEED_URL = "https://api.govmap.gov.il/OpenData/api/v1/gtfs/routes"
FARE_FEED_URL = "https://api.govmap.gov.il/OpenData/api/v1/gtfs/fare_attributes"


def load_local_tariffs():
    """Load tariffs from local tariffs.json file."""
    if not TARIFFS_FILE.exists():
        print(f"Error: {TARIFFS_FILE} not found.")
        return None

    with open(TARIFFS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_fare_values_from_tariffs(data):
    """Extract all fare/single ticket values from tariffs.json."""
    fares = set()

    # Extract from bus zones
    if 'bus' in data and 'zones' in data['bus']:
        for zone in data['bus']['zones']:
            if 'single' in zone:
                fares.add(round(zone['single'], 2))

    # Extract from rail zones
    if 'rail' in data and 'zones' in data['rail']:
        for zone in data['rail']['zones']:
            if 'single' in zone:
                fares.add(round(zone['single'], 2))

    return sorted(fares)


def fetch_gtfs_feed():
    """
    Fetch GTFS feed from data.gov.il.
    
    Returns a dict with feed_url and extracted fares.
    """
    fares = set()
    feed_url = GTFS_FEED_URL

    print(f"Fetching GTFS data from data.gov.il...")
    print(f"URL: {feed_url}")

    try:
        req = Request(feed_url, headers={
            'Accept': 'application/json',
            'User-Agent': 'PSC-Tariff-Checker/1.0'
        })
        
        with urlopen(req, timeout=30) as response:
            data = response.read()
            
        # Try to parse as JSON (data.gov.il API format)
        try:
            json_data = json.loads(data)
            
            # Extract fares from JSON response
            if isinstance(json_data, list):
                for item in json_data:
                    if 'fare' in item:
                        fares.add(round(float(item['fare']), 2))
                    if 'price' in item:
                        fares.add(round(float(item['price']), 2))
                    if 'route_fare' in item:
                        fares.add(round(float(item['route_fare']), 2))
            elif isinstance(json_data, dict):
                for key, value in json_data.items():
                    if isinstance(value, (int, float)):
                        if 1 <= value <= 100:  # Reasonable fare range
                            fares.add(round(float(value), 2))
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                if 'fare' in item:
                                    fares.add(round(float(item['fare']), 2))
                                if 'price' in item:
                                    fares.add(round(float(item['price']), 2))
            
            return {
                'feedResourceUrl': feed_url,
                'fares': sorted(fares),
                'source': 'data.gov.il GTFS API'
            }
            
        except json.JSONDecodeError:
            print("Response is not JSON, attempting CSV/GTFS parsing...")
            
    except (URLError, HTTPError) as e:
        print(f"Error fetching GTFS data: {e}")
        
        # Fallback: try alternative data.gov.il endpoints
        fallback_urls = [
            "https://data.gov.il/api/3/action/package_show?id=ministry-of-transport-gtfs",
            "https://www.data.gov.il/api/3/action/package_show?id=gtfs-israel",
        ]
        
        for fallback_url in fallback_urls:
            try:
                req = Request(fallback_url, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'PSC-Tariff-Checker/1.0'
                })
                
                with urlopen(req, timeout=30) as response:
                    data = json.loads(response.read())
                    
                if 'result' in data and data['result']:
                    resources = data['result'].get('resources', [])
                    for resource in resources:
                        if resource.get('format', '').lower() in ['gtfs', 'zip', 'json']:
                            print(f"Found GTFS resource: {resource.get('url', 'unknown')}")
                            return {
                                'feedResourceUrl': resource.get('url', fallback_url),
                                'fares': sorted(fares),
                                'source': 'data.gov.il Package API'
                            }
                            
            except Exception:
                continue

    # If we couldn't fetch data, return empty with the primary URL
    return {
        'feedResourceUrl': feed_url,
        'fares': sorted(fares),
        'source': 'No data fetched'
    }


def compare_fares(local_fares, feed_fares):
    """Compare local fares with feed fares and identify differences."""
    local_set = set(local_fares)
    feed_set = set(feed_fares)

    in_feed_not_in_local = sorted(feed_set - local_set)
    in_local_not_in_feed = sorted(local_set - feed_set)

    return {
        'inFeedNotInTariffs': in_feed_not_in_local,
        'inTariffsNotInFeed': in_local_not_in_feed,
        'common': sorted(local_set & feed_set)
    }


def save_snapshot(snapshot):
    """Save the comparison snapshot to JSON file."""
    with open(SNAPSHOT_FILE, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    print(f"Snapshot saved to: {SNAPSHOT_FILE}")


def main():
    print("=" * 60)
    print("Ministry of Transport - Tariff Drift Detector")
    print("=" * 60)
    print()

    # Load local tariffs
    print("Step 1: Loading local tariffs.json...")
    local_data = load_local_tariffs()
    if not local_data:
        print("Failed to load local tariffs.")
        sys.exit(1)

    local_fares = extract_fare_values_from_tariffs(local_data)
    print(f"  Found {len(local_fares)} fare values in local tariffs")
    print(f"  Fares: {local_fares}")

    # Fetch GTFS feed
    print()
    print("Step 2: Fetching GTFS feed from data.gov.il...")
    feed_data = fetch_gtfs_feed()
    feed_fares = feed_data.get('fares', [])
    print(f"  Found {len(feed_fares)} fare values in GTFS feed")
    print(f"  Fares: {feed_fares}")
    print(f"  Source: {feed_data.get('source', 'unknown')}")

    # Compare fares
    print()
    print("Step 3: Comparing fares...")
    diffs = compare_fares(local_fares, feed_fares)

    print(f"  Common fares: {len(diffs['common'])}")
    print(f"  In feed but not in tariffs: {len(diffs['inFeedNotInTariffs'])}")
    print(f"  In tariffs but not in feed: {len(diffs['inTariffsNotInFeed'])}")

    if diffs['inFeedNotInTariffs']:
        print(f"  → New potential fares: {diffs['inFeedNotInTariffs']}")
    if diffs['inTariffsNotInFeed']:
        print(f"  → Removed fares: {diffs['inTariffsNotInFeed']}")

    # Create snapshot
    snapshot = {
        'fetchedAt': datetime.now().isoformat(),
        'feedResourceUrl': feed_data.get('feedResourceUrl', ''),
        'feedSource': feed_data.get('source', ''),
        'localTariffsLastUpdated': local_data.get('metadata', {}).get('lastUpdated', ''),
        'localFares': local_fares,
        'feedFares': feed_fares,
        'diffs': diffs,
        'hasDrift': len(diffs['inFeedNotInTariffs']) > 0 or len(diffs['inTariffsNotInFeed']) > 0
    }

    # Save snapshot
    print()
    print("Step 4: Saving snapshot...")
    save_snapshot(snapshot)

    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    
    if snapshot['hasDrift']:
        print("⚠️  DRIFT DETECTED!")
        print(f"   {len(diffs['inFeedNotInTariffs'])} new fares in GTFS")
        print(f"   {len(diffs['inTariffsNotInFeed'])} fares removed from GTFS")
    else:
        print("✅ No drift detected - tariffs are in sync")

    print()
    print(f"Snapshot file: {SNAPSHOT_FILE}")
    print()

    return 0 if snapshot['hasDrift'] else 1


if __name__ == "__main__":
    sys.exit(main())
