// searchModal.js

// Configuration object for the search modal
const SearchModalConfig = {
    modalId: 'searchModal',
    closeOnOutsideClick: false,
    defaultPageSize: 20,
    filterPosition: 'side', // 'side' or 'top'
    fullscreenOnMobile: true,
    saveSearchEndpoint: '/api/save-search/',
    loadSearchesEndpoint: '/api/load-searches/',
    deleteSearchEndpoint: '/api/delete-search/',
};

// Main class to handle the search modal functionality
class SearchModal {
    constructor(config = {}) {
        this.config = {...SearchModalConfig, ...config};
        this.filters = new FilterManager();
        this.table = new TableManager();
        this.pagination = new PaginationManager();
        this.savedSearches = new SavedSearchManager(this);
        this.currentData = [];
        this.initialize();
    }

    initialize() {
        this.initializeModal();
        this.initializeEventListeners();
        this.setupLayoutControls();
    }

    initializeModal() {
        const modal = document.getElementById(this.config.modalId);
        if (!modal) throw new Error('Modal element not found');

        this.modal = new Modal(modal, {
            closable: !this.config.closeOnOutsideClick,
            onShow: () => this.onModalShow(),
            onHide: () => this.onModalHide()
        });
    }

    initializeEventListeners() {
        // Page size change handler
        document.getElementById('pageSize').addEventListener('change', (e) => {
            this.pagination.setPageSize(parseInt(e.target.value));
            this.refreshTable();
        });

        // Clear filters button
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.filters.clearAll();
            this.refreshTable();
        });

        // Toggle layout buttons
        document.getElementById('toggleFiltersLayout').addEventListener('click', () => {
            this.toggleFilterLayout();
        });

        document.getElementById('toggleFullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }

    setupLayoutControls() {
        if (this.config.fullscreenOnMobile) {
            this.setupMobileFullscreen();
        }
        this.setFilterPosition(this.config.filterPosition);
    }

    refreshTable() {
        const filteredData = this.filters.applyFilters(this.currentData);
        const sortedData = this.table.applySorting(filteredData);
        const paginatedData = this.pagination.getPaginatedData(sortedData);
        this.table.updateTable(paginatedData);
        this.updateResultsCount(filteredData.length);
    }

    toggleFilterLayout() {
        const filtersSection = document.getElementById('filtersSection');
        const currentPosition = filtersSection.classList.contains('filters-side') ? 'side' : 'top';
        const newPosition = currentPosition === 'side' ? 'top' : 'side';
        this.setFilterPosition(newPosition);
    }

    setFilterPosition(position) {
        const filtersSection = document.getElementById('filtersSection');
        filtersSection.classList.remove('filters-side', 'filters-top');
        filtersSection.classList.add(`filters-${position}`);
        this.config.filterPosition = position;
    }

    toggleFullscreen() {
        const modalElement = document.getElementById(this.config.modalId);
        modalElement.classList.toggle('search-modal-fullscreen');
    }

    setupMobileFullscreen() {
        if (window.innerWidth <= 768) {
            const modalElement = document.getElementById(this.config.modalId);
            modalElement.classList.add('search-modal-fullscreen');
        }
    }

    onModalShow() {
        if (this.currentData.length === 0) {
            this.loadData();
        }
    }

    onModalHide() {
        // Clean up any temporary state if needed
    }

    async loadData(data = []) {
        this.currentData = data;
        await this.savedSearches.loadSavedSearches();
        this.refreshTable();
    }

    updateResultsCount(count) {
        const countElement = document.getElementById('resultsCount');
        countElement.textContent = `Showing ${count} result${count !== 1 ? 's' : ''}`;
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    }
}

// Filter Management
class FilterManager {
    constructor() {
        this.filters = new Map();
        this.activeFilters = new Set();
    }

    addFilter(column, config) {
        const filter = this.createFilter(column, config);
        this.filters.set(column, filter);
        this.renderFilter(filter);
    }

    createFilter(column, config) {
        return {
            column,
            type: config.type,
            value: null,
            operator: config.operator || 'contains',
            render: config.render || this.getDefaultRenderer(config.type),
            validate: config.validate || (() => true)
        };
    }

    applyFilters(data) {
        if (this.activeFilters.size === 0) return data;

        return data.filter(item => {
            for (const [column, filter] of this.filters) {
                if (!this.activeFilters.has(column)) continue;
                if (!this.evaluateFilter(item[column], filter)) return false;
            }
            return true;
        });
    }

    // ... other methods
}

// Table Management
class TableManager {
    constructor() {
        this.sortState = [];
        this.columns = new Map();
    }

    setColumns(columns) {
        this.columns = new Map(columns.map(col => [col.key, col]));
        this.renderHeaders();
    }

    applySorting(data) {
        if (this.sortState.length === 0) return data;

        return [...data].sort((a, b) => {
            for (const {column, direction} of this.sortState) {
                const comparison = this.compareValues(a[column], b[column]);
                if (comparison !== 0) return comparison * (direction === 'asc' ? 1 : -1);
            }
            return 0;
        });
    }

    getDefaultRenderer(type) {
        const renderers = {
            text: this.renderTextFilter,
            number: this.renderNumberFilter,
            select: this.renderSelectFilter,
            date: this.renderDateFilter
        };
        return renderers[type] || renderers.text;
    }

    renderFilter(filter) {
        const container = document.createElement('div');
        container.className = 'filter-item';
        container.innerHTML = filter.render(filter);
        document.getElementById('filtersList').appendChild(container);
    }

    evaluateFilter(value, filter) {
        const filterValue = filter.value;
        if (!filterValue) return true;

        switch (filter.type) {
            case 'text':
                return value.toString().toLowerCase().includes(filterValue.toLowerCase());
            case 'number':
                return this.evaluateNumberFilter(value, filterValue);
            case 'date':
                return this.evaluateDateFilter(value, filterValue);
            default:
                return true;
        }
    }

    clearAll() {
        this.activeFilters.clear();
        this.filters.forEach(filter => {
            filter.value = null;
            const element = document.querySelector(`[data-filter="${filter.column}"]`);
            if (element) element.value = '';
        });
    }

    getState() {
        const state = {};
        this.filters.forEach((filter, column) => {
            if (filter.value !== null) {
                state[column] = {
                    value: filter.value,
                    operator: filter.operator
                };
            }
        });
        return state;
    }

    renderHeaders() {
        const thead = document.querySelector('#resultsTable thead');
        thead.innerHTML = '';
        const row = document.createElement('tr');

        this.columns.forEach((column, key) => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3';
            th.innerHTML = `
                <div class="flex items-center">
                    ${column.label}
                    ${column.sortable ? this.getSortIcon(key) : ''}
                </div>
            `;
            if (column.sortable) {
                th.addEventListener('click', () => this.handleSort(key));
            }
            row.appendChild(th);
        });

        thead.appendChild(row);
    }

    updateTable(data) {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';

            this.columns.forEach((column, key) => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4';
                td.textContent = row[key] || '';
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    handleSort(column) {
        const existingSort = this.sortState.find(sort => sort.column === column);

        if (existingSort) {
            if (existingSort.direction === 'asc') {
                existingSort.direction = 'desc';
            } else {
                this.sortState = this.sortState.filter(sort => sort.column !== column);
            }
        } else {
            this.sortState.push({column, direction: 'asc'});
        }

        this.renderHeaders();
        this.parent.refreshTable();
    }

    getSortIcon(column) {
        const sort = this.sortState.find(s => s.column === column);
        if (!sort) {
            return `<svg class="w-3 h-3 ml-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 9h8l-4 4-4-4z"/>
                    </svg>`;
        }
        return sort.direction === 'asc' ?
            '<svg class="w-3 h-3 ml-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M8 15l4-4 4 4H8z"/></svg>' :
            '<svg class="w-3 h-3 ml-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16 9l-4 4-4-4h8z"/></svg>';
    }
}

// Pagination Management
class PaginationManager {
    constructor(pageSize = 20) {
        this.pageSize = pageSize;
        this.currentPage = 1;
        this.totalPages = 1;
    }

    getPaginatedData(data) {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return data.slice(start, end);
    }

    // ... other methods
}

// Saved Search Management
class SavedSearchManager {
    constructor(searchModal) {
        this.searchModal = searchModal;
        this.searches = [];
        this.initializeEventListeners();
    }

    async saveSearch(name) {
        const searchState = {
            name,
            filters: this.searchModal.filters.getState(),
            sorting: this.searchModal.table.sortState,
            pageSize: this.searchModal.pagination.pageSize
        };

        try {
            const response = await fetch(this.searchModal.config.saveSearchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify(searchState)
            });

            if (response.ok) {
                await this.loadSavedSearches();

            } else {
                alert('Error saving search. Please try again.');
            }
        } catch (error) {
            console.error('Error saving search:', error);
            alert('Unable to connect to the server.');
        }
    }

    async loadSavedSearches() {
        try {
            const response = await fetch(this.searchModal.config.savedSearchesEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.searches = data.savedSearches; // Update the list of saved searches
                this.renderSavedSearches();
            } else {
                console.error('Error loading saved searches:', response.statusText);
                alert('Error loading saved searches. Please try again.');
            }
        } catch (error) {
            console.error('Unable to fetch saved searches:', error);
            alert('Unable to connect to the server.');
        }
    }

    getCsrfToken() {
        const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
        if (!csrfToken) {
            console.error('CSRF token not found. Ensure the CSRF token input is present in the DOM.');
        }
        return csrfToken;
    }
}