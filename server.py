"""
Transportation Fare Calculator Backend
Flask server for fetching real-time fare data from Israeli Ministry of Transport API
"""

from flask import Flask, request, jsonify, send_file
import requests
import time
import os

app = Flask(__name__, static_folder='.')

# Government Data API Configuration
GOV_API_URL = "https://data.gov.il/api/3/action/datastore_search"
RESOURCE_ID = "4c849191-bb02-4161-8973-f16365a6f2bb"
API_TIMEOUT = 4  # seconds

# Fallback fare matrix for known intercity routes (in NIS)
FALLBACK_FARES = {
    # Format: "origin-dest": price
    # Galilee routes
    ("טבריה", "תל אביב"): 41.50,
    ("טבריה", "ירושלים"): 41.50,
    ("טבריה", "נהריה"): 41.50,
    ("נהריה", "תל אביב"): 33.50,
    ("נהריה", "ירושלים"): 41.50,
    ("נהריה", "טבריה"): 41.50,
    ("קריית שמונה", "תל אביב"): 52.00,
    ("עכו", "תל אביב"): 33.50,
    ("חיפה", "תל אביב"): 25.50,
    ("חיפה", "ירושלים"): 33.50,
    # Jerusalem routes
    ("ירושלים", "תל אביב"): 19.00,
    ("ירושלים", "באר שבע"): 36.00,
    ("ירושלים", "חיפה"): 33.50,
    ("ירושלים", "נתניה"): 29.00,
    ("ירושלים", "אשדוד"): 27.00,
    ("ירושלים", "אשקלון"): 30.00,
    # Tel Aviv metro area
    ("תל אביב", "ראשון לציון"): 9.50,
    ("תל אביב", "פתח תקווה"): 9.50,
    ("תל אביב", "חולון"): 9.50,
    ("תל אביב", "בת ים"): 9.50,
    ("תל אביב", "רמת גן"): 9.50,
    ("תל אביב", "בני ברק"): 9.50,
    ("תל אביב", "הרצליה"): 9.50,
    ("תל אביב", "נתניה"): 19.00,
    # South routes
    ("באר שבע", "תל אביב"): 36.00,
    ("באר שבע", "אשדוד"): 25.50,
    ("אשדוד", "תל אביב"): 19.00,
    ("אשקלון", "תל אביב"): 27.00,
    # North routes
    ("צפת", "חיפה"): 29.00,
    ("צפת", "תל אביב"): 41.50,
    ("טבריה", "חיפה"): 33.50,
}


def normalize_text(text):
    """Normalize Hebrew text for comparison"""
    if not text:
        return ""
    return text.strip().replace(" ", "").replace("-", "")


def find_fallback_fare(origin, dest):
    """Find fare from local matrix with flexible matching"""
    norm_origin = normalize_text(origin)
    norm_dest = normalize_text(dest)
    
    for (o, d), price in FALLBACK_FARES.items():
        norm_o = normalize_text(o)
        norm_d = normalize_text(d)
        # Check both directions
        if (norm_o in norm_origin or norm_origin in norm_o) and \
           (norm_d in norm_dest or norm_dest in norm_d):
            return price
        if (norm_d in norm_origin or norm_origin in norm_d) and \
           (norm_o in norm_dest or norm_dest in norm_o):
            return price
    return None


def fetch_gov_api_fare(origin, dest):
    """Fetch fare data from government data API"""
    try:
        query = f"{origin} {dest}"
        params = {
            "resource_id": RESOURCE_ID,
            "q": query
        }
        
        start_time = time.time()
        response = requests.get(GOV_API_URL, params=params, timeout=API_TIMEOUT)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            records = data.get("result", {}).get("records", [])
            
            if records:
                # Try to find the exact fare in results
                for record in records:
                    record_str = str(record).lower()
                    if normalize_text(origin).lower() in record_str and \
                       normalize_text(dest).lower() in record_str:
                        # Look for fare field (try common field names)
                        fare = record.get("תעריף_נסיעה") or \
                               record.get("fare") or \
                               record.get("price") or \
                               record.get("תעריף")
                        if fare:
                            try:
                                return float(fare), elapsed, "gov_api"
                            except (ValueError, TypeError):
                                pass
                
                # If no exact match, return first record with valid fare
                for record in records[:3]:
                    fare = record.get("תעריף_נסיעה") or \
                           record.get("fare") or \
                           record.get("price") or \
                           record.get("תעריף")
                    if fare:
                        try:
                            return float(fare), elapsed, "gov_api"
                        except (ValueError, TypeError):
                            continue
            
            return None, elapsed, "gov_api_no_data"
        
        return None, elapsed, f"gov_api_error_{response.status_code}"
        
    except requests.exceptions.Timeout:
        return None, API_TIMEOUT, "timeout"
    except requests.exceptions.RequestException as e:
        return None, 0, f"error_{type(e).__name__}"
    except Exception as e:
        return None, 0, f"error_{type(e).__name__}"


@app.route("/")
def index():
    """Serve the main application page"""
    return send_file("index.html")


@app.route("/api/fare")
def get_fare():
    """
    Get fare for a route between origin and destination
    
    Query parameters:
    - origin: Origin city/station
    - dest: Destination city/station
    """
    origin = request.args.get("origin", "").strip()
    dest = request.args.get("dest", "").strip()
    
    if not origin or not dest:
        return jsonify({
            "success": False,
            "error": "יש לספק מוצא ויעד"
        }), 400
    
    result = {
        "success": True,
        "origin": origin,
        "dest": dest,
        "source": "unknown",
        "response_time": 0,
        "fallback_used": False
    }
    
    # Try government API first
    fare, elapsed, status = fetch_gov_api_fare(origin, dest)
    result["response_time"] = round(elapsed, 2)
    
    if fare is not None:
        result["fare"] = fare
        result["source"] = "gov_api"
        result["status"] = status
    else:
        # Fall back to local matrix
        fallback_fare = find_fallback_fare(origin, dest)
        
        if fallback_fare is not None:
            result["fare"] = fallback_fare
            result["source"] = "fallback_matrix"
            result["fallback_used"] = True
            result["status"] = "fallback_matched"
        else:
            # No data available
            result["success"] = False
            result["error"] = f"לא נמצא תעריף עבור המסלול {origin} - {dest}"
            result["status"] = "no_data"
            result["fallback_used"] = False
    
    return jsonify(result)


@app.route("/api/status")
def status():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "Transportation Fare Calculator",
        "version": "1.0.0"
    })


if __name__ == "__main__":
    print("=" * 50)
    print("🚌 מחשבון תעריפי תחבורה ציבורית")
    print("=" * 50)
    print("שרת מקומי חסין CORS - פורט 8081")
    print("")
    print("נקודות קצה:")
    print("  /              - דף הבית")
    print("  /api/fare      - קבלת תעריף (origin, dest)")
    print("  /api/status    - בדיקת סטטוס")
    print("")
    print("הפעלת השרת...")
    print("=" * 50)
    
    app.run(host="0.0.0.0", port=8081, debug=False)
