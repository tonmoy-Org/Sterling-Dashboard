from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Case, When, IntegerField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from .models import Review, ReviewSeen
from .serializers import ReviewSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['rating_value', 'business_name']
    search_fields = ['reviewer_name', 'review_text', 'price_assessment', 'services_mentioned']
    ordering_fields = '__all__'

    def get_queryset(self):
        queryset = Review.objects.all()
        # Only apply automatic filtering by is_deleted for the list action.
        # This prevents 404 errors on destroy/retrieve/patch for objects that are soft-deleted.
        if self.action == 'list':
            is_deleted_str = self.request.query_params.get('is_deleted', 'false').lower()
            is_deleted = is_deleted_str == 'true'
            queryset = queryset.filter(is_deleted=is_deleted)
            
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        """Mark a single review as seen by the current user."""
        review = self.get_object()
        ReviewSeen.objects.get_or_create(user=request.user, review=review)
        return Response({'success': True, 'message': 'Review marked as seen'})

    @action(detail=False, methods=['post'])
    def mark_all_seen(self, request):
        """Mark all currently filtered reviews as seen by the current user."""
        queryset = self.filter_queryset(self.get_queryset())
        
        objs = [
            ReviewSeen(user=request.user, review=review)
            for review in queryset
        ]
        
        # bulk_create with ignore_conflicts for efficiency
        ReviewSeen.objects.bulk_create(objs, ignore_conflicts=True)
        
        return Response({'success': True, 'message': f'{len(objs)} reviews marked as seen'})

    @action(detail=False, methods=['get'])
    def analysis(self, request):
        """Returns deep analysis of reviews."""
        qs = Review.objects.filter(is_deleted=False)
        
        total = qs.count()
        avg = qs.aggregate(avg=Avg('rating_value'))['avg'] or 0
        
        # Rating distribution
        distribution = qs.values('rating_value').annotate(
            count=Count('id')
        ).order_by('-rating_value')
        
        # Unseen count for current user
        seen_ids = ReviewSeen.objects.filter(user=request.user).values_list('review_id', flat=True)
        unseen_count = qs.exclude(id__in=seen_ids).count()

        # Service breakdown (mention count) - simple text-based approximation
        services = ["septic", "sewer", "repair", "installation", "pumping", "plumbing"]
        service_stats = []
        for svc in services:
            count = qs.filter(review_text__icontains=svc).count()
            if count > 0:
                service_stats.append({'service': svc, 'count': count})

        return Response({
            'total_reviews': total,
            'average_rating': round(avg, 2),
            'unseen_count': unseen_count,
            'rating_distribution': distribution,
            'service_breakdown': sorted(service_stats, key=lambda x: x['count'], reverse=True)
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns simplified aggregated stats for charts.
        """
        period = request.query_params.get('period', 'day') # day, week, month, year
        
        trunc_func = {
            'day': TruncDay,
            'week': TruncWeek,
            'month': TruncMonth,
            'year': TruncYear
        }.get(period, TruncDay)

        stats_data = Review.objects.filter(is_deleted=False).annotate(
            date=trunc_func('created_at')
        ).values('date').annotate(
            count=Count('id'),
            avg_rating=Avg('rating_value')
        ).order_by('date')

        return Response({
            'time_series': stats_data
        })
