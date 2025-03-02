create table users
(
    user_id       uuid                     default uuid_generate_v4() not null
        primary key,
    username      varchar(50)                                         not null
        unique,
    email         varchar(255)                                        not null
        unique,
    password_hash varchar(255)                                        not null,
    created_at    timestamp with time zone default CURRENT_TIMESTAMP,
    updated_at    timestamp with time zone default CURRENT_TIMESTAMP
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
    unique (first_name, last_name, sport_id)
);

create index idx_players_sport_id
    on players (sport_id);

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
    parallel_id       integer default nextval('parallels_parallel_id_seq'::regclass) not null
        primary key,
    parallel_set_name varchar(50)                                                    not null
        constraint parallels_parallel_name_key
            unique,
    description       text,
    set_id            integer                                                        not null
        references card_sets
);

create table card_attributes
(
    attribute_id   serial
        primary key,
    attribute_name varchar(50) not null
        unique,
    description    text
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
    insert_set_name varchar(50)                                                    not null,
    set_id          integer                                                        not null
        references card_sets,
    card_num_prefix varchar(10)
);

create table cards
(
    card_id            serial
        primary key,
    set_id             integer     not null
        references card_sets
            on delete restrict,
    player_id          integer     not null
        references players
            on delete restrict,
    card_number        varchar(20) not null,
    parallel_id        integer
                                   references card_set_parallels
                                       on delete set null,
    is_serial_numbered boolean default false,
    serial_limit       integer
        constraint cards_serial_limit_check
            check ((serial_limit > 0) OR (serial_limit IS NULL)),
    is_rookie          boolean default false,
    insert_id          integer
        references card_set_inserts
);

create index idx_cards_set_id
    on cards (set_id);

create index idx_cards_player_id
    on cards (player_id);

create table card_attribute_mappings
(
    mapping_id   serial
        primary key,
    card_id      integer not null
        references cards
            on delete cascade,
    attribute_id integer not null
        references card_attributes
            on delete restrict,
    details      varchar(255),
    unique (card_id, attribute_id)
);

create index idx_card_attribute_mappings_card_id
    on card_attribute_mappings (card_id);

create table card_images
(
    image_id    serial
        primary key,
    card_id     integer      not null
        references cards
            on delete cascade,
    image_type  varchar(10)  not null
        constraint card_images_image_type_check
            check ((image_type)::text = ANY ((ARRAY ['front'::character varying, 'back'::character varying])::text[])),
    image_url   varchar(255) not null,
    uploaded_at timestamp with time zone default CURRENT_TIMESTAMP,
    unique (card_id, image_type)
);

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

create table user_collections
(
    collection_id       serial
        primary key,
    user_id             uuid    not null
        references users
            on delete cascade,
    card_id             integer not null
        references cards
            on delete restrict,
    condition_id        integer not null
        references conditions
            on delete restrict,
    serial_number       integer
        constraint user_collections_serial_number_check
            check ((serial_number > 0) OR (serial_number IS NULL)),
    grading_company_id  integer
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
    notes               text,
    added_at            timestamp with time zone default CURRENT_TIMESTAMP,
    constraint user_collections_user_id_card_id_condition_id_serial_number_key
        unique (user_id, card_id, condition_id, serial_number, grading_cert_number),
    constraint valid_grade
        check (((grading_company_id IS NULL) AND (grade IS NULL) AND (grading_cert_number IS NULL) AND
                (sub_score_centering IS NULL) AND (sub_score_corners IS NULL) AND (sub_score_edges IS NULL) AND
                (sub_score_surface IS NULL)) OR ((grading_company_id IS NOT NULL) AND (grade IS NOT NULL)))
);

create index idx_user_collections_user_id
    on user_collections (user_id);

create trigger check_serial_number
    before insert or update
    on user_collections
    for each row
execute procedure validate_serial_number();

create trigger update_checklist_after_collection_change
    after insert or delete
    on user_collections
    for each row
execute procedure update_set_checklist();

create table user_collection_images
(
    user_image_id     serial
        primary key,
    collection_id     integer      not null
        references user_collections
            on delete cascade,
    image_url         varchar(255) not null,
    image_description varchar(255),
    uploaded_at       timestamp with time zone default CURRENT_TIMESTAMP
);

create index idx_user_collection_images_collection_id
    on user_collection_images (collection_id);

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

