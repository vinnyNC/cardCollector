create table users
(
    user_id       uuid                     default uuid_generate_v4() not null
        primary key,
    username      varchar(64)  not null
        unique,
    email         varchar(512) not null
        unique,
    password_hash varchar(512) not null,
    created_at    timestamp with time zone default CURRENT_TIMESTAMP,
    updated_at    timestamp with time zone default CURRENT_TIMESTAMP,
    role          integer
);

create trigger update_users_timestamp
    before update
    on users
    for each row
execute procedure update_timestamp();

create table sports
(
    sport_id    serial
        primary key,
    sport_name  varchar(50) not null
        unique,
    description text
);

create table manufacturers
(
    manufacturer_id   serial
        primary key,
    manufacturer_name varchar(100) not null
        unique,
    founded_year      integer
        constraint manufacturers_founded_year_check
            check ((founded_year > 1800) AND ((founded_year)::numeric <= EXTRACT(year FROM CURRENT_DATE)))
);

create table card_sets
(
    set_id          serial
        primary key,
    set_name        varchar(100) not null,
    manufacturer_id integer      not null
        references manufacturers
            on delete restrict,
    release_year    integer      not null
        constraint card_sets_release_year_check
            check ((release_year > 1900) AND ((release_year)::numeric <= EXTRACT(year FROM CURRENT_DATE))),
    sport_id        integer      not null
        references sports
            on delete restrict,
    unique (set_name, manufacturer_id, release_year)
);

create table conditions
(
    condition_id   serial
        primary key,
    condition_name varchar(50) not null
        unique,
    description    text
);

create table grading_companies
(
    grading_company_id serial
        primary key,
    company_name       varchar(50) not null
        unique,
    company_full_name  text,
    description        text
);

create table card_set_parallels
(
    parallel_id   integer default nextval('parallels_parallel_id_seq'::regclass) not null
        primary key,
    parallel_name varchar(50)                                                    not null
        constraint parallels_parallel_name_key
            unique,
    set_id        integer                                                        not null
        references card_sets
);

create table set_checklists
(
    checklist_id serial
        primary key,
    user_id      uuid    not null
        references users
            on delete cascade,
    set_id       integer not null
        references card_sets
            on delete cascade,
    total_cards  integer not null
        constraint set_checklists_total_cards_check
            check (total_cards > 0),
    owned_cards  integer not null,
    unique (user_id, set_id),
    constraint set_checklists_check
        check ((owned_cards >= 0) AND (owned_cards <= total_cards))
);

create index idx_set_checklists_user_id
    on set_checklists (user_id);

create table card_set_inserts
(
    insert_id       integer default nextval('parallels_parallel_id_seq'::regclass) not null
        primary key,
    insert_name varchar(50) not null,
    set_id          integer                                                        not null
        references card_sets,
    card_num_prefix varchar(10)
);

create table cards
(
    card_id             serial
        primary key,
    set_id              integer     not null
        references card_sets
            on delete restrict,
    card_number         varchar(20) not null,
    parallel_id         integer
                                    references card_set_parallels
                                        on delete set null
        constraint fk_parallel_id
            references card_set_parallels
            on delete set null,
    is_serial_numbered  boolean default false,
    serial_limit        integer
        constraint cards_serial_limit_check
            check ((serial_limit > 0) OR (serial_limit IS NULL)),
    insert_id           integer
        references card_set_inserts,
    primary_front_image integer,
    primary_back_image  integer,
    constraint unique_set_card_parallel
        unique (set_id, card_number, parallel_id)
);

create index idx_cards_set_id
    on cards (set_id);

create table card_images
(
    image_id       serial
        primary key,
    card_id        integer      not null
        references cards
            on delete cascade,
    image_url      varchar(255) not null,
    uploaded_at    timestamp with time zone default CURRENT_TIMESTAMP,
    upload_user_id uuid
                                references users
                                    on delete set null
);

alter table cards
    add foreign key (primary_front_image) references card_images;

alter table cards
    add foreign key (primary_back_image) references card_images;

create index idx_card_images_card_id
    on card_images (card_id);

create table card_price_history
(
    price_id           serial
        primary key,
    card_id            integer        not null
        references cards
            on delete cascade,
    condition_id       integer        not null
        references conditions
            on delete restrict,
    grading_company_id integer
                                      references grading_companies
                                          on delete set null,
    grade              varchar(10),
    sale_price         numeric(10, 2) not null
        constraint card_price_history_sale_price_check
            check (sale_price >= (0)::numeric),
    sale_date          date           not null,
    source             varchar(100),
    constraint card_price_history_card_id_condition_id_grading_company_id__key
        unique (card_id, condition_id, grading_company_id, grade, sale_date, source)
);

create index idx_card_price_history_card_id
    on card_price_history (card_id);

create table teams
(
    team_id      integer default nextval('cards_card_id_seq'::regclass) not null
        primary key,
    team_name    text                                                   not null,
    sport_id     integer                                                not null
        references sports,
    active       boolean default true                                   not null,
    disband_year integer
);

create table players_colleges
(
    college_id    integer default nextval('card_images_image_id_seq'::regclass) not null
        primary key,
    college_name  text                                                          not null
        constraint players_colleges_college_name_college_name1_key
            unique,
    college_city  text,
    college_state text,
    country       text
);

create table players
(
    player_id  serial
        primary key,
    first_name varchar(50) not null,
    last_name  varchar(50) not null,
    sport_id   integer     not null
        references sports
            on delete restrict,
    birth_date date,
    college_id integer
        references players_colleges,
    unique (first_name, last_name, sport_id)
);

create index idx_players_sport_id
    on players (sport_id);

create table players_history
(
    phistory_id integer default nextval('players_player_id_seq'::regclass) not null
        primary key,
    player_id   integer                                                    not null
        references players
            on delete set null,
    old_team    integer,
    new_team    integer,
    date        date                                                       not null
);

create table user_storage_locations
(
    storage_id   integer default nextval('user_collections_collection_id_seq'::regclass) not null
        primary key,
    storage_name text                                                                    not null,
    user_id      uuid                                                                    not null
        references users
);

create table card_holder_types
(
    holder_id   integer default nextval('user_collections_collection_id_seq'::regclass) not null
        constraint card_holders_pkey
            primary key,
    holder_name text                                                                    not null
);

create table user_collection_items
(
    item_id             integer default nextval('user_collections_collection_id_seq'::regclass) not null
        constraint user_collections_pkey
            primary key,
    user_id             uuid                                                                    not null
        constraint user_collections_user_id_fkey
            references users
            on delete cascade,
    card_id             integer                                                                 not null
        constraint user_collections_card_id_fkey
            references cards
            on delete restrict,
    condition_id        integer                                                                 not null
        constraint user_collections_condition_id_fkey
            references conditions
            on delete restrict,
    serial_number       integer
        constraint user_collections_serial_number_check
            check ((serial_number > 0) OR (serial_number IS NULL)),
    grading_company_id  integer
        constraint user_collections_grading_company_id_fkey
            references grading_companies
            on delete set null,
    grade               varchar(10),
    grading_cert_number varchar(50),
    sub_score_centering numeric(3, 1)
        constraint user_collections_sub_score_centering_check
            check ((sub_score_centering >= (0)::numeric) AND (sub_score_centering <= (10)::numeric)),
    sub_score_corners   numeric(3, 1)
        constraint user_collections_sub_score_corners_check
            check ((sub_score_corners >= (0)::numeric) AND (sub_score_corners <= (10)::numeric)),
    sub_score_edges     numeric(3, 1)
        constraint user_collections_sub_score_edges_check
            check ((sub_score_edges >= (0)::numeric) AND (sub_score_edges <= (10)::numeric)),
    sub_score_surface   numeric(3, 1)
        constraint user_collections_sub_score_surface_check
            check ((sub_score_surface >= (0)::numeric) AND (sub_score_surface <= (10)::numeric)),
    purchase_date       date,
    purchase_price      numeric(10, 2)
        constraint user_collections_purchase_price_check
            check (purchase_price >= (0)::numeric),
    added_at            timestamp with time zone default CURRENT_TIMESTAMP,
    autographed         boolean default false                                                   not null,
    storage_location_id integer
        references user_storage_locations,
    holder_type         integer
        references card_holder_types,
    unique (user_id, item_id),
    constraint valid_grade
        check (((grading_company_id IS NULL) AND (grade IS NULL) AND (grading_cert_number IS NULL) AND
                (sub_score_centering IS NULL) AND (sub_score_corners IS NULL) AND (sub_score_edges IS NULL) AND
                (sub_score_surface IS NULL)) OR ((grading_company_id IS NOT NULL) AND (grade IS NOT NULL)))
);

create index idx_user_collections_user_id
    on user_collection_items (user_id);

create trigger check_serial_number
    before insert or update
    on user_collection_items
    for each row
execute procedure validate_serial_number();

create trigger update_checklist_after_collection_change
    after insert or delete
    on user_collection_items
    for each row
execute procedure update_set_checklist();

create table user_collection_item_images
(
    image_id    integer                  default nextval('user_collection_images_user_image_id_seq'::regclass) not null
        constraint user_collection_images_pkey
            primary key,
    item_id     integer                                                                                        not null
        constraint user_collection_images_collection_id_fkey
            references user_collection_items
            on delete cascade,
    image_url   text                                                                                           not null,
    uploaded_at timestamp with time zone default CURRENT_TIMESTAMP                                             not null
);

create index idx_user_collection_images_collection_id
    on user_collection_item_images (item_id);

