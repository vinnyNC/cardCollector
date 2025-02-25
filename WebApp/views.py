from django.db import connection
from django.http import JsonResponse
from django.shortcuts import render


# Create your views here.
def index(request):
    return render(request, 'index.html', {'siteName': 'CardCollector', 'pageTitle': 'Home'})


def set_search_name(request, set_search_text):
    # Validate the search term (e.g., enforce a minimum length of 1 characters)
    if len(set_search_text) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 characters long.'}, status=400)

    # Use a database cursor to execute the custom SQL query
    with connection.cursor() as cursor:
        # Custom SQL query to search for set names (case-insensitive, partial matching)
        query = "SELECT set_id, set_name FROM card_sets WHERE set_name ILIKE %s ORDER BY set_name FETCH FIRST 10 ROWS ONLY"
        # Add wildcards for partial matching
        cursor.execute(query, [f'%{set_search_text}%'])
        # Fetch all matching rows
        rows = cursor.fetchall()

    # Format the results as a list of dictionaries
    results = [{'id': row[0], 'set_name': row[1]} for row in rows]

    # Return the results as a JSON response
    return JsonResponse({'results': results})


def card_num_search(request, card_num, set_id):
    # Validate the search term (e.g., enforce a minimum length of 1 characters)
    if len(card_num) < 1:
        return JsonResponse({'error': 'Search term must be at least 1 characters long.'}, status=400)

    # Use a database cursor to execute the custom SQL query
    with connection.cursor() as cursor:
        # Custom SQL query to search for card numbers (case-insensitive, partial matching)
        query = "SELECT c.card_id, c.card_number, p.first_name, p.last_name FROM cards c LEFT JOIN players p ON c.player_id = p.player_id WHERE c.set_id = %s AND c.card_number ILIKE %s ORDER BY c.card_number FETCH FIRST 10 ROWS ONLY"
        # Add wildcards for partial matching
        cursor.execute(query, [set_id, f'%{card_num}%'])
        # Fetch all matching rows
        rows = cursor.fetchall()

    # Format the results as a list of dictionaries
    results = [{
        'id': row[0],
        'card_num': row[1],
        'player': {
            'first_name': row[2],
            'last_name': row[3]
        } if row[2] and row[3] else None
    } for row in rows]

    # Return the results as a JSON response
    return JsonResponse({'results': results})
