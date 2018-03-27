/* global itowns, document, renderer, orientedImageGUI  */
// # Simple Globe viewer
var showAxis = true;

// Define initial camera position
var positionOnGlobe = {
    longitude: 2.423814,
    latitude: 48.844882,
    altitude: 100 };

var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});

globeView.controls.minDistance = 0;

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));


var layerIGN = {
    panoramic: {
        northing: 690.513643,
        easting: 732.292932,
        altitude: 52.273318,
        roll: -146.418862,
        pitch: -80.4872,
        heading: -151.352533,
        image: "./orientedImages/StMande_20171109_1_000_CAM24_nodist.jpg",
    },
    camera: {
        size: [2560, 1920],
        focale: 966.2159779935166,
        ppaX: 1303.3106550704085,
        ppaY: 973.3103220398533,
        // Basic orientation, Y (green) to the north, X (red) to east, Z (blue) is the vertical doesn't change here.
        // look at Z so Z still look to the sky
        // up is still Y, so Y look to the north
        // X to the east.
        lookAt: { x: 0, y: 0, z: 1 },
        up: { x: 0, y: 1, z: 0 },
        
    },
    offset: { x: 657000, y: 6860000, z: -0.4 },
    distance: 10,
    debugScale: 1,
    opacity: 0.8,
    orientation: true,
}

var layerMontBlanc = {
    panoramic: {
        latitude: 45.9228208442959,
        height: 4680.55588294683,
        longitude: 6.83256920100156,
        azimuth: 526.3900321920207,
        roll: 2.1876227239518276,
        tilt: -11.668910605126001,
        azimuth_: 0,
        roll_: 0,
        tilt_: 0,
        image: "./orientedImages/MontBlanc.jpg",    
    },
    camera: {
        size: [6490, 4408],
        focale: 1879.564256099287,
        ppaX: 3245,
        ppaY: 2204,
        // Define starting referential : Airdcarft orientation
        // from basic orientation ( Y (green) to the north, X (red) to east, Z (blue) is the vertical)
        // here we are creating the classic aircraft axises
        // first we look at the north, (north is on the Y axis in basic orientation), so Z axis will point to the north
        lookAt: { x: 0, y: 1, z: 0 },
        // then set the up vector to look to the ground, (the ground is oppisition of Z in basic orientation), so Y axis will point to the ground
        up: { x: 0, y: 0, z: -1 },
        // after that, X axis will naturally point the east.
        
    },
    distance: 4000,
    debugScale: 4.5,
    opacity: 0.8,
    orientation: true,
}

function updatePlanePositionAndScale(layer) {
    itowns.OrientedImageHelper.setPicturePositionAndScale(layer.plane, layer.distance, layer.camera.size[0], layer.camera.size[1], layer.camera.focale, layer.camera.ppaX, layer.camera.ppaY, layer.debugScale);
}

function computeOrientation(layer) {
    itowns.OrientedImageHelper.computeOrientation(layer.cameraBase, layer.camera.up, layer.camera.lookAt, layer.orientation, layer.quaternion);
}

function initPhoto(layer, coordinateConversion, orientationConvertion, showAxis) {
    
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var coord = coordinateConversion(layer);
    coord.as(globeView.referenceCrs, coordView);
    
    // create object layer.axis to show basic orientation
    layer.axis = showAxis ? new itowns.THREE.AxesHelper(1) : new itowns.THREE.Object3D();    
    globeView.scene.add(layer.axis);
    
    // set axis basic orientation
    itowns.OrientedImageHelper.initPositionAndOrientation(layer.axis, coordView);

    // add second object: orientation
    layer.cameraBase = showAxis ? new itowns.THREE.AxesHelper(1000) : new itowns.THREE.Object3D()
    layer.axis.add(layer.cameraBase);

    // compute and store the quaternion
    var rotationMatrix = orientationConvertion(layer);
    layer.quaternion = new itowns.THREE.Quaternion().setFromRotationMatrix(rotationMatrix)

    // update orientation
    computeOrientation(layer);

    // create a textured plane, representing the picture.
    var texture = new itowns.THREE.TextureLoader().load( layer.panoramic.image );
    texture.flipY = false;
    var geometry = new itowns.THREE.PlaneGeometry( 1, 1, 32 );
    var material = new itowns.THREE.MeshBasicMaterial( {
        map: texture,
        color: 0xffffff,
        side: itowns.THREE.BackSide,
        transparent: true, opacity: 1,
    } );
    layer.plane = new itowns.THREE.Mesh( geometry, material );
    layer.cameraBase.add(layer.plane);

    // update plane position and scale from layer informations
    updatePlanePositionAndScale(layer);

    // update all the hierarchy
    layer.axis.updateMatrixWorld(true);
}

//
// Add IGN oriented picture
//
function toCoordinateIGN(layer) {
    return itowns.OrientedImageHelper.parseInfoEastingNorthAltitudeToCoordinate('EPSG:2154', layer.panoramic, layer.offset);
}

function toOrientationIGN(layer) {
    return itowns.OrientedImageHelper.parseMicMacOrientationToMatrix(layer.panoramic);
}

initPhoto(layerIGN, toCoordinateIGN, toOrientationIGN, showAxis);

// 
// Add Mont Blanc oriented picture
//
function toCoordinateGeographic(layer) {
    return itowns.OrientedImageHelper.toCoordGeographic(layer.panoramic);
}

function toOrientationAircraft(layer) {
    return itowns.OrientedImageHelper.parseAircraftConventionOrientationToMatrix(layer.panoramic);
}

initPhoto(layerMontBlanc, toCoordinateGeographic, toOrientationAircraft, showAxis);

//
// for IGN building picture
// add red balls to display target on the wall
//
function cibleInit(res) {
    var geometry = new itowns.THREE.SphereGeometry(0.035, 32, 32);
    var material = new itowns.THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (const s of res) {
        const coord = new itowns.Coordinates('EPSG:2154', s.long, s.lat, s.alt);
        var sphere = new itowns.THREE.Mesh(geometry, material);
        coord.as('EPSG:4978').xyz(sphere.position);
        globeView.scene.add(sphere);
        sphere.updateMatrixWorld();
    }
}
var promises = [];
promises.push(itowns.Fetcher.json('./Li3ds/cibles.json', { crossOrigin: '' }));
Promise.all(promises).then((res) => {
    cibleInit(res[0])
});

// 
// for IGN building picture
// add extruded buildings (like WFS example).
// 
function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings }),
    // onMeshCreated: function setMaterial(res) { res.children[0].material = result.shaderMat; },
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 16,
    projection: 'EPSG:4326',
    // extent: {
    //     west: 2.334,
    //     east: 2.335,
    //     south: 48.849,
    //     north: 48.851,
    // },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
    wireframe: true,
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
