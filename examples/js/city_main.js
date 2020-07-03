window.onload = function() {

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0, 0, 0);
    var camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, .1, 1000 );
    camera.position.set( 30, 40, 50 );

    var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );

    var controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.rotateSpeed = 0.1;
    controls.dampingFactor = 0.1;

    var texture = new THREE.TextureLoader().load( './images/path_007_19.png', function( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 16;
    });

    var city = new City({
        areaSize: 30,
        maxHeight: 20,
        roadTexture: texture,
        roadWidth: 2,
        roadOffset: 0.6
    });
    scene.add(city.roadsGroup);
    scene.add(city.buildingsGroup);

    var helper = new THREE.GridHelper( 300 , 30, 0x114499, 0x114499 );
	scene.add( helper );

    var clock = new THREE.Clock();
    var stats = new Stats();
    document.body.appendChild( stats.dom );

    function render() {

        stats.begin();

        controls.update();

        city.run(clock.getDelta());
        
        renderer.render( scene, camera );

        stats.end();

        requestAnimationFrame( render );
    
    }

    render();
};

