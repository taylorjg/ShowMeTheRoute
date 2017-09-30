$(document).ready(() => {
    const $apiKey = $('#apiKey');
    const $submitBtn = $('#submitBtn');

    $apiKey.val(queryStringToMap().get('apiKey'));

    $submitBtn.click(e => {
        e.preventDefault();
        const apiKey = $apiKey.val();
        const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
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
        let positionIndex = 0;
        const position = response.routes[0].overview_path[positionIndex];
        console.log(`position: ${position}`);
        const mapDiv = $('#map')[0];
        const panorama = new google.maps.StreetViewPanorama(
            mapDiv, {
                position,
                pov: {
                    heading: 0,
                    pitch: 0
                },
                panControl: false,
                zoomControl: false,
                addressControl: false,
                fullscreenControl: false,
                motionTrackingControl: false,
                linksControl: false,
                enableCloseButton: false
            });
        const setPosition = positionIndex => {
            const position = response.routes[0].overview_path[positionIndex];
            console.log(`position: ${position}`);
            panorama.setPosition(position);
        };
        const $nextLocationBtn = $('#nextLocationBtn');
        $nextLocationBtn.click(() => setPosition(++positionIndex));
    });
};
