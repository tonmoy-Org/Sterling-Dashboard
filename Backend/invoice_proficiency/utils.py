import re
import unicodedata

def calculate_worth_time(item_name):
    """
    Extract the time value (in decimal hours) from an item code string.
    Rules:
      - HR suffix (e.g. --1HR, .5HR) -> hours.
      - MIN suffix (e.g. --30MIN, .025MIN) -> converted to hours (1/60).
      - 0/0H suffix -> 0.0.
    """
    if not item_name:
        return 0.0

    # Normalize stylized characters and strip
    name = unicodedata.normalize('NFKC', str(item_name)).strip()

    # Exclude explicitly 0 or 0H
    if re.search(r'(?:--|\s|^-)0H?$', name, re.IGNORECASE):
        return 0.0

    # Match HR/HRS (support leading dots like .5HR)
    hr_match = re.search(r'(?:--|\s|^)(\d*\.?\d+)\s*(?:HRS?)', name, re.IGNORECASE)
    if hr_match:
        try:
            return float(hr_match.group(1))
        except (ValueError, TypeError):
            pass
    
    # Fallback for HR at end
    hr_match_fallback = re.search(r'(\d*\.?\d+)\s*(?:HRS?)$', name, re.IGNORECASE)
    if hr_match_fallback:
        try:
            return float(hr_match_fallback.group(1))
        except (ValueError, TypeError):
            pass

    # Match MIN (support leading dots like .025MIN)
    min_match = re.search(r'(?:--|\s|^)(\d*\.?\d+)\s*MIN', name, re.IGNORECASE)
    if min_match:
        try:
            minutes = float(min_match.group(1))
            return minutes / 60.0
        except (ValueError, TypeError):
            pass

    return 0.0

def compute_item_breakdown(item_name, qty):
    """
    Returns (worth_minutes, breakdown_string)
    Example: (6.825, "0.025min x 273 = 6.825min")
    """
    if not item_name:
        return 0.0, ""
    
    worth_per_unit_hours = calculate_worth_time(item_name)
    worth_per_unit_minutes = worth_per_unit_hours * 60.0
    
    try:
        q = float(qty or 1)
    except:
        q = 1.0
        
    total_minutes = round(worth_per_unit_minutes * q, 6)
    
    # Try to extract the raw value for the breakdown string
    name_norm = unicodedata.normalize('NFKC', str(item_name))
    val_match = re.search(r'(\d*\.?\d+)\s*(?:HRS?|MIN)', name_norm, re.IGNORECASE)
    raw_val = val_match.group(1) if val_match else str(round(worth_per_unit_minutes, 6))
    unit = "min"
    
    breakdown = f"{raw_val}{unit} x {int(q) if q == int(q) else q} = {total_minutes}min"
    
    return total_minutes, breakdown

def compute_total_worth_hours(items_detail):
    """
    Calculates sum of worth from items_detail.
    """
    total = 0.0
    for item in (items_detail or []):
        item_name = item.get("item", "")
        try:
            qty = float(item.get("qty") or 1)
        except (TypeError, ValueError):
            qty = 1.0
        worth_per_unit = calculate_worth_time(item_name)
        total += worth_per_unit * qty
    return total
