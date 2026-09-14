#!/usr/bin/env python3
"""
update_tariffs.py - Dynamic Tariff Update Script for PSC Fare Calculator

This script demonstrates how to fetch external tariff data and update
the data/tariffs.json file dynamically, replacing hardcoded values in
the HTML with data-driven approach.

USAGE:
    python3 update_tariffs.py                    # Interactive mode (show current)
    python3 update_tariffs.py --fetch           # Fetch and update from external API
    python3 update_tariffs.py --simulate        # Simulate without actual API call
    python3 update_tariffs.py --validate        # Validate current tariffs.json
    python3 update_tariffs.py --dry-run         # Preview changes without applying

FEATURES:
    - Fetches tariffs from external API (simulated)
    - Validates tariff data structure
    - Creates backups before updates
    - Generates dynamic loader for index.html

FUTURE ENHANCEMENTS:
    - Real API integration with PSC Fare Authority
    - Scheduled updates via cron
    - Email notifications on tariff changes
"""

import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
TARIFFS_FILE = SCRIPT_DIR / "data" / "tariffs.json"
BACKUP_DIR = SCRIPT_DIR / "data" / "backups"
INDEX_FILE = SCRIPT_DIR / "index.html"


def load_tariffs():
    """Load current tariffs from JSON file."""
    if not TARIFFS_FILE.exists():
        print(f"Error: {TARIFFS_FILE} not found.")
        return None
    
    with open(TARIFFS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_tariffs(data):
    """Save tariffs to JSON file."""
    with open(TARIFFS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"✓ Tariffs saved to {TARIFFS_FILE}")


def create_backup():
    """Create a backup of the current tariffs."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"tariffs_backup_{timestamp}.json"
    
    if TARIFFS_FILE.exists():
        with open(TARIFFS_FILE, 'r', encoding='utf-8') as src:
            with open(backup_file, 'w', encoding='utf-8') as dst:
                dst.write(src.read())
        print(f"✓ Backup created: {backup_file}")
        return backup_file
    return None


def validate_tariffs(data):
    """Validate the structure of tariff data (schema 3.x)."""
    required_keys = ['metadata', 'currency', 'bus', 'rail', 'monthlyContracts']

    for key in required_keys:
        if key not in data:
            print(f"Error: Missing required key '{key}'")
            return False

    required_zones = ['yellow', 'green', 'lightblue', 'blue', 'purple']
    daily_fields = ['dailyLocal', 'dailyExtended', 'dailyNationwide']

    for service in ['bus', 'rail']:
        zones = data[service].get('zones')
        if not zones:
            print(f"Error: Missing zones for '{service}'")
            return False

        found_zones = [zone.get('id') for zone in zones]
        for zone_id in required_zones:
            if zone_id not in found_zones:
                print(f"Error: Missing zone '{zone_id}' in '{service}'")
                return False

        for zone in zones:
            for field in ['minDistance', 'maxDistance'] + daily_fields:
                if field not in zone:
                    print(f"Error: Missing '{field}' for {service}/{zone.get('id')}")
                    return False

            for field in daily_fields:
                rate = zone[field]
                if rate is not None and (not isinstance(rate, (int, float)) or rate < 0):
                    print(f"Error: Invalid {field} for {service}/{zone['id']}: {rate}")
                    return False

            # `single` may be null: no rail single ride is sold above 120 km.
            single = zone.get('single')
            if single is not None and (not isinstance(single, (int, float)) or single < 0):
                print(f"Error: Invalid single rate for {service}/{zone['id']}: {single}")
                return False

    for contract_id, contract in data['monthlyContracts'].items():
        base = contract.get('base')
        if not isinstance(base, (int, float)) or base < 0:
            print(f"Error: Invalid base for monthly contract '{contract_id}': {base}")
            return False

    print("✓ Tariff data validation passed")
    return True


def fetch_external_tariffs():
    """
    Fetch tariffs from external API.
    
    This is a simulated implementation. In production, replace with actual API calls:
    
    import requests
    
    response = requests.get('https://api.psc.gov.il/fares/tariffs', headers={
        'Authorization': f'Bearer {API_KEY}',
        'Accept': 'application/json'
    })
    return response.json()
    """
    
    print("📡 Fetching tariffs from external API...")
    print("   (Simulated API response - replace with real endpoint)")
    print("   Suggested endpoints:")
    print("   - https://api.psc.gov.il/fares/tariffs")
    print("   - https://www.gov.il/he/departments/ministry_of_transportation")
    
    # Simulate network delay
    import time
    time.sleep(0.5)
    
    # Return current values (in production, this would be API response)
    current_data = load_tariffs()
    if current_data:
        # Update timestamp
        current_data['metadata']['lastUpdated'] = datetime.now().isoformat()
        current_data['metadata']['source'] = 'PSC Fare Authority API (Simulated)'
        return current_data
    
    return None


def update_index_html_fare_rules(data):
    """
    Generate JavaScript code to update FARE_RULES in index.html
    """
    # index.html's FARE_RULES mirrors the bus zones.
    bus_rules = {
        zone['id']: {
            'minDistance': zone['minDistance'],
            'maxDistance': zone['maxDistance'],
            'single': zone['single'],
            'dailyLocal': zone.get('dailyLocal'),
            'dailyExtended': zone.get('dailyExtended'),
            'dailyNationwide': zone.get('dailyNationwide')
        }
        for zone in data['bus']['zones']
    }

    js_code = f"""
    // Dynamic Fare Rules Loader - Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    // This code can be used to replace hardcoded FARE_RULES in index.html

    var DYNAMIC_FARE_RULES = {json.dumps(bus_rules, indent=8, ensure_ascii=False)};

    // Usage: Replace the hardcoded FARE_RULES object with DYNAMIC_FARE_RULES
    // Make sure to load tariffs.json before the main script
    """
    return js_code


def show_current_tariffs():
    """Display current tariff information."""
    data = load_tariffs()
    if not data:
        return
    
    print("\n" + "=" * 50)
    print("   PSC Fare Tariffs - Current Configuration")
    print("=" * 50)
    print(f"\nVersion: {data['metadata']['version']}")
    print(f"Last Updated: {data['metadata']['lastUpdated']}")
    print(f"Source: {data['metadata']['source']}")
    
    for service in ['bus', 'rail']:
        print(f"\n─── {service} fare rates by zone ───")
        print(f"{'Zone':<12} {'Distance':>18} {'Single':>10} {'Daily':>10}")
        print("-" * 54)

        for zone in data[service]['zones']:
            max_dist = f"{zone['maxDistance']} km" if zone['maxDistance'] else "∞"
            distance = f"{zone['minDistance']}-{max_dist}"
            single = zone.get('single')
            single_text = f"{single:.2f}₪" if single is not None else "—"
            daily = zone.get('dailyLocal') or zone.get('dailyExtended') or zone.get('dailyNationwide')
            daily_text = f"{daily:.2f}₪" if daily is not None else "—"
            print(f"{zone['id']:<12} {distance:>18} {single_text:>10} {daily_text:>10}")
    
    print("\n─── Currency ───")
    print(f"  Code: {data['currency']['code']}")
    print(f"  Symbol: {data['currency']['symbol']}")
    
    print("\n" + "=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Update PSC Fare Tariffs dynamically",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 update_tariffs.py --show        Show current tariffs
  python3 update_tariffs.py --fetch       Fetch and apply new tariffs
  python3 update_tariffs.py --validate     Validate tariff data
  python3 update_tariffs.py --backup      Create backup only
  python3 update_tariffs.py --dry-run      Preview changes without applying
        """
    )
    
    parser.add_argument('--show', action='store_true', help='Show current tariff configuration')
    parser.add_argument('--fetch', action='store_true', help='Fetch new tariffs from external API')
    parser.add_argument('--simulate', action='store_true', help='Simulate fetch without API call')
    parser.add_argument('--validate', action='store_true', help='Validate current tariffs.json')
    parser.add_argument('--backup', action='store_true', help='Create backup only')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    
    args = parser.parse_args()
    
    # If no arguments, show help and current tariffs
    if len(sys.argv) == 1:
        parser.print_help()
        print("\n[No arguments provided - showing current tariffs]\n")
        show_current_tariffs()
        return
    
    if args.show:
        show_current_tariffs()
    
    if args.validate:
        data = load_tariffs()
        if data:
            validate_tariffs(data)
    
    if args.backup:
        create_backup()
    
    if args.fetch or args.simulate:
        print("\n─── Fetching External Tariffs ───")
        
        new_data = fetch_external_tariffs()
        
        if new_data:
            print("\n─── Validating New Data ───")
            if validate_tariffs(new_data):
                if args.dry_run:
                    print("\n[DRY RUN] Would update tariffs with:")
                    print(json.dumps(new_data, indent=2, ensure_ascii=False))
                else:
                    print("\n─── Creating Backup ───")
                    create_backup()

                    print("\n─── Saving New Tariffs ───")
                    save_tariffs(new_data)
                    
                    print("\n─── Dynamic Loader Stub ───")
                    print(update_index_html_fare_rules(new_data))
                    
                    print("\n✓ Tariff update complete!")
                    print("\nNext steps:")
                    print("  1. Update index.html to use dynamic tariff loading")
                    print("  2. Commit changes: git add data/ && git commit -m 'Update fare tariffs'")
                    print("  3. Deploy to production")
        else:
            print("✗ Failed to fetch tariffs")


if __name__ == "__main__":
    main()
