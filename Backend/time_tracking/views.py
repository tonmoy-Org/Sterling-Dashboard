from rest_framework import viewsets
from .models import TimeTracking, TimeTrackingSeen
from .serializers import TimeTrackingSerializer

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class TimeTrackingViewSet(viewsets.ModelViewSet):
    queryset = TimeTracking.objects.all()
    serializer_class = TimeTrackingSerializer
    filterset_fields = ['date', 'is_deleted']

    def get_queryset(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'restore', 'soft_delete', 'mark_as_seen']:
            return TimeTracking.objects.all()
            
        is_deleted = self.request.query_params.get('is_deleted', 'false').lower() == 'true'
        return TimeTracking.objects.filter(is_deleted=is_deleted)

    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        from django.utils import timezone
        record = self.get_object()
        record.is_deleted = True
        record.deleted_at = timezone.now()
        record.deleted_by = request.user
        record.save()
        return Response({'status': 'record moved to recycle bin'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        record = self.get_object()
        record.is_deleted = False
        record.deleted_at = None
        record.deleted_by = None
        record.save()
        return Response({'status': 'record restored'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_soft_delete(self, request):
        from django.utils import timezone
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated_count = TimeTracking.objects.filter(id__in=ids).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by=request.user
        )
        return Response({'status': f'{updated_count} records moved to recycle bin'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_restore(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated_count = TimeTracking.objects.filter(id__in=ids).update(
            is_deleted=False,
            deleted_at=None,
            deleted_by=None
        )
        return Response({'status': f'{updated_count} records restored'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_count, _ = TimeTracking.objects.filter(id__in=ids).delete()
        return Response({'status': f'{deleted_count} records permanently deleted'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_as_seen(self, request, pk=None):
        record = self.get_object()
        TimeTrackingSeen.objects.get_or_create(user=request.user, record=record)
        return Response({'status': 'marked as seen'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_mark_as_seen(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        records = TimeTracking.objects.filter(id__in=ids)
        seen_objects = [
            TimeTrackingSeen(user=request.user, record=record)
            for record in records
        ]
        TimeTrackingSeen.objects.bulk_create(seen_objects, ignore_conflicts=True)
        return Response({'status': f'{len(seen_objects)} records marked as seen'}, status=status.HTTP_200_OK)
