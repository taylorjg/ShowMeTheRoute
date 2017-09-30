$(document).ready(() => {
    const $apiKey = $('#apiKey');
    const $submitBtn = $('#submitBtn');
    $submitBtn.click(function(e) {
        e.preventDefault();
        const apiKey = $apiKey.val();
        const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        $('head').append($('<script>', { src }));
    });
});

function initMap() {
    console.log(`init()`);
    const $map = $('#map');
    const directionsService = new google.maps.DirectionsService();
    const request = {
        origin: 'M21 8TX',
        destination: 'Cake Solutions, Houldsworth Street, Stockport',
        travelMode: 'DRIVING'
    };
    directionsService.route(request, function(response, status) {
        console.dir(arguments);
        response.routes[0].overview_path.forEach((p, index) => {
            console.log(`[${index}] lat: ${p.lat()}; lng: ${p.lng()}`);
        });
    });
};
