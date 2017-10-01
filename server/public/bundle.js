/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports) {

/* global google */

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

const queryStringToMap = () => {
    const pairs = window.location.search.substr(1).split('&').map(q => q.split('='));
    return new Map(pairs);
};

// eslint-disable-next-line no-unused-vars
function initMap() {

    const ADVANCE_TO_NEXT_STEP_INTERVAL = 1000;
    const ADJUST_HEADING_DELAY = 100;

    const directionsService = new google.maps.DirectionsService();

    const request = {
        origin: '29 Brookfield Ave, Manchester, England',
        destination: 'Cake Solutions, Houldsworth Street, Stockport',
        travelMode: 'DRIVING'
    };

    // eslint-disable-next-line no-unused-vars
    directionsService.route(request, function (response, status) {

        // TODO: check 'status'.

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
            const position1 = response.routes[0].overview_path[positionIndex];
            panorama.setPosition(position1);
            if (positionIndex + 1 < numPositions) {
                const position2 = response.routes[0].overview_path[positionIndex + 1];
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
}


/***/ })
/******/ ]);