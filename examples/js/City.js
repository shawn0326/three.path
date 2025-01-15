import * as THREE from 'three';
import * as BufferGeometryUtils from './libs/BufferGeometryUtils.js';
import { PathPointList, PathGeometry } from '../../build/three.path.module.js';

/**
 * City Builder
 * @param {Object} params
 */
function City(params) {
	const areaSize = params.areaSize || 30;
	const maxHeight = params.maxHeight || areaSize;
	this._areas = this._getAreaList(areaSize, params.count || 7);
	this._halfAreaSize = areaSize / 2;
	this._roadTexture = params.roadTexture || null;
	this._buildingMat = params.buildingMat || {
		color: 0x114499, // 0x2194ce,
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
	for (let i = 0; i < this.buildings.length; i++) {
		this.speeds[i] = Math.random() * 0.8 + 0.4;
	}

	this._progress = 0;
}

City.prototype = Object.assign(City.prototype, {
	run: function(delta) {
		if (this._progress <= 1) {
			this._progress += 0.5 * delta;

			const that = this;
			this.roads.forEach(function(obj) {
				const geometry = obj.geometry;
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

		let index = 0;
		const speeds = this.speeds;
		this.buildings.forEach(function(obj) {
			obj.scale.y = Math.min(1, obj.scale.y + delta * speeds[index++]);

			// var material = obj.material;
			// material.opacity = that._progress;
		});
	},
	_getAreaList: function(areaSize, count) {
		const list = [];

		const totalLength = areaSize * count;
		const origin = -totalLength / 2;
		const p1 = new THREE.Vector2();
		const p2 = new THREE.Vector2();
		for (let j = 0; j < count; j++) {
			for (let i = 0; i < count; i++) {
				const box = new THREE.Box2();
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
		const offset = roadOffset; // road offset
		const width = roadWidth; // road width

		const halfAreaSize = this._halfAreaSize;

		const geometries = [];

		for (let loop = 1; loop < 5; loop++) {
			const points = [];
			for (let j = 0; j < loop; j++) {
				if (j === 0) {
					points.push(new THREE.Vector3(-halfAreaSize - offset, 0, -halfAreaSize - offset));
				}

				points.push(new THREE.Vector3(halfAreaSize + offset, 0, -halfAreaSize - offset));
				points.push(new THREE.Vector3(halfAreaSize + offset, 0, halfAreaSize + offset));
				points.push(new THREE.Vector3(-halfAreaSize - offset, 0, halfAreaSize + offset));
				points.push(new THREE.Vector3(-halfAreaSize - offset, 0, -halfAreaSize - offset));
			}

			const pathPointList = new PathPointList();
			pathPointList.set(points, 0, 0, new THREE.Vector3(0, 1, 0));

			const updateParam = {
				width: width,
				arrow: false,
				progress: 0
			};

			const geometry = new PathGeometry({
				pathPointList: pathPointList,
				options: updateParam
			});
			geometry._pathPointList = pathPointList;
			geometry._updateParam = updateParam;

			geometries.push(geometry);
		}

		return geometries;
	},
	_createRoads: function(roadWidth, roadOffset) {
		const areas = this._areas;
		const geometries = this._createRoadGeometries(roadWidth, roadOffset);
		const texture = this._roadTexture;

		const group = new THREE.Group();

		const material = new THREE.MeshBasicMaterial({
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
			map: texture
		});

		const center = new THREE.Vector2();
		const geoLength = geometries.length;
		for (let i = 0; i < areas.length; i++) {
			const geometry = geometries[Math.ceil(Math.random() * geoLength)];
			if (geometry) {
				const mesh = new THREE.Mesh(geometry, material);
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
		const areas = this._areas;

		const group = new THREE.Group();

		const material = new THREE.MeshBasicMaterial(this._buildingMat);

		const center = new THREE.Vector2();
		const heightDividedBy3 = height / 3;
		for (let i = 0; i < areas.length; i++) {
			if (ignoreCenter && (i == areas.length / 2 - 0.5)) {
				continue;
			}

			const area = areas[i];
			area.getCenter(center);

			const array = [], xDividedBy3 = Math.abs(area.max.x - area.min.x) / 3, zDividedBy3 = Math.abs(area.max.y - area.min.y) / 3;
			for (let j = 0; j < 6; j++) {
				const _height = (Math.random() * 2 + 1) * heightDividedBy3;
				const _w1 = Math.random() * 2 * xDividedBy3;
				const _w2 = Math.random() * 2 * zDividedBy3;
				const _x = (Math.random() - 0.5) * 2 * xDividedBy3;
				const _z = (Math.random() - 0.5) * 2 * zDividedBy3;

				const _geometry = new THREE.BoxGeometry(_w1, _height, _w2);
				_geometry.translate(_x, _height / 2, _z);

				array.push(_geometry);
			}

			const geometry = BufferGeometryUtils.mergeGeometries(array);
			geometry.computeBoundingBox();
			geometry.computeBoundingSphere();

			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.x = center.x;
			mesh.position.y = 0;
			mesh.position.z = center.y;
			mesh.scale.y = 0;
			group.add(mesh);
		}

		return group;
	}
});

export { City };