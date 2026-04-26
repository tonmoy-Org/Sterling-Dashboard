from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import InvoiceProficiency, InvoiceProficiencySeen
from .serializers import InvoiceProficiencySerializer, InvoiceProficiencySeenSerializer

class InvoiceProficiencyViewSet(viewsets.ModelViewSet):
    queryset = InvoiceProficiency.objects.all()
    serializer_class = InvoiceProficiencySerializer

    def get_queryset(self):
        # Default to non-deleted records
        return InvoiceProficiency.objects.filter(is_deleted=False)

    @action(detail=False, methods=['get'], url_path='trashed')
    def trashed(self, request):
        queryset = InvoiceProficiency.objects.filter(is_deleted=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        instance = InvoiceProficiency.objects.filter(id=pk, is_deleted=True).first()
        if not instance:
            return Response({'error': 'Record not found in trash'}, status=status.HTTP_404_NOT_FOUND)
        
        instance.is_deleted = False
        instance.deleted_by = None
        instance.deleted_by_email = None
        instance.deleted_date = None
        instance.save()
        return Response({'status': 'restored'})

    @action(detail=True, methods=['post'], url_path='mark-seen')
    def mark_seen(self, request, pk=None):
        instance = self.get_object()
        seen, created = InvoiceProficiencySeen.objects.get_or_create(
            user=request.user,
            invoice_proficiency=instance
        )
        return Response({'status': 'seen', 'at': seen.seen_at})

    @action(detail=False, methods=['post'], url_path='mark-all-seen')
    def mark_all_seen(self, request):
        unseen_records = InvoiceProficiency.objects.filter(is_deleted=False).exclude(
            user_seen_records__user=request.user
        )
        
        seen_objects = [
            InvoiceProficiencySeen(user=request.user, invoice_proficiency=record)
            for record in unseen_records
        ]
        InvoiceProficiencySeen.objects.bulk_create(seen_objects, ignore_conflicts=True)
        
        return Response({'status': 'all_marked_seen', 'count': unseen_records.count()})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        
        # Prioritize data from request body if available (matches frontend pattern)
        instance.deleted_by = request.data.get('deleted_by') or getattr(request.user, 'name', request.user.username)
        instance.deleted_by_email = request.data.get('deleted_by_email') or request.user.email
        instance.deleted_date = timezone.now()
        
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        instance = InvoiceProficiency.objects.filter(id=pk, is_deleted=True).first()
        if not instance:
            return Response({'error': 'Record not found in trash'}, status=status.HTTP_404_NOT_FOUND)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
