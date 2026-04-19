from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from .models import Review
from .serializers import ReviewSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_deleted', 'rating_value', 'business_name']
    search_fields = ['reviewer_name', 'review_text', 'price_assessment', 'services_mentioned']
    ordering_fields = '__all__'

    def get_queryset(self):
        queryset = Review.objects.all()
        if self.action == 'list':
            is_deleted = self.request.query_params.get('is_deleted', 'false').lower() == 'true'
            queryset = queryset.filter(is_deleted=is_deleted)
        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns aggregated stats for reviews.
        """
        period = request.query_params.get('period', 'day') # day, week, month, year
        
        trunc_func = {
            'day': TruncDay,
            'week': TruncWeek,
            'month': TruncMonth,
            'year': TruncYear
        }.get(period, TruncDay)

        stats = Review.objects.filter(is_deleted=False).annotate(
            date=trunc_func('created_at')
        ).values('date').annotate(
            count=Count('id'),
            avg_rating=Avg('rating_value')
        ).order_by('date')

        return Response({
            'time_series': stats
        })
