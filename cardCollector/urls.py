from django.contrib import admin
from django.urls import path

from WebApp.views import index, set_search_name, card_num_search, insert_name_search

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('api/set_name/<str:set_search_text>', set_search_name, name='set_name_search'),
    path('api/card_num/<str:card_num>/<int:set_id>', card_num_search, name='card_num_search'),
    path('api/insert_name/<str:insert_name>', insert_name_search, name='insert_name_search'),
]
