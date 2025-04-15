import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Extended user model based on Django's AbstractUser"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    is_public_collection = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    # Add these custom related_name attributes
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='webapp_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='webapp_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return self.username

    def get_collection_value(self):
        """Calculate total value of user's collection"""
        from django.db.models import Sum
        return self.collection_items.filter(is_deleted=False).aggregate(
            total=Sum('current_value')
        )['total'] or 0


class BaseModel(models.Model):
    """Abstract base model with common fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class Sport(BaseModel):
    """Sports categories for cards"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [models.Index(fields=['name'])]


class Manufacturer(BaseModel):
    """Card manufacturers/brands"""
    name = models.CharField(max_length=100, unique=True)
    founded_year = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return self.name


class CardSet(BaseModel):
    """Card sets/collections"""
    name = models.CharField(max_length=100, db_index=True)
    manufacturer = models.ForeignKey(
        Manufacturer, on_delete=models.CASCADE, related_name='card_sets'
    )
    release_year = models.IntegerField(db_index=True)
    sport = models.ForeignKey(
        Sport, on_delete=models.CASCADE, related_name='card_sets'
    )

    class Meta:
        unique_together = ('name', 'manufacturer', 'release_year')
        indexes = [
            models.Index(fields=['name', 'release_year']),
        ]
        ordering = ['-release_year', 'name']

    def __str__(self):
        return f"{self.name} ({self.release_year}) - {self.manufacturer.name}"

    def completion_percentage(self, user):
        """Calculate what percentage of set the user has collected"""
        total_cards = Card.objects.filter(
            set=self, is_deleted=False
        ).count()

        if total_cards == 0:
            return 0

        owned_cards = UserCollectionItem.objects.filter(
            user=user,
            card__set=self,
            is_deleted=False
        ).count()

        return (owned_cards / total_cards) * 100


class SetParallel(BaseModel):
    """Parallel versions of card sets"""
    name = models.CharField(max_length=50, unique=True)
    set = models.ForeignKey(
        CardSet, on_delete=models.CASCADE, related_name='parallels'
    )

    def __str__(self):
        return f"{self.name} - {self.set.name}"


class SetInsert(BaseModel):
    """Insert cards within a set"""
    name = models.CharField(max_length=50)
    set = models.ForeignKey(
        CardSet, on_delete=models.CASCADE, related_name='inserts'
    )
    card_num_prefix = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.set.name}"


class College(BaseModel):
    """Player colleges"""
    name = models.TextField(unique=True)
    city = models.TextField(blank=True, null=True)
    state = models.TextField(blank=True, null=True)
    country = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Player(BaseModel):
    """Sports players"""
    first_name = models.CharField(max_length=50, db_index=True)
    last_name = models.CharField(max_length=50, db_index=True)
    sport = models.ForeignKey(
        Sport, on_delete=models.CASCADE, related_name='players'
    )
    birth_date = models.DateField(blank=True, null=True)
    college = models.ForeignKey(
        College, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='players'
    )
    birth_location = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('first_name', 'last_name', 'sport')
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def card_count(self):
        """Get count of cards this player appears on"""
        return self.cards.filter(is_deleted=False).count()


class Team(BaseModel):
    """Sports teams"""
    name = models.TextField()
    sport = models.ForeignKey(
        Sport, on_delete=models.CASCADE, related_name='teams'
    )
    active = models.BooleanField(default=True)
    disband_year = models.IntegerField(blank=True, null=True)

    class Meta:
        indexes = [models.Index(fields=['name'])]

    def __str__(self):
        return self.name


class PlayerHistory(BaseModel):
    """Track player team changes"""
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name='history'
    )
    old_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='player_departures'
    )
    new_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='player_arrivals'
    )
    date = models.DateField()

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.player} move: {self.old_team or 'None'} → {self.new_team or 'None'} ({self.date})"


class Card(BaseModel):
    """Main card model"""
    set = models.ForeignKey(
        CardSet, on_delete=models.CASCADE, related_name='cards'
    )
    card_number = models.CharField(max_length=20, db_index=True)
    parallel = models.ForeignKey(
        SetParallel, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='cards'
    )
    insert = models.ForeignKey(
        SetInsert, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='cards'
    )
    is_serial_numbered = models.BooleanField(default=False)
    serial_limit = models.IntegerField(blank=True, null=True)
    players = models.ManyToManyField(
        Player, through='CardPlayer', related_name='cards'
    )
    teams = models.ManyToManyField(
        Team, through='CardTeam', related_name='cards'
    )
    is_deleted = models.BooleanField(default=False)
    class Meta:
        unique_together = ('set', 'card_number', 'parallel')
        indexes = [
            models.Index(fields=['set', 'card_number']),
        ]

    def __str__(self):
        return f"{self.set} #{self.card_number}{' ' + self.parallel.name if self.parallel else ''}"

    def has_front_image(self):
        """Check if card has front image"""
        return self.images.filter(
            is_front=True, is_deleted=False
        ).exists()

    def has_back_image(self):
        """Check if card has back image"""
        return self.images.filter(
            is_front=False, is_deleted=False
        ).exists()

    def current_value(self, condition=None):
        """Get most recent price for this card"""
        prices = self.price_history.filter(is_deleted=False)
        if condition:
            prices = prices.filter(condition=condition)
        if not prices.exists():
            return None
        return prices.order_by('-sale_date').first().sale_price


class CardImage(BaseModel):
    """Card images"""
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name='images'
    )
    image_url = models.CharField(max_length=255)
    is_front = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='uploaded_images'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.card} {'Front' if self.is_front else 'Back'} Image"


class CardPlayer(BaseModel):
    """Many-to-many relationship between cards and players"""
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        blank=True, null=True
    )
    is_rookie = models.BooleanField(default=False)

    class Meta:
        unique_together = ('card', 'player')

    def __str__(self):
        return f"{self.player} on {self.card}"


class CardTeam(BaseModel):
    """Many-to-many relationship between cards and teams"""
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('card', 'team')

    def __str__(self):
        return f"{self.team} on {self.card}"


class Condition(BaseModel):
    """Card conditions (e.g., Mint, Near Mint)"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class GradingCompany(BaseModel):
    """Card grading companies (e.g., PSA, BGS)"""
    name = models.CharField(max_length=50, unique=True)
    full_name = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class CardPriceHistory(BaseModel):
    """Track card prices over time"""
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name='price_history'
    )
    condition = models.ForeignKey(
        Condition, on_delete=models.CASCADE, related_name='price_history'
    )
    grading_company = models.ForeignKey(
        GradingCompany, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='price_history'
    )
    grade = models.CharField(max_length=10, blank=True, null=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateField(db_index=True)
    source = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        unique_together = ('card', 'condition', 'grading_company', 'grade', 'sale_date', 'source')
        indexes = [
            models.Index(fields=['-sale_date']),
        ]

    def __str__(self):
        return f"{self.card} - {self.sale_price} ({self.sale_date})"


class CardHolderType(BaseModel):
    """Types of card storage (e.g., toploader, one-touch)"""
    name = models.TextField()

    def __str__(self):
        return self.name


class StorageLocation(BaseModel):
    """Physical storage locations for cards"""
    name = models.TextField()
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='storage_locations'
    )

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class UserCollectionItem(BaseModel):
    """User's collection items"""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='collection_items'
    )
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name='collection_items'
    )
    condition = models.ForeignKey(
        Condition, on_delete=models.CASCADE
    )
    serial_number = models.IntegerField(blank=True, null=True)
    grading_company = models.ForeignKey(
        GradingCompany, on_delete=models.SET_NULL,
        blank=True, null=True
    )
    grade = models.CharField(max_length=10, blank=True, null=True)
    grading_cert_number = models.CharField(max_length=50, blank=True, null=True)
    sub_score_centering = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_corners = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_edges = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_surface = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    last_value_update = models.DateTimeField(blank=True, null=True)
    autographed = models.BooleanField(default=False)
    storage_location = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='items'
    )
    holder_type = models.ForeignKey(
        CardHolderType, on_delete=models.SET_NULL,
        blank=True, null=True
    )

    class Meta:
        unique_together = ('user', 'card', 'serial_number')
        indexes = [
            models.Index(fields=['user', 'card']),
            models.Index(fields=['purchase_date']),
        ]

    def __str__(self):
        return f"{self.user.username}'s {self.card}"

    def update_current_value(self):
        """Update current value based on latest price data"""
        latest_price = CardPriceHistory.objects.filter(
            card=self.card,
            condition=self.condition,
            grading_company=self.grading_company,
            grade=self.grade,
            is_deleted=False
        ).order_by('-sale_date').first()

        if latest_price:
            self.current_value = latest_price.sale_price
            self.last_value_update = timezone.now()
            self.save(update_fields=['current_value', 'last_value_update'])
            return True
        return False


class UserCollectionItemImage(BaseModel):
    """User's images of their specific collection items"""
    item = models.ForeignKey(
        UserCollectionItem, on_delete=models.CASCADE, related_name='images'
    )
    image_url = models.TextField()
    is_front = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.item}"


class SetChecklist(BaseModel):
    """Track user's progress on completing sets"""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='checklists'
    )
    set = models.ForeignKey(
        CardSet, on_delete=models.CASCADE, related_name='checklists'
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('user', 'set')

    def __str__(self):
        return f"{self.user.username}'s {self.set} checklist"

    def get_completion_stats(self):
        """Get checklist completion statistics"""
        total_cards = Card.objects.filter(
            set=self.set, is_deleted=False
        ).count()

        owned_cards = UserCollectionItem.objects.filter(
            user=self.user,
            card__set=self.set,
            is_deleted=False
        ).count()

        completion_percentage = (owned_cards / total_cards * 100) if total_cards > 0 else 0

        return {
            'total_cards': total_cards,
            'owned_cards': owned_cards,
            'completion_percentage': completion_percentage
        }


# Add Custom Managers for common queries
class CardManager(models.Manager):
    def get_by_player(self, player_id):
        """Get all cards featuring a specific player"""
        return self.filter(
            players__id=player_id,
            is_deleted=False
        )

    def get_by_set(self, set_id):
        """Get all cards in a specific set"""
        return self.filter(
            set_id=set_id,
            is_deleted=False
        ).order_by('card_number')

    def find_by_card_number(self, set_id, card_number):
        """Find a card by its number within a set"""
        return self.filter(
            set_id=set_id,
            card_number=card_number,
            is_deleted=False
        )


# Add the manager to the Card model
Card.objects = CardManager()
