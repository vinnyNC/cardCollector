from django.contrib import admin
from django.urls import path

from WebApp.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('api/set/search/<str:set_search_text>', set_search_name, name='set_name_search'),
    path('api/card_num/search/<str:card_num>/<int:set_id>', card_num_search, name='card_num_search'),
    path('api/inserts/search/<str:insert_name>/<int:set_id>', insert_name_search, name='insert_name_search'),
    path('api/inserts/all/<int:set_id>', set_all_inserts, name='set_all_inserts'),
]
