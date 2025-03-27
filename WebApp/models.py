# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class CardHolderTypes(models.Model):
    holder_id = models.AutoField(primary_key=True)
    holder_name = models.TextField()

    class Meta:
        managed = False
        db_table = 'card_holder_types'


class CardImages(models.Model):
    image_id = models.AutoField(primary_key=True)
    card = models.ForeignKey('Cards', models.DO_NOTHING)
    image_url = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(blank=True, null=True)
    upload_user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'card_images'


class CardPlayers(models.Model):
    pk = models.CompositePrimaryKey('card_id', 'player_id')
    card = models.ForeignKey('Cards', models.DO_NOTHING)
    player = models.ForeignKey('Players', models.DO_NOTHING)
    team = models.ForeignKey('Teams', models.DO_NOTHING, blank=True, null=True)
    is_rookie = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'card_players'
        unique_together = (('card', 'player'),)


class CardPriceHistory(models.Model):
    price_id = models.AutoField(primary_key=True)
    card = models.ForeignKey('Cards', models.DO_NOTHING)
    condition = models.ForeignKey('Conditions', models.DO_NOTHING)
    grading_company = models.ForeignKey('GradingCompanies', models.DO_NOTHING, blank=True, null=True)
    grade = models.CharField(max_length=10, blank=True, null=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_date = models.DateField()
    source = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'card_price_history'
        unique_together = (('card', 'condition', 'grading_company', 'grade', 'sale_date', 'source'),)


class CardSetInserts(models.Model):
    insert_id = models.AutoField(primary_key=True)
    insert_name = models.CharField(max_length=50)
    set = models.ForeignKey('CardSets', models.DO_NOTHING)
    card_num_prefix = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'card_set_inserts'


class CardSetParallels(models.Model):
    parallel_id = models.AutoField(primary_key=True)
    parallel_name = models.CharField(unique=True, max_length=50)
    set = models.ForeignKey('CardSets', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'card_set_parallels'


class CardSets(models.Model):
    set_id = models.AutoField(primary_key=True)
    set_name = models.CharField(max_length=100)
    manufacturer = models.ForeignKey('Manufacturers', models.DO_NOTHING)
    release_year = models.IntegerField()
    sport = models.ForeignKey('Sports', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'card_sets'
        unique_together = (('set_name', 'manufacturer', 'release_year'),)


class CardTeams(models.Model):
    pk = models.CompositePrimaryKey('card_id', 'team_id')
    card = models.ForeignKey('Cards', models.DO_NOTHING)
    team = models.ForeignKey('Teams', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'card_teams'
        unique_together = (('card', 'team'),)


class Cards(models.Model):
    card_id = models.AutoField(primary_key=True)
    set = models.ForeignKey(CardSets, models.DO_NOTHING)
    card_number = models.CharField(max_length=20)
    parallel = models.ForeignKey(CardSetParallels, models.DO_NOTHING, blank=True, null=True)
    is_serial_numbered = models.BooleanField(blank=True, null=True)
    serial_limit = models.IntegerField(blank=True, null=True)
    insert = models.ForeignKey(CardSetInserts, models.DO_NOTHING, blank=True, null=True)
    primary_front_image = models.ForeignKey(CardImages, models.DO_NOTHING, db_column='primary_front_image', blank=True, null=True)
    primary_back_image = models.ForeignKey(CardImages, models.DO_NOTHING, db_column='primary_back_image', related_name='cards_primary_back_image_set', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'cards'
        unique_together = (('set', 'card_number', 'parallel'),)


class Conditions(models.Model):
    condition_id = models.AutoField(primary_key=True)
    condition_name = models.CharField(unique=True, max_length=50)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'conditions'


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class GradingCompanies(models.Model):
    grading_company_id = models.AutoField(primary_key=True)
    company_name = models.CharField(unique=True, max_length=50)
    company_full_name = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'grading_companies'


class Manufacturers(models.Model):
    manufacturer_id = models.AutoField(primary_key=True)
    manufacturer_name = models.CharField(unique=True, max_length=100)
    founded_year = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'manufacturers'


class Players(models.Model):
    player_id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    sport = models.ForeignKey('Sports', models.DO_NOTHING)
    birth_date = models.DateField(blank=True, null=True)
    college = models.ForeignKey('PlayersColleges', models.DO_NOTHING, blank=True, null=True)
    birth_location = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'players'
        unique_together = (('first_name', 'last_name', 'sport'),)


class PlayersColleges(models.Model):
    college_id = models.AutoField(primary_key=True)
    college_name = models.TextField(unique=True)
    college_city = models.TextField(blank=True, null=True)
    college_state = models.TextField(blank=True, null=True)
    country = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'players_colleges'


class PlayersHistory(models.Model):
    phistory_id = models.AutoField(primary_key=True)
    player = models.ForeignKey(Players, models.DO_NOTHING)
    old_team = models.IntegerField(blank=True, null=True)
    new_team = models.IntegerField(blank=True, null=True)
    date = models.DateField()

    class Meta:
        managed = False
        db_table = 'players_history'


class SetChecklists(models.Model):
    checklist_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    set = models.ForeignKey(CardSets, models.DO_NOTHING)
    total_cards = models.IntegerField()
    owned_cards = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'set_checklists'
        unique_together = (('user', 'set'),)


class Sports(models.Model):
    sport_id = models.AutoField(primary_key=True)
    sport_name = models.CharField(unique=True, max_length=50)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'sports'


class Teams(models.Model):
    team_id = models.AutoField(primary_key=True)
    team_name = models.TextField()
    sport = models.ForeignKey(Sports, models.DO_NOTHING)
    active = models.BooleanField()
    disband_year = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'teams'


class UserCollectionItemImages(models.Model):
    image_id = models.AutoField(primary_key=True)
    item = models.ForeignKey('UserCollectionItems', models.DO_NOTHING)
    image_url = models.TextField()
    uploaded_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'user_collection_item_images'


class UserCollectionItems(models.Model):
    item_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    card = models.ForeignKey(Cards, models.DO_NOTHING)
    condition = models.ForeignKey(Conditions, models.DO_NOTHING)
    serial_number = models.IntegerField(blank=True, null=True)
    grading_company = models.ForeignKey(GradingCompanies, models.DO_NOTHING, blank=True, null=True)
    grade = models.CharField(max_length=10, blank=True, null=True)
    grading_cert_number = models.CharField(max_length=50, blank=True, null=True)
    sub_score_centering = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_corners = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_edges = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    sub_score_surface = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    added_at = models.DateTimeField(blank=True, null=True)
    autographed = models.BooleanField()
    storage_location = models.ForeignKey('UserStorageLocations', models.DO_NOTHING, blank=True, null=True)
    holder_type = models.ForeignKey(CardHolderTypes, models.DO_NOTHING, db_column='holder_type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_collection_items'
        unique_together = (('user', 'item_id'),)


class UserStorageLocations(models.Model):
    storage_id = models.AutoField(primary_key=True)
    storage_name = models.TextField()
    user = models.ForeignKey('Users', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'user_storage_locations'


class Users(models.Model):
    user_id = models.UUIDField(primary_key=True)
    username = models.CharField(unique=True, max_length=64)
    email = models.CharField(unique=True, max_length=512)
    password_hash = models.CharField(max_length=512)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    role = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'
