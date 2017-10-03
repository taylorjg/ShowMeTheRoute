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

    const NEXT_STEP_INTERVAL = 1250;
    const HEADING_DELAY = 100;

    const ACTION_SHOW_ROUTE = 0;
    const ACTION_PLAY = 1;
    const ACTION_PAUSE = 2;
    const ACTION_RESET = 3;
    const ACTION_TICK = 4;

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
        path: [],
        numPositions: 0,
        positionIndex: 0,
        nextHeading: null,
        playing: false
    };

    state.panorama.addListener('position_changed', () => {
        log(`[panorama position_changed]`);
        if (state.nextHeading) {
            setTimeout(() => {
                log(`[nextHeading setTimeout callback]`);
                if (state.nextHeading) {
                    const pov = state.panorama.pov;
                    pov.heading = state.nextHeading.heading;
                    log(`[nextHeading setTimeout callback] calling panorama.setPov`);
                    state.panorama.setPov(pov);
                }
            }, HEADING_DELAY);
        }
    });

    const showPositionIndex = state => {
        const position1 = state.path[state.positionIndex];
        if (state.positionIndex + 1 < state.numPositions) {
            const position2 = state.path[state.positionIndex + 1];
            const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
            state.nextHeading = { heading };
        }
        else {
            state.nextHeading = null;
        }
        log(`[showPositionIndex] calling panorama.setPosition`);
        state.panorama.setPosition(position1);
        return state;
    };

    const advance = state => {
        if (!state.playing) return state;
        log(`[advance] playing`);
        if (++state.positionIndex < state.numPositions) {
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
            if (status !== 'OK') {
                // TODO: state.routeSubject.onNext({ type: CMD_ROUTE_OUTCOME_NOT_OK, status });
                return state;
            }
            state.path = response.routes[0].overview_path;
            state.numPositions = state.path.length;
            // TODO: state.routeSubject.onNext({ type: CMD_ROUTE_OUTCOME_OK, route: response.routes[0] });
            return reset(state);
        });

        log(`[showRoute] leaving`);
        // TODO: state.routeSubject.onNext({ type: CMD_ROUTE_IN_PROGRESS });
        return state;
    };

    const showRouteBtn = document.getElementById('showRouteBtn');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    const showRouteBtn$ = Rx.Observable.fromEvent(showRouteBtn, 'click').do(e => e.preventDefault()).mapTo({ type: ACTION_SHOW_ROUTE });
    const playBtn$ = Rx.Observable.fromEvent(playBtn, 'click').mapTo({ type: ACTION_PLAY });
    const pauseBtn$ = Rx.Observable.fromEvent(pauseBtn, 'click').mapTo({ type: ACTION_PAUSE });
    const resetBtn$ = Rx.Observable.fromEvent(resetBtn, 'click').mapTo({ type: ACTION_RESET });
    const interval$ = Rx.Observable.interval(NEXT_STEP_INTERVAL).mapTo({ type: ACTION_TICK });

    // TODO: do we need a stream of (async) outcomes from the directions service ?

    const merged$ = Rx.Observable.merge(showRouteBtn$, playBtn$, pauseBtn$, resetBtn$, interval$);
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
            default:
                return state;
        }
    }, state);
    scan$.subscribe();
};
