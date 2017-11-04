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

const queryStringToDict = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return pairs.reduce((m, [k, v]) => (m[k] = v, m), {});
};

const qsdict = queryStringToDict();
origin.value = qsdict['origin'] || '';
destination.value = qsdict['destination'] || '';
origin.focus();

const hideAlert = () => {
    alert.className = 'hidden';
};

const showAlert = (title, message) => {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alert.className = 'show';
};

alertCloseBtn.addEventListener('click', hideAlert);

window.gm_authFailure = function () {
    showAlert(
        'Google Maps Api Authorisation Failure',
        'An error occurred loading the Google Maps Api.');
};

window.initMap = function () {

    const ADVANCE_TO_NEXT_STEP_INTERVAL = 1300;
    const ADJUST_HEADING_DELAY = 100;

    const panorama = new google.maps.StreetViewPanorama(
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

    const directionsService = new google.maps.DirectionsService();

    new google.maps.places.Autocomplete(origin);
    new google.maps.places.Autocomplete(destination);

    let path = [];
    let fullPath = [];
    let numPositions = 0;
    let positionIndex = 0;
    let nextHeading = null;
    let timer = null;

    // TODO: use addListenerOnce instead ?
    google.maps.event.addListener(panorama, 'position_changed', () => {
        console.log('[position_changed]');
        if (nextHeading) {
            setTimeout(() => {
                const pov = panorama.pov;
                pov.heading = nextHeading.heading;
                panorama.setPov(pov);
            }, ADJUST_HEADING_DELAY);
        }
    });

    const showPositionIndex = positionIndex => {
        const position1 = path[positionIndex];
        panorama.setPosition(position1);
        if (positionIndex + 1 < numPositions) {
            const position2 = path[positionIndex + 1];
            const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
            nextHeading = { heading };
        }
        else {
            nextHeading = null;
        }
    };

    const advance = () => {
        if (++positionIndex < numPositions) {
            showPositionIndex(positionIndex);
        }
        else {
            pause();
        }
    };

    const loadInitialPosition = () => {
        positionIndex = 0;
        const position = path[positionIndex];
        panorama.setPosition(position);
        const heading = google.maps.geometry.spherical.computeHeading(fullPath[0], fullPath[1]);
        nextHeading = { heading };
    };

    const play = () => {
        const id = setInterval(advance, ADVANCE_TO_NEXT_STEP_INTERVAL);
        timer = { id };
    };

    const pause = () => {
        if (timer) {
            clearInterval(timer.id);
            timer = null;
        }
    };

    const reset = () => {
        loadInitialPosition();
    };

    const showRoute = e => {
        e.preventDefault();
        const request = {
            origin: origin.value,
            destination: destination.value,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, function (response, status) {

            if (status !== 'OK') {
                showAlert(
                    'Failed to find route',
                    `The directions service returned, '${status}'.`);
            }
            else {
                hideAlert();
                path = response.routes[0].overview_path;
                numPositions = path.length;
                const steps = response.routes[0].legs[0].steps;
                const paths = steps.map(step => step.path);
                fullPath = [].concat(...paths);
                loadInitialPosition();
            }
        });
    };

    showRouteBtn.addEventListener('click', showRoute);
    playBtn.addEventListener('click', play);
    pauseBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);
};
