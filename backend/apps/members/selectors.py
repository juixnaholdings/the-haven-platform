from django.db.models import Prefetch, Q

from apps.households.models import HouseholdMembership
from apps.members.models import Member


def list_members(*, filters: dict | None = None):
    filters = filters or {}
    queryset = Member.objects.all()

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(middle_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone_number__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    household_id = filters.get("household_id")
    if household_id is not None:
        queryset = queryset.filter(
            household_memberships__household_id=household_id,
            household_memberships__is_active=True,
        )

    return queryset.distinct()


def get_member_by_id(*, member_id: int):
    active_memberships = HouseholdMembership.objects.filter(is_active=True).select_related("household")
    return (
        Member.objects.filter(id=member_id)
        .prefetch_related(
            Prefetch("household_memberships", queryset=active_memberships)
        )
        .first()
    )
