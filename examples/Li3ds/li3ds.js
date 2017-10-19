/* global itowns, document, renderer, dat, debug, menuGlobe */
// # Simple Globe viewer

var debugGui = new dat.GUI({ width: 200 });

// Define initial camera position
var positionOnGlobe = { longitude: 2.423814, latitude: 48.844882, altitude: 100 };
var promises = [];
var pointcloud;
var pointcloud2;
var loader;

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
    // immersiveControls:true,
    controlsSwitcher: true,
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}
globeView.controls.minDistance = 0;
// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('../layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
// promises.push(itowns.Fetcher.json('../layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('../layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

/*
function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}
*/
globeView.addLayer({
    type: 'geometry',
    update: itowns.OrientedImageProcessing.update(),
    images: 'http://localhost:8080/examples/Li3ds/images_091117/{imageId}_{sensorId}.jpg',
    orientations: 'http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_pano.json',
    calibrations: 'http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_camera.json',
    protocol: 'orientedimage',
    // sphereRadius: 500,
    points: false,
    offset: { x: 657000, y: 6860000, z: -0.4 },
    // version: '2.0.0',
    id: 'demo_orientedImage',
    level: 16,
    projection: 'EPSG:2154',
    view: globeView,
    crsOut: globeView.referenceCrs,
    options: {
        mimetype: 'geojson',
    },
}, globeView.tileLayer).then(function addPointCloud(result) {
    var folder;
    // result.shaderMat.wireframe = true;

    if (globeView.controls instanceof itowns.ImmersiveControls ||
        globeView.controls instanceof itowns.ControlsSwitcher) {
        globeView.controls.addLayer(result);
    }

    // LOAD POINT CLOUD
    pointcloud = new itowns.GeometryLayer('Point cloud', new itowns.THREE.Group());
    pointcloud.type = 'geometry';
    pointcloud.file = 'cloud.json';
    pointcloud.protocol = 'potreeconverter';
    pointcloud.url = 'http://localhost:8080/examples/Li3ds/demo';
    // set size to 1
    pointcloud.pointSize = 1;

    function onLayerReady() {
        debug.PointCloudDebug.initTools(globeView, pointcloud, debugGui);
        pointcloud.dbgDisplaybbox = false;

        // add GUI entry
        menuGlobe.addImageryLayerGUI(pointcloud);
    }

    itowns.View.prototype.addLayer.call(globeView, pointcloud).then(onLayerReady);

    // LOAD POINT CLOUD
    pointcloud2 = new itowns.GeometryLayer('Centre Photo', new itowns.THREE.Group());
    pointcloud2.type = 'geometry';
    pointcloud2.file = 'cloud.json';
    pointcloud2.protocol = 'potreeconverter';
    pointcloud2.url = 'http://localhost:8080/examples/Li3ds/Photo';
    // set size to 1
    pointcloud2.pointSize = 2;
    function onLayerReady2() {
        pointcloud2.visible = false;
        pointcloud2.bboxes.visible = false;

        // add GUI entry
        menuGlobe.addImageryLayerGUI(pointcloud2);
    }

    itowns.View.prototype.addLayer.call(globeView, pointcloud2).then(onLayerReady2);

    // LOAD PLY SURFACE
    loader = new itowns.THREE.PLYLoader();
    loader.load('http://localhost:8080/examples/Li3ds/li3ds.ply', function loadPly(geometry) {
        var mesh;
        var meshLayer;
        var group = new itowns.THREE.Group();

        var skyGeometry = new itowns.THREE.SphereGeometry(500, 32, 32);
        var sphere = new itowns.THREE.Mesh(skyGeometry, result.shaderMat);
        result.sphere = sphere;
        group.add(sphere);

        // create mesh
        mesh = new itowns.THREE.Mesh(geometry, result.shaderMat);
        mesh.position.copy(new itowns.THREE.Vector3().set(4201000, 177000, 4779000));
        mesh.updateMatrixWorld();
        group.add(mesh);

        // create layer
        meshLayer = new itowns.GeometryLayer('Surface', group);
        meshLayer.update = function _() {};
        meshLayer.name = 'Mesh Layer';
        meshLayer.overrideMaterials = true;  // custom cesium shaders are not functional
        meshLayer.type = 'geometry';
        meshLayer.visible = true;
        globeView.addLayer(meshLayer);
        group.layer = meshLayer.id;
        // add GUI entry
        menuGlobe.addImageryLayerGUI(meshLayer);
    });

    folder = menuGlobe.gui.addFolder('ControlsSwitcher');
    folder.add({ immersive: true }, 'immersive').onChange(function switchMode(/* value */) {
        globeView.controls.switchMode();
    });
});

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
