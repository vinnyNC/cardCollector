from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db.models import Q, Prefetch
from django.http import JsonResponse
from django.shortcuts import render, redirect

from WebApp.models import *


# Default Views
def index(request):
    return render(request, 'index.html', {'siteName': 'CardCollector', 'pageTitle': 'Home'})


# Authentication Views
def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}! You can now log in.')
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'auth/register.html', {'form': form, 'siteName': 'CardCollector', 'pageTitle': 'Register'})


@login_required
def profile(request):
    return render(request, 'auth/profile.html', {'siteName': 'CardCollector', 'pageTitle': 'Profile'})


# API Views
def add_card_1(request):
    return render(request, 'beta_add_card/add_card.html', {'siteName': 'CardCollector', 'pageTitle': 'Add Card'})


def set_search_name(request):
    # Get variables from query
    set_search_text = request.GET.get('setName')

    # Validate the search term
    if len(set_search_text) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 character long.'}, status=400)

    # Use Django ORM instead of raw SQL
    matching_sets = CardSet.objects.filter(
        name__icontains=set_search_text,
        is_deleted=False
    ).select_related('sport').order_by('name')

    # Format the results as a list of dictionaries
    results = [
        {
            'setName': card_set.name,
            'setYear': card_set.release_year,
            'setSport': card_set.sport.name,
            'setID': card_set.id
        }
        for card_set in matching_sets
    ]

    # Return the results as a JSON response
    return JsonResponse({'results': results})


def search_cards_in_set(request):
    # Get search parameters
    search_text = request.GET.get('q')
    set_id = request.GET.get('setID')

    # Validate inputs
    if not set_id:
        return JsonResponse({'error': 'Set ID is required'}, status=400)

    if not search_text or len(search_text) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 character long'}, status=400)

    # Debug - print the Card model fields
    print("Available fields:", [f.name for f in Card._meta.get_fields()])

    # Build the base query to get cards in the specified set
    # Instead of filtering directly
    try:
        cards_query = Card.objects.filter(
            set_id=set_id,
            is_deleted=False
        )
        # Continue with the rest of your view function
    except Exception as e:
        # If error, return empty results instead of failing
        print(f"Query error: {e}")
        return JsonResponse({'results': []})

    # Add search filters (card number OR player name)
    cards_query = cards_query.filter(
        Q(card_number__icontains=search_text) |
        Q(players__first_name__icontains=search_text) |
        Q(players__last_name__icontains=search_text)
    ).distinct()

    # Optimize query with select_related and prefetch_related
    cards_query = cards_query.select_related(
        'parallel',
        'insert'
    ).prefetch_related(
        Prefetch('players', queryset=Player.objects.filter(is_deleted=False))
    )

    # Format the results
    results = []
    for card in cards_query:
        # Get player names for this card
        player_names = ", ".join([f"{player.first_name} {player.last_name}"
                                  for player in card.players.all()])

        # Determine card type (could be customized further)
        card_type = "Base"
        if card.is_serial_numbered:
            card_type = f"Numbered /{card.serial_limit}" if card.serial_limit else "Numbered"

        # Get parallel or insert name
        parallel_insert = ""
        if card.parallel:
            parallel_insert = card.parallel.name
        elif card.insert:
            parallel_insert = card.insert.name

        results.append({
            'card_number': card.card_number,
            'player_name': player_names,
            'type': card_type,
            'parallel_insert': parallel_insert,
            'card_id': card.id
        })

    return JsonResponse({'results': results})


def get_sports(request):
    # Use Django ORM to retrieve all active sports
    sports = Sport.objects.filter(is_deleted=False).order_by('name')

    # Format the results into a list of dictionaries
    results = [
        {
            'sport_id': sport.id,
            'sport_name': sport.name,
        }
        for sport in sports
    ]

    # Return JSON response with all sports
    return JsonResponse({'results': results})
