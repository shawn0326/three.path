window.onload = function() {

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0.3, 0.3, 0.3);
    var camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, .1, 1000 );
    camera.position.set( 0, 10, -10 );

    var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    container.appendChild( renderer.domElement );

    container.addEventListener( 'mousedown', onMouseDown, false );
    container.addEventListener( 'mousemove', onMouseMove, false );

    var controls = new THREE.OrbitControls( camera, renderer.domElement );

    var groundGroup = new THREE.Group();

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshLambertMaterial({color: 0x124312}));
    floor.rotation.x = - Math.PI * 0.5;
    groundGroup.add(floor);

    var box1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({color: 0xaa4312}));
    box1.position.x = 1.5;
    box1.position.y = 0.5;
    groundGroup.add(box1);

    var box2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({color: 0xaa4312}));
    box2.position.x = -1.5;
    box2.position.y = 0.5;
    groundGroup.add(box2);

    scene.add(groundGroup);

    var ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff);
    directionalLight.position.set( 2, 2, - 3 );
    directionalLight.position.normalize();
    scene.add( directionalLight );

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    
    var path3D = new THREE.Path3D();
    this.fixRadius = 0.5; // fixRadius should larger than cornerRadius
    this.height = 0.1;

    var geometry = new THREE.PathGeometry();

    var texture = new THREE.TextureLoader().load( 'images/diffuse.jpg', function( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    var material = new THREE.MeshBasicMaterial({
        color : 0x58DEDE, 
        depthWrite: true,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    material.map = texture;
    
    var line = new THREE.Mesh(geometry, material);
    line.drawMode = THREE.TriangleStripDrawMode;
    scene.add(line);

    var params = {useTexture: true, color: [88, 222, 222], scrollUV: true, scrollSpeed: 0.03, width: 0.3, cornerRadius: 0.2};
    var gui = new dat.GUI();

    gui.add( params, 'useTexture').onChange(function(val) {
        material.map = val ? texture : null;
        material.needsUpdate = true;
    });
    gui.addColor(params, "color").onChange(function(value) {
        material.color.r = value[0] / 255;
        material.color.g = value[1] / 255;
        material.color.b = value[2] / 255;
    });
    gui.add( material, 'opacity').min(0).max(1);
    gui.add( params, 'scrollUV');
    gui.add( params, 'scrollSpeed').min(-0.1).max(0.1);
    gui.add( params, 'width').min(-0.1).max(1).onChange(function() {
        geometry.update(path3D.getPoints(), {
            width: params.width,
            // uvOffset: params.scrollUV ? scrollingY : 0,
            cornerRadius: params.cornerRadius
        });
    });
    // gui.add( params, 'cornerRadius').min(0.1).max(1).onChange(function() {
    //     geometry.update(path3D.getPoints(), {
    //         width: params.width,
    //         // uvOffset: params.scrollUV ? scrollingY : 0,
    //         cornerRadius: params.cornerRadius
    //     });
    // });
    // gui.open();

    var scrollingY = 0;

    function render(time) {

        requestAnimationFrame( render );
        controls.update();

        container.style.cursor = drawing ? 'crosshair' : 'default'; 

        if(drawing) {
            scrollingY += params.scrollSpeed;
            geometry.update(path3D.getPoints(), {
                width: params.width,
                uvOffset: params.scrollUV ? scrollingY : 0,
                cornerRadius: params.cornerRadius
            });
        } else {
            if(params.scrollUV) {
                geometry.updateUVScroll(0, -params.scrollSpeed);
            }
        }
    
        renderer.render( scene, camera );
    
    }

    render();

    var drawing = false;

    document.addEventListener('keydown', (event) => {
        var keyName = event.key;
        if('Escape' == keyName ) {
            path3D.clear();
            geometry.update([]);
            drawing = false;
        } else if('d' == keyName) {
            drawing = true;
            path3D.start();
        }
    });

    function onMouseDown( event ) {
        

        if(event.button == 0) {

            if(!drawing) {
                return;
            }

            mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
            mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
            raycaster.setFromCamera( mouse, camera );
            // See if the ray from the camera into the world hits one of our meshes
            var intersects = raycaster.intersectObjects( [floor, box1, box2] );
            // Toggle rotation bool for meshes that we clicked
            if ( intersects.length > 0 ) {
                path3D.confirm();
            }
            
        } else if(event.button == 1) {

            path3D.clear();
            geometry.update([]);
            drawing = false;

        } else if(event.button == 2) {

            drawing = false;
            path3D.stop();
            geometry.update(path3D.getPoints(), {
                width: params.width,
                // uvOffset: time / 1000,
                cornerRadius: params.cornerRadius
            });

        }
    }

    function onMouseMove( event ) {
        if(!drawing) {
            return;
        }

        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
        raycaster.setFromCamera( mouse, camera );
        // See if the ray from the camera into the world hits one of our meshes
        var intersects = raycaster.intersectObjects( [floor, box1, box2] );
        // Toggle rotation bool for meshes that we clicked
        if ( intersects.length > 0 ) {

            path3D.updateLastPoint(intersects[ 0 ].point);

        }
    }

};

