/* global google */

$(document).ready(() => {

    const $apiKey = $('#apiKey');
    $apiKey.val(queryStringToMap().get('apiKey'));

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

    const directionsService = new google.maps.DirectionsService();

    const request = {
        origin: '29 Brookfield Ave, Manchester, England',
        destination: 'Cake Solutions, Houldsworth Street, Stockport',
        travelMode: 'DRIVING'
    };

    directionsService.route(request, function (response, status) {

        if (status !== 'OK') {
            console.warn(`DirectionsService returned status: ${status}`);
            return;
        }

        const steps = response.routes[0].legs[0].steps;
        steps.forEach((step, index) => {
            console.log(`[step ${index}] instructions: ${step.instructions}; path length: ${step.path.length}`);
        });
        const paths = steps.map(step => step.path);
        const path = [].concat(...paths);

        const numPositions = path.length;
        let positionIndex = 0;
        let nextHeading = null;
        let timer = null;
        const position1 = path[positionIndex];
        const position2 = path[positionIndex + 1];
        const initialHeading = google.maps.geometry.spherical.computeHeading(position1, position2);
        const mapDiv = document.getElementById('map');

        const panorama = new google.maps.StreetViewPanorama(
            mapDiv, {
                position: position1,
                pov: {
                    heading: initialHeading,
                    pitch: 0
                },
                panControl: false,
                zoomControl: false,
                addressControl: false,
                fullscreenControl: false,
                motionTrackingControl: false,
                linksControl: false,
                enableCloseButton: false,
                showRoadLabels: false
            });

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
                stopAdvancing();
            }
        };

        const startAdvancing = () => {
            const id = setInterval(advance, ADVANCE_TO_NEXT_STEP_INTERVAL);
            timer = { id };
        };

        const stopAdvancing = () => {
            if (timer) {
                clearInterval(timer.id);
                timer = null;
            }
        };

        $('#startBtn').click(startAdvancing);
        $('#stopBtn').click(stopAdvancing);
    });
};
