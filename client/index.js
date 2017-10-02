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

window.initMap = function () {

    const ADVANCE_TO_NEXT_STEP_INTERVAL = 1000;
    const ADJUST_HEADING_DELAY = 100;
    
    const ACTION_SHOW_ROUTE = 0;
    const ACTION_PLAY = 1;
    const ACTION_PAUSE = 2;
    const ACTION_RESET = 3;
    // const ACTION_TICK = 4;
    
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
        fullPath: [],
        numPositions: 0,
        positionIndex: 0,
        nextHeading: null,
        timer: null
    };
    
    state.panorama.addListener('position_changed', () => {
        if (state.nextHeading) {
            setTimeout(() => {
                const pov = state.panorama.pov;
                pov.heading = state.nextHeading.heading;
                state.panorama.setPov(pov);
            }, ADJUST_HEADING_DELAY);
        }
    });

    const showPositionIndex = positionIndex => {
        const position1 = state.path[positionIndex];
        state.panorama.setPosition(position1);
        if (positionIndex + 1 < state.numPositions) {
            const position2 = state.path[positionIndex + 1];
            const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
            state.nextHeading = { heading };
        }
        else {
            state.nextHeading = null;
        }
    };

    const advance = () => {
        if (++state.positionIndex < state.numPositions) {
            showPositionIndex(state.positionIndex);
        }
        else {
            pause();
        }
    };

    const loadInitialPosition = () => {
        state.positionIndex = 0;
        const position = state.path[state.positionIndex];
        state.panorama.setPosition(position);
        const heading = google.maps.geometry.spherical.computeHeading(state.fullPath[0], state.fullPath[1]);
        state.nextHeading = { heading };
    };

    const play = state => {
        const id = setInterval(advance, ADVANCE_TO_NEXT_STEP_INTERVAL);
        state.timer = { id };
        return state;
    };

    const pause = state => {
        if (state.timer) {
            clearInterval(state.timer.id);
            state.timer = null;
        }
        return state;
    };

    const reset = state => {
        loadInitialPosition();
        return state;
    };

    const showRoute = state => {
        const $origin = $('#origin');
        const $destination = $('#destination');
        const request = {
            origin: $origin.val(),
            destination: $destination.val(),
            travelMode: 'DRIVING'
        };
        state.directionsService.route(request, function (response, status) {
            if (status !== 'OK') {
                console.warn(`DirectionsService returned status: ${status}`);
                return state;
            }
            state.path = response.routes[0].overview_path;
            state.numPositions = state.path.length;
            const steps = response.routes[0].legs[0].steps;
            const paths = steps.map(step => step.path);
            state.fullPath = [].concat(...paths);
            loadInitialPosition();
        });
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

    const merged$ = Rx.Observable.merge(showRouteBtn$, playBtn$, pauseBtn$, resetBtn$);
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
            // case ACTION_TICK:
            //     break;
            default:
                return state;
        }
    }, state);
    scan$.subscribe();
};
