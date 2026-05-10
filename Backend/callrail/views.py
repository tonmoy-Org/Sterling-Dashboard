import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from .models import CallRailWebhook
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

@csrf_exempt
@require_POST
def callrail_webhook(request):
    try:
        data = json.loads(request.body)
        CallRailWebhook.objects.create(payload=data)
        return JsonResponse({"status": "success"}, status=200)
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_webhooks(request):
    webhooks = CallRailWebhook.objects.all()[:50]  # Get last 50
    data = [
        {
            "id": w.id,
            "payload": w.payload,
            "created_at": w.created_at
        }
        for w in webhooks
    ]
    return Response(data)
