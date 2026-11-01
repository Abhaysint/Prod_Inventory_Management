import math
from datetime import date
from typing import Optional, List, Dict, Any


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees) using the Haversine formula.
    Zero external paid APIs required.
    """
    # Convert decimal degrees to radians
    phi1, lambda1 = math.radians(lat1), math.radians(lon1)
    phi2, lambda2 = math.radians(lat2), math.radians(lon2)

    dphi = phi2 - phi1
    dlambda = lambda2 - lambda1

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    earth_radius_km = 6371.0
    return round(earth_radius_km * c, 1)


def estimate_transit_days(distance_km: float) -> int:
    """
    Estimate ground freight transit time in business days (~600 km / day).
    Minimum is 1 day.
    """
    return max(1, math.ceil(distance_km / 600.0))


def rank_route_candidates(
    dest_name: str,
    dest_lat: float,
    dest_lon: float,
    requested_qty: int,
    warehouses_data: List[Dict[str, Any]],
    prioritize_expiry: bool = True,
    current_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Scores and ranks warehouse candidates for order fulfillment.
    
    Rules:
    1. Availability: Warehouse must have sum(batch.quantity) >= requested_qty.
    2. FEFO (First-Expired, First-Out): Prioritizes non-expired batches closest to expiry
       to prevent perishable write-offs and waste.
    3. Speed/Distance: Uses Haversine distance to calculate delivery transit time.
    4. Scoring:
       - Distance score: max(0, 100 - (distance_km / 50))
       - Expiry urgency bonus (if prioritize_expiry and 0 <= days_until_expiry <= 30): +45 points
       - Expiry urgency bonus (if prioritize_expiry and 31 <= days_until_expiry <= 60): +20 points
    """
    today = current_date or date.today()
    candidates: List[Dict[str, Any]] = []

    for wh in warehouses_data:
        dist_km = haversine_km(wh["latitude"], wh["longitude"], dest_lat, dest_lon)
        transit_days = estimate_transit_days(dist_km)

        # Filter active non-expired batches for this product in this warehouse
        active_batches = [
            b for b in wh.get("batches", [])
            if b["quantity"] > 0 and b["expiry_date"] >= today
        ]

        # Sort batches by expiry_date ASC (FEFO)
        active_batches.sort(key=lambda b: b["expiry_date"])
        available_qty = sum(b["quantity"] for b in active_batches)

        can_fulfill = available_qty >= requested_qty

        selected_batch = active_batches[0] if active_batches else None
        selected_batch_id = selected_batch["id"] if selected_batch else None
        selected_batch_num = selected_batch["batch_number"] if selected_batch else None
        nearest_expiry = selected_batch["expiry_date"] if selected_batch else None

        days_until_expiry = (nearest_expiry - today).days if nearest_expiry else None
        has_expiring_soon = (
            days_until_expiry is not None and 0 <= days_until_expiry <= 30
        )

        if not can_fulfill:
            score = -1.0
            if available_qty == 0:
                reason = "No available non-expired stock in this warehouse."
            else:
                reason = f"Insufficient stock: {available_qty} units available, {requested_qty} requested."
        else:
            # Base distance score (100 pts for 0km, 80 pts for 1000km, 50 pts for 2500km)
            distance_score = max(0.0, 100.0 - (dist_km / 50.0))
            
            # FEFO urgency bonus: prioritize clearing soon-to-expire stock
            expiry_bonus = 0.0
            if prioritize_expiry and days_until_expiry is not None:
                if 0 <= days_until_expiry <= 30:
                    expiry_bonus = 45.0
                elif 31 <= days_until_expiry <= 60:
                    expiry_bonus = 20.0

            score = round(distance_score + expiry_bonus, 2)

            # Generate plain-English explanation
            reasons = []
            if expiry_bonus > 0 and selected_batch_num:
                reasons.append(
                    f"FEFO Priority: dispatches batch {selected_batch_num} expiring in {days_until_expiry} days to avoid waste"
                )
            if dist_km <= 500:
                reasons.append(f"Fast delivery (~{transit_days} day transit, {dist_km} km away)")
            else:
                reasons.append(f"Estimated transit: ~{transit_days} days ({dist_km} km)")

            reasons.append(f"Sufficient stock ({available_qty} units on hand)")
            reason = "; ".join(reasons) + "."

        candidates.append({
            "warehouse_id": wh["id"],
            "warehouse_name": wh["name"],
            "warehouse_code": wh["code"],
            "city": wh["city"],
            "distance_km": dist_km,
            "estimated_transit_days": transit_days,
            "available_quantity": available_qty,
            "can_fulfill": can_fulfill,
            "selected_batch_id": selected_batch_id,
            "selected_batch_number": selected_batch_num,
            "nearest_expiry_date": nearest_expiry,
            "days_until_expiry": days_until_expiry,
            "has_expiring_soon_batch": has_expiring_soon,
            "score": score,
            "is_recommended": False,
            "recommendation_reason": reason,
        })

    # Sort candidates by score DESC (highest score first)
    candidates.sort(key=lambda c: c["score"], reverse=True)

    # Mark the top capable warehouse as recommended
    for candidate in candidates:
        if candidate["can_fulfill"]:
            candidate["is_recommended"] = True
            candidate["recommendation_reason"] = "★ Optimal Route: " + candidate["recommendation_reason"]
            break

    return candidates

