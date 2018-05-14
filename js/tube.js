window.onload = function() {

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0.3, 0.3, 0.3);
    var camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, .1, 1000 );
    camera.position.set( 0, 40, 40 );

    var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );

    var controls = new THREE.OrbitControls( camera, renderer.domElement );

    var ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff);
    directionalLight.position.set( 2, 2, - 3 );
    directionalLight.position.normalize();
    scene.add( directionalLight );

    var points = [new THREE.Vector3()];
    var oldType = 2;
    for(var i = 0; i < 100; i++) {
        var old = points[points.length - 1];
        var type = Math.floor(Math.random() * 100) % 3;
        while(oldType == type) {
            type = Math.floor(Math.random() * 100) % 3;
        }
        oldType = type;
        var offset = (Math.random() * 3 + 1) * (Math.random() > 0.5 ? 1 : -1);
        points.push(new THREE.Vector3(
            type === 0 ? (old.x + offset) : old.x,
            type === 1 ? (old.y + offset) : old.y,
            type === 2 ? (old.z + offset) : old.z,
        ));
    }

    var pathPointList = new THREE.PathPointList();
    pathPointList.set(points, 0.1, 10, false);
    var radius = 0.2;
    var geometry = new THREE.PathTubeGeometry();
    geometry.update(pathPointList, {
        radius: radius
    });

    var texture = new THREE.TextureLoader().load( 'images/diffuse.jpg', function( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    var material = new THREE.MeshPhongMaterial({
        color : 0x58DEDE, 
        depthWrite: true,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    material.map = texture;
    
    var tube = new THREE.Mesh(geometry, material);
    scene.add(tube);

    var scroll = 0;
    var progress = 0;

    function render(time) {

        requestAnimationFrame( render );
        controls.update();

        scroll += 0.01;
        geometry.update(pathPointList, {
            radius: radius,
            uvOffset: scroll
        });

        progress += 0.001;
        if(progress > 1) progress = 0;
        geometry.update(pathPointList, {
            radius: radius,
            progress: progress
        });
    
        renderer.render( scene, camera );
    
    }

    render();

};

