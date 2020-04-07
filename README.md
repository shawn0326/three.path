three.path
===================

three.path is a three.js extension which provides a 3D path geometry builder.

### Usage

##### Step1: Create PathPointList to preprocess and store points.

````javascript

var list = new THREE.PathPointList();

/**
 * set points
 * @param {THREE.Vector3[]} points key points array
 * @param {number} cornerRadius? the corner radius. set 0 to disable round corner. default is 0.1
 * @param {number} cornerSplit? the corner split. default is 10.
 * @param {number} up? force up. default is auto up (calculate by tangent).
 * @param {boolean} close? close path. default is false.
 */
list.set(points, 0.1, 10);

````

##### Step2 Generate geometries

Generate PathGeometry.

````javascript

var geometry = new THREE.PathGeometry();

// update geometry when pathPointList changed
geometry.update(pathPointList, {
    width: 0.1, // default is 0.1
    arrow: true, // default is true
    progress: 1, // default is 1
    side: "both" // "left"/"right"/"both", default is "both"
});

````

Or generate PathTubeGeometry.

````javascript

var geometry = new THREE.PathTubeGeometry();

// update geometry when pathPointList changed
geometry.update(pathPointList, {
    radius: 0.1, // default is 0.1
    radialSegments: 8, // default is 8
    progress: 1, // default is 1
    startRad: 0 // default is 0
});

````

### demo

##### draw path

path geometry build from pathPointList. ->> [tube](https://shawn0326.github.io/three.path/examples/index.html)

![image](./examples/images/screenshot.png) 

##### tube

path tube geometry build from pathPointList. ->> [tube](https://shawn0326.github.io/three.path/examples/tube.html)

![image](./examples/images/screenshot2.png) 

##### city

[City](https://shawn0326.github.io/three.path/examples/city.html)

![image](./examples/images/screenshot3.png) 

### build

##### first run

````
npm install
````

##### build

````
npm run b
````