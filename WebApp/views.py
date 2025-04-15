from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db import connection
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


def card_num_search(request):
    # Get variables from query
    card_num = request.GET.get('cardNum')
    set_id = request.GET.get('setID')

    # Validate the search term (e.g., enforce a minimum length of 1 character)
    if len(card_num) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 characters long.'}, status=400)

    # Use a database cursor to execute the custom SQL query
    with connection.cursor() as cursor:
        query = """
            SELECT c.card_id, c.card_number, p.first_name, p.last_name, t.team_name, c.is_serial_numbered, c.serial_limit, c.insert_id, c.parallel_id, c.primary_back_image, c.primary_front_image
            FROM cards c 
            LEFT JOIN card_players cp ON c.card_id = cp.card_id
            LEFT JOIN players p ON cp.player_id = p.player_id 
            LEFT JOIN teams t ON cp.team_id = t.team_id
            WHERE c.set_id = %s AND c.card_number ILIKE %s 
            ORDER BY c.card_number
        """
        # Add wildcards for partial matching
        cursor.execute(query, [set_id, f'%{card_num}%'])
        # Fetch all matching rows
        rows = cursor.fetchall()

    # Format the results as a list of dictionaries
    results = [{
        'id': row[0],
        'card': {
            'card_num': row[1],
            'serial_numbered': row[5],
            'serial_limit': row[6],
            'insert_id': row[7],
            'parallel_id': row[8],
            'images': {
                'front': row[10],
                'back': row[9]
            }
        },
        'players': [{
            'first_name': row[2],
            'last_name': row[3],
            'team': row[4]
        }] if row[2] and row[3] else None
    } for row in rows]

    # Return the results as a JSON response
    return JsonResponse({'results': results})


def search_cards_in_set(request):
    # Get search parameters
    search_text = request.GET.get('q', '')
    set_id = request.GET.get('setID')

    # Validate inputs
    if not set_id:
        return JsonResponse({'error': 'Set ID is required'}, status=400)

    if not search_text or len(search_text) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 character long'}, status=400)

    # Build the base query to get cards in the specified set
    cards_query = Card.objects.filter(
        set_id=set_id,
        is_deleted=False
    )

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


def insert_name_search(request):
    # Get variables from query
    insert_name = request.GET.get('insertName')
    set_id = request.GET.get('setID')

    # Validate the search term. Adjust minimum length requirements as needed.
    if len(insert_name) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 character long.'}, status=400)

    # Execute a database query to find inserts whose name contains the search text
    # for the chosen set. The ILIKE operator provides case-insensitive matching.
    with connection.cursor() as cursor:
        query = """
            SELECT insert_id, insert_name 
            FROM card_set_inserts
            WHERE set_id = %s
              AND insert_name ILIKE %s
            ORDER BY insert_name
            FETCH FIRST 10 ROWS ONLY
        """
        cursor.execute(query, [set_id, f'%{insert_name}%'])
        rows = cursor.fetchall()

    # Format the results into a list of dictionaries
    results = [
        {
            'insert_id': row[0],
            'insert_name': row[1],
        }
        for row in rows
    ]

    # Return JSON response with matching inserts
    return JsonResponse({'results': results})


def set_all_inserts(request):
    # Get variables from query
    set_id = request.GET.get('setID')

    # Execute a database query to retrieve all inserts for a given set
    with connection.cursor() as cursor:
        query = """
            SELECT insert_id, insert_name 
            FROM card_set_inserts
            WHERE set_id = %s
            ORDER BY insert_name
        """
        cursor.execute(query, [set_id])
        rows = cursor.fetchall()

    # Format the results into a list of dictionaries
    results = [
        {
            'insert_id': row[0],
            'insert_name': row[1],
        }
        for row in rows
    ]

    # Return JSON response with all inserts for the set
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
