from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import InvoiceProficiency, InvoiceProficiencySeen
from .serializers import InvoiceProficiencySerializer, InvoiceProficiencySeenSerializer

class InvoiceProficiencyViewSet(viewsets.ModelViewSet):
    queryset = InvoiceProficiency.objects.filter(is_deleted=False)
    serializer_class = InvoiceProficiencySerializer

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
        instance.deleted_by = request.user.username
        instance.deleted_by_email = request.user.email
        instance.deleted_date = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
