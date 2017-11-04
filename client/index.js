/* global google */

const alert = document.getElementById('alert');
const alertCloseBtn = document.getElementById('alertCloseBtn');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');

const origin = document.getElementById('origin');
const destination = document.getElementById('destination');
const showRouteBtn = document.getElementById('showRouteBtn');

const map = document.getElementById('map');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const routeState = {
    initialised: false,
    panorama: null,
    directionsService: null,
    playing: false,
    path: [],
    fullPath: [],
    numPositions: 0,
    positionIndex: 0,
    nextHeading: null,
    timer: null
};

const ADVANCE_TO_NEXT_STEP_INTERVAL = 1300;
const ADJUST_HEADING_DELAY = 100;

const queryStringToDict = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return pairs.reduce((m, [k, v]) => (m[k] = v, m), {});
};

const hideAlert = () => {
    alert.className = 'hidden';
};

const showAlert = (title, message) => {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alert.className = 'show';
};

const updateButtonState = () => {

    const enableShowRouteBtn =
        routeState.initialised &&
        origin.value.length &&
        destination.value.length;

    const enablePlayBtn = routeState.initialised && !routeState.playing;

    const enablePauseBtn = routeState.initialised && routeState.playing;
    
    const enableResetBtn =
        routeState.initialised &&
        routeState.playing &&
        routeState.positionIndex > 0;
    
    showRouteBtn.disabled = !enableShowRouteBtn;
    playBtn.disabled = !enablePlayBtn;
    pauseBtn.disabled = !enablePauseBtn;
    resetBtn.disabled = !enableResetBtn;
};

const showPositionIndex = positionIndex => {
    const position1 = routeState.path[positionIndex];
    routeState.panorama.setPosition(position1);
    if (positionIndex + 1 < routeState.numPositions) {
        const position2 = routeState.path[positionIndex + 1];
        const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
        routeState.nextHeading = { heading };
    }
    else {
        routeState.nextHeading = null;
    }
};

const advance = () => {
    if (++routeState.positionIndex < routeState.numPositions) {
        showPositionIndex(routeState.positionIndex);
    }
    else {
        pause();
    }
    updateButtonState();
};

const loadInitialPosition = () => {
    routeState.positionIndex = 0;
    const position = routeState.path[routeState.positionIndex];
    routeState.panorama.setPosition(position);
    const heading = google.maps.geometry.spherical.computeHeading(
        routeState.fullPath[0],
        routeState.fullPath[1]);
    routeState.nextHeading = { heading };
};

const play = () => {
    const id = setInterval(advance, ADVANCE_TO_NEXT_STEP_INTERVAL);
    routeState.timer = { id };
    routeState.playing = true;
    updateButtonState();
};

const pause = () => {
    if (routeState.timer) {
        clearInterval(routeState.timer.id);
        routeState.timer = null;
    }
    routeState.playing = false;
    updateButtonState();
};

const reset = () => {
    pause();
    loadInitialPosition();
    updateButtonState();
};

const showRoute = e => {

    e.preventDefault();

    pause();

    const request = {
        origin: origin.value,
        destination: destination.value,
        travelMode: 'DRIVING'
    };

    routeState.directionsService.route(request, function (response, status) {

        if (status !== 'OK') {
            showAlert(
                'Failed to find route',
                `The directions service returned, '${status}'.`);
        }
        else {
            hideAlert();
            routeState.path = response.routes[0].overview_path;
            routeState.numPositions = routeState.path.length;
            const steps = response.routes[0].legs[0].steps;
            const paths = steps.map(step => step.path);
            routeState.fullPath = [].concat(...paths);
            loadInitialPosition();
            play();
        }

        updateButtonState();
    });
};

window.gm_authFailure = function () {
    showAlert(
        'Google Maps Api Authorisation Failure',
        'An error occurred loading the Google Maps Api.');
};

window.initMap = function () {

    routeState.panorama = new google.maps.StreetViewPanorama(
        map,
        {
            panControl: false,
            zoomControl: false,
            addressControl: false,
            fullscreenControl: false,
            motionTrackingControl: false,
            linksControl: false,
            enableCloseButton: false,
            showRoadLabels: false
        });

    routeState.directionsService = new google.maps.DirectionsService();

    new google.maps.places.Autocomplete(origin);
    new google.maps.places.Autocomplete(destination);

    // TODO: use addListenerOnce instead ?
    google.maps.event.addListener(routeState.panorama, 'position_changed', () => {
        if (routeState.nextHeading) {
            setTimeout(() => {
                const pov = routeState.panorama.pov;
                pov.heading = routeState.nextHeading.heading;
                routeState.panorama.setPov(pov);
            }, ADJUST_HEADING_DELAY);
        }
    });

    routeState.initialised = true;
};

updateButtonState();
alertCloseBtn.addEventListener('click', hideAlert);
showRouteBtn.addEventListener('click', showRoute);
playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);
origin.addEventListener('input', updateButtonState);
destination.addEventListener('input', updateButtonState);

const qsdict = queryStringToDict();
origin.value = qsdict['origin'] || '';
destination.value = qsdict['destination'] || '';

origin.focus();
