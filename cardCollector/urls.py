import django.conf
import django.conf.urls.static
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path

import cardCollector.settings
from WebApp.views import *

urlpatterns = [
                  path('admin/', admin.site.urls),
                  path('', index, name='index'),

                  # Authentication
                  path('login/', auth_views.LoginView.as_view(template_name='auth/login.html'), name='login'),
                  path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
                  path('register/', register, name='register'),
                  path('profile/', profile, name='profile'),

                  # API
                  path('api/sets', set_search_name, name='set_name_search'),
                  path('api/cards', card_num_search, name='card_num_search'),
                  path('api/inserts?insertName=<str:insert_name>&setID=<int:set_id>', insert_name_search,
                       name='insert_name_search'),
                  path('api/inserts/all/<int:set_id>', set_all_inserts, name='set_all_inserts'),
                  path('api/sports', get_sports, name='get_sports'),

                  # Test Links
                  path('add_card', add_card_1, name='add_card_1'),
              ] + django.conf.urls.static.static(django.conf.settings.MEDIA_URL,
                                                 document_root=cardCollector.settings.MEDIA_ROOT)
