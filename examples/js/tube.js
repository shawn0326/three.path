window.onload = function() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0.3, 0.3, 0.3);
	const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 1000);
	camera.position.set(0, 20, 20);

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	const controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.target.set(5, -5, 5);

	const ambientLight = new THREE.AmbientLight(0xffffff);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.position.set(2, 2, -3);
	directionalLight.position.normalize();
	scene.add(directionalLight);

	// random vector3 points
	const points = [new THREE.Vector3()];
	let oldType = 2;
	for (let i = 0; i < 5; i++) {
		const old = points[points.length - 1];
		let type = Math.floor(Math.random() * 100) % 3;
		while (oldType == type) {
			type = Math.floor(Math.random() * 100) % 3;
		}
		oldType = type;
		const offset = (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1);
		points.push(new THREE.Vector3(
			type === 0 ? (old.x + offset) : old.x,
			type === 1 ? (old.y + offset) : old.y,
			type === 2 ? (old.z + offset) : old.z
		));
	}

	// create PathPointList
	const pathPointList = new THREE.PathPointList();
	pathPointList.set(points, 0.3, 10, false);

	// create geometry
	const radius = 0.2;
	const geometry = new THREE.PathTubeGeometry({
		pathPointList: pathPointList,
		options: { radius: radius, generateFlatStartCap: true, generateFlatEndCap: true },
		usage: THREE.DynamicDrawUsage
	});

	const texture = new THREE.TextureLoader().load('images/diffuse.jpg', function(texture) {
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
	});

	const material = new THREE.MeshPhongMaterial({
		color: 0x58DEDE,
		depthWrite: true,
		transparent: true,
		opacity: 0.9,
		side: THREE.FrontSide
	});
	material.map = texture;

	const tube = new THREE.Mesh(geometry, material);
	scene.add(tube);

	const params = {
		useTexture: true,
		color: [88, 222, 222],
		scrollUV: true,
		scrollSpeed: 0.03,
		radius: 0.2,
		radialSegments: 8,
		cornerRadius: 0.3,
		cornerSplit: 10,
		progress: 1,
		playSpeed: 0.14,
		wireframe: false,
		startCap: true,
		endCap: true
	};
	const gui = new dat.GUI();

	gui.add(params, 'useTexture').onChange(function(val) {
		material.map = val ? texture : null;
		material.needsUpdate = true;
	});
	gui.add(params, 'wireframe').onChange(function(val) {
		material.wireframe = val;
		material.needsUpdate = true;
	});
	gui.addColor(params, 'color').onChange(function(value) {
		material.color.r = value[0] / 255;
		material.color.g = value[1] / 255;
		material.color.b = value[2] / 255;
	});
	gui.add(material, 'opacity').min(0).max(1);
	gui.add(params, 'scrollUV');
	gui.add(params, 'scrollSpeed').min(-0.1).max(0.1);
	gui.add(params, 'radius').min(0.1).max(1).onChange(function() {
		geometry.update(pathPointList, {
			radius: params.radius,
			radialSegments: params.radialSegments,
			generateFlatStartCap: params.startCap,
			generateFlatEndCap: params.endCap
		});
	});
	gui.add(params, 'radialSegments').min(2).max(10).step(1).onChange(function() {
		geometry.update(pathPointList, {
			radius: params.radius,
			radialSegments: params.radialSegments,
			generateFlatStartCap: params.startCap,
			generateFlatEndCap: params.endCap
		});
	});
	gui.add(params, 'progress').min(0).max(1).step(0.01).listen().onChange(function() {
		geometry.update(pathPointList, {
			radius: params.radius,
			radialSegments: params.radialSegments,
			progress: params.progress,
			generateFlatStartCap: params.startCap,
			generateFlatEndCap: params.endCap
		});
	});
	gui.add(params, 'playSpeed').min(0.01).max(0.2);
	gui.add(params, 'cornerRadius').min(0).max(1).onChange(function(val) {
		pathPointList.set(points, params.cornerRadius, params.cornerSplit, false);
		geometry.update(pathPointList, {
			radius: params.radius,
			radialSegments: params.radialSegments,
			generateFlatStartCap: params.startCap,
			generateFlatEndCap: params.endCap
		});
	});
	gui.add(params, 'cornerSplit').min(0).max(30).step(1).onChange(function(val) {
		pathPointList.set(points, params.cornerRadius, params.cornerSplit, false);
		geometry.update(pathPointList, {
			radius: params.radius,
			radialSegments: params.radialSegments,
			generateFlatStartCap: params.startCap,
			generateFlatEndCap: params.endCap
		});
	});

	let playing = false;

	function render(time) {
		requestAnimationFrame(render);
		controls.update();

		// progress
		if (playing) {
			const distance = pathPointList.distance();

			if (distance > 0) {
				params.progress += params.playSpeed / distance;
				if (params.progress > 1) {
					playing = false;
					params.progress = 1;
				}
			} else {
				playing = false;
				params.progress = 1;
			}

			geometry.update(pathPointList, {
				radius: params.radius,
				radialSegments: params.radialSegments,
				progress: params.progress,
				generateFlatStartCap: params.startCap,
				generateFlatEndCap: params.endCap
			});
		}

		if (params.scrollUV) {
			texture.offset.x -= params.scrollSpeed;
			texture.repeat.x = 1;
		}

		renderer.render(scene, camera);
	}

	render();

	document.addEventListener('keydown', event => {
		const keyName = event.key;
		if ('Escape' == keyName) {
			// nothing to do
		} else if ('p' == keyName) {
			playing = true;
			params.progress = 0;
		}
	});
};

