/**
 * City Builder
 * @param {Object} params
 */
function City(params) {
    var areaSize = params.areaSize || 30;
    var maxHeight = params.maxHeight || areaSize;
    this._areas = this._getAreaList(areaSize, params.count || 7);
    this._halfAreaSize = areaSize / 2;
    this._roadTexture = params.roadTexture || null;
    this._buildingMat = params.buildingMat || {
        color: 0x114499,//0x2194ce,
        transparent: true,
        opacity: 0.3,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    };

    this.roadsGroup = this._createRoads(params.roadWidth || 2, params.roadOffset || 0.6);
    this.buildingsGroup = this._createSimpleBuildings(maxHeight, params.ignoreCenter);

    this.roads = this.roadsGroup.children;
    this.buildings = this.buildingsGroup.children;

    this.speeds = [];
    for(var i = 0; i < this.buildings.length; i++) {
        this.speeds[i] = Math.random() * 0.8 + 0.4;
    }

    this._progress = 0;
}

City.prototype = Object.assign(City.prototype, {
    run: function(delta) {
        if(this._progress <= 1) {
            this._progress += 0.5 * delta;

            var that = this;
            this.roads.forEach(function(obj) {
                var geometry = obj.geometry;
                geometry._updateParam.progress = that._progress;
                geometry.update(geometry._pathPointList, geometry._updateParam);
                geometry.computeBoundingBox();
                geometry.computeBoundingSphere();

                // var material = obj.material;
                // material.opacity = that._progress;
            });            
        }

        this._roadTexture.offset.x -= delta * 0.02 * 24;
        this._roadTexture.repeat.x = 1 / 24;

        var index = 0;
        var speeds = this.speeds;
        this.buildings.forEach(function(obj) {
            obj.scale.y = Math.min(1, obj.scale.y + delta * speeds[index++]);

            // var material = obj.material;
            // material.opacity = that._progress;
        });
    },
    _getAreaList: function(areaSize, count) {
        var list = [];

        var totalLength = areaSize * count;
        var origin = -totalLength / 2;
        var p1 = new THREE.Vector2();
        var p2 = new THREE.Vector2();
        for(var j = 0; j < count; j++) {
            for(var i = 0; i < count; i++) {
                var box = new THREE.Box2();
                p1.set(i * areaSize + origin, j * areaSize + origin);
                p2.set((i + 1) * areaSize + origin, (j + 1) * areaSize + origin);
                box.expandByPoint(p1);
                box.expandByPoint(p2);
                list.push(box);
            }
        }

        return list;
    },
    _createRoadGeometries: function(roadWidth, roadOffset) {
        var offset = roadOffset; // road offset
        var width = roadWidth; // road width

        var halfAreaSize = this._halfAreaSize;

        var geometries = [];

        for(var loop = 1; loop < 5; loop++) {
            var points = [];
            for(var j = 0; j < loop; j++) {
                if(j === 0) {
                    points.push(new THREE.Vector3(-halfAreaSize - offset, 0, -halfAreaSize - offset));
                }

                points.push(new THREE.Vector3(halfAreaSize + offset, 0, -halfAreaSize - offset));
                points.push(new THREE.Vector3(halfAreaSize + offset, 0, halfAreaSize + offset));
                points.push(new THREE.Vector3(-halfAreaSize - offset, 0, halfAreaSize + offset));
                points.push(new THREE.Vector3(-halfAreaSize - offset, 0, -halfAreaSize - offset));
            }

            var pathPointList = new THREE.PathPointList();
            pathPointList.set(points, 0, 0, new THREE.Vector3(0, 1, 0));

            var updateParam = {
                width: width,
                arrow: false,
                progress: 0
            };

            var geometry = new THREE.PathGeometry({
                pathPointList: pathPointList,
                options: updateParam
            });
            geometry._pathPointList = pathPointList;
            geometry._updateParam = updateParam;

            geometries.push(geometry);
        }

        console.log(geometries)

        return geometries;
    },
    _createRoads: function(roadWidth, roadOffset) {
        var areas = this._areas;
        var geometries = this._createRoadGeometries(roadWidth, roadOffset);
        var texture = this._roadTexture;

        var group = new THREE.Group();

        var material = new THREE.MeshBasicMaterial({
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            map: texture
        });

        var center = new THREE.Vector2();
        var geoLength = geometries.length;
        for(var i = 0; i < areas.length; i++) {
            var geometry = geometries[Math.ceil(Math.random() * geoLength)];
            if(geometry) {
                var mesh = new THREE.Mesh(geometry, material);
                areas[i].getCenter(center);
                mesh.position.x = center.x;
                mesh.position.y = 0;
                mesh.position.z = center.y;
                group.add(mesh);
            }
        }

        return group;
    },
    _createSimpleBuildings: function(height, ignoreCenter) {
        var areas = this._areas;

        var group = new THREE.Group();

        var material = new THREE.MeshBasicMaterial(this._buildingMat);

        var center = new THREE.Vector2();
        var heightDividedBy3 = height / 3;
        for(var i = 0; i < areas.length; i++) {
            if(ignoreCenter && (i == areas.length / 2 - 0.5)) {
                continue;
            }

            var area = areas[i];
            area.getCenter(center);

            var array = [], xDividedBy3 = Math.abs(area.max.x - area.min.x) / 3, zDividedBy3 = Math.abs(area.max.y - area.min.y) / 3;
            for(var j = 0; j < 6; j++) {
                var _height = (Math.random() * 2 + 1) * heightDividedBy3;
                var _w1 = Math.random() * 2 * xDividedBy3;
                var _w2 = Math.random() * 2 * zDividedBy3;
                var _x = (Math.random() - 0.5) * 2 * xDividedBy3;
                var _z = (Math.random() - 0.5) * 2 * zDividedBy3;

                var geometry = new THREE.BoxBufferGeometry(_w1, _height, _w2);
                geometry.translate(_x, _height / 2, _z);
                
                array.push(geometry);
            }

            var geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(array);
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = center.x;
            mesh.position.y = 0;
            mesh.position.z = center.y;
            mesh.scale.y = 0;
            group.add(mesh);
            
        }

        return group;
    }
});