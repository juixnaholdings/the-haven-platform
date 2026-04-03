from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from random import Random

from django.contrib.auth.models import Group
from django.core.management import BaseCommand, CommandError, call_command
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.attendance.models import (
    AttendanceStatus,
    AttendanceSummary,
    MemberAttendance,
    ServiceEvent,
    ServiceEventType,
)
from apps.attendance import services as attendance_services
from apps.common import services as common_services
from apps.common.audit import AuditEventType, AuditTargetType
from apps.common.models import AuditEvent
from apps.finance.models import (
    FundAccount,
    LedgerDirection,
    Transaction,
    TransactionLine,
    TransactionType,
)
from apps.groups.models import Group as MinistryGroup
from apps.groups.models import GroupMembership
from apps.households.models import Household, HouseholdMembership, HouseholdRelationship
from apps.members.models import Member
from apps.users.constants import BASELINE_ROLE_NAMES
from apps.users.models import User


SEED_TAG = "demo_seed_v1"
DEMO_USER_PASSWORD = "DemoPass123!"
DEFAULT_COUNT = 24
MIN_COUNT = 5
MAX_COUNT = 60


class Command(BaseCommand):
    help = (
        "Seed linked and realistic demo data across core product tables for local "
        "UI, workflow, and pagination exploration."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=DEFAULT_COUNT,
            help=(
                "Scale factor for demo data volume (allowed: 5-60, default: 24). "
                "Default scale targets roughly 120 members, 30+ households, "
                "8+ ministries, and 70+ finance transactions."
            ),
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260330,
            help="Deterministic random seed for reproducible demo data.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help=(
                "Clear existing product-domain rows (members/households/groups/attendance/"
                "finance/audit) before reseeding."
            ),
        )
        parser.add_argument(
            "--sunday-weeks-back",
            type=int,
            default=8,
            help="Weeks of past Sunday services to ensure for attendance workflows.",
        )
        parser.add_argument(
            "--sunday-weeks-forward",
            type=int,
            default=12,
            help="Weeks of upcoming Sunday services to ensure for attendance workflows.",
        )

    def _build_seed_plan(self, *, count: int) -> dict[str, int]:
        return {
            "staff_user_count": max(6, round(count / 4)),
            "basic_user_count": max(5, round(count / 4)),
            "member_count": count * 5,
            "household_count": max(5, round(count * 1.3)),
            "ministry_count": max(5, min(12, round(count / 3))),
            "membership_span": max(5, count),
            "manual_service_event_count": max(8, count),
            "attendance_event_count": max(8, round(count * 0.9)),
            "member_attendance_per_event": max(10, round(count * 2.5)),
            "transaction_count": max(12, count * 3),
            "audit_event_count": max(12, round(count * 1.5)),
        }

    def handle(self, *args, **options):
        count = options["count"]
        if count < MIN_COUNT or count > MAX_COUNT:
            raise CommandError(
                f"--count must be between {MIN_COUNT} and {MAX_COUNT}. Received {count}."
            )
        if options["sunday_weeks_back"] < 0 or options["sunday_weeks_forward"] < 0:
            raise CommandError("--sunday-weeks-back and --sunday-weeks-forward must be zero or greater.")

        seed_plan = self._build_seed_plan(count=count)

        random = Random(options["seed"])

        self.stdout.write("Ensuring baseline roles and finance accounts...")
        call_command("setup_roles")
        call_command("seed_fund_accounts")

        with transaction.atomic():
            if options["reset"]:
                self._reset_product_data()

            staff_users = self._seed_staff_users(count=seed_plan["staff_user_count"])
            actor = staff_users[0]

            self._seed_basic_users(count=seed_plan["basic_user_count"])

            members = self._seed_members(
                count=seed_plan["member_count"],
                actor=actor,
                random=random,
            )
            households = self._seed_households(
                count=seed_plan["household_count"],
                actor=actor,
            )
            self._seed_household_memberships(
                members=members,
                households=households,
                count=seed_plan["household_count"],
                actor=actor,
            )

            ministries = self._seed_ministries(
                count=seed_plan["ministry_count"],
                actor=actor,
            )
            self._seed_ministry_memberships(
                members=members,
                ministries=ministries,
                count=seed_plan["membership_span"],
                actor=actor,
                random=random,
            )

            sunday_service_events = attendance_services.ensure_system_managed_sunday_services(
                weeks_back=options["sunday_weeks_back"],
                weeks_forward=options["sunday_weeks_forward"],
                actor=actor,
            )
            manual_service_events = self._seed_service_events(
                count=seed_plan["manual_service_event_count"],
                actor=actor,
                random=random,
            )
            service_events_by_id = {
                service_event.id: service_event
                for service_event in [*sunday_service_events, *manual_service_events]
            }
            service_events = list(service_events_by_id.values())
            random.shuffle(service_events)

            self._seed_attendance(
                members=members,
                service_events=service_events[: seed_plan["attendance_event_count"]],
                count=seed_plan["member_attendance_per_event"],
                actor=actor,
                random=random,
            )

            fund_accounts = self._seed_fund_accounts(actor=actor)
            transactions = self._seed_transactions(
                service_events=service_events,
                fund_accounts=fund_accounts,
                count=seed_plan["transaction_count"],
                actor=actor,
                random=random,
            )

            self._seed_audit_events(
                staff_users=staff_users,
                members=members,
                service_events=service_events,
                transactions=transactions,
                count=seed_plan["audit_event_count"],
            )
        expected_minimums = {
            "users_user": seed_plan["staff_user_count"] + seed_plan["basic_user_count"],
            "auth_group": len(BASELINE_ROLE_NAMES),
            "members_member": seed_plan["member_count"],
            "households_household": seed_plan["household_count"],
            "households_householdmembership": seed_plan["member_count"],
            "groups_group": seed_plan["ministry_count"],
            "groups_groupmembership": seed_plan["membership_span"],
            "attendance_serviceevent": len(sunday_service_events)
            + seed_plan["manual_service_event_count"],
            "attendance_attendancesummary": min(
                seed_plan["attendance_event_count"],
                len(service_events),
            ),
            "attendance_memberattendance": min(
                seed_plan["attendance_event_count"],
                len(service_events),
            )
            * min(seed_plan["member_attendance_per_event"], seed_plan["member_count"]),
            "finance_fundaccount": 6,
            "finance_transaction": seed_plan["transaction_count"],
            "finance_transactionline": seed_plan["transaction_count"],
            "common_auditevent": seed_plan["audit_event_count"],
        }

        self._print_row_summary(expected_minimums=expected_minimums)
        self.stdout.write(self.style.SUCCESS("Demo data seeding complete."))

    def _reset_product_data(self) -> None:
        self.stdout.write("Resetting product-domain rows before seeding...")

        AuditEvent.objects.all().delete()
        MemberAttendance.objects.all().delete()
        AttendanceSummary.objects.all().delete()
        TransactionLine.objects.all().delete()
        Transaction.objects.all().delete()
        GroupMembership.objects.all().delete()
        HouseholdMembership.objects.all().delete()
        ServiceEvent.objects.all().delete()
        MinistryGroup.objects.all().delete()
        Household.objects.all().delete()
        Member.objects.all().delete()
        User.objects.filter(username__startswith="demo_staff_").delete()
        User.objects.filter(username__startswith="demo_basic_").delete()

    def _seed_staff_users(self, *, count: int) -> list[User]:
        roles = list(
            Group.objects.filter(name__in=BASELINE_ROLE_NAMES).order_by("name")
        )
        if not roles:
            raise CommandError(
                "No baseline roles found. Run setup_roles and verify migration state first."
            )

        users: list[User] = []
        for index in range(count):
            username = f"demo_staff_{index + 1}"
            email = f"{username}@thehaven.local"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": f"Demo{index + 1}",
                    "last_name": "Staff",
                    "is_active": True,
                    "is_staff": True,
                    "is_superuser": index == 0,
                },
            )

            changed = False
            if created:
                user.set_password(DEMO_USER_PASSWORD)
                changed = True

            desired_fields = {
                "email": email,
                "first_name": f"Demo{index + 1}",
                "last_name": "Staff",
                "is_active": True,
                "is_staff": True,
                "is_superuser": index == 0,
            }
            for field_name, desired_value in desired_fields.items():
                if getattr(user, field_name) != desired_value:
                    setattr(user, field_name, desired_value)
                    changed = True

            if changed:
                user.save()

            assigned_roles = [roles[index % len(roles)]]
            if index % 2 == 0 and len(roles) > 1:
                assigned_roles.append(roles[(index + 1) % len(roles)])
            user.groups.set(assigned_roles)

            users.append(user)

        self.stdout.write(f"Seeded/updated staff users: {len(users)}")
        return users

    def _seed_basic_users(self, *, count: int) -> list[User]:
        users: list[User] = []
        for index in range(count):
            username = f"demo_basic_{index + 1}"
            email = f"{username}@thehaven.local"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": f"Demo{index + 1}",
                    "last_name": "Member",
                    "is_active": True,
                    "is_staff": False,
                    "is_superuser": False,
                },
            )

            changed = False
            if created:
                user.set_password(DEMO_USER_PASSWORD)
                changed = True

            desired_fields = {
                "email": email,
                "first_name": f"Demo{index + 1}",
                "last_name": "Member",
                "is_active": True,
                "is_staff": False,
                "is_superuser": False,
            }
            for field_name, desired_value in desired_fields.items():
                if getattr(user, field_name) != desired_value:
                    setattr(user, field_name, desired_value)
                    changed = True

            if changed:
                user.save()

            user.groups.clear()
            users.append(user)

        self.stdout.write(f"Seeded/updated basic users: {len(users)}")
        return users

    def _seed_members(self, *, count: int, actor: User, random: Random) -> list[Member]:
        first_names = [
            "Grace",
            "Samuel",
            "Ruth",
            "Daniel",
            "Esther",
            "Michael",
            "Deborah",
            "Jonathan",
            "Naomi",
            "David",
            "Hannah",
            "Benjamin",
            "Priscilla",
            "Emmanuel",
            "Abigail",
            "Elijah",
            "Miriam",
            "Solomon",
            "Rebecca",
            "Nathaniel",
        ]
        last_names = [
            "Adewale",
            "Okoro",
            "Johnson",
            "Nwosu",
            "Adebayo",
            "Mensah",
            "Kalu",
            "Bassey",
            "Adeyemi",
            "Nartey",
            "Asante",
            "Boateng",
            "Owusu",
            "Danquah",
            "Agyeman",
            "Bamfo",
            "Ofori",
            "Amoah",
            "Nkrumah",
            "Kwarteng",
        ]

        members: list[Member] = []
        today = date.today()

        for index in range(count + 2):
            first_name = first_names[index % len(first_names)]
            last_name = last_names[index % len(last_names)]
            email = f"member{index + 1}@thehaven.local"
            member, _ = Member.objects.update_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "middle_name": "" if index % 3 else "K",
                    "last_name": last_name,
                    "phone_number": f"+10000000{index + 1:03d}",
                    "date_of_birth": today - timedelta(days=365 * (20 + index)),
                    "notes": f"Seeded demo member ({SEED_TAG}).",
                    "is_active": index % 7 != 0,
                    "created_by": actor,
                    "updated_by": actor,
                },
            )
            members.append(member)

        random.shuffle(members)
        self.stdout.write(f"Seeded/updated members: {len(members)}")
        return members

    def _seed_households(self, *, count: int, actor: User) -> list[Household]:
        households: list[Household] = []
        for index in range(count):
            household, _ = Household.objects.update_or_create(
                name=f"Seed Household {index + 1}",
                defaults={
                    "primary_phone": f"+1555100{index + 1:03d}",
                    "address_line_1": f"{100 + index} Hope Avenue",
                    "address_line_2": "",
                    "city": ["London", "Birmingham", "Leeds", "Manchester", "Bristol"][
                        index % 5
                    ],
                    "notes": f"Seeded demo household ({SEED_TAG}).",
                    "is_active": index % 6 != 0,
                    "created_by": actor,
                    "updated_by": actor,
                },
            )
            households.append(household)

        self.stdout.write(f"Seeded/updated households: {len(households)}")
        return households

    def _seed_household_memberships(
        self,
        *,
        members: list[Member],
        households: list[Household],
        count: int,
        actor: User,
    ) -> None:
        relationship_options = [
            HouseholdRelationship.SPOUSE,
            HouseholdRelationship.CHILD,
            HouseholdRelationship.RELATIVE,
            HouseholdRelationship.OTHER,
        ]
        today = date.today()

        for index, member in enumerate(members):
            household = households[index % len(households)]
            is_head = index < len(households)
            relationship = (
                HouseholdRelationship.HEAD
                if is_head
                else relationship_options[index % len(relationship_options)]
            )

            membership, _ = HouseholdMembership.objects.update_or_create(
                member=member,
                is_active=True,
                defaults={
                    "household": household,
                    "relationship_to_head": relationship,
                    "is_head": is_head,
                    "joined_on": today - timedelta(days=360 + (index * 5)),
                    "left_on": None,
                    "notes": f"Seeded active household membership ({SEED_TAG}).",
                    "created_by": actor,
                    "updated_by": actor,
                },
            )

            if membership.is_head:
                HouseholdMembership.objects.filter(
                    household=household,
                    is_active=True,
                ).exclude(id=membership.id).update(is_head=False, updated_by=actor)

        for index, member in enumerate(members[:count]):
            historical_household = households[(index + 1) % len(households)]
            if HouseholdMembership.objects.filter(
                member=member,
                household=historical_household,
                is_active=False,
            ).exists():
                continue

            joined_on = today - timedelta(days=1200 + index * 30)
            left_on = joined_on + timedelta(days=300 + index * 10)
            HouseholdMembership.objects.create(
                member=member,
                household=historical_household,
                relationship_to_head=HouseholdRelationship.OTHER,
                is_head=False,
                is_active=False,
                joined_on=joined_on,
                left_on=left_on,
                notes=f"Seeded historical household membership ({SEED_TAG}).",
                created_by=actor,
                updated_by=actor,
            )

    def _seed_ministries(self, *, count: int, actor: User) -> list[MinistryGroup]:
        ministry_names = [
            "Choir Ministry",
            "Ushering Team",
            "Youth Fellowship",
            "Children Ministry",
            "Prayer Team",
            "Media Team",
            "Welfare Team",
            "Evangelism Team",
            "Protocol Team",
            "Follow-up Team",
        ]

        ministries: list[MinistryGroup] = []
        for index in range(count):
            ministry, _ = MinistryGroup.objects.update_or_create(
                name=ministry_names[index % len(ministry_names)],
                defaults={
                    "description": f"Seeded ministry record ({SEED_TAG}).",
                    "is_active": index % 5 != 0,
                    "created_by": actor,
                    "updated_by": actor,
                },
            )
            ministries.append(ministry)

        self.stdout.write(f"Seeded/updated ministries: {len(ministries)}")
        return ministries

    def _seed_ministry_memberships(
        self,
        *,
        members: list[Member],
        ministries: list[MinistryGroup],
        count: int,
        actor: User,
        random: Random,
    ) -> None:
        role_names = [
            "Coordinator",
            "Team Lead",
            "Assistant",
            "Member",
            "Volunteer",
        ]
        today = date.today()

        for ministry_index, ministry in enumerate(ministries):
            active_members = members[ministry_index : ministry_index + count]
            if len(active_members) < count:
                active_members = (active_members + members)[:count]

            for member_index, member in enumerate(active_members):
                GroupMembership.objects.update_or_create(
                    group=ministry,
                    member=member,
                    is_active=True,
                    defaults={
                        "role_name": role_names[(ministry_index + member_index) % len(role_names)],
                        "started_on": today - timedelta(days=200 + member_index * 3),
                        "ended_on": None,
                        "notes": f"Seeded active ministry membership ({SEED_TAG}).",
                        "created_by": actor,
                        "updated_by": actor,
                    },
                )

        for index, member in enumerate(members[:count]):
            ministry = ministries[(index + 2) % len(ministries)]
            if GroupMembership.objects.filter(
                group=ministry,
                member=member,
                is_active=False,
            ).exists():
                continue

            started_on = today - timedelta(days=900 + (index * 20))
            ended_on = started_on + timedelta(days=180 + random.randint(0, 90))
            GroupMembership.objects.create(
                group=ministry,
                member=member,
                role_name="Former Member",
                started_on=started_on,
                ended_on=ended_on,
                is_active=False,
                notes=f"Seeded historical ministry membership ({SEED_TAG}).",
                created_by=actor,
                updated_by=actor,
            )

    def _seed_service_events(
        self,
        *,
        count: int,
        actor: User,
        random: Random,
    ) -> list[ServiceEvent]:
        event_types = [
            ServiceEventType.MIDWEEK_SERVICE,
            ServiceEventType.PRAYER_MEETING,
            ServiceEventType.YOUTH_MEETING,
            ServiceEventType.CHOIR_REHEARSAL,
            ServiceEventType.SPECIAL_EVENT,
            ServiceEventType.OTHER,
        ]
        title_prefixes = [
            "Midweek Encounter",
            "Prayer Night",
            "Youth Connect",
            "Choir Rehearsal",
            "Community Outreach",
            "Leaders Retreat",
            "Special Thanksgiving",
            "Training Session",
            "Workers Meeting",
            "Family Fellowship",
        ]
        today = date.today()
        events: list[ServiceEvent] = []

        for index in range(count):
            service_date = today + timedelta(days=(index - (count // 2)) * 3)
            title_prefix = title_prefixes[index % len(title_prefixes)]
            event, _ = ServiceEvent.objects.update_or_create(
                title=f"{title_prefix} {index + 1}",
                service_date=service_date,
                defaults={
                    "event_type": event_types[index % len(event_types)],
                    "is_system_managed": False,
                    "start_time": time(hour=18 if index % 2 else 9, minute=30),
                    "end_time": time(hour=20 if index % 2 else 11, minute=30),
                    "location": ["Main Hall", "Youth Hall", "Prayer Room"][
                        random.randint(0, 2)
                    ],
                    "notes": f"Seeded service event ({SEED_TAG}).",
                    "is_active": service_date >= (today - timedelta(days=60)),
                    "created_by": actor,
                    "updated_by": actor,
                },
            )
            events.append(event)

        self.stdout.write(f"Seeded/updated service events: {len(events)}")
        return events

    def _seed_attendance(
        self,
        *,
        members: list[Member],
        service_events: list[ServiceEvent],
        count: int,
        actor: User,
        random: Random,
    ) -> None:
        statuses = [choice for choice, _ in AttendanceStatus.choices]

        for event_index, event in enumerate(service_events):
            men_count = 20 + event_index + random.randint(0, 8)
            women_count = 24 + event_index + random.randint(0, 10)
            children_count = 8 + (event_index % 4) + random.randint(0, 3)
            total_count = men_count + women_count + children_count
            visitor_count = min(6 + (event_index % 3), total_count)

            AttendanceSummary.objects.update_or_create(
                service_event=event,
                defaults={
                    "men_count": men_count,
                    "women_count": women_count,
                    "children_count": children_count,
                    "visitor_count": visitor_count,
                    "total_count": total_count,
                    "notes": f"Seeded attendance summary ({SEED_TAG}).",
                    "created_by": actor,
                    "updated_by": actor,
                },
            )

            active_members = members[:count]
            base_start_time = event.start_time or time(hour=9, minute=0)
            for member_index, member in enumerate(active_members):
                checked_in = timezone.make_aware(
                    datetime.combine(
                        event.service_date,
                        time(
                            hour=base_start_time.hour,
                            minute=min(59, base_start_time.minute + min(45, member_index * 2)),
                        ),
                    ),
                    timezone.get_current_timezone(),
                )
                MemberAttendance.objects.update_or_create(
                    service_event=event,
                    member=member,
                    defaults={
                        "status": statuses[(event_index + member_index) % len(statuses)],
                        "checked_in_at": checked_in,
                        "notes": f"Seeded member attendance ({SEED_TAG}).",
                        "created_by": actor,
                        "updated_by": actor,
                    },
                )

    def _seed_fund_accounts(self, *, actor: User) -> list[FundAccount]:
        extra_accounts = (
            {
                "name": "Missions Fund",
                "code": "MF",
                "description": "Missionary support and outreach programs.",
                "is_active": True,
            },
            {
                "name": "Youth Fund",
                "code": "YF",
                "description": "Youth activities and discipleship initiatives.",
                "is_active": True,
            },
        )

        for account in extra_accounts:
            FundAccount.objects.update_or_create(
                code=account["code"],
                defaults={
                    **account,
                    "created_by": actor,
                    "updated_by": actor,
                },
            )

        accounts = list(FundAccount.objects.order_by("code"))
        self.stdout.write(f"Seeded/updated fund accounts: {len(accounts)}")
        return accounts

    def _seed_transactions(
        self,
        *,
        service_events: list[ServiceEvent],
        fund_accounts: list[FundAccount],
        count: int,
        actor: User,
        random: Random,
    ) -> list[Transaction]:
        if len(fund_accounts) < 2:
            raise CommandError(
                "At least two fund accounts are required to seed transfer transactions."
            )

        transaction_types = [
            TransactionType.INCOME,
            TransactionType.EXPENSE,
            TransactionType.TRANSFER,
        ]
        categories = ["Offering", "Welfare", "Operations", "Projects", "Missions"]
        today = date.today()
        transactions: list[Transaction] = []

        for index in range(count):
            transaction_type = transaction_types[index % len(transaction_types)]
            transaction, _ = Transaction.objects.update_or_create(
                reference_no=f"SEED-TX-{index + 1:04d}",
                defaults={
                    "transaction_type": transaction_type,
                    "transaction_date": today - timedelta(days=index * 2),
                    "description": f"Seeded {transaction_type.lower()} transaction ({SEED_TAG}).",
                    "service_event": service_events[index % len(service_events)]
                    if index % 2 == 0
                    else None,
                    "posted_at": timezone.now() - timedelta(days=index),
                    "created_by": actor,
                    "updated_by": actor,
                },
            )

            transaction.lines.all().delete()
            amount = Decimal("75.00") + Decimal(index * 15)
            source_fund = fund_accounts[index % len(fund_accounts)]
            destination_fund = fund_accounts[(index + 1) % len(fund_accounts)]

            if transaction_type == TransactionType.INCOME:
                TransactionLine.objects.create(
                    transaction=transaction,
                    fund_account=source_fund,
                    direction=LedgerDirection.IN,
                    amount=amount,
                    category_name=categories[index % len(categories)],
                    notes=f"Seeded income line ({SEED_TAG}).",
                    created_by=actor,
                    updated_by=actor,
                )
            elif transaction_type == TransactionType.EXPENSE:
                TransactionLine.objects.create(
                    transaction=transaction,
                    fund_account=source_fund,
                    direction=LedgerDirection.OUT,
                    amount=amount,
                    category_name=categories[(index + 1) % len(categories)],
                    notes=f"Seeded expense line ({SEED_TAG}).",
                    created_by=actor,
                    updated_by=actor,
                )
            else:
                if source_fund.id == destination_fund.id:
                    destination_fund = fund_accounts[(index + 2) % len(fund_accounts)]
                TransactionLine.objects.create(
                    transaction=transaction,
                    fund_account=source_fund,
                    direction=LedgerDirection.OUT,
                    amount=amount,
                    category_name="Transfer",
                    notes=f"Seeded transfer out line ({SEED_TAG}).",
                    created_by=actor,
                    updated_by=actor,
                )
                TransactionLine.objects.create(
                    transaction=transaction,
                    fund_account=destination_fund,
                    direction=LedgerDirection.IN,
                    amount=amount,
                    category_name="Transfer",
                    notes=f"Seeded transfer in line ({SEED_TAG}).",
                    created_by=actor,
                    updated_by=actor,
                )

            transactions.append(transaction)

        random.shuffle(transactions)
        self.stdout.write(f"Seeded/updated transactions: {len(transactions)}")
        return transactions

    def _seed_audit_events(
        self,
        *,
        staff_users: list[User],
        members: list[Member],
        service_events: list[ServiceEvent],
        transactions: list[Transaction],
        count: int,
    ) -> None:
        event_spec = [
            (AuditEventType.MEMBER_CREATED, AuditTargetType.MEMBER, members),
            (AuditEventType.MEMBER_UPDATED, AuditTargetType.MEMBER, members),
            (
                AuditEventType.ATTENDANCE_SUMMARY_CREATED,
                AuditTargetType.ATTENDANCE_SUMMARY,
                service_events,
            ),
            (
                AuditEventType.MEMBER_ATTENDANCE_UPDATED,
                AuditTargetType.MEMBER_ATTENDANCE,
                list(MemberAttendance.objects.order_by("id")),
            ),
            (
                AuditEventType.FINANCE_TRANSACTION_CREATED,
                AuditTargetType.FINANCE_TRANSACTION,
                transactions,
            ),
            (
                AuditEventType.STAFF_USER_UPDATED,
                AuditTargetType.STAFF_USER,
                staff_users,
            ),
        ]

        AuditEvent.objects.filter(summary__startswith="Seeded demo event ").delete()

        for index in range(count):
            event_type, target_type, targets = event_spec[index % len(event_spec)]
            target = targets[index % len(targets)] if targets else None
            actor = staff_users[index % len(staff_users)]

            common_services.log_audit_event(
                actor=actor,
                event_type=event_type,
                target_type=target_type,
                target_id=getattr(target, "id", None),
                summary=f"Seeded demo event {index + 1}: {event_type}",
                payload={
                    "seed_tag": SEED_TAG,
                    "index": index + 1,
                },
            )

    def _print_row_summary(self, *, expected_minimums: dict[str, int]) -> None:
        table_counts = [
            ("users_user", User.objects.count()),
            ("auth_group", Group.objects.count()),
            ("members_member", Member.objects.count()),
            ("households_household", Household.objects.count()),
            ("households_householdmembership", HouseholdMembership.objects.count()),
            ("groups_group", MinistryGroup.objects.count()),
            ("groups_groupmembership", GroupMembership.objects.count()),
            ("attendance_serviceevent", ServiceEvent.objects.count()),
            ("attendance_attendancesummary", AttendanceSummary.objects.count()),
            ("attendance_memberattendance", MemberAttendance.objects.count()),
            ("finance_fundaccount", FundAccount.objects.count()),
            ("finance_transaction", Transaction.objects.count()),
            ("finance_transactionline", TransactionLine.objects.count()),
            ("common_auditevent", AuditEvent.objects.count()),
        ]

        duplicate_active_household_memberships = (
            HouseholdMembership.objects.filter(is_active=True)
            .values("member_id")
            .annotate(active_count=Count("id"))
            .filter(active_count__gt=1)
            .count()
        )
        duplicate_active_household_heads = (
            HouseholdMembership.objects.filter(is_active=True, is_head=True)
            .values("household_id")
            .annotate(active_head_count=Count("id"))
            .filter(active_head_count__gt=1)
            .count()
        )

        self.stdout.write("")
        self.stdout.write("Row counts:")
        below_threshold = []
        for table_name, row_count in table_counts:
            self.stdout.write(f"- {table_name}: {row_count}")
            expected_minimum = expected_minimums.get(table_name)
            if expected_minimum is not None and row_count < expected_minimum:
                below_threshold.append((table_name, row_count, expected_minimum))

        self.stdout.write("")
        self.stdout.write("Integrity checks:")
        self.stdout.write(
            f"- Active household membership duplicates per member: "
            f"{duplicate_active_household_memberships}"
        )
        self.stdout.write(
            f"- Active household head duplicates per household: "
            f"{duplicate_active_household_heads}"
        )

        if below_threshold:
            below_text = ", ".join(
                f"{table} ({rows} < expected {minimum})"
                for table, rows, minimum in below_threshold
            )
            raise CommandError(
                f"Some tables are below the expected seeded volume: {below_text}"
            )

