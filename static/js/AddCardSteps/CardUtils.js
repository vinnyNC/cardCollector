import logger from '../debug-manager.js';

export class CardUtils {
    constructor(state) {
        // Store a reference to the shared state object
        this.state = state;
        logger.debug("CardUtils initialized with shared state reference.");
    }

    /**
     * Makes an API call based on the provided parameters.
     * Handles URL construction and basic error handling.
     *
     * @param {string} apiSegment - The specific API segment (e.g., 'set_name', 'card_num').
     * @param {object} [params={}] - Key-value pairs for query parameters.
     * @return {Promise<Array>} A promise that resolves to an array of results (empty if error or no results).
     */
    async makeApiCall(apiSegment, params = {}) {
        logger.info(`API Call Request: Segment='${apiSegment}', Params=`, params);

        let url;
        const queryParams = new URLSearchParams();

        // Append common parameters or parameters specific to the state
        if (['card_num', 'insert_name'].includes(apiSegment)) {
            if (!this.state.selectedSet || !this.state.selectedSet.id) {
                logger.error(`API Call Error: Cannot call '${apiSegment}' without a selectedSet.id in state.`);
                throw new Error(`Cannot perform '${apiSegment}' search without a selected set.`);
            }
            queryParams.append('setID', this.state.selectedSet.id);
        }

        // Append specific search parameters
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        }

        // Construct base URL based on segment
        switch (apiSegment) {
            case 'set_name':
                url = '/api/sets';
                break;
            case 'card_num':
                url = '/api/cards';
                break;
            case 'insert_name':
                url = '/api/inserts'; // Assuming this endpoint exists
                break;
            // Assuming these endpoints expect the value directly in the path
            case 'parallel_name':
                url = `/api/parallel_name/${encodeURIComponent(params.parallelName || '')}`;
                queryParams.delete('parallelName'); // Remove from query if used in path
                break;
            case 'where_bought':
                url = `/api/where_bought/${encodeURIComponent(params.whereBought || '')}`;
                queryParams.delete('whereBought'); // Remove from query if used in path
                break;
            case 'get_sports':
                url = '/api/sports';
                break;
            case 'get_manufacturers':
                url = '/api/manufacturers';
                break;
            case 'add_set': // Example for a POST request (though tool is GET only)
                url = '/api/sets'; // Need to handle POST separately if required
                logger.warn("makeApiCall currently only supports GET. 'add_set' might need a different method.");
                break;
            default:
                logger.error(`API Call Error: Unknown API segment: ${apiSegment}`);
                throw new Error(`Unknown API segment: ${apiSegment}`);
        }

        const queryString = queryParams.toString();
        if (queryString && url.includes('/api/')) { // Only append query string if it exists and URL is relative API path
            url += `?${queryString}`;
        }

        logger.debug(`Constructed API URL: ${url}`);

        try {
            const response = await fetch(url); // Assuming GET requests for now
            if (!response.ok) {
                // Log detailed error response if possible
                let errorBody = 'Could not read error body.';
                try {
                    errorBody = await response.text();
                } catch (_) { /* ignore */
                }
                logger.error(`API Call Error: Status ${response.status} for ${url}. Body: ${errorBody}`);
                return []; // Return empty array on error
            }

            const data = await response.json();
            logger.info(`API Call Success: Segment='${apiSegment}'. Response Count: ${data.results?.length ?? 0}. Response Data:`, data);

            // Ensure we always return an array
            return data.results && Array.isArray(data.results) ? data.results : [];

        } catch (error) {
            logger.error(`API Call Fetch Error: Segment='${apiSegment}', URL='${url}'. Error:`, error);
            return []; // Return empty array on fetch error
        }
    }

    /**
     * Debounce utility function.
     *
     * @param {Function} func The function to debounce.
     * @param {number} delay The debounce delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
}