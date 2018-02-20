/* global itowns, document, renderer, orientedImageGUI  */
// # Simple Globe viewer

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
//promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));


var layer = {
    sensors: [],
    dist:'',
    // dist:'_nodist',
    opacity:1,
    convergence:0.414,
    cameraFOV: 30,
    focaleReel: 1,
    debugScale: 1,
    micmac: true,
}


function updateOrientationConvention() {
    // Basically, we are oriented like camera looing at the sky, following the geodesic normal
    layer.orientationConvention.lookAt(layer.coordView.geodesicNormal.clone().add(layer.orientationConvention.position));

    if (layer.orientedNord) {

        // Here we change orientation to follow a convention, like a camera looking at the north. Z axis to the north
        layer.orientationConvention.rotateX(Math.PI / 2);
        
        // This inverse Z axis sens (rotating around Y). now Z, the camera look to the north (not the south)
        layer.orientationConvention.rotateY(Math.PI );
        // And then inverse X axis sens (rotating around Z)
        layer.orientationConvention.rotateZ(Math.PI );
       
        
        layer.orientationConvention.rotateY(-layer.convergence * Math.PI / 180.0);
    } else {
        layer.orientationConvention.rotateZ(layer.convergence * Math.PI / 180.0);
    }
    
    
    layer.orientationConvention.updateMatrixWorld(true);

    if (layer.camera) {
       // layer.camera.updateMatrixWorld(true);
        if (layer.cameraHelper) {
            layer.cameraHelper.updateMatrixWorld(true);
        }
    }
}

function updateAxisOrientation() {
    
    var quaternion = new itowns.THREE.Quaternion();
    layer.axis.quaternion = new itowns.THREE.Quaternion();

    // layer.axis.lookAt(new itowns.THREE.Vector3(0,1,0));
    // layer.axis.lookAt(layer.coordView.geodesicNormal.clone().add(layer.axis.position));
    // rectification vrai NORD
    // layer.axis.rotateZ(layer.convergence * Math.PI / 180.0);
    // if (!micmac) {
    //     layer.axis.rotateX(90 * Math.PI / 180.0);
    // }

    const matrixFromEuler = new itowns.THREE.Matrix4().makeRotationFromEuler(layer.orientation);
    
    // The three angles ω,ɸ,k are computed
    // for a traditionnal image coordinate system (X=colomns left to right and Y=lines bottom up)
    // and not for a computer vision compliant geometry (X=colomns left to right and Y=lines top down)
    // so we have to multiply to rotation matrix by this matrix :
   if (layer.micmac) {
        var trix = new itowns.THREE.Matrix4().set(
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1);
        const trixQuaternion = new itowns.THREE.Quaternion().setFromRotationMatrix(trix);
        matrixFromEuler.multiply(trix);    
    }

    quaternion.setFromRotationMatrix (matrixFromEuler);

    layer.axis.quaternion.copy(quaternion);
    // layer.axis.updateMatrixWorld();

    layer.orientationConvention.updateMatrixWorld(true);
}

function updatePlanePositionAndScale() {
    layer.Xreel = (layer.sizeX * layer.focaleReel) / layer.focaleX ;
    layer.Yreel = (layer.sizeY * layer.focaleReel) / layer.focaleY;
    layer.ppaXReel = ((layer.ppaX - layer.sizeX / 2) * layer.focaleReel) / layer.focaleX;
    layer.ppaYReel = (-(layer.ppaY - layer.sizeY / 2) * layer.focaleReel) / layer.focaleY;

    layer.plane.scale.set(layer.Xreel / layer.debugScale , layer.Yreel / layer.debugScale, 1);
    layer.plane.position.set(layer.ppaXReel, layer.ppaYReel, layer.focaleReel);
    layer.plane.updateMatrixWorld();

    if (layer.camera) {
        layer.camera.near = layer.focaleReel;
        layer.camera.far = layer.focaleReel + 1;
        layer.camera.updateProjectionMatrix();
        if (layer.cameraHelper) {
            layer.cameraHelper.update();
        }
    }
}
function orientedImagesInit(orientedImages) {
    var i;
    var ori;
    var listOrientation;
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var offset = { x: 657000, y: 6860000, z: -0.4 };
    itowns.micMacConvert.offset = offset;
    
    layer.images = 'http://localhost:8080/examples/Li3ds/images_091117/{imageId}_{sensorId}{dist}.jpg';
    listOrientation = itowns.OrientedImageDecoder.decode(orientedImages, itowns.micMacConvert);

    // get a threeJs layer and add it to the camera
    var layerTHREEjs = globeView.mainLoop.gfxEngine.getUniqueThreejsLayer();
    globeView.camera.camera3D.layers.enable(layerTHREEjs);

    for (i = 0; i < listOrientation.length; i++) {

        // sho one picture every 5 pictures
        if (i % 5 != 0) continue;

        // get informations from the decoder
        ori = listOrientation[i];

        // get the coordinate
        ori.coord.as(globeView.referenceCrs, coordView);
        layer.coordView = coordView;
        
        // get the orientation
        layer.orientation = ori.orientation;

        // first create an object 'orientation convention'
        layer.orientationConvention = new itowns.THREE.AxesHelper(1);
        layer.orientationConvention.layers.set(layerTHREEjs);
        layer.orientationConvention.position.copy(coordView.xyz());
        // here is the function to dynamically update this orientation convention
        updateOrientationConvention();

        // create an axis helper
        layer.axis = new itowns.THREE.AxesHelper(0);

        // get picture informations from metadata
        var projectionMatrix = layer.sensors[0].projection;
        var size = layer.sensors[0].size;
        layer.focaleX = projectionMatrix[0];
        layer.ppaX = projectionMatrix[2];
        layer.focaleY = projectionMatrix[4];
        layer.ppaY = projectionMatrix[5];
        layer.sizeX = size[0];
        layer.sizeY = size[1];

        // here is the function that dynamically update axis orientation
        updateAxisOrientation();

        // add a mini camera oriented on Z
        var ouverture = (2 * Math.atan((layer.sizeY / 2) / layer.focaleY)) / Math.PI * 180;
        layer.camera = new itowns.THREE.PerspectiveCamera(ouverture, layer.sizeX / layer.sizeY, layer.focaleReel, layer.focaleReel * 2);
        layer.axis.add(layer.camera);
        // Dans notre repère de l'image orientée, l'axe des Z va vers la visée de caméra
        // Dans ThreeJS, la camera vise vers l'opposé de l'axe des Z
        // Donc on retourne la camera autour de l'axe Y
        layer.camera.rotateY(Math.PI);
        layer.camera.updateMatrixWorld(true);

        // get the texture for the picture
        var url = itowns.format(layer.images, { imageId:ori.source.id, sensorId: 'CAM24', dist:layer.dist });
        var texture = new itowns.THREE.TextureLoader().load( url );

        // create a plane for the picture
        var geometry = new itowns.THREE.PlaneGeometry( 1, 1, 32 );
        var material = new itowns.THREE.MeshBasicMaterial( {
            map: texture,
            color: 0xffffff,
            side: itowns.THREE.DoubleSide,
            transparent: true, opacity: layer.opacity,
        } );
        layer.plane = new itowns.THREE.Mesh( geometry, material );
        layer.plane.layers.set(layerTHREEjs);
        
        layer.plane.rotateX(Math.PI);
        layer.axis.add( layer.plane );

        // here is function that dinamically update plane position
        updatePlanePositionAndScale();
        layer.orientationConvention.add(layer.axis);
        // add axis to scene and update matrix world
        globeView.scene.add(layer.orientationConvention);
        layer.orientationConvention.updateMatrixWorld();

        // add a camera helper on the camera (to see it)
        layer.cameraHelper = new itowns.THREE.CameraHelper(layer.camera);
        layer.cameraHelper.layers.set(layerTHREEjs);
        globeView.scene.add(layer.cameraHelper);
        layer.cameraHelper.updateMatrixWorld(true);
    }
}

function sensorsInit(res) {
    for (const s of res) {
        var sensor = {};
        sensor.id = s.id;
        sensor.projection = s.projection;
        sensor.size = s.size;
        layer.sensors.push(sensor);
    }
}

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
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/cibles.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_camera.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_pano.json', { crossOrigin: '' }));

Promise.all(promises).then((res) => {
    cibleInit(res[0])
    sensorsInit(res[1]);
    orientedImagesInit(res[2]);
});

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
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 16,
    projection: 'EPSG:4326',
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
    wireframe: true,
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
