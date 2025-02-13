from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render

# Create your views here.
def index(request):
    return render(request, 'index.html', {'siteName': 'CardCollector', 'pageTitle': 'Home'})

def set_autocomplete(request):
    query = request.GET.get('q', '')
    # Parse query into year, manufacturer, set parts
    sets = Card.objects.filter(
        Q(year__icontains=parts[0]) &
        Q(manufacturer__icontains=parts[1]) &
        Q(set__icontains=parts[2])
    ).values('year', 'manufacturer', 'set').distinct()
    return JsonResponse(list(sets), safe=False)

def check_card(request):
    number = request.GET.get('number')
    exists = Card.objects.filter(number=number).exists()
    if exists:
        card = Card.objects.get(number=number)
        return JsonResponse({
            'exists': True,
            'first_name': card.first_name,
            'last_name': card.last_name,
            'team': card.team
        })
    return JsonResponse({'exists': False})


class Card:
    objects = None
