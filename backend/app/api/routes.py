from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/safe")
async def safe_route(
    origin: str = Query(..., description="Origin location"),
    destination: str = Query(..., description="Destination location"),
):
    """Find the safest walking route between two locations."""
    # TODO: Integrate with routing engine + safety model
    return {
        "origin": origin,
        "destination": destination,
        "route": [],
        "total_safety_score": 0,
        "message": "Route computation not yet implemented — connect ML model and routing engine.",
    }
