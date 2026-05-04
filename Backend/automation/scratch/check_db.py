import os
import sys
import django

def setup_django():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if project_root not in sys.path:
        sys.path.append(project_root)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    django.setup()

setup_django()

from time_tracking.models import TimeTracking

count = TimeTracking.objects.count()
print(f"Total TimeTracking records: {count}")

latest = TimeTracking.objects.order_by('-updated_at').first()
if latest:
    print(f"Latest record: WO {latest.wo_number}, Tech {latest.technician_name}, Date {latest.date}")
else:
    print("No records found.")
