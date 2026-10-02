import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { estimateRange, SERVICE_GROUP } from "./brand";

/**
 * What the catalogue is being narrowed by, held where both screens can see it.
 *
 * The filter is its own page and the list it filters is another, so the choice
 * cannot live in either - it belongs between them. Kept in memory rather than
 * on the phone on purpose: a filter is about the errand somebody is on right
 * now, and one that is still applied a week later is a customer wondering why
 * half the catalogue has vanished.
 *
 * `apply` does the narrowing here rather than in the list, so the count the
 * filter screen shows on its own button and the rows the list actually draws
 * can never disagree.
 */
const FiltersContext = createContext(null);

export const BLANK = {
    group: "All services",

    /*
     * A band in whole rupees, matched against the trade's indicative range
     * rather than against a real quote - nothing is priced until an engineer
     * has looked at it.
     *
     * `PRICE_MAX` means "and above": a ceiling on the top thumb would hide
     * every expensive trade from somebody who dragged it to the end, which is
     * the opposite of what dragging it there means.
     */
    priceLow: 0,
    priceHigh: 2000,

    /*
     * A day, only as far ahead as the booking flow will take one.
     *
     * It narrows nothing today and is stored anyway, because it is what the
     * customer said - the booking screen reads it as the day to open on rather
     * than making them choose twice. A trade is not "available" on a date; an
     * engineer is, and which one is free is the office's to settle.
     */
    onDay: null,

    // 0 means "any". Anything else is a floor: 4 shows 4.0 and above.
    minStars: 0,

    // Only trades with somebody working near this customer.
    nearbyOnly: false,
};

export const useFilters = () => useContext(FiltersContext) || {
    filters: BLANK,
    setFilters: () => {},
    reset: () => {},
    active: 0,
    apply: (list) => list,
};

export const FiltersProvider = ({ children }) => {
    const [filters, setFilters] = useState(BLANK);

    const reset = useCallback(() => setFilters(BLANK), []);

    // How many of the four are actually doing something, for the badge on the
    // filter button. A screen that says "Filter" when three are set is a screen
    // hiding the reason a list looks wrong.
    const active = useMemo(() => (
        (filters.group !== BLANK.group ? 1 : 0)
        + (filters.priceLow > BLANK.priceLow || filters.priceHigh < BLANK.priceHigh ? 1 : 0)
        + (filters.onDay ? 1 : 0)
        + (filters.minStars ? 1 : 0)
        + (filters.nearbyOnly ? 1 : 0)
    ), [filters]);

    /**
     * `cover` is the area hook's own lookup, passed in rather than read here -
     * this module has no business knowing where the customer is, and taking it
     * as an argument keeps the narrowing a pure function of its inputs.
     */
    const apply = useCallback((list, cover) => list.filter((service) => {
        if (filters.group !== BLANK.group && SERVICE_GROUP[service.key] !== filters.group) {
            return false;
        }

        if (filters.minStars && Number(service.rating || 0) < filters.minStars) return false;

        /*
         * Kept when the two ranges overlap at all.
         *
         * A trade that starts under the ceiling is worth showing even if it can
         * run past it, and one that tops out above the floor is worth showing
         * even if it usually costs less - what the customer set is a budget,
         * not a specification.
         */
        const range = estimateRange(service);
        const from = Number(range.from || 0);
        const to = Number(range.to || from);

        if (to < filters.priceLow) return false;
        if (filters.priceHigh < BLANK.priceHigh && from > filters.priceHigh) return false;

        if (filters.nearbyOnly && cover) {
            const near = cover(service.key);
            if (near && !near.available) return false;
        }

        return true;
    }), [filters]);

    return (
        <FiltersContext.Provider value={{ filters, setFilters, reset, active, apply }}>
            {children}
        </FiltersContext.Provider>
    );
};
