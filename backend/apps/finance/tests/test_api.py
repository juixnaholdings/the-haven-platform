from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attendance.models import ServiceEvent, ServiceEventType
from apps.finance.models import FundAccount

User = get_user_model()


class FinanceAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="finance-admin",
            email="finance-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.general_fund = FundAccount.objects.create(
            name="General Fund",
            code="GF",
            description="General operations",
            is_active=True,
        )
        self.welfare_fund = FundAccount.objects.create(
            name="Welfare Fund",
            code="WF",
            description="Welfare support",
            is_active=True,
        )
        self.service_event = ServiceEvent.objects.create(
            title="Sunday Morning Service",
            event_type=ServiceEventType.SUNDAY_SERVICE,
            service_date=date(2026, 3, 22),
            location="Main Auditorium",
            is_active=True,
        )

    def test_list_create_and_update_fund_accounts(self):
        list_response = self.client.get("/api/finance/fund-accounts/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]), 2)

        create_response = self.client.post(
            "/api/finance/fund-accounts/",
            {
                "name": "Building Fund",
                "code": "BF",
                "description": "Building projects",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        fund_account_id = create_response.data["data"]["id"]
        update_response = self.client.patch(
            f"/api/finance/fund-accounts/{fund_account_id}/",
            {"description": "Building and renovation projects"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            update_response.data["data"]["description"],
            "Building and renovation projects",
        )

    def test_record_income_and_retrieve_transaction_detail(self):
        create_response = self.client.post(
            "/api/finance/transactions/income/",
            {
                "fund_account_id": self.general_fund.id,
                "amount": "150.00",
                "transaction_date": "2026-03-22",
                "description": "Sunday offering",
                "service_event_id": self.service_event.id,
                "category_name": "Offering",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        transaction_id = create_response.data["data"]["id"]

        detail_response = self.client.get(f"/api/finance/transactions/{transaction_id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["transaction_type"], "INCOME")
        self.assertEqual(len(detail_response.data["data"]["lines"]), 1)

    def test_record_expense_and_transfer_transactions(self):
        expense_response = self.client.post(
            "/api/finance/transactions/expense/",
            {
                "fund_account_id": self.general_fund.id,
                "amount": "45.00",
                "transaction_date": "2026-03-23",
                "description": "Utility payment",
            },
            format="json",
        )
        self.assertEqual(expense_response.status_code, status.HTTP_201_CREATED)

        transfer_response = self.client.post(
            "/api/finance/transactions/transfer/",
            {
                "source_fund_account_id": self.general_fund.id,
                "destination_fund_account_id": self.welfare_fund.id,
                "amount": "25.00",
                "transaction_date": "2026-03-24",
                "description": "Support welfare fund",
            },
            format="json",
        )
        self.assertEqual(transfer_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(transfer_response.data["data"]["transaction_type"], "TRANSFER")
        self.assertEqual(len(transfer_response.data["data"]["lines"]), 2)

    def test_transaction_list_endpoint(self):
        self.client.post(
            "/api/finance/transactions/income/",
            {
                "fund_account_id": self.general_fund.id,
                "amount": "100.00",
                "transaction_date": "2026-03-22",
                "description": "Special offering",
            },
            format="json",
        )

        response = self.client.get("/api/finance/transactions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)

    def test_transaction_list_supports_optional_pagination(self):
        self.client.post(
            "/api/finance/transactions/income/",
            {
                "fund_account_id": self.general_fund.id,
                "amount": "75.00",
                "transaction_date": "2026-03-23",
                "description": "Second offering",
            },
            format="json",
        )
        self.client.post(
            "/api/finance/transactions/expense/",
            {
                "fund_account_id": self.general_fund.id,
                "amount": "20.00",
                "transaction_date": "2026-03-24",
                "description": "Operational expense",
            },
            format="json",
        )

        response = self.client.get("/api/finance/transactions/?page=1&page_size=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["count"], 2)
        self.assertEqual(response.data["data"]["page"], 1)
        self.assertEqual(response.data["data"]["page_size"], 1)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_finance_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/finance/fund-accounts/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_finance_endpoints_reject_authenticated_user_without_permissions(self):
        basic_user = User.objects.create_user(
            username="finance-basic",
            email="finance-basic@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(basic_user)

        response = self.client.get("/api/finance/fund-accounts/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
