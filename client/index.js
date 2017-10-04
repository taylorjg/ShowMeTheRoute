/* global google, Rx */

$(document).ready(() => {

    const $apiKey = $('#apiKey');
    const $origin = $('#origin');
    const $destination = $('#destination');

    const qsmap = queryStringToMap();
    $apiKey.val(qsmap.get('apiKey'));
    $origin.val(qsmap.get('origin'));
    $destination.val(qsmap.get('destination'));

    const onSubmit = e => {
        e.preventDefault();
        const apiKey = $apiKey.val();
        const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initMap`;
        $('head').append($('<script>', { src }));
    };

    $('#submitBtn').click(onSubmit);
});

const queryStringToMap = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return new Map(pairs);
};

const log = message => {
    const now = new Date();
    const timestamp = now.toISOString().substr(11, 12);
    console.log(`[${timestamp}] ${message}`);
};

window.initMap = function () {

    const NEXT_STEP_INTERVAL = 1300;
    const HEADING_DELAY = 200;

    const ACTION_SHOW_ROUTE = 0;
    const ACTION_PLAY = 1;
    const ACTION_PAUSE = 2;
    const ACTION_RESET = 3;
    const ACTION_TICK = 4;
    const ACTION_ROUTE_SUCCESS = 5;
    const ACTION_ROUTE_FAILURE = 6;

    const mapDiv = document.getElementById('map');
    const panoramaOptions = {
        panControl: false,
        zoomControl: false,
        addressControl: false,
        fullscreenControl: false,
        motionTrackingControl: false,
        linksControl: false,
        enableCloseButton: false,
        showRoadLabels: false
    };

    const state = {
        panorama: new google.maps.StreetViewPanorama(mapDiv, panoramaOptions),
        directionsService: new google.maps.DirectionsService(),
        async$: new Rx.Subject(),
        path: [],
        positionIndex: 0,
        playing: false,
        routing: false
    };

    const showPositionIndex = state => {
        const position1 = state.path[state.positionIndex];
        log(`[showPositionIndex] calling panorama.setPosition`);
        state.panorama.setPosition(position1);
        if (state.positionIndex + 1 < state.path.length) {
            const position2 = state.path[state.positionIndex + 1];
            const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
            setTimeout(
                () => {
                    const pov = state.panorama.pov;
                    pov.heading = heading;
                    log(`[setTimeout callback] calling panorama.setPov`);
                    state.panorama.setPov(pov);
                },
                HEADING_DELAY);
        }
        return state;
    };

    const advance = state => {
        if (!state.playing) return state;
        log(`[advance] playing`);
        if (++state.positionIndex < state.path.length) {
            return showPositionIndex(state);
        }
        return pause(state);
    };

    const play = state => {
        state.playing = true;
        return state;
    };

    const pause = state => {
        state.playing = false;
        return state;
    };

    const reset = state => {
        state.positionIndex = 0;
        return showPositionIndex(state);
    };

    const showRoute = state => {

        log(`[showRoute] entering`);

        const $origin = $('#origin');
        const $destination = $('#destination');

        const request = {
            origin: $origin.val(),
            destination: $destination.val(),
            travelMode: 'DRIVING'
        };

        state.directionsService.route(request, function (response, status) {
            log(`[route callback] status: ${status}`);
            if (status === 'OK') {
                state.async$.next({ type: ACTION_ROUTE_SUCCESS, route: response.routes[0] });
            }
            else {
                state.async$.next({ type: ACTION_ROUTE_FAILURE, status });
            }
            state.routing = false;
            return state;
        });

        log(`[showRoute] leaving`);
        state.routing = true;
        return state;
    };

    const routeSuccess = (state, route) => {
        state.path = route.overview_path;
        return reset(state);
    };

    const routeFailure = (state, status) => {
        console.error(`Route failure - status: ${status}`);
        return state;
    };

    const preventDefault = e => e.preventDefault();

    const showRouteBtn = document.getElementById('showRouteBtn');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    const showRouteBtn$ = Rx.Observable.fromEvent(showRouteBtn, 'click')
        .do(preventDefault)
        .mapTo({ type: ACTION_SHOW_ROUTE });
    const playBtn$ = Rx.Observable.fromEvent(playBtn, 'click').mapTo({ type: ACTION_PLAY });
    const pauseBtn$ = Rx.Observable.fromEvent(pauseBtn, 'click').mapTo({ type: ACTION_PAUSE });
    const resetBtn$ = Rx.Observable.fromEvent(resetBtn, 'click').mapTo({ type: ACTION_RESET });
    const interval$ = Rx.Observable.interval(NEXT_STEP_INTERVAL).mapTo({ type: ACTION_TICK });

    const merged$ = Rx.Observable.merge(
        showRouteBtn$,
        playBtn$,
        pauseBtn$,
        resetBtn$,
        interval$,
        state.async$);

    const scan$ = merged$.scan((state, action) => {
        switch (action.type) {
            case ACTION_SHOW_ROUTE:
                return showRoute(state);
            case ACTION_PLAY:
                return play(state);
            case ACTION_PAUSE:
                return pause(state);
            case ACTION_RESET:
                return reset(state);
            case ACTION_TICK:
                return advance(state);
            case ACTION_ROUTE_SUCCESS:
                return routeSuccess(state, action.route);
            case ACTION_ROUTE_FAILURE:
                return routeFailure(state, action.status);
            default:
                return state;
        }
    }, state);

    scan$.subscribe();
};
