from django.db.models import Count, Prefetch, Q

from apps.households.models import Household, HouseholdMembership


def _ordered_membership_queryset():
    return HouseholdMembership.objects.select_related("member").order_by(
        "-is_active",
        "-is_head",
        "member__last_name",
        "member__first_name",
        "id",
    )


def list_households(*, filters: dict | None = None):
    filters = filters or {}
    queryset = Household.objects.annotate(
        active_member_count=Count(
            "memberships",
            filter=Q(memberships__is_active=True),
            distinct=True,
        )
    )

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(primary_phone__icontains=search)
            | Q(address_line_1__icontains=search)
            | Q(address_line_2__icontains=search)
            | Q(city__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset.order_by("name", "id")


def get_household_by_id(*, household_id: int):
    return Household.objects.filter(id=household_id).first()


def get_household_detail_with_members(*, household_id: int):
    return (
        Household.objects.filter(id=household_id)
        .prefetch_related(
            Prefetch("memberships", queryset=_ordered_membership_queryset())
        )
        .first()
    )


def get_household_membership_by_id(*, household_id: int, membership_id: int):
    return (
        _ordered_membership_queryset()
        .filter(household_id=household_id, id=membership_id)
        .first()
    )
