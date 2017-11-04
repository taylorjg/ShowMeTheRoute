/* global google */

$(document).ready(() => {
    const $origin = $('#origin');
    const $destination = $('#destination');
    const qsmap = queryStringToMap();
    $origin.val(qsmap.get('origin'));
    $destination.val(qsmap.get('destination'));
    $('#alertCloseBtn').click(hideAlert);
});

const queryStringToMap = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return new Map(pairs);
};

const hideAlert = () => {
    const $alert = $('#alert');
    $alert.removeClass('show');
    $alert.addClass('hidden');
};

const showAlert = (title, message) => {
    const $alert = $('#alert');
    const $alertTitle = $('#alertTitle');
    const $alertMessage = $('#alertMessage');
    $alertTitle.text(title);
    $alertMessage.text(message);
    $alert.removeClass('hidden');
    $alert.addClass('show');
};

window.gm_authFailure = function() {
    showAlert(
        'Google Maps Api Authorisation Failure',
        'An error occurred loading the Google Maps Api.');
};

window.initMap = function () {

    const ADVANCE_TO_NEXT_STEP_INTERVAL = 1300;
    const ADJUST_HEADING_DELAY = 100;

    const mapDiv = document.getElementById('map');
    const panorama = new google.maps.StreetViewPanorama(
        mapDiv, {
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

    new google.maps.places.Autocomplete(document.getElementById('origin'));
    new google.maps.places.Autocomplete(document.getElementById('destination'));

    let path = [];
    let fullPath = [];
    let numPositions = 0;
    let positionIndex = 0;
    let nextHeading = null;
    let timer = null;

    panorama.addListener('position_changed', () => {
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
        const $origin = $('#origin');
        const $destination = $('#destination');
        const request = {
            origin: $origin.val(),
            destination: $destination.val(),
            travelMode: 'DRIVING'
        };

        directionsService.route(request, function (response, status) {
            if (status !== 'OK') {
                showAlert(
                    'Failed to find route',
                    `The directions service returned, '${status}'.`);
                return;
            }
            path = response.routes[0].overview_path;
            numPositions = path.length;

            const steps = response.routes[0].legs[0].steps;
            const paths = steps.map(step => step.path);
            fullPath = [].concat(...paths);
            loadInitialPosition();
        });
    };

    $('#showRouteBtn').click(showRoute);
    $('#playBtn').click(play);
    $('#pauseBtn').click(pause);
    $('#resetBtn').click(reset);
};
