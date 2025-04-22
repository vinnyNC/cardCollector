from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db.models import Q, Prefetch, OuterRef, Subquery, F, Value, CharField
from django.db.models.functions import Concat
from django.http import JsonResponse
from django.shortcuts import render, redirect

from WebApp.models import *
from WebApp.models import CardImage, CardPlayer  # ensure CardImage and CardPlayer are imported


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
    set_search_text = request.GET.get('setName', '')
    user_id = request.user.id if request.user.is_authenticated else None

    # Search result limit
    result_limit = 200
    # Initialize the results list
    results = []

    if user_id:
        # Get the most recent sets the user has added cards to
        recent_sets_subquery = UserCollectionItem.objects.filter(
            user_id=user_id,
            is_deleted=False
        ).values('card__set').annotate(
            last_added=models.Max('created_at')
        ).order_by('-last_added').values_list('card__set', flat=True)[:50]

        # Query these recent sets
        recent_sets = CardSet.objects.filter(
            id__in=recent_sets_subquery,
            is_deleted=False
        ).select_related('sport')

        # Add these to our results
        for card_set in recent_sets:
            results.append({
                'setName': card_set.name,
                'setYear': card_set.release_year,
                'setSport': card_set.sport.name,
                'setID': card_set.id
            })

    # If we have less than 50 sets, add the most used sets
    if len(results) < result_limit and user_id:
        # Get most used sets by count of cards
        most_used_sets_subquery = UserCollectionItem.objects.filter(
            user_id=user_id,
            is_deleted=False
        ).exclude(
            card__set__in=[r['setID'] for r in results]
        ).values('card__set').annotate(
            count=models.Count('id')
        ).order_by('-count').values_list('card__set', flat=True)[:result_limit - len(results)]

        # Query these most used sets
        most_used_sets = CardSet.objects.filter(
            id__in=most_used_sets_subquery,
            is_deleted=False
        ).select_related('sport')

        # Add these to our results
        for card_set in most_used_sets:
            results.append({
                'setName': card_set.name,
                'setYear': card_set.release_year,
                'setSport': card_set.sport.name,
                'setID': card_set.id
            })

    # If we still have less than 50 sets or if the search text is provided, perform the search
    if set_search_text:
        # Validate the search term
        if len(set_search_text) < 1:
            return JsonResponse({'error': 'Search term must be at least 1 character long.'}, status=400)

        # Filter sets by search text
        existing_ids = [r['setID'] for r in results]
        matching_sets = CardSet.objects.filter(
            name__icontains=set_search_text,
            is_deleted=False
        ).exclude(
            id__in=existing_ids
        ).select_related('sport').order_by('name')

        # Add these to our results
        for card_set in matching_sets:
            results.append({
                'setName': card_set.name,
                'setYear': card_set.release_year,
                'setSport': card_set.sport.name,
                'setID': card_set.id
            })
    # If we still have less than 50 sets and no search text, add random sets to reach 50
    elif len(results) < result_limit:
        # Get any additional sets to reach result_limit total
        existing_ids = [r['setID'] for r in results]
        additional_sets = CardSet.objects.filter(
            is_deleted=False
        ).exclude(
            id__in=existing_ids
        ).select_related('sport').order_by('-release_year')[:result_limit - len(results)]

        # Add these to our results
        for card_set in additional_sets:
            results.append({
                'setName': card_set.name,
                'setYear': card_set.release_year,
                'setSport': card_set.sport.name,
                'setID': card_set.id
            })

    # Return the results as a JSON response
    return JsonResponse({'results': results})


def search_cards_in_set(request):
    # Get search parameters
    search_text = request.GET.get('q')
    set_id = request.GET.get('setID')

    if not set_id:
        return JsonResponse({'error': 'Set ID is required'}, status=400)

    # This block executes when loading ALL cards for a set (search_text is None)
    if set_id.isnumeric() and search_text is None:
        try:
            # Subquery for the front image
            front_image_subquery = CardImage.objects.filter(
                card=OuterRef('pk'),
                is_front=True,
                is_deleted=False
            ).values('image_url')[:1]

            # Subquery for player names (get first player associated with the card)
            player_name_subquery = CardPlayer.objects.filter(
                card=OuterRef('pk')
            ).annotate(
                full_name=Concat(
                    F('player__first_name'), Value(' '), F('player__last_name'),
                    output_field=CharField()
                )
            ).values('full_name')[:1]

            # Main query for Cards
            cards = Card.objects.filter(
                set_id=set_id,
                is_deleted=False
            ).annotate(
                front_image=Subquery(front_image_subquery),
                player_name=Subquery(player_name_subquery)
            ).order_by('card_number').values(
                'card_number', 'parallel__name', 'insert__name', 'id', 'front_image', 'player_name'
            )
            return JsonResponse({'results': list(cards)}, safe=False)
        except Exception as e:
            print(f"Query error: {e}")
            return JsonResponse({'results': []})

    # This block executes when searching within a set (search_text is provided)
    try:
        cards_query = Card.objects.filter(set_id=set_id, is_deleted=False)

        if not search_text or len(search_text) < 1:
            return JsonResponse({'error': 'Search term must be at least 1 character long'}, status=400)

        cards_query = cards_query.filter(
            Q(card_number__icontains=search_text) |
            Q(players__first_name__icontains=search_text) |
            Q(players__last_name__icontains=search_text)
        ).distinct()

        cards_query = cards_query.select_related(
            'parallel',
            'insert'
        ).prefetch_related(
            Prefetch('players', queryset=Player.objects.filter(is_deleted=False))
        )

        results = []
        for card in cards_query:
            player_names = ", ".join([f"{player.first_name} {player.last_name}"
                                      for player in card.players.all()])

            card_type = "Base"
            if card.is_serial_numbered:
                card_type = f"Numbered /{card.serial_limit}" if card.serial_limit else "Numbered"

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
    except Exception as e:
        # Potentially the same error could happen here too
        print(f"Query error: {e}")
        return JsonResponse({'results': []})


def get_sports(request):
    sports = Sport.objects.filter(is_deleted=False).order_by('name')

    results = [
        {
            'sport_id': sport.id,
            'sport_name': sport.name,
        }
        for sport in sports
    ]

    return JsonResponse({'results': results})


def get_manufacturers(request):
    manufacturers = Manufacturer.objects.all().order_by('name')
    manufacturers_data = [{'id': m.id, 'name': m.name} for m in manufacturers]
    return JsonResponse({'results': manufacturers_data})
