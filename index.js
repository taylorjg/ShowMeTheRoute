$(document).ready(() => {
    const $apiKey = $('#apiKey');
    const $submitBtn = $('#submitBtn');

    $apiKey.val(queryStringToMap().get('apiKey'));

    $submitBtn.click(e => {
        e.preventDefault();
        const apiKey = $apiKey.val();
        const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initMap`;
        $('head').append($('<script>', { src }));
    });
});

queryStringToMap = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return new Map(pairs);
}

function initMap() {

    const directionsService = new google.maps.DirectionsService();

    const request = {
        origin: '29 Brookfield Ave, Manchester, England',
        destination: 'Cake Solutions, Houldsworth Street, Stockport',
        travelMode: 'DRIVING'
    };

    directionsService.route(request, function (response, status) {

        const numPositions = response.routes[0].overview_path.length;
        let positionIndex = 0;
        let nextHeading = null;
        let timer = null;
        const position1 = response.routes[0].overview_path[positionIndex];
        const position2 = response.routes[0].overview_path[positionIndex + 1];
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

        const goToNextLocation = () => {
            if (++positionIndex < numPositions) {
                showPositionIndex(positionIndex);
            }
        };

        $('#startBtn').click(() => {
            const id = setInterval(goToNextLocation, 1000);
            timer = { id };
        });

        $('#stopBtn').click(() => {
            if (timer) {
                clearInterval(timer.id);
                timer = null;
            }
        });

        panorama.addListener('position_changed', () => {
            if (nextHeading) {
                setTimeout(() => {
                    const pov = panorama.pov;
                    pov.heading = nextHeading.heading;
                    panorama.setPov(pov);
                }, 100);
            }
        });

        const showPositionIndex = positionIndex => {
            const position1 = response.routes[0].overview_path[positionIndex];
            if (positionIndex + 1 < numPositions) {
                const position2 = response.routes[0].overview_path[positionIndex + 1];
                const heading = google.maps.geometry.spherical.computeHeading(position1, position2);
                nextHeading = { heading };
                panorama.setPosition(position1);
            }
            else {
                nextHeading = null;
                panorama.setPosition(position1);
            }
        };
    });
};
