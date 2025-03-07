from django.urls import path
from . import views

urlpatterns = [
    path('api/signup', views.signup_view, name='signup'),
    path('api/login', views.login_view, name='login'),
    path('api/logout', views.logout_view, name='logout'),
    path('api/user', views.get_user, name='get_user'),
]