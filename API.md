# Comprehensive API Endpoints for Card Collection Process

Based on your existing schema, here are detailed API endpoints for each step:

## 1. Set
```
GET /api/sets - List all sets with filtering options
GET /api/sets/{id} - Get specific set details
GET /api/sets/search?name={term} - Search by name
GET /api/sets/search?year={year} - Filter by year
GET /api/sets/search?sport={type} - Filter by sport
GET /api/sets/{id}/cards - Get all cards in a set
GET /api/sets/statistics - Get set completion statistics
```

## 2. Card
```
GET /api/cards?set_id={id} - Cards by set
GET /api/cards/{id} - Get specific card
GET /api/cards/search?number={num} - Search by card number
GET /api/cards/search?player={name} - Search by player
GET /api/cards?is_rookie=true - Filter rookie cards
GET /api/cards?parallel_id={id} - Filter by parallel type
GET /api/cards?insert_id={id} - Filter by insert type
GET /api/parallels - List all parallel types
GET /api/inserts - List all insert types
```

## 3. Player/Team
```
GET /api/players - List all players
GET /api/players/{id} - Get player details
GET /api/players/search?name={term} - Search by name
GET /api/teams - List all teams
GET /api/teams/{id} - Get team details
GET /api/teams/{id}/players - Get players on team
GET /api/players/{id}/cards - Get player's cards
GET /api/positions - List all positions
```

## 4. Condition
```
GET /api/conditions - List condition types
GET /api/grading_companies - List grading companies
GET /api/grades - List possible grades
GET /api/cards/{id}/condition - Get card's condition
POST /api/cards/{id}/condition - Set card condition
GET /api/cards/graded - Get all graded cards
```

## 5. Storage
```
GET /api/storage_locations - List storage locations
GET /api/storage_types - List storage types
GET /api/protection_types - List protection options
GET /api/cards/{id}/storage - Get card storage info
POST /api/cards/{id}/storage - Set card storage
GET /api/storage_locations/{id}/cards - Cards in location
```

## 6. Photos
```
GET /api/cards/{id}/photos - Get card photos
POST /api/cards/{id}/photos - Upload card photos
PUT /api/photos/{id} - Update photo
DELETE /api/photos/{id} - Remove photo
POST /api/photos/bulk - Bulk photo upload
```

## 7. Purchase Info
```
GET /api/cards/{id}/purchase - Get purchase details
POST /api/cards/{id}/purchase - Add purchase info
GET /api/acquisition_methods - List acquisition methods
GET /api/sellers - List known sellers
GET /api/purchases/stats - Purchase statistics
GET /api/cards/value?min={val}&max={val} - Filter by value
```

## 8. Review
```
GET /api/cards/{id}/complete - Get all card details
POST /api/cards/validate - Validate before saving
GET /api/cards/{id}/history - Get edit history
```

These endpoints provide complete coverage for all collection management functions based on your schema.