"""
Management command to seed the initial set of monitored services.
Currently only seeds Dispatcher Booked services for testing.

Usage:
    python manage.py seed_services
"""

from django.core.management.base import BaseCommand
from status.models import Service


# Services to seed — starting with Dispatcher Booked for testing
INITIAL_SERVICES = [
    {
        'name': 'Dispatcher Booked Scraper',
        'slug': 'dispatcher-booked-scraper',
        'description': 'Scrapes dispatcher booking data from FieldEdge including Cameron/Eric booked counts and total leads.',
        'category': 'scraper',
        'display_order': 1,
        'freshness_threshold_minutes': 30,
        'outage_threshold_minutes': 60,
    },
    {
        'name': 'Dispatcher Booked API',
        'slug': 'dispatcher-booked-api',
        'description': 'REST API endpoint for dispatcher booked data (CRUD operations).',
        'category': 'api',
        'display_order': 2,
        'freshness_threshold_minutes': 5,
        'outage_threshold_minutes': 15,
    },
    {
        'name': 'Database',
        'slug': 'database',
        'description': 'MySQL database connectivity and health.',
        'category': 'database',
        'display_order': 3,
        'freshness_threshold_minutes': 5,
        'outage_threshold_minutes': 10,
    },
]

# Future services (commented out — enable when ready to expand)
# {
#     'name': 'FieldEdge Scraper',
#     'slug': 'fieldedge-scraper',
#     'description': 'Scrapes work orders from the FieldEdge dashboard.',
#     'category': 'scraper',
#     'display_order': 10,
# },
# {
#     'name': 'Work Orders Scraper',
#     'slug': 'work-orders-scraper',
#     'description': 'Scrapes and inserts today\'s work orders with status and addresses.',
#     'category': 'scraper',
#     'display_order': 11,
# },
# {
#     'name': 'Work Orders Tags Scraper',
#     'slug': 'work-orders-tags-scraper',
#     'description': 'Scrapes work order tags and associated data.',
#     'category': 'scraper',
#     'display_order': 12,
# },
# {
#     'name': 'Online RME Scraper',
#     'slug': 'online-rme-scraper',
#     'description': 'Scrapes inspection data from the Online RME system.',
#     'category': 'scraper',
#     'display_order': 13,
# },


class Command(BaseCommand):
    help = 'Seed initial monitored services for the health check system.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing services before seeding.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            count = Service.objects.count()
            Service.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing services."))

        created_count = 0
        updated_count = 0

        for service_data in INITIAL_SERVICES:
            slug = service_data['slug']
            obj, created = Service.objects.update_or_create(
                slug=slug,
                defaults=service_data,
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {obj.name}"))
            else:
                updated_count += 1
                self.stdout.write(f"  🔄 Updated: {obj.name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done! Created: {created_count}, Updated: {updated_count}, "
            f"Total active: {Service.objects.filter(is_active=True).count()}"
        ))
