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
        json.dump(data, f, f, indent=4, ensure_ascii=False)
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
    """Validate the structure of tariff data."""
    required_keys = ['metadata', 'fareRules', 'currency']
    
    for key in required_keys:
        if key not in data:
            print(f"Error: Missing required key '{key}'")
            return False
    
    # Validate fare rules
    required_zones = ['yellow', 'green', 'lightblue', 'blue', 'purple', 'gray']
    for zone in required_zones:
        if zone not in data['fareRules']:
            print(f"Error: Missing zone '{zone}'")
            return False
        
        zone_data = data['fareRules'][zone]
        for rate_type in ['single', 'daily']:
            if rate_type not in zone_data:
                print(f"Error: Missing '{rate_type}' rate for '{zone}'")
                return False
            
            rate = zone_data[rate_type]
            if not isinstance(rate, (int, float)) or rate < 0:
                print(f"Error: Invalid rate for {zone}/{rate_type}: {rate}")
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
    js_code = f"""
    // Dynamic Fare Rules Loader - Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    // This code can be used to replace hardcoded FARE_RULES in index.html
    
    var DYNAMIC_FARE_RULES = {json.dumps(data['fareRules'], indent=8, ensure_ascii=False)};
    
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
    
    print("\n─── Fare Rates by Zone ───")
    print(f"{'Zone':<12} {'Distance':>15} {'Single':>10} {'Daily':>10}")
    print("-" * 50)
    
    for zone, rules in data['fareRules'].items():
        max_dist = f"{rules['maxDistance']} km" if rules['maxDistance'] else "∞"
        distance = f"{rules['minDistance']}-{max_dist}"
        print(f"{zone:<12} {distance:>15} {rules['single']:>9.2f}₪ {rules['daily']:>9.2f}₪")
    
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
                print("\n─── Creating Backup ───")
                create_backup()
                
                if args.dry_run:
                    print("\n[DRY RUN] Would update tariffs with:")
                    print(json.dumps(new_data, indent=2, ensure_ascii=False))
                else:
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
