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
    
    var path3D = new Path3D();
    this.fixRadius = 0.5; // fixRadius should larger than cornerRadius
    this.height = 0.1;

    var geometry = new THREE.PathGeometry(128);

    var textureMap = new Map();
    function getTexture(url) {
        if (textureMap.has(url)) {
            return textureMap.get(url);
        } else {
            var texture = new THREE.TextureLoader().load(url, function( texture ) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            });
            textureMap.set(url, texture);
        }
    }
    getTexture('images/diffuse.jpg');
    getTexture('images/light.png');

    var material = new THREE.MeshBasicMaterial({
        color : 0x58DEDE, 
        depthWrite: true,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    material.map = getTexture('images/diffuse.jpg');
    
    line = new THREE.Mesh(geometry, material);
    line.frustumCulled = false;
    scene.add(line);

    var params = {texture: 'images/diffuse.jpg', color: [88, 222, 222], scrollUV: true, scrollSpeed: 0.03, width: 0.3, side: "both", cornerRadius: 0.2, cornerSplit: 10, progress: 1, playSpeed: 0.14};
    var gui = new dat.GUI();

    gui.add( params, 'texture', ['none', 'images/diffuse.jpg', 'images/light.png']).onChange(function(val) {
        if (val === 'none') {
            material.map = null;
        } else {
            material.map = getTexture(val);
        }
        material.needsUpdate = true;
    });
    gui.add( material, 'wireframe');
    gui.add( material, 'depthWrite');
    gui.addColor(params, "color").onChange(function(value) {
        material.color.r = value[0] / 255;
        material.color.g = value[1] / 255;
        material.color.b = value[2] / 255;
    });
    gui.add( material, 'opacity').min(0).max(1);
    gui.add( params, 'scrollUV');
    gui.add( params, 'scrollSpeed').min(-0.1).max(0.1);
    gui.add( params, 'width').min(-0.1).max(1).onChange(function() {
        geometry.update(path3D.getPathPointList(), {
            width: params.width,
            side: params.side,
            arrow: true
        });
    });
    gui.add( params, 'side', ["both", "left", "right"]).onChange(function(value) {
        geometry.update(path3D.getPathPointList(), {
            width: params.width,
            side: value,
            arrow: true
        });
    });
    gui.add( params, 'progress').min(0).max(1).step(0.01).listen().onChange(function() {
        geometry.update(path3D.getPathPointList(), {
            width: params.width,
            side: params.side,
            progress: params.progress,
            arrow: true
        });
    });
    gui.add( params, 'playSpeed').min(0.01).max(0.2);
    gui.add( params, 'cornerRadius').min(0).max(1).onChange(function(val) {
        path3D.cornerRadius = val;
        geometry.update(path3D.getPathPointList(), {
            width: params.width,
            side: params.side,
            arrow: true
        });
    });
    gui.add( params, 'cornerSplit').min(0).max(30).step(1).onChange(function(val) {
        path3D.cornerSplit = val;
        geometry.update(path3D.getPathPointList(), {
            width: params.width,
            side: params.side,
            arrow: true
        });
    });
    // gui.open();

    function render() {

        requestAnimationFrame( render );
        controls.update();

        container.style.cursor = drawing ? 'crosshair' : 'default'; 

        if(drawing) {
            geometry.update(path3D.getPathPointList(), {
                width: params.width,
                side: params.side,
                arrow: true
            });
        } else {
            if(playing) {
                var pathPointList = path3D.getPathPointList();
                var distance = pathPointList.distance();

                if(distance > 0) {
                    params.progress += params.playSpeed / distance;
                    if(params.progress >= 1) {
                        params.progress = 1;
                        playing = false;
                    }
                } else {
                    params.progress = 1;
                    playing = false;
                }

                geometry.update(pathPointList, {
                    width: params.width,
                    side: params.side,
                    progress: params.progress,
                    arrow: true
                });
            }
            
        }

        if(params.scrollUV && material.map) {
            material.map.offset.x -= params.scrollSpeed;
            material.map.repeat.x = 1;
        }
    
        renderer.render( scene, camera );
    
    }

    render();

    var drawing = false;
    var playing = true; // animation playing

    document.addEventListener('keydown', (event) => {
        var keyName = event.key;
        if('Escape' == keyName ) {
            if(!playing) {
                path3D.clear();
                geometry.update(path3D.getPathPointList());
                drawing = false;
            } else {
                console.warn('clear after playing finished');
            }
        } else if('d' == keyName) {
            drawing = true;
            path3D.start();
        } else if('p' == keyName) {
            if(!drawing) {
                playing = true;
                params.progress = 0;
            } else {
                console.warn('play after drawing finished');
            }
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
            geometry.update(path3D.getPathPointList());
            drawing = false;

        } else if(event.button == 2) {

            drawing = false;
            path3D.stop();
            geometry.update(path3D.getPathPointList(), {
                width: params.width,
                side: params.side,
                arrow: true
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

            path3D.update(intersects[ 0 ].point);

        }
    }

};

