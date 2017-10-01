/* global google */

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
                console.warn(`DirectionsService returned status: ${status}`);
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
