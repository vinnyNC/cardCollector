from django.contrib import admin
from django.urls import path

from WebApp.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('api/sets', set_search_name, name='set_name_search'),
    path('api/cards', card_num_search, name='card_num_search'),
    path('api/inserts?insertName=<str:insert_name>&setID=<int:set_id>', insert_name_search, name='insert_name_search'),
    path('api/inserts/all/<int:set_id>', set_all_inserts, name='set_all_inserts'),
]
