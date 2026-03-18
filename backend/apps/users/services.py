from django.contrib.auth import login, logout


def login_user(request, user):
    login(request, user)
    return user


def logout_user(request):
    logout(request)