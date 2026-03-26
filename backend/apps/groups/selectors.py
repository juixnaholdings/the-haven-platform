from django.db.models import Count, Prefetch, Q

from apps.groups.models import Group, GroupMembership


def _ordered_membership_queryset():
    return GroupMembership.objects.select_related("group", "member").order_by(
        "-is_active",
        "group__name",
        "member__last_name",
        "member__first_name",
        "id",
    )


def list_groups(*, filters: dict | None = None):
    filters = filters or {}
    queryset = Group.objects.annotate(
        active_member_count=Count(
            "memberships",
            filter=Q(memberships__is_active=True),
            distinct=True,
        )
    )

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset.order_by("name", "id")


def get_group_by_id(*, group_id: int):
    return Group.objects.filter(id=group_id).first()


def get_group_detail_with_members(*, group_id: int):
    return (
        Group.objects.filter(id=group_id)
        .prefetch_related(
            Prefetch("memberships", queryset=_ordered_membership_queryset())
        )
        .first()
    )


def list_group_memberships(*, filters: dict | None = None):
    filters = filters or {}
    queryset = _ordered_membership_queryset()

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(role_name__icontains=search)
            | Q(group__name__icontains=search)
            | Q(member__first_name__icontains=search)
            | Q(member__last_name__icontains=search)
        )

    group_id = filters.get("group_id")
    if group_id is not None:
        queryset = queryset.filter(group_id=group_id)

    member_id = filters.get("member_id")
    if member_id is not None:
        queryset = queryset.filter(member_id=member_id)

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset


def list_member_groups(*, member_id: int, filters: dict | None = None):
    filters = filters or {}
    filters["member_id"] = member_id
    return list_group_memberships(filters=filters)
