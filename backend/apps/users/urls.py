from django.urls import path

from apps.users.apis.public import PublicLoginApi, PublicLogoutApi, PublicMeApi

urlpatterns = [
    path("auth/login/", PublicLoginApi.as_view(), name="auth-login"),
    path("auth/logout/", PublicLogoutApi.as_view(), name="auth-logout"),
    path("auth/me/", PublicMeApi.as_view(), name="auth-me"),
]